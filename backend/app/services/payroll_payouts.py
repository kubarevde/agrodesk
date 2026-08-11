"""Payroll payouts: linked payments, unlinked advances, remainder close (Prompt #6)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.payroll import PayrollPayout, PayrollRun, PayrollRunLine
from app.services.audit import log_change

ZERO = Decimal('0.00')
PAYOUT_METHODS = frozenset({'cash', 'bank_transfer', 'card', 'other'})
PAYOUT_KIND_ADVANCE = 'advance'
PAYOUT_KIND_SALARY = 'salary_payment'
PAYOUT_KINDS = frozenset({PAYOUT_KIND_ADVANCE, PAYOUT_KIND_SALARY})


def _q(value: Decimal | float | int | str | None) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal('0.01'))


def payout_status_for_amounts(*, total: Decimal, paid: Decimal, remainder_closed: bool) -> str:
    if remainder_closed:
        return 'paid'
    total_q = _q(total)
    paid_q = _q(paid)
    if paid_q <= ZERO:
        return 'unpaid'
    if paid_q >= total_q:
        return 'paid'
    return 'partially_paid'


def line_paid_total(line: PayrollRunLine, payouts: list[PayrollPayout] | None = None) -> Decimal:
    rows = payouts if payouts is not None else list(getattr(line, 'payouts', None) or [])
    return _q(sum((_q(p.amount_paid) for p in rows), ZERO))


def recompute_line_payout_status(
    line: PayrollRunLine,
    payouts: list[PayrollPayout] | None = None,
) -> None:
    paid = line_paid_total(line, payouts)
    closed = line.remainder_closed_at is not None
    line.payout_status = payout_status_for_amounts(
        total=_q(line.total_amount),
        paid=paid,
        remainder_closed=closed,
    )


def line_is_settled(line: PayrollRunLine) -> bool:
    """Paid in full or closed with remainder."""
    return line.payout_status == 'paid' or line.remainder_closed_at is not None


def maybe_mark_run_paid(run: PayrollRun) -> None:
    lines = list(run.lines or [])
    if not lines:
        return
    if all(line_is_settled(line) for line in lines):
        run.status = 'paid'


def validate_payout_comment(
    *,
    payout_method: str,
    comment: str | None,
    is_unlinked_advance: bool,
) -> str | None:
    text = (comment or '').strip() or None
    if payout_method == 'other' and not text:
        raise ValueError('Для способа оплаты «другое» комментарий обязателен')
    if is_unlinked_advance and not text:
        raise ValueError(
            'Для аванса без привязки к начислению комментарий обязателен '
            '(укажите период или назначение)'
        )
    return text


async def sum_payouts_for_line(db: AsyncSession, line_id: UUID) -> Decimal:
    result = await db.execute(
        select(PayrollPayout).where(PayrollPayout.payroll_run_line_id == line_id)
    )
    return _q(sum((_q(p.amount_paid) for p in result.scalars().all()), ZERO))


async def line_has_payouts(db: AsyncSession, line_id: UUID) -> bool:
    result = await db.execute(
        select(PayrollPayout.id).where(PayrollPayout.payroll_run_line_id == line_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def run_has_any_payouts(db: AsyncSession, run: PayrollRun) -> bool:
    line_ids = [line.id for line in (run.lines or [])]
    if not line_ids:
        return False
    result = await db.execute(
        select(PayrollPayout.id)
        .where(PayrollPayout.payroll_run_line_id.in_(line_ids))
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def assert_run_lines_mutable(db: AsyncSession, run: PayrollRun) -> None:
    """Block recalc / total changes once any linked payout exists."""
    if await run_has_any_payouts(db, run):
        raise ValueError(
            'Нельзя пересчитывать сумму строки после выдач — '
            'по run уже есть связанные payroll_payouts'
        )


async def list_unlinked_advances_for_run(
    db: AsyncSession,
    *,
    org_id: UUID,
    run: PayrollRun,
) -> list[PayrollPayout]:
    """Unlinked advances for employees in this run with payout_date <= period_end."""
    employee_ids = {line.employee_id for line in (run.lines or [])}
    if not employee_ids:
        return []
    result = await db.execute(
        select(PayrollPayout)
        .options(selectinload(PayrollPayout.employee))
        .where(
            PayrollPayout.org_id == org_id,
            PayrollPayout.payroll_run_line_id.is_(None),
            PayrollPayout.payout_kind == PAYOUT_KIND_ADVANCE,
            PayrollPayout.employee_id.in_(employee_ids),
            PayrollPayout.payout_date <= run.period_end,
        )
        .order_by(PayrollPayout.payout_date.asc(), PayrollPayout.created_at.asc())
    )
    return list(result.scalars().all())


async def create_linked_payout(
    db: AsyncSession,
    *,
    org_id: UUID,
    run: PayrollRun,
    line: PayrollRunLine,
    amount_paid: Decimal,
    payout_method: str,
    payout_date: date,
    comment: str | None,
    confirmed_by: UUID,
) -> PayrollPayout:
    if run.status != 'confirmed':
        raise ValueError('Выдача по строке доступна только для confirmed run')
    if line.remainder_closed_at is not None:
        raise ValueError('Строка закрыта с остатком — новые выдачи запрещены')
    if payout_method not in PAYOUT_METHODS:
        raise ValueError('Недопустимый способ оплаты')
    amount = _q(amount_paid)
    if amount <= ZERO:
        raise ValueError('Сумма выдачи должна быть больше нуля')
    paid_so_far = await sum_payouts_for_line(db, line.id)
    remainder = _q(line.total_amount) - paid_so_far
    if amount > remainder:
        raise ValueError('Сумма выдачи превышает остаток по начислению')
    text = validate_payout_comment(
        payout_method=payout_method,
        comment=comment,
        is_unlinked_advance=False,
    )
    payout = PayrollPayout(
        org_id=org_id,
        payroll_run_line_id=line.id,
        employee_id=line.employee_id,
        amount_paid=amount,
        payout_method=payout_method,
        payout_kind=PAYOUT_KIND_SALARY,
        payout_date=payout_date,
        confirmed_by=confirmed_by,
        comment=text,
    )
    db.add(payout)
    await db.flush()
    paid = await sum_payouts_for_line(db, line.id)
    line.payout_status = payout_status_for_amounts(
        total=_q(line.total_amount),
        paid=paid,
        remainder_closed=line.remainder_closed_at is not None,
    )
    maybe_mark_run_paid(run)
    return payout


async def create_advance_payout(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
    amount_paid: Decimal,
    payout_method: str,
    payout_date: date,
    comment: str | None,
    confirmed_by: UUID,
    advance_period_hint: str | None = None,
) -> PayrollPayout:
    emp = await db.get(Employee, employee_id)
    if emp is None or emp.org_id != org_id:
        raise ValueError('Сотрудник не найден в организации')
    if payout_method not in PAYOUT_METHODS:
        raise ValueError('Недопустимый способ оплаты')
    amount = _q(amount_paid)
    if amount <= ZERO:
        raise ValueError('Сумма выдачи должна быть больше нуля')
    text = validate_payout_comment(
        payout_method=payout_method,
        comment=comment,
        is_unlinked_advance=True,
    )
    payout = PayrollPayout(
        org_id=org_id,
        payroll_run_line_id=None,
        employee_id=employee_id,
        amount_paid=amount,
        payout_method=payout_method,
        payout_kind=PAYOUT_KIND_ADVANCE,
        payout_date=payout_date,
        confirmed_by=confirmed_by,
        comment=text,
        advance_period_hint=(advance_period_hint or '').strip() or None,
    )
    db.add(payout)
    await db.flush()
    return payout


async def create_advance_on_line(
    db: AsyncSession,
    *,
    org_id: UUID,
    run: PayrollRun,
    line: PayrollRunLine,
    amount_paid: Decimal,
    payout_method: str,
    payout_date: date,
    comment: str | None,
    confirmed_by: UUID,
) -> PayrollPayout:
    """Staff advance from a draft (or confirmed) payroll run card.

    Does not change total_amount / adjustments; only increases paid_amount.
    Prefer attaching to the employee's primary line (caller chooses line).
    """
    if run.status not in ('draft', 'confirmed'):
        raise ValueError('Аванс по начислению доступен для draft или confirmed')
    if line.remainder_closed_at is not None:
        raise ValueError('Строка закрыта с остатком — новые выдачи запрещены')
    if payout_method not in PAYOUT_METHODS:
        raise ValueError('Недопустимый способ оплаты')
    amount = _q(amount_paid)
    if amount <= ZERO:
        raise ValueError('Сумма выдачи должна быть больше нуля')
    # Aggregate remainder across all lines of the same employee in this run.
    employee_total = ZERO
    employee_paid = ZERO
    for row in run.lines or []:
        if row.employee_id != line.employee_id:
            continue
        employee_total += _q(row.total_amount)
        employee_paid += await sum_payouts_for_line(db, row.id)
    remainder = employee_total - employee_paid
    if amount > remainder:
        raise ValueError('Сумма аванса превышает текущий остаток по начислению сотрудника')
    text = validate_payout_comment(
        payout_method=payout_method,
        comment=comment,
        is_unlinked_advance=False,
    )
    payout = PayrollPayout(
        org_id=org_id,
        payroll_run_line_id=line.id,
        employee_id=line.employee_id,
        amount_paid=amount,
        payout_method=payout_method,
        payout_kind=PAYOUT_KIND_ADVANCE,
        payout_date=payout_date,
        confirmed_by=confirmed_by,
        comment=text,
    )
    db.add(payout)
    await db.flush()
    paid = await sum_payouts_for_line(db, line.id)
    line.payout_status = payout_status_for_amounts(
        total=_q(line.total_amount),
        paid=paid,
        remainder_closed=line.remainder_closed_at is not None,
    )
    if run.status == 'confirmed':
        maybe_mark_run_paid(run)
    return payout


async def link_advance_to_line(
    db: AsyncSession,
    *,
    org_id: UUID,
    payout: PayrollPayout,
    line: PayrollRunLine,
    run: PayrollRun,
) -> PayrollPayout:
    if payout.org_id != org_id:
        raise ValueError('Выдача не найдена')
    if payout.payroll_run_line_id is not None:
        raise ValueError('Аванс уже привязан к строке начисления')
    if payout.employee_id != line.employee_id:
        raise ValueError('Аванс можно привязать только к строке того же сотрудника')
    if run.status not in ('draft', 'confirmed'):
        raise ValueError('Привязка доступна для draft или confirmed run')
    if line.remainder_closed_at is not None:
        raise ValueError('Строка закрыта с остатком')
    paid_so_far = await sum_payouts_for_line(db, line.id)
    projected = paid_so_far + _q(payout.amount_paid)
    if projected > _q(line.total_amount):
        raise ValueError(
            'После привязки аванса сумма выданного превысит начисление — '
            'выберите другую строку или уменьшите аванс'
        )
    payout.payroll_run_line_id = line.id
    await db.flush()
    paid = await sum_payouts_for_line(db, line.id)
    line.payout_status = payout_status_for_amounts(
        total=_q(line.total_amount),
        paid=paid,
        remainder_closed=line.remainder_closed_at is not None,
    )
    if run.status == 'confirmed':
        maybe_mark_run_paid(run)
    return payout


async def close_line_remainder(
    db: AsyncSession,
    *,
    org_id: UUID,
    run: PayrollRun,
    line: PayrollRunLine,
    comment: str,
    closed_by: UUID,
    closed_at,
) -> PayrollRunLine:
    if run.status not in ('confirmed', 'paid'):
        raise ValueError('Закрытие остатка доступно для confirmed run')
    text = (comment or '').strip()
    if not text:
        raise ValueError('Комментарий обязателен при закрытии с остатком')
    if line.remainder_closed_at is not None:
        raise ValueError('Остаток уже закрыт')
    if line.payout_status != 'partially_paid':
        raise ValueError('Закрыть с остатком можно только частично оплаченную строку')
    paid = await sum_payouts_for_line(db, line.id)
    remaining = _q(line.total_amount) - paid
    if remaining <= ZERO:
        raise ValueError('Остатка к закрытию нет')

    before = {
        'payout_status': line.payout_status,
        'total_amount': str(_q(line.total_amount)),
        'amount_paid': str(paid),
        'remainder_closed_at': None,
    }
    line.remainder_closed_at = closed_at
    line.remainder_closed_by = closed_by
    line.remainder_close_comment = text
    line.payout_status = 'paid'
    maybe_mark_run_paid(run)
    after = {
        'payout_status': line.payout_status,
        'total_amount': str(_q(line.total_amount)),
        'amount_paid': str(paid),
        'remainder_closed_at': closed_at.isoformat() if closed_at else None,
        'remainder_close_comment': text,
        'closed_remaining': str(remaining),
    }
    await log_change(
        db,
        org_id=org_id,
        entity_type='payroll_run_line',
        entity_id=line.id,
        action='update',
        changed_by=closed_by,
        before=before,
        after=after,
        summary=f'Закрытие остатка по строке начисления ({remaining} ₽): {text}',
    )
    return line


async def load_payout(db: AsyncSession, payout_id: UUID, org_id: UUID) -> PayrollPayout | None:
    result = await db.execute(
        select(PayrollPayout)
        .options(selectinload(PayrollPayout.employee))
        .where(PayrollPayout.id == payout_id, PayrollPayout.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def list_payouts_for_lines(
    db: AsyncSession,
    line_ids: list[UUID],
) -> dict[UUID, list[PayrollPayout]]:
    if not line_ids:
        return {}
    result = await db.execute(
        select(PayrollPayout)
        .options(selectinload(PayrollPayout.employee))
        .where(PayrollPayout.payroll_run_line_id.in_(line_ids))
        .order_by(PayrollPayout.payout_date.asc(), PayrollPayout.created_at.asc())
    )
    by_line: dict[UUID, list[PayrollPayout]] = {lid: [] for lid in line_ids}
    for payout in result.scalars().all():
        if payout.payroll_run_line_id is not None:
            by_line.setdefault(payout.payroll_run_line_id, []).append(payout)
    return by_line

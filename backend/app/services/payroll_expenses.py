"""Post/unpost payroll run lines to Expense (category=salary) — Prompt #4."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.payroll import PayrollPayout, PayrollRun, PayrollRunLine

SALARY_CATEGORY = 'salary'


def format_payroll_expense_description(
    period_start: date,
    period_end: date,
    employee_name: str,
) -> str:
    start = period_start.strftime('%d.%m.%Y')
    end = period_end.strftime('%d.%m.%Y')
    name = (employee_name or '').strip() or 'сотрудник'
    return f'Начисление ЗП за {start}–{end} — {name}'


async def payroll_run_has_payouts(
    db: AsyncSession,
    *,
    line_ids: list[UUID],
) -> bool:
    """True if any payroll_payouts row references the given lines."""
    if not line_ids:
        return False
    found = await db.scalar(
        select(PayrollPayout.id)
        .where(PayrollPayout.payroll_run_line_id.in_(line_ids))
        .limit(1)
    )
    return found is not None


async def post_confirmed_run_expenses(
    db: AsyncSession,
    *,
    run: PayrollRun,
    confirmed_at: datetime,
    created_by: UUID | None,
) -> int:
    """Create one Expense per line. Skips lines that already have a linked expense.

    Expense.date is the payroll period end (not confirm day) so «Затраты» date
    filters match the accrual period shown in payroll UI.

    Returns number of newly created expense rows.
    """
    # confirmed_at retained for call-site compatibility; date follows accrual period.
    _ = confirmed_at
    expense_date = run.period_end
    created = 0
    for line in run.lines or []:
        existing_id = await db.scalar(
            select(Expense.id).where(Expense.payroll_run_line_id == line.id)
        )
        if existing_id is not None:
            continue
        employee_name = ''
        if line.employee is not None:
            employee_name = line.employee.full_name
        description = format_payroll_expense_description(
            run.period_start,
            run.period_end,
            employee_name,
        )
        db.add(
            Expense(
                org_id=run.org_id,
                date=expense_date,
                category=SALARY_CATEGORY,
                amount=Decimal(str(line.total_amount or 0)),
                description=description,
                employee_id=line.employee_id,
                payroll_run_line_id=line.id,
                created_by=created_by,
            )
        )
        created += 1
    return created


async def delete_run_payroll_expenses(
    db: AsyncSession,
    *,
    line_ids: list[UUID],
) -> int:
    """Hard-delete Expense rows linked to the given payroll_run_line ids."""
    if not line_ids:
        return 0
    result = await db.execute(
        select(Expense).where(Expense.payroll_run_line_id.in_(line_ids))
    )
    rows = list(result.scalars().all())
    for expense in rows:
        await db.delete(expense)
    return len(rows)


async def unconfirm_payroll_run(
    db: AsyncSession,
    *,
    run: PayrollRun,
) -> None:
    """confirmed → draft: delete salary expenses if no payouts exist."""
    if run.status != 'confirmed':
        raise ValueError('Отменить подтверждение можно только для статуса confirmed')
    line_ids = [line.id for line in (run.lines or [])]
    if await payroll_run_has_payouts(db, line_ids=line_ids):
        raise ValueError(
            'Нельзя отменить начисление — по нему уже зафиксирована выдача'
        )
    await delete_run_payroll_expenses(db, line_ids=line_ids)
    run.status = 'draft'
    run.confirmed_by = None
    run.confirmed_at = None


async def crosscheck_salary_expenses_vs_confirmed_lines(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
) -> dict[str, Decimal | bool | str]:
    """QA helper: salary expenses with payroll_run_line_id vs confirmed lines.

    Matches expenses linked to lines of confirmed/paid runs whose period
    overlaps [period_start, period_end]. Expense.date filter is not used —
    linkage via payroll_run_line_id is the source of truth.
    """
    line_ids_subq = (
        select(PayrollRunLine.id)
        .join(PayrollRun, PayrollRun.id == PayrollRunLine.payroll_run_id)
        .where(
            PayrollRun.org_id == org_id,
            PayrollRun.status.in_(('confirmed', 'paid')),
            PayrollRun.period_start <= period_end,
            PayrollRun.period_end >= period_start,
        )
    )
    lines_sum = await db.scalar(
        select(func.coalesce(func.sum(PayrollRunLine.total_amount), 0)).where(
            PayrollRunLine.id.in_(line_ids_subq)
        )
    )
    expenses_sum = await db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.org_id == org_id,
            Expense.category == SALARY_CATEGORY,
            Expense.payroll_run_line_id.in_(line_ids_subq),
        )
    )
    lines_total = Decimal(str(lines_sum or 0)).quantize(Decimal('0.01'))
    expenses_total = Decimal(str(expenses_sum or 0)).quantize(Decimal('0.01'))
    return {
        'period_start': period_start.isoformat(),
        'period_end': period_end.isoformat(),
        'confirmed_lines_total': lines_total,
        'salary_expenses_total': expenses_total,
        'match': lines_total == expenses_total,
    }

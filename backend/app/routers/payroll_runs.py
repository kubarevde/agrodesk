"""Payroll runs API (Prompt #3)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.payroll import PayrollAdjustment, PayrollRun, PayrollRunLine
from app.schemas.payroll import (
    CloseRemainderRequest,
    PayrollAdjustmentCreate,
    PayrollAdjustmentResponse,
    PayrollAdvanceOnRunCreate,
    PayrollPayoutCreate,
    PayrollPayoutResponse,
    PayrollRunCreate,
    PayrollRunLineResponse,
    PayrollRunResponse,
    PayoutSheetLineResponse,
    PayoutSheetResponse,
)
from app.services.action_permissions import (
    employee_has_action,
    require_action,
    resolve_effective_permissions,
)
from app.services.dashboard import clear_dashboard_cache
from app.services.org_timezone import now_in_org
from app.services.payroll import (
    assert_no_period_overlap,
    get_run_with_details,
    populate_run_lines,
    recompute_line_totals,
    resolve_adjustment_sign,
)
from app.services.payroll_expenses import (
    post_confirmed_run_expenses,
    unconfirm_payroll_run,
)
from app.services.payroll_payouts import (
    assert_run_lines_mutable,
    close_line_remainder,
    create_advance_on_line,
    create_linked_payout,
    list_payouts_for_lines,
    list_unlinked_advances_for_run,
    maybe_mark_run_paid,
    payout_status_for_amounts,
    sum_payouts_for_line,
)
from app.routers.payroll_payouts import payout_to_response

router = APIRouter()


def _money(value: Decimal | None) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal('0.01'))


def adjustment_to_response(adj: PayrollAdjustment) -> PayrollAdjustmentResponse:
    return PayrollAdjustmentResponse(
        id=adj.id,
        payroll_run_line_id=adj.payroll_run_line_id,
        type=adj.type,  # type: ignore[arg-type]
        amount=adj.amount,
        sign=int(adj.sign),
        comment=adj.comment,
        created_by=adj.created_by,
        created_at=adj.created_at,
    )


def line_to_response(
    line: PayrollRunLine,
    *,
    amount_paid: Decimal | None = None,
    amount_advance: Decimal | None = None,
    amount_salary_paid: Decimal | None = None,
) -> PayrollRunLineResponse:
    employee = line.employee
    paid = _money(amount_paid if amount_paid is not None else Decimal('0'))
    advance = _money(amount_advance if amount_advance is not None else Decimal('0'))
    salary_paid = _money(
        amount_salary_paid if amount_salary_paid is not None else max(paid - advance, Decimal('0'))
    )
    total = _money(line.total_amount)
    closed = line.remainder_closed_at is not None
    remainder = Decimal('0.00') if closed else max(total - paid, Decimal('0.00'))
    exceeds = paid > total
    return PayrollRunLineResponse(
        id=line.id,
        payroll_run_id=line.payroll_run_id,
        employee_id=line.employee_id,
        employee_name=(employee.full_name if employee else '') or 'Сотрудник недоступен',
        employee_code=(employee.employee_code if employee else '') or '—',
        payment_scheme=line.payment_scheme,  # type: ignore[arg-type]
        base_calculated_amount=line.base_calculated_amount,
        adjustments_total=line.adjustments_total,
        total_amount=line.total_amount,
        source_breakdown=dict(line.source_breakdown or {}),
        payout_status=line.payout_status,  # type: ignore[arg-type]
        amount_paid=paid,
        amount_advance=advance,
        amount_salary_paid=salary_paid,
        remainder_amount=remainder,
        remainder_closed=closed,
        remainder_close_comment=line.remainder_close_comment,
        paid_exceeds_accrued=exceeds,
        adjustments=[adjustment_to_response(a) for a in (line.adjustments or [])],
    )


async def enrich_lines_with_paid(
    db: AsyncSession,
    lines: list[PayrollRunLine],
) -> list[PayrollRunLineResponse]:
    by_line = await list_payouts_for_lines(db, [line.id for line in lines])
    result: list[PayrollRunLineResponse] = []
    for line in lines:
        payouts = by_line.get(line.id, [])
        paid = _money(sum((_money(p.amount_paid) for p in payouts), Decimal('0')))
        advance = _money(
            sum(
                (
                    _money(p.amount_paid)
                    for p in payouts
                    if str(getattr(p, 'payout_kind', 'salary_payment')) == 'advance'
                ),
                Decimal('0'),
            )
        )
        salary_paid = _money(paid - advance)
        result.append(
            line_to_response(
                line,
                amount_paid=paid,
                amount_advance=advance,
                amount_salary_paid=salary_paid,
            )
        )
    return result


async def run_to_response(
    db: AsyncSession,
    run: PayrollRun,
    *,
    include_unlinked: bool = False,
) -> PayrollRunResponse:
    lines = await enrich_lines_with_paid(db, list(run.lines or []))
    total = sum((_money(line.total_amount) for line in lines), Decimal('0.00'))
    total_paid = sum((_money(line.amount_paid) for line in lines), Decimal('0.00'))
    remainder = max(total - total_paid, Decimal('0.00'))
    exceeds = any(line.paid_exceeds_accrued for line in lines)
    unlinked: list[PayrollPayoutResponse] = []
    if include_unlinked:
        advances = await list_unlinked_advances_for_run(db, org_id=run.org_id, run=run)
        unlinked = [payout_to_response(p) for p in advances]
    return PayrollRunResponse(
        id=run.id,
        org_id=run.org_id,
        period_start=run.period_start,
        period_end=run.period_end,
        status=run.status,  # type: ignore[arg-type]
        created_by=run.created_by,
        created_at=run.created_at,
        confirmed_by=run.confirmed_by,
        confirmed_at=run.confirmed_at,
        lines=lines,
        lines_count=len(lines),
        total_amount=_money(total),
        total_paid=_money(total_paid),
        remainder_amount=_money(remainder),
        paid_exceeds_accrued=exceeds,
        unlinked_advances=unlinked,
    )

def require_draft(run: PayrollRun) -> None:
    if run.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Изменения доступны только для черновика (draft)',
        )


async def can_view_all_payroll(db: AsyncSession, current: Employee) -> bool:
    """Org-wide payroll visibility. No employee hierarchy in employees API —
    without payroll.view_all a manager only sees their own lines.
    """
    if current.role.value == 'admin':
        return True
    effective = await resolve_effective_permissions(db, current)
    return employee_has_action(effective, 'payroll.view_all')


async def run_to_response_for_viewer(
    db: AsyncSession,
    run: PayrollRun,
    current: Employee,
    *,
    include_unlinked: bool = False,
) -> PayrollRunResponse:
    response = await run_to_response(db, run, include_unlinked=include_unlinked)
    if await can_view_all_payroll(db, current):
        return response
    own_lines = [line for line in response.lines if line.employee_id == current.id]
    total = sum((_money(line.total_amount) for line in own_lines), Decimal('0.00'))
    return response.model_copy(
        update={
            'lines': own_lines,
            'lines_count': len(own_lines),
            'total_amount': _money(total),
        }
    )


@router.get('', response_model=list[PayrollRunResponse])
async def list_payroll_runs(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> list[PayrollRunResponse]:
    org_id = get_org_id(request)
    result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.adjustments),
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.employee),
        )
        .where(PayrollRun.org_id == org_id)
        .order_by(PayrollRun.period_start.desc())
    )
    runs = result.scalars().unique().all()
    return [await run_to_response_for_viewer(db, run, current) for run in runs]


@router.get('/{run_id}', response_model=PayrollRunResponse)
async def get_payroll_run(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PayrollRunResponse:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    return await run_to_response_for_viewer(db, run, current)


@router.post('', response_model=PayrollRunResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll_run(
    request: Request,
    payload: PayrollRunCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PayrollRunResponse:
    org_id = get_org_id(request)
    try:
        await assert_no_period_overlap(
            db,
            org_id=org_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    run = PayrollRun(
        org_id=org_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        status='draft',
        created_by=current.id,
    )
    db.add(run)
    await db.flush()
    await populate_run_lines(db, run)
    await db.commit()
    loaded = await get_run_with_details(db, run.id, org_id)
    assert loaded is not None
    # After draft calc — surface unlinked advances for manual linking.
    return await run_to_response(db, loaded, include_unlinked=True)


@router.post('/{run_id}/recalculate', response_model=PayrollRunResponse)
async def recalculate_payroll_run(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> PayrollRunResponse:
    """Rebuild line bases from shifts/piecework/rates; keep manual adjustments."""
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    require_draft(run)
    # Linked advances/payouts are re-attached after rebuild (preserve_adjustments).
    # Confirmed/paid runs are already blocked by require_draft.
    await populate_run_lines(db, run, preserve_adjustments=True)
    await db.commit()
    loaded = await get_run_with_details(db, run_id, org_id)
    assert loaded is not None
    return await run_to_response(db, loaded, include_unlinked=True)


@router.post('/{run_id}/confirm', response_model=PayrollRunResponse)
async def confirm_payroll_run(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.confirm')),
) -> PayrollRunResponse:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    if run.status == 'confirmed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Начисление уже подтверждено',
        )
    if run.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Подтвердить можно только черновик',
        )
    by_line_pre = await list_payouts_for_lines(db, [line.id for line in run.lines or []])
    for line in run.lines or []:
        paid = _money(
            sum((_money(p.amount_paid) for p in by_line_pre.get(line.id, [])), Decimal('0'))
        )
        if paid > _money(line.total_amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    'По сотруднику уже выдано больше, чем начислено после пересчёта. '
                    'Проверьте смены, ставки, корректировки и ранее выданные суммы'
                ),
            )
    now = await now_in_org(db, org_id)
    run.status = 'confirmed'
    run.confirmed_by = current.id
    run.confirmed_at = now
    # Linked advances during draft must refresh payout_status after confirm.
    by_line = await list_payouts_for_lines(db, [line.id for line in run.lines or []])
    for line in run.lines or []:
        paid = sum(
            (Decimal(str(p.amount_paid or 0)) for p in by_line.get(line.id, [])),
            Decimal('0'),
        ).quantize(Decimal('0.01'))
        line.payout_status = payout_status_for_amounts(
            total=_money(line.total_amount),
            paid=paid,
            remainder_closed=line.remainder_closed_at is not None,
        )
    maybe_mark_run_paid(run)
    await post_confirmed_run_expenses(
        db,
        run=run,
        confirmed_at=now,
        created_by=current.id,
    )
    await db.commit()
    clear_dashboard_cache()
    loaded = await get_run_with_details(db, run_id, org_id)
    assert loaded is not None
    return await run_to_response_for_viewer(db, loaded, current)


@router.post('/{run_id}/unconfirm', response_model=PayrollRunResponse)
async def unconfirm_payroll_run_endpoint(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.confirm')),
) -> PayrollRunResponse:
    """confirmed → draft: remove salary Expenses unless payouts exist."""
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    try:
        await unconfirm_payroll_run(db, run=run)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    clear_dashboard_cache()
    loaded = await get_run_with_details(db, run_id, org_id)
    assert loaded is not None
    return await run_to_response_for_viewer(db, loaded, current)


@router.post(
    '/{run_id}/lines/{line_id}/adjustments',
    response_model=PayrollAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_adjustment(
    request: Request,
    run_id: UUID,
    line_id: UUID,
    payload: PayrollAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PayrollAdjustmentResponse:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    require_draft(run)
    line = next((row for row in run.lines if row.id == line_id), None)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Строка начисления не найдена')

    try:
        sign = resolve_adjustment_sign(payload.type, payload.sign)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    adj = PayrollAdjustment(
        payroll_run_line_id=line.id,
        type=payload.type,
        amount=payload.amount,
        sign=sign,
        comment=payload.comment,
        created_by=current.id,
    )
    db.add(adj)
    await db.flush()
    line.adjustments.append(adj)
    recompute_line_totals(line)
    await db.commit()
    await db.refresh(adj)
    return adjustment_to_response(adj)


@router.delete(
    '/{run_id}/lines/{line_id}/adjustments/{adjustment_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_adjustment(
    request: Request,
    run_id: UUID,
    line_id: UUID,
    adjustment_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> Response:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    require_draft(run)
    line = next((row for row in run.lines if row.id == line_id), None)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Строка начисления не найдена')
    adj = next((row for row in line.adjustments if row.id == adjustment_id), None)
    if adj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Корректировка не найдена')
    await db.delete(adj)
    await db.flush()
    line.adjustments = [row for row in line.adjustments if row.id != adjustment_id]
    recompute_line_totals(line)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    '/{run_id}/advances',
    response_model=PayrollPayoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_run_advance(
    request: Request,
    run_id: UUID,
    payload: PayrollAdvanceOnRunCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.pay')),
) -> PayrollPayoutResponse:
    """Issue an advance from a draft/confirmed payroll run card (primary UX)."""
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    # Prefer first chronological line for the employee (scheme segments stay transparent).
    employee_lines = [
        line for line in (run.lines or []) if line.employee_id == payload.employee_id
    ]
    if not employee_lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник отсутствует в этом начислении',
        )
    line = sorted(employee_lines, key=lambda row: str(row.id))[0]
    try:
        payout = await create_advance_on_line(
            db,
            org_id=org_id,
            run=run,
            line=line,
            amount_paid=payload.amount_paid,
            payout_method=payload.payout_method,
            payout_date=payload.payout_date,
            comment=payload.comment,
            confirmed_by=current.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    from app.services.payroll_payouts import load_payout

    loaded = await load_payout(db, payout.id, org_id)
    assert loaded is not None
    return payout_to_response(loaded)


@router.post(
    '/{run_id}/lines/{line_id}/payouts',
    response_model=PayrollPayoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_line_payout(
    request: Request,
    run_id: UUID,
    line_id: UUID,
    payload: PayrollPayoutCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.pay')),
) -> PayrollPayoutResponse:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    line = next((row for row in run.lines if row.id == line_id), None)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Строка начисления не найдена')
    try:
        payout = await create_linked_payout(
            db,
            org_id=org_id,
            run=run,
            line=line,
            amount_paid=payload.amount_paid,
            payout_method=payload.payout_method,
            payout_date=payload.payout_date,
            comment=payload.comment,
            confirmed_by=current.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    from app.services.payroll_payouts import load_payout

    loaded = await load_payout(db, payout.id, org_id)
    assert loaded is not None
    return payout_to_response(loaded)


@router.post(
    '/{run_id}/lines/{line_id}/close-remainder',
    response_model=PayrollRunLineResponse,
)
async def close_remainder(
    request: Request,
    run_id: UUID,
    line_id: UUID,
    payload: CloseRemainderRequest,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.pay')),
) -> PayrollRunLineResponse:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    line = next((row for row in run.lines if row.id == line_id), None)
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Строка начисления не найдена')
    now = await now_in_org(db, org_id)
    try:
        await close_line_remainder(
            db,
            org_id=org_id,
            run=run,
            line=line,
            comment=payload.comment,
            closed_by=current.id,
            closed_at=now,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    paid = await sum_payouts_for_line(db, line.id)
    return line_to_response(line, amount_paid=paid)


@router.get('/{run_id}/payout-sheet', response_model=PayoutSheetResponse)
async def get_payout_sheet(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PayoutSheetResponse:
    """Timesheet for confirmed/paid run.

    Viewing: manager with payroll.pay or payroll.view_all (admin always).
    Mutating payouts still require payroll.pay on POST endpoints.
    """
    org_id = get_org_id(request)
    if current.role.value != 'admin':
        effective = await resolve_effective_permissions(db, current)
        can_view = employee_has_action(effective, 'payroll.pay') or employee_has_action(
            effective, 'payroll.view_all'
        )
        if not can_view:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Нужно право payroll.pay или payroll.view_all',
            )
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    if run.status not in ('confirmed', 'paid'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Табель выдачи доступен для confirmed или paid run',
        )
    by_line = await list_payouts_for_lines(db, [line.id for line in run.lines or []])
    sheet_lines: list[PayoutSheetLineResponse] = []
    for line in run.lines or []:
        payouts = by_line.get(line.id, [])
        paid = _money(sum((_money(p.amount_paid) for p in payouts), Decimal('0')))
        total = _money(line.total_amount)
        closed = line.remainder_closed_at is not None
        remainder = Decimal('0.00') if closed else max(total - paid, Decimal('0.00'))
        employee = line.employee
        sheet_lines.append(
            PayoutSheetLineResponse(
                line_id=line.id,
                employee_id=line.employee_id,
                employee_name=employee.full_name if employee else '',
                employee_code=employee.employee_code if employee else '',
                payment_scheme=line.payment_scheme,  # type: ignore[arg-type]
                total_amount=total,
                amount_paid=paid,
                remainder_amount=remainder,
                payout_status=line.payout_status,  # type: ignore[arg-type]
                remainder_closed=closed,
                remainder_close_comment=line.remainder_close_comment,
                payouts=[payout_to_response(p) for p in payouts],
            )
        )
    return PayoutSheetResponse(
        run_id=run.id,
        period_start=run.period_start,
        period_end=run.period_end,
        status=run.status,  # type: ignore[arg-type]
        lines=sheet_lines,
    )


@router.delete(
    '/{run_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_payroll_run(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> Response:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    if run.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Удалить можно только черновик',
        )
    try:
        await assert_run_lines_mutable(db, run)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.delete(run)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

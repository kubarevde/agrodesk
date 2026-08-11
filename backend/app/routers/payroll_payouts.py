"""Payroll payouts API (Prompt #6): advances and link to run lines."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.payroll import PayrollPayout, PayrollRun, PayrollRunLine
from app.schemas.payroll import (
    PayrollAdvanceCreate,
    PayrollPayoutLinkRequest,
    PayrollPayoutResponse,
)
from app.services.action_permissions import require_action
from app.services.payroll import get_run_with_details
from app.services.payroll_payouts import (
    create_advance_payout,
    link_advance_to_line,
    list_unlinked_advances_for_run,
    load_payout,
)

router = APIRouter()


def payout_to_response(payout: PayrollPayout) -> PayrollPayoutResponse:
    employee = payout.employee
    kind = getattr(payout, 'payout_kind', None) or (
        'advance' if payout.payroll_run_line_id is None else 'salary_payment'
    )
    return PayrollPayoutResponse(
        id=payout.id,
        org_id=payout.org_id,
        payroll_run_line_id=payout.payroll_run_line_id,
        employee_id=payout.employee_id,
        employee_name=employee.full_name if employee else '',
        employee_code=employee.employee_code if employee else '',
        amount_paid=payout.amount_paid,
        payout_method=payout.payout_method,  # type: ignore[arg-type]
        payout_kind=kind,  # type: ignore[arg-type]
        payout_date=payout.payout_date,
        confirmed_by=payout.confirmed_by,
        comment=payout.comment,
        advance_period_hint=payout.advance_period_hint,
        created_at=payout.created_at,
    )


@router.post(
    '/advances',
    response_model=PayrollPayoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_advance(
    request: Request,
    payload: PayrollAdvanceCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.pay')),
) -> PayrollPayoutResponse:
    org_id = get_org_id(request)
    try:
        payout = await create_advance_payout(
            db,
            org_id=org_id,
            employee_id=payload.employee_id,
            amount_paid=payload.amount_paid,
            payout_method=payload.payout_method,
            payout_date=payload.payout_date,
            comment=payload.comment,
            confirmed_by=current.id,
            advance_period_hint=payload.advance_period_hint,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    loaded = await load_payout(db, payout.id, org_id)
    assert loaded is not None
    return payout_to_response(loaded)


@router.post('/{payout_id}/link', response_model=PayrollPayoutResponse)
async def link_advance(
    request: Request,
    payout_id: UUID,
    payload: PayrollPayoutLinkRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('payroll.pay')),
) -> PayrollPayoutResponse:
    org_id = get_org_id(request)
    payout = await load_payout(db, payout_id, org_id)
    if payout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Выдача не найдена')

    result = await db.execute(
        select(PayrollRunLine)
        .options(selectinload(PayrollRunLine.payroll_run).selectinload(PayrollRun.lines))
        .where(PayrollRunLine.id == payload.payroll_run_line_id)
    )
    line = result.scalar_one_or_none()
    if line is None or line.payroll_run is None or line.payroll_run.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Строка начисления не найдена',
        )
    try:
        await link_advance_to_line(
            db,
            org_id=org_id,
            payout=payout,
            line=line,
            run=line.payroll_run,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    loaded = await load_payout(db, payout_id, org_id)
    assert loaded is not None
    return payout_to_response(loaded)


@router.get('/unlinked', response_model=list[PayrollPayoutResponse])
async def list_unlinked_for_run(
    request: Request,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('payroll.pay')),
) -> list[PayrollPayoutResponse]:
    org_id = get_org_id(request)
    run = await get_run_with_details(db, run_id, org_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Начисление не найдено')
    advances = await list_unlinked_advances_for_run(db, org_id=org_id, run=run)
    return [payout_to_response(p) for p in advances]

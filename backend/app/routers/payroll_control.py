"""Payroll control & reporting API (read-only aggregates + Excel)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.routers.payroll_runs import can_view_all_payroll
from app.services.payroll_control import (
    build_accruals_export_workbook,
    build_advances_export_workbook,
    build_payouts_export_workbook,
    build_payroll_control_summary,
)
from app.services.reports import workbook_response

router = APIRouter()


class PeriodBody(BaseModel):
    period_start: date = Field(..., description='Inclusive start')
    period_end: date = Field(..., description='Inclusive end')


async def _require_payroll_view_all(
    db: AsyncSession,
    current: Employee,
) -> None:
    if not await can_view_all_payroll(db, current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Нужно право видеть начисления всех сотрудников',
        )


def _validate_period(period_start: date, period_end: date) -> None:
    if period_end < period_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Дата начала не может быть позже даты окончания',
        )


@router.get('/summary')
async def payroll_control_summary(
    request: Request,
    period_start: date = Query(...),
    period_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> dict:
    _validate_period(period_start, period_end)
    await _require_payroll_view_all(db, current)
    org_id = get_org_id(request)
    return await build_payroll_control_summary(
        db,
        org_id=org_id,
        period_start=period_start,
        period_end=period_end,
    )


@router.post('/export/accruals')
async def export_accruals_registry(
    request: Request,
    payload: PeriodBody,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
):
    _validate_period(payload.period_start, payload.period_end)
    await _require_payroll_view_all(db, current)
    org_id = get_org_id(request)
    wb = await build_accruals_export_workbook(
        db,
        org_id=org_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    name = f'payroll_accruals_{payload.period_start}_{payload.period_end}.xlsx'
    return workbook_response(wb, name)


@router.post('/export/payouts')
async def export_payouts_sheet(
    request: Request,
    payload: PeriodBody,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
):
    _validate_period(payload.period_start, payload.period_end)
    await _require_payroll_view_all(db, current)
    org_id = get_org_id(request)
    wb = await build_payouts_export_workbook(
        db,
        org_id=org_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    name = f'payroll_payouts_{payload.period_start}_{payload.period_end}.xlsx'
    return workbook_response(wb, name)


@router.post('/export/advances')
async def export_advances_registry(
    request: Request,
    payload: PeriodBody,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
):
    _validate_period(payload.period_start, payload.period_end)
    await _require_payroll_view_all(db, current)
    org_id = get_org_id(request)
    wb = await build_advances_export_workbook(
        db,
        org_id=org_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    name = f'payroll_advances_{payload.period_start}_{payload.period_end}.xlsx'
    return workbook_response(wb, name)

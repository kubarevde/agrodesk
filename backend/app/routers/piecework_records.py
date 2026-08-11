"""Standalone piecework output records (Prompt #2)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee, EmployeeRole
from app.models.piecework_record import PieceworkRecord
from app.models.reference import WorkType
from app.models.shift import Shift
from app.schemas.piecework import PieceworkRecordCreate, PieceworkRecordResponse
from app.services.salary import create_piecework_record, get_rate_for_shift, resolve_payment_scheme

router = APIRouter()


def record_to_response(record: PieceworkRecord) -> PieceworkRecordResponse:
    return PieceworkRecordResponse(
        id=record.id,
        employee_id=record.employee_id,
        shift_id=record.shift_id,
        work_type_id=record.work_type_id,
        quantity=record.quantity,
        unit=record.unit,
        date=record.date,
        rate_applied=record.rate_applied,
        calculated_amount=record.calculated_amount,
    )


@router.post('', response_model=PieceworkRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_piecework(
    request: Request,
    payload: PieceworkRecordCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> PieceworkRecordResponse:
    """Create piecework output without closing a shift (or attach to an existing one)."""
    org_id = get_org_id(request)

    if (
        payload.employee_id != current.id
        and current.role not in (EmployeeRole.manager, EmployeeRole.admin)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    employee = await db.get(Employee, payload.employee_id)
    if employee is None or employee.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сотрудник не найден')

    work_type = await db.get(WorkType, payload.work_type_id)
    if work_type is None or work_type.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Тип работ не найден')

    if payload.shift_id is not None:
        shift = await db.get(Shift, payload.shift_id)
        if shift is None or shift.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Смена не найдена')
        if shift.employee_id != payload.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Смена принадлежит другому сотруднику',
            )

    rate_obj, _source = await get_rate_for_shift(
        db,
        payload.employee_id,
        payload.work_type_id,
        payload.date,
        org_id=org_id,
    )
    scheme = resolve_payment_scheme(rate_obj)
    if scheme != 'piecework' or rate_obj is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='На указанную дату у сотрудника нет активной сдельной ставки для этого вида работ',
        )

    record = create_piecework_record(
        org_id=org_id,
        employee_id=payload.employee_id,
        work_type_id=payload.work_type_id,
        quantity=payload.quantity,
        unit=payload.unit,
        work_date=payload.date,
        rate_applied=Decimal(str(rate_obj.rate)),
        created_by=current.id,
        shift_id=payload.shift_id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record_to_response(record)


@router.get('', response_model=list[PieceworkRecordResponse])
async def list_piecework(
    request: Request,
    employee_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[PieceworkRecordResponse]:
    org_id = get_org_id(request)
    query = select(PieceworkRecord).where(PieceworkRecord.org_id == org_id)
    if employee_id is not None:
        query = query.where(PieceworkRecord.employee_id == employee_id)
    result = await db.execute(query.order_by(PieceworkRecord.date.desc(), PieceworkRecord.created_at.desc()))
    return [record_to_response(row) for row in result.scalars().all()]

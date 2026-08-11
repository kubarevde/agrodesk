from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.employee_rate import EmployeeRate
from app.models.reference import WorkType
from app.schemas.employee_rate import (
    EmployeeRateCreate,
    EmployeeRateResponse,
    EmployeeRateUpdate,
    RatePreviewResponse,
    validate_rate_scheme_fields,
)
from app.services.action_permissions import require_action
from app.services.audit import log_change, model_snapshot
from app.services.salary import calculate_amount, get_rate_for_shift

router = APIRouter()


def rate_load_options():
    return (
        selectinload(EmployeeRate.employee),
        selectinload(EmployeeRate.work_type),
    )


def rate_to_response(rate: EmployeeRate) -> EmployeeRateResponse:
    return EmployeeRateResponse(
        id=rate.id,
        employee_id=rate.employee_id,
        employee_name=rate.employee.full_name if rate.employee else '',
        work_type_id=rate.work_type_id,
        work_type_name=rate.work_type.name if rate.work_type else None,
        payment_scheme=rate.payment_scheme or 'hourly',
        piecework_unit=rate.piecework_unit,
        rate=rate.rate,
        overtime_multiplier=rate.overtime_multiplier,
        overtime_threshold_hours=rate.overtime_threshold_hours,
        valid_from=rate.valid_from,
        valid_to=rate.valid_to,
        notes=rate.notes,
    )


async def get_rate_or_404(db: AsyncSession, rate_id: UUID, org_id: UUID) -> EmployeeRate:
    result = await db.execute(
        select(EmployeeRate)
        .options(*rate_load_options())
        .where(EmployeeRate.id == rate_id, EmployeeRate.org_id == org_id)
    )
    rate = result.scalar_one_or_none()
    if rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ставка не найдена')
    return rate


def _work_type_match(work_type_id: UUID | None):
    if work_type_id is None:
        return EmployeeRate.work_type_id.is_(None)
    return EmployeeRate.work_type_id == work_type_id


async def assert_no_overlap(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
    work_type_id: UUID | None,
    valid_from: date,
    valid_to: date | None,
    exclude_id: UUID | None = None,
) -> None:
    if valid_to is not None and valid_to < valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='valid_to не может быть раньше valid_from',
        )

    query = select(EmployeeRate).where(
        EmployeeRate.org_id == org_id,
        EmployeeRate.employee_id == employee_id,
        _work_type_match(work_type_id),
        EmployeeRate.valid_from <= (valid_to or date.max),
        or_(
            EmployeeRate.valid_to.is_(None),
            EmployeeRate.valid_to >= valid_from,
        ),
    )
    if exclude_id is not None:
        query = query.where(EmployeeRate.id != exclude_id)

    result = await db.execute(query.limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Период ставки пересекается с существующей записью',
        )


async def close_previous_open_base_rates(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
    new_valid_from: date,
) -> None:
    """Close any open base rate (work_type_id IS NULL) before inserting a new base.

    Sets valid_to = new_valid_from - 1 day, regardless of previous payment_scheme.
    """
    close_to = new_valid_from - timedelta(days=1)
    result = await db.execute(
        select(EmployeeRate).where(
            EmployeeRate.org_id == org_id,
            EmployeeRate.employee_id == employee_id,
            EmployeeRate.work_type_id.is_(None),
            EmployeeRate.valid_to.is_(None),
        )
    )
    for prior in result.scalars().all():
        # Keep chronological sanity if prior started on/after new_valid_from.
        if prior.valid_from > close_to:
            prior.valid_to = prior.valid_from
        else:
            prior.valid_to = close_to
        db.add(prior)


async def get_org_employee(db: AsyncSession, employee_id: UUID, org_id: UUID) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сотрудник не найден')
    return employee


@router.get('', response_model=list[EmployeeRateResponse])
async def list_employee_rates(
    request: Request,
    employee_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[EmployeeRateResponse]:
    org_id = get_org_id(request)
    query = select(EmployeeRate).options(*rate_load_options()).where(EmployeeRate.org_id == org_id)
    if employee_id is not None:
        query = query.where(EmployeeRate.employee_id == employee_id)
    result = await db.execute(query.order_by(EmployeeRate.valid_from.desc()))
    return [rate_to_response(item) for item in result.scalars().all()]


@router.get('/calculate-preview', response_model=RatePreviewResponse)
async def calculate_preview(
    request: Request,
    employee_id: UUID = Query(...),
    hours: float = Query(..., ge=0),
    shift_date: date = Query(...),
    work_type_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> RatePreviewResponse:
    org_id = get_org_id(request)
    employee = await get_org_employee(db, employee_id, org_id)

    rate_obj, source = await get_rate_for_shift(
        db, employee_id, work_type_id, shift_date, org_id=org_id
    )
    calc = calculate_amount(hours, rate_obj, float(employee.hourly_rate or 0))
    return RatePreviewResponse(total=calc['total'], source=source, breakdown=calc)


@router.post('', response_model=EmployeeRateResponse, status_code=status.HTTP_201_CREATED)
async def create_employee_rate(
    request: Request,
    payload: EmployeeRateCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.manage_rates')),
) -> EmployeeRateResponse:
    org_id = get_org_id(request)
    await get_org_employee(db, payload.employee_id, org_id)
    if payload.work_type_id is not None:
        result = await db.execute(
            select(WorkType).where(
                WorkType.id == payload.work_type_id,
                WorkType.org_id == org_id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Тип работ не найден')

    # One open base rate per employee: close previous base rows first.
    if payload.work_type_id is None:
        await close_previous_open_base_rates(
            db,
            org_id=org_id,
            employee_id=payload.employee_id,
            new_valid_from=payload.valid_from,
        )

    await assert_no_overlap(
        db,
        org_id=org_id,
        employee_id=payload.employee_id,
        work_type_id=payload.work_type_id,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
    )

    rate = EmployeeRate(
        org_id=org_id,
        employee_id=payload.employee_id,
        work_type_id=payload.work_type_id,
        payment_scheme=payload.payment_scheme,
        piecework_unit=payload.piecework_unit,
        rate=payload.rate,
        overtime_multiplier=payload.overtime_multiplier,
        overtime_threshold_hours=payload.overtime_threshold_hours,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        notes=payload.notes,
        created_by=current.id,
    )
    db.add(rate)
    await db.flush()
    await log_change(db, org_id=org_id, entity_type='employee_rate', entity_id=rate.id,
                     action='create', changed_by=current.id, after=model_snapshot(rate))
    await db.commit()
    return rate_to_response(await get_rate_or_404(db, rate.id, org_id))


@router.patch('/{rate_id}', response_model=EmployeeRateResponse)
async def update_employee_rate(
    request: Request,
    rate_id: UUID,
    payload: EmployeeRateUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.manage_rates')),
) -> EmployeeRateResponse:
    org_id = get_org_id(request)
    rate = await get_rate_or_404(db, rate_id, org_id)
    before = model_snapshot(rate)
    data = payload.model_dump(exclude_unset=True)

    if 'work_type_id' in data and data['work_type_id'] is not None:
        result = await db.execute(
            select(WorkType).where(
                WorkType.id == data['work_type_id'],
                WorkType.org_id == org_id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Тип работ не найден')

    next_work_type_id = data['work_type_id'] if 'work_type_id' in data else rate.work_type_id
    next_scheme = data['payment_scheme'] if 'payment_scheme' in data else (rate.payment_scheme or 'hourly')
    next_unit = data['piecework_unit'] if 'piecework_unit' in data else rate.piecework_unit
    try:
        validate_rate_scheme_fields(
            payment_scheme=next_scheme,
            work_type_id=next_work_type_id,
            piecework_unit=next_unit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    next_from = data.get('valid_from', rate.valid_from)
    next_to = data['valid_to'] if 'valid_to' in data else rate.valid_to

    await assert_no_overlap(
        db,
        org_id=org_id,
        employee_id=rate.employee_id,
        work_type_id=next_work_type_id,
        valid_from=next_from,
        valid_to=next_to,
        exclude_id=rate.id,
    )

    for field, value in data.items():
        setattr(rate, field, value)

    db.add(rate)
    await log_change(db, org_id=org_id, entity_type='employee_rate', entity_id=rate.id,
                     action='update', changed_by=current.id, before=before, after=model_snapshot(rate))
    await db.commit()
    return rate_to_response(await get_rate_or_404(db, rate.id, org_id))


@router.delete('/{rate_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee_rate(
    request: Request,
    rate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('payroll.manage_rates')),
) -> None:
    rate = await get_rate_or_404(db, rate_id, get_org_id(request))
    before = model_snapshot(rate)
    await log_change(db, org_id=rate.org_id, entity_type='employee_rate', entity_id=rate.id,
                     action='delete', changed_by=current.id, before=before)
    await db.delete(rate)
    await db.commit()

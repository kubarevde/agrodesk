import calendar
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.models.agro_plan import AgroPlan
from app.models.employee import Employee
from app.models.implement import Implement
from app.models.reference import Equipment, Location, WorkType
from app.routers.fields import get_field_or_404
from app.schemas.agro_plan import AgroPlanCreate, AgroPlanResponse, AgroPlanUpdate

router = APIRouter()


def plan_load_options():
    return (
        selectinload(AgroPlan.location),
        selectinload(AgroPlan.work_type),
        selectinload(AgroPlan.equipment),
        selectinload(AgroPlan.implement),
        selectinload(AgroPlan.employee),
    )


def parse_month(month: str) -> tuple[date, date]:
    try:
        year_str, month_str = month.split('-', 1)
        year = int(year_str)
        mon = int(month_str)
        if mon < 1 or mon > 12:
            raise ValueError
        start = date(year, mon, 1)
        last_day = calendar.monthrange(year, mon)[1]
        return start, date(year, mon, last_day)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Некорректный параметр month, ожидается YYYY-MM',
        ) from exc


def plan_to_response(plan: AgroPlan) -> AgroPlanResponse:
    return AgroPlanResponse(
        id=plan.id,
        field_id=plan.location_id,
        work_type_id=plan.work_type_id,
        planned_date=plan.planned_date,
        planned_end_date=plan.planned_end_date,
        equipment_id=plan.equipment_id,
        implement_id=plan.implement_id,
        employee_id=plan.employee_id,
        notes=plan.notes,
        status=plan.status,
        field_name=plan.location.name if plan.location else '',
        work_type_name=plan.work_type.name if plan.work_type else '',
        equipment_name=plan.equipment.name if plan.equipment else None,
        implement_name=plan.implement.name if plan.implement else None,
        employee_name=plan.employee.full_name if plan.employee else None,
        actual_shift_id=plan.actual_shift_id,
    )


async def get_plan_or_404(db: AsyncSession, plan_id: UUID) -> AgroPlan:
    result = await db.execute(
        select(AgroPlan).options(*plan_load_options()).where(AgroPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='План не найден')
    return plan


async def validate_plan_refs(
    db: AsyncSession,
    *,
    field_id: UUID | None = None,
    work_type_id: UUID | None = None,
    equipment_id: UUID | None = None,
    implement_id: UUID | None = None,
    employee_id: UUID | None = None,
) -> None:
    if field_id is not None:
        await get_field_or_404(db, field_id)
    if work_type_id is not None:
        work_type = await db.get(WorkType, work_type_id)
        if work_type is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Тип работы не найден')
    if equipment_id is not None:
        equipment = await db.get(Equipment, equipment_id)
        if equipment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    if implement_id is not None:
        implement = await db.get(Implement, implement_id)
        if implement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Приспособление не найдено',
            )
    if employee_id is not None:
        employee = await db.get(Employee, employee_id)
        if employee is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сотрудник не найден')


@router.get('/today', response_model=list[AgroPlanResponse])
async def list_agro_plans_today(
    employee_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[AgroPlanResponse]:
    today = date.today()
    target_employee_id = employee_id or current.id
    query = (
        select(AgroPlan)
        .options(*plan_load_options())
        .where(
            AgroPlan.employee_id == target_employee_id,
            AgroPlan.status.in_(['planned', 'in_progress']),
            AgroPlan.planned_date <= today,
            or_(
                AgroPlan.planned_end_date.is_(None),
                AgroPlan.planned_end_date >= today,
            ),
        )
        .order_by(AgroPlan.planned_date.asc())
    )
    result = await db.execute(query)
    return [plan_to_response(item) for item in result.scalars().all()]


@router.get('', response_model=list[AgroPlanResponse])
async def list_agro_plans(
    month: str | None = Query(None),
    field_id: UUID | None = Query(None),
    employee_id: UUID | None = Query(None),
    planned_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[AgroPlanResponse]:
    query = select(AgroPlan).options(*plan_load_options())

    if month is not None:
        start, end = parse_month(month)
        # Overlap: plan starts on/before month end AND ends on/after month start
        query = query.where(
            AgroPlan.planned_date <= end,
            or_(
                and_(AgroPlan.planned_end_date.is_(None), AgroPlan.planned_date >= start),
                and_(
                    AgroPlan.planned_end_date.is_not(None),
                    AgroPlan.planned_end_date >= start,
                ),
            ),
        )
    if field_id is not None:
        query = query.where(AgroPlan.location_id == field_id)
    if employee_id is not None:
        query = query.where(AgroPlan.employee_id == employee_id)
    if planned_date is not None:
        query = query.where(
            AgroPlan.planned_date <= planned_date,
            or_(
                and_(AgroPlan.planned_end_date.is_(None), AgroPlan.planned_date == planned_date),
                and_(
                    AgroPlan.planned_end_date.is_not(None),
                    AgroPlan.planned_end_date >= planned_date,
                ),
            ),
        )

    query = query.order_by(AgroPlan.planned_date.asc())
    result = await db.execute(query)
    return [plan_to_response(item) for item in result.scalars().all()]


@router.post('', response_model=AgroPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_agro_plan(
    payload: AgroPlanCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> AgroPlanResponse:
    await validate_plan_refs(
        db,
        field_id=payload.field_id,
        work_type_id=payload.work_type_id,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        employee_id=payload.employee_id,
    )

    plan = AgroPlan(
        location_id=payload.field_id,
        work_type_id=payload.work_type_id,
        planned_date=payload.planned_date,
        planned_end_date=payload.planned_end_date,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        employee_id=payload.employee_id,
        notes=payload.notes,
        status='planned',
        created_by=current.id,
    )
    db.add(plan)
    await db.commit()
    return plan_to_response(await get_plan_or_404(db, plan.id))


@router.patch('/{plan_id}', response_model=AgroPlanResponse)
async def update_agro_plan(
    plan_id: UUID,
    payload: AgroPlanUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> AgroPlanResponse:
    plan = await get_plan_or_404(db, plan_id)
    update_data = payload.model_dump(exclude_unset=True)

    await validate_plan_refs(
        db,
        field_id=update_data.get('field_id'),
        work_type_id=update_data.get('work_type_id'),
        equipment_id=update_data.get('equipment_id'),
        implement_id=update_data.get('implement_id'),
        employee_id=update_data.get('employee_id'),
    )

    if 'field_id' in update_data:
        plan.location_id = update_data.pop('field_id')

    for field, value in update_data.items():
        setattr(plan, field, value)

    db.add(plan)
    await db.commit()
    return plan_to_response(await get_plan_or_404(db, plan.id))


@router.delete('/{plan_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_agro_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    plan = await get_plan_or_404(db, plan_id)
    await db.delete(plan)
    await db.commit()

import calendar
import logging
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.agro_plan import AgroPlan, AgroPlanField
from app.models.employee import Employee
from app.models.implement import Implement
from app.models.reference import Equipment, Location, WorkType
from app.routers.fields import get_field_or_404
from app.schemas.agro_plan import (
    AgroPlanCloseRequest,
    AgroPlanCreate,
    AgroPlanResponse,
    AgroPlanUpdate,
    AgroPlanWeatherAdvisoryResponse,
    WeatherAdvisoryOut,
)
from app.services.audit import log_change, model_snapshot
from app.services.weather.advisories import WeatherAdvisory
from app.services.weather.plan_advisories import advisories_for_plans, compute_plan_advisories

logger = logging.getLogger(__name__)
router = APIRouter()


def plan_load_options():
    return (
        selectinload(AgroPlan.location),
        selectinload(AgroPlan.fields).selectinload(AgroPlanField.location),
        selectinload(AgroPlan.work_type),
        selectinload(AgroPlan.equipment),
        selectinload(AgroPlan.implement),
        selectinload(AgroPlan.employee),
        selectinload(AgroPlan.closed_by_user),
    )


def mark_plan_closed(
    plan: AgroPlan,
    *,
    closed_by: UUID,
    status_value: str,
    note: str | None = None,
) -> None:
    plan.status = status_value
    plan.closed_by = closed_by
    plan.closed_at = datetime.now(timezone.utc)
    if note is not None:
        plan.close_note = note.strip() or None


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


def advisory_to_out(item: WeatherAdvisory) -> WeatherAdvisoryOut:
    return WeatherAdvisoryOut(
        code=item.code,
        severity=item.severity,
        title=item.title,
        message=item.message,
        date=date.fromisoformat(item.date),
        temp_min=item.temp_min,
        temp_max=item.temp_max,
        precipitation_mm=item.precipitation_mm,
        wind_speed_ms=item.wind_speed_ms,
    )


def plan_to_response(
    plan: AgroPlan,
    advisories: list[WeatherAdvisory] | None = None,
) -> AgroPlanResponse:
    field_ids = [item.location_id for item in plan.fields]
    field_names = [
        item.location.name if item.location else ''
        for item in plan.fields
    ]
    if not field_ids:
        field_ids = [plan.location_id]
        field_names = [plan.location.name if plan.location else '']

    closed_by_user = plan.__dict__.get('closed_by_user')
    return AgroPlanResponse(
        id=plan.id,
        field_id=field_ids[0],
        field_name=field_names[0] if field_names else '',
        field_ids=field_ids,
        field_names=field_names,
        work_type_id=plan.work_type_id,
        planned_date=plan.planned_date,
        planned_end_date=plan.planned_end_date,
        equipment_id=plan.equipment_id,
        implement_id=plan.implement_id,
        employee_id=plan.employee_id,
        notes=plan.notes,
        status=plan.status,
        entry_kind=getattr(plan, 'entry_kind', None) or 'plan',
        work_type_name=plan.work_type.name if plan.work_type else '',
        equipment_name=plan.equipment.name if plan.equipment else None,
        implement_name=plan.implement.name if plan.implement else None,
        employee_name=plan.employee.full_name if plan.employee else None,
        actual_shift_id=plan.actual_shift_id,
        closed_by=getattr(plan, 'closed_by', None),
        closed_by_name=closed_by_user.full_name if closed_by_user else None,
        closed_at=getattr(plan, 'closed_at', None),
        close_note=getattr(plan, 'close_note', None),
        advisories=[advisory_to_out(a) for a in (advisories or [])],
    )


async def plans_to_responses(
    plans: list[AgroPlan],
    *,
    include_advisories: bool = False,
) -> list[AgroPlanResponse]:
    if not include_advisories:
        return [plan_to_response(plan) for plan in plans]
    by_id = await advisories_for_plans(plans)
    return [plan_to_response(plan, by_id.get(plan.id)) for plan in plans]


async def plan_to_response_with_advisories(plan: AgroPlan) -> AgroPlanResponse:
    """Single-plan response including weather advisories (additive, online weather)."""
    items = await compute_plan_advisories(plan)
    return plan_to_response(plan, advisories=items)


async def get_plan_or_404(db: AsyncSession, plan_id: UUID, org_id: UUID) -> AgroPlan:
    result = await db.execute(
        select(AgroPlan)
        .join(Location, AgroPlan.location_id == Location.id)
        .options(*plan_load_options())
        .where(AgroPlan.id == plan_id, Location.org_id == org_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='План не найден')
    if plan.closed_by is not None and plan.__dict__.get('closed_by_user') is None:
        plan.closed_by_user = await db.get(Employee, plan.closed_by)
    return plan


async def validate_plan_refs(
    db: AsyncSession,
    org_id: UUID,
    *,
    field_ids: list[UUID] | None = None,
    work_type_id: UUID | None = None,
    equipment_id: UUID | None = None,
    implement_id: UUID | None = None,
    employee_id: UUID | None = None,
) -> None:
    if field_ids is not None:
        for field_id in field_ids:
            await get_field_or_404(db, field_id, org_id)
    if work_type_id is not None:
        work_type = await db.get(WorkType, work_type_id)
        if work_type is None or work_type.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Тип работы не найден')
    if equipment_id is not None:
        equipment = await db.get(Equipment, equipment_id)
        if equipment is None or equipment.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    if implement_id is not None:
        implement = await db.get(Implement, implement_id)
        if implement is None or implement.org_id != org_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Приспособление не найдено',
            )
    if employee_id is not None:
        employee = await db.get(Employee, employee_id)
        if employee is None or employee.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сотрудник не найден')


def set_plan_fields(plan: AgroPlan, field_ids: list[UUID]) -> None:
    plan.location_id = field_ids[0]
    rows: list[AgroPlanField] = []
    for field_id in field_ids:
        row = AgroPlanField(location_id=field_id)
        if getattr(plan, 'id', None) is not None:
            row.plan_id = plan.id
        rows.append(row)
    plan.fields = rows


@router.get('/today', response_model=list[AgroPlanResponse])
async def list_agro_plans_today(
    request: Request,
    employee_id: UUID | None = Query(None),
    include_advisories: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[AgroPlanResponse]:
    org_id = get_org_id(request)
    today = date.today()
    target_employee_id = employee_id or current.id
    query = (
        select(AgroPlan)
        .join(Location, AgroPlan.location_id == Location.id)
        .options(*plan_load_options())
        .where(
            Location.org_id == org_id,
            AgroPlan.entry_kind == 'plan',
            or_(
                AgroPlan.employee_id == target_employee_id,
                AgroPlan.employee_id.is_(None),
            ),
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
    plans = list(result.scalars().all())
    missing = [p.closed_by for p in plans if p.closed_by and p.__dict__.get('closed_by_user') is None]
    if missing:
        employees = await db.execute(select(Employee).where(Employee.id.in_(missing)))
        by_id = {emp.id: emp for emp in employees.scalars().all()}
        for plan in plans:
            if plan.closed_by and plan.__dict__.get('closed_by_user') is None:
                plan.closed_by_user = by_id.get(plan.closed_by)
    return await plans_to_responses(plans, include_advisories=include_advisories)


@router.get('', response_model=list[AgroPlanResponse])
async def list_agro_plans(
    request: Request,
    month: str | None = Query(None),
    field_id: UUID | None = Query(None),
    employee_id: UUID | None = Query(None),
    planned_date: date | None = Query(None),
    include_advisories: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[AgroPlanResponse]:
    org_id = get_org_id(request)
    query = (
        select(AgroPlan)
        .join(Location, AgroPlan.location_id == Location.id)
        .options(*plan_load_options())
        .where(Location.org_id == org_id)
    )

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
        query = query.where(
            or_(
                AgroPlan.location_id == field_id,
                exists(
                    select(AgroPlanField.plan_id).where(
                        AgroPlanField.plan_id == AgroPlan.id,
                        AgroPlanField.location_id == field_id,
                    )
                ),
            )
        )
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
    plans = list(result.scalars().unique().all())
    missing = [p.closed_by for p in plans if p.closed_by and p.__dict__.get('closed_by_user') is None]
    if missing:
        employees = await db.execute(select(Employee).where(Employee.id.in_(missing)))
        by_id = {emp.id: emp for emp in employees.scalars().all()}
        for plan in plans:
            if plan.closed_by and plan.__dict__.get('closed_by_user') is None:
                plan.closed_by_user = by_id.get(plan.closed_by)
    return await plans_to_responses(plans, include_advisories=include_advisories)


@router.post('', response_model=AgroPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_agro_plan(
    request: Request,
    payload: AgroPlanCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> AgroPlanResponse:
    org_id = get_org_id(request)
    await validate_plan_refs(
        db,
        org_id,
        field_ids=payload.field_ids,
        work_type_id=payload.work_type_id,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        employee_id=payload.employee_id,
    )

    # Deduplicate while preserving order
    seen: set[UUID] = set()
    field_ids: list[UUID] = []
    for field_id in payload.field_ids:
        if field_id not in seen:
            seen.add(field_id)
            field_ids.append(field_id)

    plan = AgroPlan(
        location_id=field_ids[0],
        work_type_id=payload.work_type_id,
        planned_date=payload.planned_date,
        planned_end_date=payload.planned_end_date,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        employee_id=payload.employee_id,
        notes=payload.notes,
        status='planned',
        entry_kind='plan',
        created_by=current.id,
    )
    # Assign junction rows while plan is still transient — assigning
    # plan.fields after flush triggers async lazy-load (MissingGreenlet).
    set_plan_fields(plan, field_ids)
    db.add(plan)
    logger.info(
        'POST /api/agro-plan create field_ids=%s work_type_id=%s planned_date=%s',
        [str(fid) for fid in field_ids],
        payload.work_type_id,
        payload.planned_date,
    )
    try:
        await db.flush()
        await log_change(db, org_id=org_id, entity_type='agro_plan', entity_id=plan.id,
                         action='create', changed_by=current.id, after=model_snapshot(plan))
        await db.commit()
    except Exception as exc:
        await db.rollback()
        message = str(exc).lower()
        logger.exception('POST /api/agro-plan create failed: %s', exc)
        if 'agro_plan_fields' in message and (
            'does not exist' in message or 'undefinedtable' in message
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    'Таблица agro_plan_fields не найдена. '
                    'Выполните на сервере: alembic upgrade head'
                ),
            ) from exc
        raise

    response = await plan_to_response_with_advisories(await get_plan_or_404(db, plan.id, org_id))
    logger.info('POST /api/agro-plan created id=%s fields=%s', plan.id, response.field_ids)
    return response


@router.patch('/{plan_id}', response_model=AgroPlanResponse)
async def update_agro_plan(
    request: Request,
    plan_id: UUID,
    payload: AgroPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> AgroPlanResponse:
    org_id = get_org_id(request)
    plan = await get_plan_or_404(db, plan_id, org_id)
    if getattr(plan, 'entry_kind', 'plan') == 'fact':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Фактическую запись нельзя редактировать — она связана со сменой',
        )
    before = model_snapshot(plan)
    update_data = payload.model_dump(exclude_unset=True)

    await validate_plan_refs(
        db,
        org_id,
        field_ids=update_data.get('field_ids'),
        work_type_id=update_data.get('work_type_id'),
        equipment_id=update_data.get('equipment_id'),
        implement_id=update_data.get('implement_id'),
        employee_id=update_data.get('employee_id'),
    )

    if 'field_ids' in update_data:
        raw_ids: list[UUID] = update_data.pop('field_ids')
        seen: set[UUID] = set()
        field_ids: list[UUID] = []
        for field_id in raw_ids:
            if field_id not in seen:
                seen.add(field_id)
                field_ids.append(field_id)
        set_plan_fields(plan, field_ids)

    new_status = update_data.pop('status', None)
    for field, value in update_data.items():
        setattr(plan, field, value)

    if new_status is not None:
        if new_status in ('done', 'cancelled'):
            mark_plan_closed(plan, closed_by=current.id, status_value=new_status)
        else:
            plan.status = new_status
            plan.closed_by = None
            plan.closed_at = None
            plan.close_note = None

    db.add(plan)
    try:
        await log_change(db, org_id=org_id, entity_type='agro_plan', entity_id=plan.id,
                         action='update', changed_by=current.id, before=before, after=model_snapshot(plan))
        await db.commit()
    except Exception as exc:
        await db.rollback()
        message = str(exc).lower()
        logger.exception('PATCH /api/agro-plan/%s failed: %s', plan_id, exc)
        if 'agro_plan_fields' in message and (
            'does not exist' in message or 'undefinedtable' in message
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    'Таблица agro_plan_fields не найдена. '
                    'Выполните на сервере: alembic upgrade head'
                ),
            ) from exc
        raise

    return await plan_to_response_with_advisories(await get_plan_or_404(db, plan.id, org_id))


@router.post('/{plan_id}/close', response_model=AgroPlanResponse)
async def close_agro_plan(
    request: Request,
    plan_id: UUID,
    payload: AgroPlanCloseRequest,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> AgroPlanResponse:
    """Admin-only: close any plan (done/cancelled) without a linked shift."""
    org_id = get_org_id(request)
    plan = await get_plan_or_404(db, plan_id, org_id)
    if getattr(plan, 'entry_kind', 'plan') == 'fact':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Фактическую запись нельзя закрыть вручную — она связана со сменой',
        )

    before = model_snapshot(plan)
    mark_plan_closed(
        plan,
        closed_by=current.id,
        status_value=payload.status,
        note=payload.note,
    )
    db.add(plan)
    await log_change(
        db,
        org_id=org_id,
        entity_type='agro_plan',
        entity_id=plan.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(plan),
    )
    await db.commit()
    return plan_to_response(await get_plan_or_404(db, plan.id, org_id))


@router.get('/{plan_id}/weather-advisory', response_model=AgroPlanWeatherAdvisoryResponse)
async def get_plan_weather_advisory(
    request: Request,
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> AgroPlanWeatherAdvisoryResponse:
    org_id = get_org_id(request)
    plan = await get_plan_or_404(db, plan_id, org_id)
    items = await compute_plan_advisories(plan)
    return AgroPlanWeatherAdvisoryResponse(
        plan_id=plan.id,
        advisories=[advisory_to_out(a) for a in items],
    )


@router.delete('/{plan_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_agro_plan(
    request: Request,
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> None:
    org_id = get_org_id(request)
    plan = await get_plan_or_404(db, plan_id, org_id)
    if getattr(plan, 'entry_kind', 'plan') == 'fact':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Фактическую запись нельзя удалить — она связана со сменой',
        )
    before = model_snapshot(plan)
    await log_change(db, org_id=org_id, entity_type='agro_plan', entity_id=plan.id,
                     action='delete', changed_by=current.id, before=before)
    await db.delete(plan)
    await db.commit()

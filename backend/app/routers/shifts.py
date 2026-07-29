from datetime import date, datetime, timedelta
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee, EmployeeRole
from app.models.implement import Implement
from app.models.reference import Equipment, Location, WorkType
from app.models.shift import Shift, ShiftStatus
from app.schemas.shift import (
    ShiftClose,
    ShiftCreate,
    ShiftManualAdd,
    ShiftResponse,
    ShiftUpdate,
)
from app.services.agro_calendar_facts import apply_shift_to_agro_calendar, get_selectable_plan
from app.services.dashboard import clear_dashboard_cache
from app.services.audit import log_change, model_snapshot
from app.services.action_permissions import (
    employee_has_action,
    employee_has_section,
    resolve_effective_permissions,
)
from app.services.equipment_meters import add_equipment_meter_log, calc_meter_label
from app.services.org_timezone import now_in_org
from app.services.salary import apply_salary_to_shift
from app.services.shifts import (
    calc_duration_from_datetimes,
    calc_duration_minutes,
    calc_duration_rounded,
    calc_manual_duration_minutes,
    combine_date_time,
    ranges_overlap,
    resolve_shift_end_datetime,
    shift_time_range,
    unlink_shift_dependencies,
)

router = APIRouter()

logger = logging.getLogger(__name__)


def shift_to_response(shift: Shift) -> ShiftResponse:
    equipment = shift.equipment
    return ShiftResponse(
        id=shift.id,
        date=shift.date,
        employee_id=shift.employee_id,
        employee_name=shift.employee.full_name,
        employee_code=shift.employee.employee_code,
        start_time=shift.start_time,
        end_time=shift.end_time,
        work_type=shift.work_type.name,
        location=shift.location.name,
        equipment=equipment.name if equipment else None,
        equipment_id=shift.equipment_id,
        equipment_meter_type=equipment.meter_type if equipment else None,
        equipment_meter_label=calc_meter_label(equipment.meter_type) if equipment else None,
        field_id=shift.field_id,
        field_name=shift.field.name if shift.field else None,
        implement_id=shift.implement_id,
        implement_name=shift.implement.name if shift.implement else None,
        agro_plan_id=shift.agro_plan_id,
        description=shift.description,
        comment=shift.comment,
        status=shift.status.value,
        duration_raw=shift.duration_raw,
        duration_rounded=shift.duration_rounded,
        calculated_amount=shift.calculated_amount,
        rate_snapshot=shift.rate_snapshot if isinstance(shift.rate_snapshot, dict) else None,
        latitude=shift.latitude,
        longitude=shift.longitude,
    )


def shift_load_options():
    return (
        selectinload(Shift.employee),
        selectinload(Shift.work_type),
        selectinload(Shift.location),
        selectinload(Shift.equipment),
        selectinload(Shift.field),
        selectinload(Shift.implement),
    )


async def get_shift_or_404(db: AsyncSession, shift_id: UUID, org_id: UUID) -> Shift:
    result = await db.execute(
        select(Shift)
        .options(*shift_load_options())
        .where(Shift.id == shift_id, Shift.org_id == org_id)
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Смена не найдена')
    return shift


def ensure_shift_access(shift: Shift, current: Employee) -> None:
    if current.role == EmployeeRole.employee and shift.employee_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')


async def ensure_shift_section_access(
    db: AsyncSession,
    org_id: UUID,
    current: Employee,
) -> None:
    """Enforce section + action grants for shift APIs (role defaults or access group)."""
    if current.role == EmployeeRole.admin:
        return

    effective = await resolve_effective_permissions(db, current)
    if current.role == EmployeeRole.employee:
        if not employee_has_section(effective, 'my-shift'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Раздел недоступен для вашей роли',
            )
        return

    # Managers: worktime OR my-shift (own shift) — do not force worktime-only.
    if employee_has_section(effective, 'worktime'):
        return
    if employee_has_section(effective, 'my-shift'):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail='Раздел недоступен для вашей роли',
    )


async def ensure_can_open_for_target(
    db: AsyncSession,
    current: Employee,
    target_employee_id: UUID,
) -> None:
    if current.role == EmployeeRole.admin:
        return
    if target_employee_id == current.id:
        effective = await resolve_effective_permissions(db, current)
        if not employee_has_action(effective, 'shift.open_own'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Недостаточно прав для открытия своей смены',
            )
        return
    effective = await resolve_effective_permissions(db, current)
    if not employee_has_action(effective, 'shift.open_for_others'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав для открытия смены за другого сотрудника',
        )


async def validate_reference_ids(
    db: AsyncSession,
    org_id: UUID,
    *,
    location_id: UUID,
    work_type_id: UUID,
    equipment_id: UUID | None = None,
    field_id: UUID | None = None,
    implement_id: UUID | None = None,
) -> None:
    location = await db.get(Location, location_id)
    if location is None or not location.is_active or location.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Локация не найдена')

    work_type = await db.get(WorkType, work_type_id)
    if work_type is None or not work_type.is_active or work_type.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Тип работ не найден')

    if equipment_id is not None:
        equipment = await db.get(Equipment, equipment_id)
        if equipment is None or not equipment.is_active or equipment.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Техника не найдена')

    if field_id is not None:
        field = await db.get(Location, field_id)
        if field is None or not field.is_active or field.org_id != org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Поле не найдено')

    if implement_id is not None:
        implement = await db.get(Implement, implement_id)
        if implement is None or not implement.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Приспособление не найдено',
            )


async def get_employee_or_400(db: AsyncSession, employee_id: UUID, org_id: UUID) -> Employee:
    employee = await db.get(Employee, employee_id)
    if employee is None or not employee.is_active or employee.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Сотрудник не найден')
    return employee


async def ensure_no_open_shift(db: AsyncSession, employee_id: UUID, org_id: UUID) -> None:
    result = await db.execute(
        select(Shift).where(
            Shift.org_id == org_id,
            Shift.employee_id == employee_id,
            Shift.status == ShiftStatus.open,
        )
    )
    open_shift = result.scalar_one_or_none()
    if open_shift is not None:
        start_label = open_shift.start_time.strftime('%H:%M')
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'У сотрудника уже есть открытая смена (с {start_label})',
        )


async def ensure_no_shift_overlap(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee_id: UUID,
    start_dt: datetime,
    end_dt: datetime,
    now: datetime | None = None,
    exclude_shift_id: UUID | None = None,
) -> None:
    """Block only when time ranges actually overlap.

    Open shifts are treated as [start, now] (or open-ended if now is missing).
    They must NOT block a non-overlapping retrospective interval.
    """
    date_from = start_dt.date() - timedelta(days=1)
    date_to = end_dt.date() + timedelta(days=1)
    query = select(Shift).where(
        Shift.org_id == org_id,
        Shift.employee_id == employee_id,
        or_(
            and_(Shift.date >= date_from, Shift.date <= date_to),
            Shift.status == ShiftStatus.open,
        ),
    )
    if exclude_shift_id is not None:
        query = query.where(Shift.id != exclude_shift_id)

    result = await db.execute(query)
    for existing in result.scalars().all():
        existing_start, existing_end = shift_time_range(
            existing.date,
            existing.start_time,
            existing.end_time,
            now=now,
        )
        if existing_end is None:
            # Open shift without a "now" bound — still open-ended into the future
            existing_end = datetime.max.replace(microsecond=0)

        if not ranges_overlap(start_dt, end_dt, existing_start, existing_end):
            continue

        start_label = existing.start_time.strftime('%H:%M')
        if existing.status == ShiftStatus.open:
            detail = (
                f'Смена пересекается с открытой сменой '
                f'от {existing.date.strftime("%d.%m.%Y")} {start_label}'
            )
        else:
            detail = (
                f'Смена пересекается с существующей сменой '
                f'от {existing.date.strftime("%d.%m.%Y")} {start_label}'
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def resolve_target_employee_id(payload: ShiftCreate, current: Employee) -> UUID:
    if current.role == EmployeeRole.employee:
        return current.id
    return payload.employee_id or current.id


def recalculate_duration(shift: Shift) -> None:
    if shift.end_time is None:
        shift.duration_raw = None
        shift.duration_rounded = None
        return

    duration_raw = calc_manual_duration_minutes(
        shift.date,
        shift.start_time,
        shift.end_time,
        end_date=None,
    )
    shift.duration_raw = duration_raw
    shift.duration_rounded = calc_duration_rounded(duration_raw)


@router.get('', response_model=list[ShiftResponse])
async def list_shifts(
    request: Request,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    employee_id: UUID | None = Query(None),
    # Accept 'all' from older clients / UI filters — treat as no status filter.
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[ShiftResponse]:
    org_id = get_org_id(request)
    query = select(Shift).options(*shift_load_options()).where(Shift.org_id == org_id)

    await ensure_shift_section_access(db, org_id, current)
    if current.role == EmployeeRole.employee:
        query = query.where(Shift.employee_id == current.id)
    elif employee_id is not None:
        query = query.where(Shift.employee_id == employee_id)

    if from_date is not None:
        query = query.where(Shift.date >= from_date)
    if to_date is not None:
        query = query.where(Shift.date <= to_date)
    if status in (ShiftStatus.open.value, ShiftStatus.closed.value):
        query = query.where(Shift.status == ShiftStatus(status))

    query = query.order_by(Shift.date.desc(), Shift.start_time.desc())
    result = await db.execute(query)
    return [shift_to_response(shift) for shift in result.scalars().all()]


@router.get('/{shift_id}', response_model=ShiftResponse)
async def get_shift(
    request: Request,
    shift_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ShiftResponse:
    shift = await get_shift_or_404(db, shift_id, get_org_id(request))
    ensure_shift_access(shift, current)
    await ensure_shift_section_access(db, shift.org_id, current)
    return shift_to_response(shift)


@router.post('', response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def open_shift(
    request: Request,
    payload: ShiftCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ShiftResponse:
    org_id = get_org_id(request)
    await ensure_shift_section_access(db, org_id, current)
    target_employee_id = resolve_target_employee_id(payload, current)
    await ensure_can_open_for_target(db, current, target_employee_id)
    await get_employee_or_400(db, target_employee_id, org_id)
    await validate_reference_ids(
        db,
        org_id,
        location_id=payload.location_id,
        work_type_id=payload.work_type_id,
        equipment_id=payload.equipment_id,
        field_id=payload.field_id,
        implement_id=payload.implement_id,
    )
    work_type = await db.get(WorkType, payload.work_type_id)
    is_field = bool(work_type is not None and work_type.is_field_work)
    if is_field and payload.field_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для полевой работы укажите поле',
        )

    agro_plan_id = payload.agro_plan_id
    if agro_plan_id is not None:
        if not is_field:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='План агрокалендаря можно выбрать только для полевой работы',
            )
        plan = await get_selectable_plan(
            db,
            org_id=org_id,
            plan_id=agro_plan_id,
            employee_id=target_employee_id,
        )
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Выбранный план недоступен',
            )
        if plan.work_type_id != payload.work_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Тип работ смены не совпадает с выбранным планом',
            )
        if payload.field_id is not None:
            plan_field_ids = {plan.location_id, *(row.location_id for row in plan.fields)}
            if payload.field_id not in plan_field_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Поле смены не совпадает с выбранным планом',
                )

    now = await now_in_org(db, org_id)
    await ensure_no_open_shift(db, target_employee_id, org_id)
    open_start = now.replace(microsecond=0)
    # Treat new open shift as starting now with open-ended range for overlap against closed shifts
    await ensure_no_shift_overlap(
        db,
        org_id=org_id,
        employee_id=target_employee_id,
        start_dt=open_start,
        end_dt=open_start + timedelta(minutes=1),
        now=now,
    )

    shift = Shift(
        org_id=org_id,
        date=now.date(),
        employee_id=target_employee_id,
        start_time=now.time().replace(microsecond=0),
        work_type_id=payload.work_type_id,
        location_id=payload.location_id,
        equipment_id=payload.equipment_id,
        field_id=payload.field_id,
        implement_id=payload.implement_id,
        agro_plan_id=agro_plan_id,
        status=ShiftStatus.open,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(shift)
    await db.flush()
    await log_change(db, org_id=org_id, entity_type='shift', entity_id=shift.id,
                     action='create', changed_by=current.id, after=model_snapshot(shift))
    await db.commit()
    clear_dashboard_cache()

    shift = await get_shift_or_404(db, shift.id, org_id)
    return shift_to_response(shift)


@router.post('/manual', response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def add_manual_shift(
    request: Request,
    payload: ShiftManualAdd,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ShiftResponse:
    org_id = get_org_id(request)
    await ensure_shift_section_access(db, org_id, current)
    await get_employee_or_400(db, payload.employee_id, org_id)
    await validate_reference_ids(
        db,
        org_id,
        location_id=payload.location_id,
        work_type_id=payload.work_type_id,
        equipment_id=payload.equipment_id,
        field_id=payload.field_id,
        implement_id=payload.implement_id,
    )
    work_type = await db.get(WorkType, payload.work_type_id)
    is_field = bool(work_type is not None and work_type.is_field_work)
    if is_field and payload.field_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для полевой работы укажите поле',
        )

    agro_plan_id = payload.agro_plan_id
    if agro_plan_id is not None:
        if not is_field:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='План агрокалендаря можно выбрать только для полевой работы',
            )
        plan = await get_selectable_plan(
            db,
            org_id=org_id,
            plan_id=agro_plan_id,
            employee_id=payload.employee_id,
        )
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Выбранный план недоступен',
            )
        if plan.work_type_id != payload.work_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Тип работ смены не совпадает с выбранным планом',
            )
        if payload.field_id is not None:
            plan_field_ids = {plan.location_id, *(row.location_id for row in plan.fields)}
            if payload.field_id not in plan_field_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Поле смены не совпадает с выбранным планом',
                )

    duration_raw = calc_manual_duration_minutes(
        payload.date,
        payload.start_time,
        payload.end_time,
        payload.end_date,
    )
    if duration_raw <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Время окончания должно быть позже времени начала',
        )

    start_dt = combine_date_time(payload.date, payload.start_time)
    end_dt = resolve_shift_end_datetime(
        payload.date,
        payload.start_time,
        payload.end_time,
        payload.end_date,
    )
    now = await now_in_org(db, org_id)
    # Manual/retrospective shifts: only real interval overlap (open shifts included
    # as [start, now]). Do NOT block solely because an unrelated open shift exists.
    await ensure_no_shift_overlap(
        db,
        org_id=org_id,
        employee_id=payload.employee_id,
        start_dt=start_dt,
        end_dt=end_dt,
        now=now,
    )

    shift = Shift(
        org_id=org_id,
        date=payload.date,
        employee_id=payload.employee_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        work_type_id=payload.work_type_id,
        location_id=payload.location_id,
        equipment_id=payload.equipment_id,
        field_id=payload.field_id,
        implement_id=payload.implement_id,
        agro_plan_id=agro_plan_id,
        description=payload.description,
        comment=payload.comment,
        status=ShiftStatus.closed,
        duration_raw=duration_raw,
        duration_rounded=calc_duration_rounded(duration_raw),
    )
    db.add(shift)
    await db.flush()
    await apply_salary_to_shift(db, shift)
    if shift.field_id is not None:
        await apply_shift_to_agro_calendar(db, org_id=org_id, shift=shift)
    await log_change(db, org_id=org_id, entity_type='shift', entity_id=shift.id,
                     action='create', changed_by=current.id, after=model_snapshot(shift))
    await db.commit()
    clear_dashboard_cache()

    shift = await get_shift_or_404(db, shift.id, org_id)
    return shift_to_response(shift)


@router.post('/{shift_id}/close', response_model=ShiftResponse)
async def close_shift(
    request: Request,
    shift_id: UUID,
    payload: ShiftClose,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> ShiftResponse:
    org_id = get_org_id(request)
    shift = await get_shift_or_404(db, shift_id, org_id)
    before = model_snapshot(shift)

    await ensure_shift_section_access(db, org_id, current)

    if shift.status != ShiftStatus.open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Смена уже закрыта')

    if shift.employee_id == current.id:
        effective = await resolve_effective_permissions(db, current)
        if current.role != EmployeeRole.admin and not employee_has_action(
            effective, 'shift.close_own'
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')
    else:
        effective = await resolve_effective_permissions(db, current)
        if current.role != EmployeeRole.admin and not employee_has_action(
            effective, 'shift.close_others'
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    try:
        now = await now_in_org(db, org_id)
        shift.end_time = now.time().replace(microsecond=0)
        shift.description = payload.description
        shift.comment = payload.comment
        shift.status = ShiftStatus.closed

        start_dt = combine_date_time(shift.date, shift.start_time)
        duration_raw = calc_duration_from_datetimes(start_dt, now)
        shift.duration_raw = duration_raw
        shift.duration_rounded = calc_duration_rounded(duration_raw)
        try:
            await apply_salary_to_shift(db, shift)
        except HTTPException:
            raise
        except Exception:
            # Salary calculation is the most common source of unexpected 500s.
            # Provide a safe, actionable message to the user and keep the stack in logs.
            logger.exception(
                'close_shift salary calculation failed shift_id=%s org_id=%s',
                shift_id,
                org_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Не удалось рассчитать оплату для смены. Проверьте тарифы и настройки сотрудника.',
            )

        db.add(shift)

        # Snapshot after mutations, before related flushes (meter log expires attrs).
        after = model_snapshot(shift)

        if shift.equipment_id is not None and shift.duration_rounded is not None:
            equipment = await db.get(Equipment, shift.equipment_id)
            if (
                equipment is not None
                and equipment.org_id == org_id
                and equipment.meter_type == 'shift_hours'
                and float(shift.duration_rounded) > 0
            ):
                try:
                    await add_equipment_meter_log(
                        db,
                        equipment_id=equipment.id,
                        value_added=shift.duration_rounded,
                        log_date=shift.date,
                        note='Автоматически из смены',
                        shift_id=shift.id,
                        created_by=current.id,
                    )
                except Exception:
                    # Meter side-effect must not block closing the shift.
                    logger.exception(
                        'close_shift meter log failed shift_id=%s equipment_id=%s',
                        shift_id,
                        shift.equipment_id,
                    )

        if shift.field_id is not None:
            await apply_shift_to_agro_calendar(db, org_id=org_id, shift=shift)

        await log_change(
            db,
            org_id=org_id,
            entity_type='shift',
            entity_id=shift.id,
            action='update',
            changed_by=current.id,
            before=before,
            after=after,
            summary=f'Закрыта смена от {shift.date.strftime("%d.%m.%Y")}',
        )
        await db.commit()
        clear_dashboard_cache()

        shift = await get_shift_or_404(db, shift.id, org_id)
        return shift_to_response(shift)
    except HTTPException:
        raise
    except Exception:
        # Keep 500 behaviour, but print the full stack trace for diagnostics.
        logger.exception(
            'close_shift failed shift_id=%s org_id=%s by_employee_id=%s',
            shift_id,
            org_id,
            current.id,
        )
        raise


@router.patch('/{shift_id}', response_model=ShiftResponse)
async def update_shift(
    request: Request,
    shift_id: UUID,
    payload: ShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ShiftResponse:
    org_id = get_org_id(request)
    await ensure_shift_section_access(db, org_id, current)
    shift = await get_shift_or_404(db, shift_id, org_id)
    before = model_snapshot(shift)
    update_data = payload.model_dump(exclude_unset=True)

    if 'employee_id' in update_data:
        await get_employee_or_400(db, update_data['employee_id'], org_id)

    reference_ids = {
        'location_id': update_data.get('location_id', shift.location_id),
        'work_type_id': update_data.get('work_type_id', shift.work_type_id),
        'equipment_id': update_data.get('equipment_id', shift.equipment_id),
        'field_id': update_data.get('field_id', shift.field_id),
        'implement_id': update_data.get('implement_id', shift.implement_id),
    }
    if any(
        key in update_data
        for key in ('location_id', 'work_type_id', 'equipment_id', 'field_id', 'implement_id')
    ):
        await validate_reference_ids(db, org_id, **reference_ids)

    for field, value in update_data.items():
        setattr(shift, field, value)

    if any(key in update_data for key in ('start_time', 'end_time', 'date')):
        recalculate_duration(shift)

    if update_data.get('status') == ShiftStatus.open:
        shift.end_time = None
        shift.duration_raw = None
        shift.duration_rounded = None
        shift.calculated_amount = None
        shift.rate_snapshot = None
    elif shift.status == ShiftStatus.closed and shift.end_time is not None:
        recalculate_duration(shift)
        await apply_salary_to_shift(db, shift)

    db.add(shift)
    await log_change(db, org_id=org_id, entity_type='shift', entity_id=shift.id,
                     action='update', changed_by=current.id, before=before, after=model_snapshot(shift))
    await db.commit()
    clear_dashboard_cache()

    shift = await get_shift_or_404(db, shift.id, org_id)
    return shift_to_response(shift)


@router.delete('/{shift_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    request: Request,
    shift_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> None:
    """Hard-delete a shift (admin only). Unlinks agro facts/plans and meter logs first."""
    org_id = get_org_id(request)
    shift = await get_shift_or_404(db, shift_id, org_id)
    before = model_snapshot(shift)
    await unlink_shift_dependencies(db, shift.id)
    await log_change(
        db,
        org_id=shift.org_id,
        entity_type='shift',
        entity_id=shift.id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.delete(shift)
    await db.commit()
    clear_dashboard_cache()

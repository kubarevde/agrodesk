from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee, EmployeeRole
from app.models.equipment_log import EquipmentMaintenance
from app.models.expense import Expense
from app.models.notification import Notification
from app.models.reference import Equipment
from app.routers.references import equipment_to_response
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate
from app.schemas.reference import EquipmentResponse
from app.services.audit import log_change, model_snapshot
from app.services.dashboard import clear_dashboard_cache
from app.services.equipment_meters import calc_meter_label
from app.services.maintenance_expense import (
    create_maintenance_expense,
    should_create_maintenance_expense,
)

router = APIRouter()


async def _get_equipment_or_404(
    db: AsyncSession, equipment_id: UUID, org_id: UUID
) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None or equipment.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    return equipment


def _next_to_interval(record: EquipmentMaintenance) -> float | None:
    if record.next_to_at is None or record.meter_at is None:
        return None
    return float(Decimal(str(record.next_to_at)) - Decimal(str(record.meter_at)))


def maintenance_to_response(record: EquipmentMaintenance) -> MaintenanceResponse:
    equipment = record.equipment
    return MaintenanceResponse(
        id=record.id,
        equipment_id=record.equipment_id,
        date=record.date,
        type=record.type,
        meter_at=float(record.meter_at) if record.meter_at is not None else None,
        cost=float(record.cost) if record.cost is not None else None,
        description=record.description,
        next_to_interval=_next_to_interval(record),
        equipment_name=equipment.name if equipment else '',
        meter_label=calc_meter_label(equipment.meter_type if equipment else None),
        expense_id=record.expense_id,
    )


def maintenance_load_options():
    return (selectinload(EquipmentMaintenance.equipment),)


async def notify_managers(
    db: AsyncSession,
    *,
    org_id: UUID,
    notif_type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> None:
    result = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.role.in_([EmployeeRole.admin, EmployeeRole.manager]),
            Employee.is_active.is_(True),
        )
    )
    for employee in result.scalars().all():
        db.add(
            Notification(
                employee_id=employee.id,
                type=notif_type,
                title=title,
                body=body,
                link=link,
            )
        )


@router.get('/maintenance/upcoming', response_model=list[EquipmentResponse])
async def list_upcoming_maintenance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[EquipmentResponse]:
    """Use the same maintenance status rules as equipment list/dashboard (warning/overdue)."""
    org_id = get_org_id(request)
    result = await db.execute(
        select(Equipment).where(
            Equipment.org_id == org_id,
            Equipment.is_active.is_(True),
        )
    )
    items: list[EquipmentResponse] = []
    for equipment in result.scalars().all():
        response = equipment_to_response(equipment)
        if response.to_status in ('warning', 'overdue'):
            items.append(response)
    items.sort(key=lambda item: item.next_to_at or 0)
    return items


@router.get('/{id}/maintenance', response_model=list[MaintenanceResponse])
async def list_maintenance(
    request: Request,
    id: UUID,
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[MaintenanceResponse]:
    await _get_equipment_or_404(db, id, get_org_id(request))
    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*maintenance_load_options())
        .where(EquipmentMaintenance.equipment_id == id)
        .order_by(EquipmentMaintenance.date.desc(), EquipmentMaintenance.created_at.desc())
        .limit(limit)
    )
    return [maintenance_to_response(row) for row in result.scalars().all()]


@router.post(
    '/{id}/maintenance',
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_maintenance(
    request: Request,
    id: UUID,
    payload: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> MaintenanceResponse:
    org_id = get_org_id(request)
    equipment = await _get_equipment_or_404(db, id, org_id)
    current_meter = Decimal(str(equipment.current_meter or 0))
    meter_at = (
        Decimal(str(payload.meter_at)) if payload.meter_at is not None else current_meter
    )
    label = calc_meter_label(equipment.meter_type)

    expense_id: UUID | None = None
    if should_create_maintenance_expense(payload.cost):
        expense = await create_maintenance_expense(
            db,
            org_id=org_id,
            expense_date=payload.date,
            amount=payload.cost,  # validated > 0 above
            description=f'ТО ({payload.type}): {equipment.name}',
            created_by=current.id,
            equipment_id=equipment.id,
        )
        expense_id = expense.id

    next_to_at: Decimal | None = None
    if payload.next_to_interval is not None:
        from app.services.maintenance import next_after_completed_service

        interval = Decimal(str(payload.next_to_interval))
        computed = next_after_completed_service(float(current_meter), float(interval))
        next_to_at = Decimal(str(computed)) if computed is not None else current_meter + interval
        equipment.next_to_at = next_to_at
        equipment.to_interval = interval
        db.add(equipment)

    record = EquipmentMaintenance(
        equipment_id=equipment.id,
        date=payload.date,
        type=payload.type,
        meter_at=meter_at,
        cost=Decimal(str(payload.cost)) if payload.cost is not None else None,
        description=payload.description,
        next_to_at=next_to_at,
        expense_id=expense_id,
        created_by=current.id,
        status='done',
        priority='normal',
    )
    db.add(record)

    await notify_managers(
        db,
        org_id=org_id,
        notif_type='maintenance_done',
        title=f'ТО выполнено: {equipment.name}',
        body=(
            f'{payload.type} при {float(meter_at):g} {label}.'
            + (
                f' Следующее через {payload.next_to_interval:g} {label}.'
                if payload.next_to_interval is not None
                else ''
            )
        ),
        link=f'/equipment/{equipment.id}',
    )

    await db.flush()
    await log_change(db, org_id=org_id, entity_type='equipment_maintenance', entity_id=record.id,
                     action='create', changed_by=current.id, after=model_snapshot(record))
    await db.commit()
    clear_dashboard_cache()

    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*maintenance_load_options())
        .where(EquipmentMaintenance.id == record.id)
    )
    return maintenance_to_response(result.scalar_one())


@router.patch('/{id}/maintenance/{mid}', response_model=MaintenanceResponse)
async def update_maintenance(
    request: Request,
    id: UUID,
    mid: UUID,
    payload: MaintenanceUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> MaintenanceResponse:
    equipment = await _get_equipment_or_404(db, id, get_org_id(request))
    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*maintenance_load_options())
        .where(
            EquipmentMaintenance.id == mid,
            EquipmentMaintenance.equipment_id == id,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись ТО не найдена')
    before = model_snapshot(record)

    updates = payload.model_dump(exclude_unset=True)
    next_to_interval = updates.pop('next_to_interval', None)

    for field, value in updates.items():
        if field in {'meter_at', 'cost'} and value is not None:
            setattr(record, field, Decimal(str(value)))
        else:
            setattr(record, field, value)

    if next_to_interval is not None:
        from app.services.maintenance import next_after_completed_service

        current_meter = Decimal(str(equipment.current_meter or 0))
        interval = Decimal(str(next_to_interval))
        computed = next_after_completed_service(float(current_meter), float(interval))
        next_to_at = Decimal(str(computed)) if computed is not None else current_meter + interval
        record.next_to_at = next_to_at
        equipment.next_to_at = next_to_at
        equipment.to_interval = interval
        db.add(equipment)
        equipment.next_to_at = next_to_at
        db.add(equipment)

    if 'cost' in updates and record.expense_id is not None and record.cost is not None:
        expense = await db.get(Expense, record.expense_id)
        if expense is not None:
            expense.amount = record.cost
            expense.equipment_id = equipment.id
            if 'type' in updates or 'date' in updates:
                expense.date = record.date
                expense.description = f'ТО ({record.type}): {equipment.name}'
            db.add(expense)

    db.add(record)
    await log_change(db, org_id=get_org_id(request), entity_type='equipment_maintenance', entity_id=record.id,
                     action='update', changed_by=current.id, before=before, after=model_snapshot(record))
    await db.commit()
    clear_dashboard_cache()

    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*maintenance_load_options())
        .where(EquipmentMaintenance.id == record.id)
    )
    return maintenance_to_response(result.scalar_one())


@router.delete('/{id}/maintenance/{mid}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance(
    request: Request,
    id: UUID,
    mid: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> None:
    await _get_equipment_or_404(db, id, get_org_id(request))
    result = await db.execute(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == mid,
            EquipmentMaintenance.equipment_id == id,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись ТО не найдена')

    before = model_snapshot(record)
    await log_change(db, org_id=get_org_id(request), entity_type='equipment_maintenance', entity_id=record.id,
                     action='delete', changed_by=current.id, before=before)
    await db.delete(record)
    await db.commit()
    clear_dashboard_cache()

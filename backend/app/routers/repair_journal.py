"""Repair journal API — extends equipment_maintenance with checklist."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.equipment_log import EquipmentMaintenance, MaintenanceChecklistItem
from app.models.implement import Implement
from app.models.reference import Equipment
from app.models.purchase_planner import PurchasePlannerItem
from app.schemas.purchase_planner import PurchasePlannerResponse
from app.schemas.repair_journal import (
    ActiveRepairsCountResponse,
    ChecklistItemCreate,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    RepairJournalCreate,
    RepairJournalResponse,
    RepairJournalUpdate,
)
from app.services.audit import log_change, model_snapshot
from app.services.dashboard import clear_dashboard_cache
from app.services.maintenance_expense import (
    create_maintenance_expense,
    should_create_maintenance_expense,
)
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('maintenance'))])

ACTIVE_STATUSES = ('in_progress', 'waiting_parts')
PRIORITY_ORDER = {'urgent': 0, 'normal': 1, 'low': 2}


def _checklist_to_response(item: MaintenanceChecklistItem) -> ChecklistItemResponse:
    return ChecklistItemResponse(
        id=item.id,
        maintenance_id=item.maintenance_id,
        item_type=item.item_type,
        description=item.description,
        is_done=bool(item.is_done),
        cost=float(item.cost) if item.cost is not None else None,
        done_at=item.done_at,
        created_at=item.created_at,
    )


def repair_to_response(record: EquipmentMaintenance) -> RepairJournalResponse:
    equipment_name = record.equipment.name if record.equipment else None
    implement_name = record.implement.name if record.implement else None
    if equipment_name and implement_name:
        asset_label = f'{equipment_name} + {implement_name}'
    else:
        asset_label = equipment_name or implement_name or 'Без названия'

    items = list(record.checklist_items or [])
    done = sum(1 for item in items if item.is_done)
    return RepairJournalResponse(
        id=record.id,
        equipment_id=record.equipment_id,
        implement_id=record.implement_id,
        equipment_name=equipment_name,
        implement_name=implement_name,
        asset_label=asset_label,
        date=record.date,
        type=record.type,
        description=record.description,
        status=record.status or 'done',
        priority=record.priority or 'normal',
        date_returned=record.date_returned,
        meter_at=float(record.meter_at) if record.meter_at is not None else None,
        cost=float(record.cost) if record.cost is not None else None,
        expense_id=record.expense_id,
        checklist_items=[_checklist_to_response(item) for item in items],
        checklist_done=done,
        checklist_total=len(items),
        created_at=record.created_at,
    )


def _load_options():
    return (
        selectinload(EquipmentMaintenance.equipment),
        selectinload(EquipmentMaintenance.implement),
        selectinload(EquipmentMaintenance.checklist_items),
    )


async def _get_org_equipment(
    db: AsyncSession, equipment_id: UUID, org_id: UUID
) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None or equipment.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    return equipment


async def _get_org_implement(
    db: AsyncSession, implement_id: UUID, org_id: UUID
) -> Implement:
    implement = await db.get(Implement, implement_id)
    if implement is None or implement.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='Приспособление не найдено'
        )
    return implement


async def _get_repair_or_404(
    db: AsyncSession, repair_id: UUID, org_id: UUID
) -> EquipmentMaintenance:
    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*_load_options())
        .where(EquipmentMaintenance.id == repair_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')
    if record.equipment and record.equipment.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')
    if record.implement and record.implement.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')
    if not record.equipment and not record.implement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')
    return record


def _org_filter(org_id: UUID):
    return or_(
        EquipmentMaintenance.equipment.has(Equipment.org_id == org_id),
        EquipmentMaintenance.implement.has(Implement.org_id == org_id),
    )


@router.get('/active-count', response_model=ActiveRepairsCountResponse)
async def active_repairs_count(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ActiveRepairsCountResponse:
    org_id = get_org_id(request)
    result = await db.execute(
        select(EquipmentMaintenance)
        .options(*_load_options())
        .where(
            _org_filter(org_id),
            EquipmentMaintenance.status.in_(ACTIVE_STATUSES),
        )
        .order_by(EquipmentMaintenance.date.desc())
    )
    rows = list(result.scalars().all())
    rows.sort(key=lambda r: (PRIORITY_ORDER.get(r.priority or 'normal', 9), r.date))
    top = [repair_to_response(row) for row in rows[:3]]
    return ActiveRepairsCountResponse(count=len(rows), items=top)


@router.get('', response_model=list[RepairJournalResponse])
async def list_repairs(
    request: Request,
    status_filter: str | None = Query(None, alias='status'),
    equipment_id: UUID | None = None,
    implement_id: UUID | None = None,
    priority: str | None = None,
    include_done: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[RepairJournalResponse]:
    org_id = get_org_id(request)
    query = (
        select(EquipmentMaintenance)
        .options(*_load_options())
        .where(_org_filter(org_id))
        .order_by(EquipmentMaintenance.date.desc(), EquipmentMaintenance.created_at.desc())
    )
    if status_filter:
        query = query.where(EquipmentMaintenance.status == status_filter)
    elif not include_done:
        query = query.where(EquipmentMaintenance.status.in_(ACTIVE_STATUSES))
    if equipment_id:
        query = query.where(EquipmentMaintenance.equipment_id == equipment_id)
    if implement_id:
        query = query.where(EquipmentMaintenance.implement_id == implement_id)
    if priority:
        query = query.where(EquipmentMaintenance.priority == priority)

    result = await db.execute(query)
    return [repair_to_response(row) for row in result.scalars().all()]


@router.post('', response_model=RepairJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_repair(
    request: Request,
    payload: RepairJournalCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> RepairJournalResponse:
    org_id = get_org_id(request)
    equipment: Equipment | None = None
    implement: Implement | None = None
    if payload.equipment_id:
        equipment = await _get_org_equipment(db, payload.equipment_id, org_id)
    if payload.implement_id:
        implement = await _get_org_implement(db, payload.implement_id, org_id)

    asset_name = (equipment.name if equipment else None) or (
        implement.name if implement else 'актив'
    )
    expense_id: UUID | None = None
    if should_create_maintenance_expense(payload.cost):
        expense = await create_maintenance_expense(
            db,
            org_id=org_id,
            expense_date=payload.date,
            amount=payload.cost,
            description=f'Ремонт: {asset_name}',
            created_by=current.id,
            equipment_id=equipment.id if equipment else None,
        )
        expense_id = expense.id

    record = EquipmentMaintenance(
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        date=payload.date,
        type=payload.type,
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        meter_at=Decimal(str(payload.meter_at)) if payload.meter_at is not None else None,
        cost=Decimal(str(payload.cost)) if payload.cost is not None else None,
        expense_id=expense_id,
        created_by=current.id,
    )
    db.add(record)
    await db.flush()

    for item in payload.checklist_items:
        db.add(
            MaintenanceChecklistItem(
                maintenance_id=record.id,
                item_type=item.item_type,
                description=item.description.strip(),
                cost=Decimal(str(item.cost)) if item.cost is not None else None,
                is_done=item.is_done,
                done_at=datetime.now(timezone.utc) if item.is_done else None,
            )
        )

    await log_change(
        db,
        org_id=org_id,
        entity_type='equipment_maintenance',
        entity_id=record.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(record),
        summary=f'Постановка на ремонт: {asset_name}',
    )
    await db.commit()
    clear_dashboard_cache()
    return repair_to_response(await _get_repair_or_404(db, record.id, org_id))


@router.get('/{repair_id}', response_model=RepairJournalResponse)
async def get_repair(
    request: Request,
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> RepairJournalResponse:
    return repair_to_response(await _get_repair_or_404(db, repair_id, get_org_id(request)))


@router.patch('/{repair_id}', response_model=RepairJournalResponse)
async def update_repair(
    request: Request,
    repair_id: UUID,
    payload: RepairJournalUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> RepairJournalResponse:
    org_id = get_org_id(request)
    record = await _get_repair_or_404(db, repair_id, org_id)
    before = model_snapshot(record)
    updates = payload.model_dump(exclude_unset=True)
    create_expense = bool(updates.pop('create_expense', False))
    new_status = updates.get('status')

    if new_status == 'done' and updates.get('date_returned') is None and record.date_returned is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Укажите дату возврата в строй (date_returned)',
        )

    for field, value in updates.items():
        if field in {'meter_at', 'cost'} and value is not None:
            setattr(record, field, Decimal(str(value)))
        else:
            setattr(record, field, value)

    if create_expense and record.expense_id is None:
        checklist_sum = sum(
            float(item.cost or 0) for item in (record.checklist_items or [])
        )
        amount = float(record.cost) if record.cost is not None else checklist_sum
        if should_create_maintenance_expense(amount):
            asset_name = (
                record.equipment.name
                if record.equipment
                else (record.implement.name if record.implement else 'актив')
            )
            expense = await create_maintenance_expense(
                db,
                org_id=org_id,
                expense_date=record.date_returned or record.date or date.today(),
                amount=amount,
                description=f'Ремонт: {asset_name}',
                created_by=current.id,
                equipment_id=record.equipment_id,
            )
            record.expense_id = expense.id
            if record.cost is None:
                record.cost = Decimal(str(amount))

    db.add(record)
    await log_change(
        db,
        org_id=org_id,
        entity_type='equipment_maintenance',
        entity_id=record.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(record),
        summary=f'Обновление ремонта: {(record.equipment.name if record.equipment else (record.implement.name if record.implement else "актив"))}',
    )
    await db.commit()
    clear_dashboard_cache()
    return repair_to_response(await _get_repair_or_404(db, repair_id, org_id))


@router.post(
    '/{repair_id}/checklist-items',
    response_model=ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_checklist_item(
    request: Request,
    repair_id: UUID,
    payload: ChecklistItemCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ChecklistItemResponse:
    org_id = get_org_id(request)
    await _get_repair_or_404(db, repair_id, org_id)
    item = MaintenanceChecklistItem(
        maintenance_id=repair_id,
        item_type=payload.item_type,
        description=payload.description.strip(),
        cost=Decimal(str(payload.cost)) if payload.cost is not None else None,
        is_done=payload.is_done,
        done_at=datetime.now(timezone.utc) if payload.is_done else None,
    )
    db.add(item)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='maintenance_checklist_item',
        entity_id=item.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(item),
    )
    await db.commit()
    await db.refresh(item)
    return _checklist_to_response(item)


@router.patch('/checklist-items/{item_id}', response_model=ChecklistItemResponse)
async def update_checklist_item(
    request: Request,
    item_id: UUID,
    payload: ChecklistItemUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ChecklistItemResponse:
    org_id = get_org_id(request)
    item = await db.get(MaintenanceChecklistItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Пункт не найден')
    await _get_repair_or_404(db, item.maintenance_id, org_id)
    before = model_snapshot(item)
    updates = payload.model_dump(exclude_unset=True)
    if 'is_done' in updates:
        item.is_done = bool(updates.pop('is_done'))
        item.done_at = datetime.now(timezone.utc) if item.is_done else None
    for field, value in updates.items():
        if field == 'cost' and value is not None:
            item.cost = Decimal(str(value))
        elif field == 'description' and value is not None:
            item.description = value.strip()
        else:
            setattr(item, field, value)
    db.add(item)
    await log_change(
        db,
        org_id=org_id,
        entity_type='maintenance_checklist_item',
        entity_id=item.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(item),
    )
    await db.commit()
    await db.refresh(item)
    return _checklist_to_response(item)


@router.post(
    '/checklist-items/{item_id}/to-purchase-planner',
    response_model=PurchasePlannerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def checklist_to_purchase_planner(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PurchasePlannerResponse:
    """Create a purchase planner item from a repair checklist «buy» row."""
    from app.routers.purchase_planner import _load_options, _purchase_audit_summary, item_to_response

    org_id = get_org_id(request)
    item = await db.get(MaintenanceChecklistItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Пункт не найден')
    repair = await _get_repair_or_404(db, item.maintenance_id, org_id)

    existing = await db.execute(
        select(PurchasePlannerItem).where(
            PurchasePlannerItem.org_id == org_id,
            PurchasePlannerItem.maintenance_checklist_item_id == item.id,
            PurchasePlannerItem.status != 'cancelled',
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Этот пункт уже добавлен в планировщик закупок',
        )

    if repair.equipment_id:
        category = 'equipment'
        equipment_id = repair.equipment_id
        implement_id = None
    elif repair.implement_id:
        category = 'implement'
        equipment_id = None
        implement_id = repair.implement_id
    else:
        category = 'general'
        equipment_id = None
        implement_id = None

    row = PurchasePlannerItem(
        org_id=org_id,
        title=item.description.strip(),
        category=category,
        equipment_id=equipment_id,
        implement_id=implement_id,
        inventory_item_id=None,
        urgency='urgent' if (repair.priority or '') == 'urgent' else 'normal',
        status='planned',
        estimated_cost=Decimal(str(item.cost)) if item.cost is not None else None,
        maintenance_id=repair.id,
        maintenance_checklist_item_id=item.id,
        notes=f'Из журнала ремонта: {repair.type}',
        created_by=current.id,
    )
    db.add(row)
    await db.flush()
    result = await db.execute(
        select(PurchasePlannerItem)
        .options(*_load_options())
        .where(PurchasePlannerItem.id == row.id)
    )
    loaded = result.scalar_one()

    await log_change(
        db,
        org_id=org_id,
        entity_type='purchase_planner',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
        summary=_purchase_audit_summary(loaded, verb='Создана'),
    )
    await db.commit()
    clear_dashboard_cache()

    result = await db.execute(
        select(PurchasePlannerItem)
        .options(*_load_options())
        .where(PurchasePlannerItem.id == row.id)
    )
    return item_to_response(result.scalar_one())


@router.delete('/checklist-items/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_checklist_item(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> Response:
    org_id = get_org_id(request)
    item = await db.get(MaintenanceChecklistItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Пункт не найден')
    await _get_repair_or_404(db, item.maintenance_id, org_id)
    before = model_snapshot(item)
    await log_change(
        db,
        org_id=org_id,
        entity_type='maintenance_checklist_item',
        entity_id=item.id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.delete(item)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
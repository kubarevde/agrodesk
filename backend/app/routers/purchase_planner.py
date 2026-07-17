"""Purchase planner API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.equipment_log import EquipmentMaintenance, MaintenanceChecklistItem
from app.models.expense import Expense
from app.models.implement import Implement
from app.models.inventory import InventoryItem
from app.models.purchase_planner import PurchasePlannerItem
from app.models.reference import Equipment
from app.schemas.purchase_planner import (
    PurchasePlannerCreate,
    PurchasePlannerResponse,
    PurchasePlannerUpdate,
)
from app.services.audit import log_change, model_snapshot
from app.services.dashboard import clear_dashboard_cache
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('purchase-planner'))])


def _load_options():
    return (
        selectinload(PurchasePlannerItem.equipment),
        selectinload(PurchasePlannerItem.implement),
        selectinload(PurchasePlannerItem.inventory_item),
        selectinload(PurchasePlannerItem.responsible),
        selectinload(PurchasePlannerItem.maintenance).selectinload(EquipmentMaintenance.equipment),
        selectinload(PurchasePlannerItem.maintenance).selectinload(EquipmentMaintenance.implement),
    )


def _asset_label(row: PurchasePlannerItem) -> str | None:
    if row.equipment:
        return row.equipment.name
    if row.implement:
        return row.implement.name
    if row.inventory_item:
        return row.inventory_item.name
    return None


def _purchase_audit_summary(row: PurchasePlannerItem, *, verb: str) -> str:
    asset = _asset_label(row)
    repair = row.maintenance
    repair_asset = None
    if repair:
        if repair.equipment:
            repair_asset = repair.equipment.name
        elif repair.implement:
            repair_asset = repair.implement.name
    if repair_asset:
        return f'{verb} закупка для ремонта {repair_asset}: {row.title}'
    if asset:
        return f'{verb} закупка для {asset}: {row.title}'
    return f'{verb} закупка: {row.title}'


def item_to_response(row: PurchasePlannerItem) -> PurchasePlannerResponse:
    equipment_name = row.equipment.name if row.equipment else None
    implement_name = row.implement.name if row.implement else None
    inventory_name = row.inventory_item.name if row.inventory_item else None
    linked = equipment_name or implement_name or inventory_name
    if row.category == 'general':
        linked = 'Общее'
    maintenance_asset_label = None
    if row.maintenance:
        if row.maintenance.equipment:
            maintenance_asset_label = row.maintenance.equipment.name
        elif row.maintenance.implement:
            maintenance_asset_label = row.maintenance.implement.name
    return PurchasePlannerResponse(
        id=row.id,
        org_id=row.org_id,
        title=row.title,
        category=row.category,
        equipment_id=row.equipment_id,
        implement_id=row.implement_id,
        inventory_item_id=row.inventory_item_id,
        equipment_name=equipment_name,
        implement_name=implement_name,
        inventory_item_name=inventory_name,
        linked_label=linked,
        urgency=row.urgency,
        status=row.status,
        purchase_place=row.purchase_place,
        responsible_id=row.responsible_id,
        responsible_name=row.responsible.full_name if row.responsible else None,
        estimated_cost=float(row.estimated_cost) if row.estimated_cost is not None else None,
        actual_cost=float(row.actual_cost) if row.actual_cost is not None else None,
        expense_id=row.expense_id,
        maintenance_id=row.maintenance_id,
        maintenance_checklist_item_id=row.maintenance_checklist_item_id,
        maintenance_asset_label=maintenance_asset_label,
        notes=row.notes,
        created_by=row.created_by,
        created_at=row.created_at,
        purchased_at=row.purchased_at,
    )


async def _get_item_or_404(
    db: AsyncSession, item_id: UUID, org_id: UUID
) -> PurchasePlannerItem:
    result = await db.execute(
        select(PurchasePlannerItem)
        .options(*_load_options())
        .where(PurchasePlannerItem.id == item_id, PurchasePlannerItem.org_id == org_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Пункт не найден')
    return row


async def _assert_refs(
    db: AsyncSession,
    org_id: UUID,
    *,
    equipment_id: UUID | None,
    implement_id: UUID | None,
    inventory_item_id: UUID | None,
    responsible_id: UUID | None,
) -> None:
    if equipment_id:
        eq = await db.get(Equipment, equipment_id)
        if eq is None or eq.org_id != org_id:
            raise HTTPException(status_code=404, detail='Техника не найдена')
    if implement_id:
        impl = await db.get(Implement, implement_id)
        if impl is None or impl.org_id != org_id:
            raise HTTPException(status_code=404, detail='Приспособление не найдено')
    if inventory_item_id:
        inv = await db.get(InventoryItem, inventory_item_id)
        if inv is None or inv.org_id != org_id:
            raise HTTPException(status_code=404, detail='ТМЦ не найдено')
    if responsible_id:
        emp = await db.get(Employee, responsible_id)
        if emp is None or emp.org_id != org_id:
            raise HTTPException(status_code=404, detail='Сотрудник не найден')


@router.get('/urgent', response_model=list[PurchasePlannerResponse])
async def list_urgent(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[PurchasePlannerResponse]:
    org_id = get_org_id(request)
    result = await db.execute(
        select(PurchasePlannerItem)
        .options(*_load_options())
        .where(
            PurchasePlannerItem.org_id == org_id,
            PurchasePlannerItem.status == 'planned',
            PurchasePlannerItem.urgency == 'urgent',
        )
        .order_by(PurchasePlannerItem.created_at.desc())
        .limit(50)
    )
    return [item_to_response(row) for row in result.scalars().all()]


@router.get('', response_model=list[PurchasePlannerResponse])
async def list_items(
    request: Request,
    status_filter: str | None = Query(None, alias='status'),
    urgency: str | None = None,
    category: str | None = None,
    responsible_id: UUID | None = None,
    equipment_id: UUID | None = None,
    implement_id: UUID | None = None,
    maintenance_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[PurchasePlannerResponse]:
    org_id = get_org_id(request)
    query = (
        select(PurchasePlannerItem)
        .options(*_load_options())
        .where(PurchasePlannerItem.org_id == org_id)
        .order_by(PurchasePlannerItem.created_at.desc())
    )
    if status_filter:
        query = query.where(PurchasePlannerItem.status == status_filter)
    if urgency:
        query = query.where(PurchasePlannerItem.urgency == urgency)
    if category:
        query = query.where(PurchasePlannerItem.category == category)
    if responsible_id:
        query = query.where(PurchasePlannerItem.responsible_id == responsible_id)
    if equipment_id:
        query = query.where(PurchasePlannerItem.equipment_id == equipment_id)
    if implement_id:
        query = query.where(PurchasePlannerItem.implement_id == implement_id)
    if maintenance_id:
        query = query.where(PurchasePlannerItem.maintenance_id == maintenance_id)
    result = await db.execute(query)
    return [item_to_response(row) for row in result.scalars().all()]


@router.post('', response_model=PurchasePlannerResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: Request,
    payload: PurchasePlannerCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PurchasePlannerResponse:
    org_id = get_org_id(request)
    await _assert_refs(
        db,
        org_id,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        inventory_item_id=payload.inventory_item_id,
        responsible_id=payload.responsible_id,
    )
    row = PurchasePlannerItem(
        org_id=org_id,
        title=payload.title.strip(),
        category=payload.category,
        equipment_id=payload.equipment_id,
        implement_id=payload.implement_id,
        inventory_item_id=payload.inventory_item_id,
        urgency=payload.urgency,
        status=payload.status,
        purchase_place=payload.purchase_place,
        responsible_id=payload.responsible_id,
        estimated_cost=(
            Decimal(str(payload.estimated_cost)) if payload.estimated_cost is not None else None
        ),
        notes=payload.notes,
        maintenance_id=payload.maintenance_id,
        maintenance_checklist_item_id=payload.maintenance_checklist_item_id,
        created_by=current.id,
    )
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='purchase_planner',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
        summary=f'Создана закупка: {row.title}',
    )
    await db.commit()
    clear_dashboard_cache()
    loaded = await _get_item_or_404(db, row.id, org_id)
    return item_to_response(loaded)


@router.patch('/{item_id}', response_model=PurchasePlannerResponse)
async def update_item(
    request: Request,
    item_id: UUID,
    payload: PurchasePlannerUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> PurchasePlannerResponse:
    org_id = get_org_id(request)
    row = await _get_item_or_404(db, item_id, org_id)
    before = model_snapshot(row)
    updates = payload.model_dump(exclude_unset=True)
    create_expense = bool(updates.pop('create_expense', False))
    expense_category = updates.pop('expense_category', None) or 'parts'

    # Merge category refs for validation when category changes
    if 'category' in updates:
        merged = {
            'category': updates['category'],
            'equipment_id': updates.get('equipment_id', row.equipment_id),
            'implement_id': updates.get('implement_id', row.implement_id),
            'inventory_item_id': updates.get('inventory_item_id', row.inventory_item_id),
        }
        # Clear non-matching refs when category switches
        cat = merged['category']
        if cat == 'equipment':
            updates.setdefault('implement_id', None)
            updates.setdefault('inventory_item_id', None)
        elif cat == 'implement':
            updates.setdefault('equipment_id', None)
            updates.setdefault('inventory_item_id', None)
        elif cat == 'inventory_item':
            updates.setdefault('equipment_id', None)
            updates.setdefault('implement_id', None)
        elif cat == 'general':
            updates.setdefault('equipment_id', None)
            updates.setdefault('implement_id', None)
            updates.setdefault('inventory_item_id', None)

    await _assert_refs(
        db,
        org_id,
        equipment_id=updates.get('equipment_id', row.equipment_id),
        implement_id=updates.get('implement_id', row.implement_id),
        inventory_item_id=updates.get('inventory_item_id', row.inventory_item_id),
        responsible_id=updates.get('responsible_id', row.responsible_id),
    )

    new_status = updates.get('status')
    for field, value in updates.items():
        if field in {'estimated_cost', 'actual_cost'} and value is not None:
            setattr(row, field, Decimal(str(value)))
        elif field == 'title' and value is not None:
            row.title = str(value).strip()
        else:
            setattr(row, field, value)

    if new_status == 'purchased' and row.purchased_at is None:
        row.purchased_at = datetime.now(timezone.utc)

    if create_expense and row.expense_id is None:
        amount = row.actual_cost if row.actual_cost is not None else row.estimated_cost
        if amount is not None and Decimal(str(amount)) > 0:
            expense = Expense(
                org_id=org_id,
                date=date.today(),
                category=expense_category or 'parts',
                amount=Decimal(str(amount)),
                description=f'Закупка: {row.title}',
                equipment_id=row.equipment_id,
                created_by=current.id,
            )
            db.add(expense)
            await db.flush()
            row.expense_id = expense.id
            if row.actual_cost is None:
                row.actual_cost = Decimal(str(amount))

    db.add(row)
    summary_verb = 'Куплена' if new_status == 'purchased' else 'Обновлена'
    await log_change(
        db,
        org_id=org_id,
        entity_type='purchase_planner',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary=_purchase_audit_summary(row, verb=summary_verb),
    )
    await db.commit()
    clear_dashboard_cache()
    return item_to_response(await _get_item_or_404(db, item_id, org_id))


@router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_item(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> Response:
    org_id = get_org_id(request)
    row = await _get_item_or_404(db, item_id, org_id)
    before = model_snapshot(row)
    await log_change(
        db,
        org_id=org_id,
        entity_type='purchase_planner',
        entity_id=row.id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.delete(row)
    await db.commit()
    clear_dashboard_cache()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

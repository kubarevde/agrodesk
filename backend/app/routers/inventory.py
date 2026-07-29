from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.inventory import (
    InventoryItem,
    InventoryOperation,
    InventoryOperationType,
)
from app.schemas.inventory import (
    EquipmentStockAction,
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryOperationCreate,
    InventoryOperationResponse,
)
from app.services.audit import log_change, model_snapshot
from app.services.action_permissions import require_action
from app.services.inventory import create_inventory_operation, create_opening_balance_operation
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('inventory'))])

_OPERATION_LOAD_OPTIONS = (
    selectinload(InventoryOperation.item),
    selectinload(InventoryOperation.equipment),
    selectinload(InventoryOperation.created_by_user),
)


def item_to_response(item: InventoryItem) -> InventoryItemResponse:
    category = item.category
    if hasattr(category, 'value'):
        category = category.value
    return InventoryItemResponse(
        id=item.id,
        org_id=item.org_id,
        name=item.name,
        category=str(category),
        unit=item.unit,
        current_stock=item.current_stock,
        min_stock=item.min_stock,
        total_capacity=item.total_capacity,
        is_active=item.is_active,
        is_critical=item.current_stock < item.min_stock,
    )


def operation_to_response(operation: InventoryOperation) -> InventoryOperationResponse:
    return InventoryOperationResponse(
        id=operation.id,
        date=operation.date,
        item_id=operation.item_id,
        item_name=operation.item.name if operation.item else '',
        type=operation.type.value,
        quantity=operation.quantity,
        stock_after=operation.stock_after,
        reason=operation.reason,
        supplier=operation.supplier,
        cost=operation.cost,
        created_by=operation.created_by,
        created_by_name=(
            operation.created_by_user.full_name if operation.created_by_user else None
        ),
        equipment_id=operation.equipment_id,
        purpose=operation.purpose or 'general',
        equipment_name=operation.equipment.name if operation.equipment else None,
    )


async def get_item_or_404(db: AsyncSession, item_id: UUID, org_id: UUID) -> InventoryItem:
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.org_id == org_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Позиция не найдена')
    return item


async def _load_operation(db: AsyncSession, operation_id: UUID) -> InventoryOperation:
    result = await db.execute(
        select(InventoryOperation)
        .options(*_OPERATION_LOAD_OPTIONS)
        .where(InventoryOperation.id == operation_id)
    )
    return result.scalar_one()


def _operations_query(org_id: UUID):
    return (
        select(InventoryOperation)
        .join(InventoryItem, InventoryOperation.item_id == InventoryItem.id)
        .options(*_OPERATION_LOAD_OPTIONS)
        .where(InventoryItem.org_id == org_id)
        .order_by(InventoryOperation.date.desc(), InventoryOperation.created_at.desc())
    )


@router.get('', response_model=list[InventoryItemResponse])
async def list_inventory(
    request: Request,
    category: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryItemResponse]:
    org_id = get_org_id(request)
    query = select(InventoryItem).where(InventoryItem.org_id == org_id)
    if category is not None:
        query = query.where(InventoryItem.category == category)
    if is_active is not None:
        query = query.where(InventoryItem.is_active == is_active)

    query = query.order_by(
        case((InventoryItem.current_stock < InventoryItem.min_stock, 0), else_=1),
        InventoryItem.name,
    )
    result = await db.execute(query)
    return [item_to_response(item) for item in result.scalars().all()]


@router.get('/operations', response_model=list[InventoryOperationResponse])
async def list_operations(
    request: Request,
    item_id: UUID | None = Query(None),
    equipment_id: UUID | None = Query(None),
    purpose: str | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    operation_type: InventoryOperationType | None = Query(None, alias='type'),
    exclude_opening: bool = Query(True),
    limit: int | None = Query(None, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryOperationResponse]:
    org_id = get_org_id(request)
    query = _operations_query(org_id)

    if item_id is not None:
        query = query.where(InventoryOperation.item_id == item_id)
    if equipment_id is not None:
        query = query.where(InventoryOperation.equipment_id == equipment_id)
    if purpose is not None:
        query = query.where(InventoryOperation.purpose == purpose)
    elif exclude_opening:
        query = query.where(InventoryOperation.purpose != 'opening')
    if from_date is not None:
        query = query.where(InventoryOperation.date >= from_date)
    if to_date is not None:
        query = query.where(InventoryOperation.date <= to_date)
    if operation_type is not None:
        query = query.where(InventoryOperation.type == operation_type)
    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    return [operation_to_response(operation) for operation in result.scalars().all()]


@router.post('/operations', response_model=InventoryOperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    request: Request,
    payload: InventoryOperationCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.operate')),
) -> InventoryOperationResponse:
    item = await get_item_or_404(db, payload.item_id, get_org_id(request))
    if not item.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Позиция неактивна')

    purpose = payload.purpose or 'general'
    if purpose == 'opening':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Начальный остаток задаётся при создании позиции, не через операции',
        )
    if purpose == 'adjustment' and not (payload.reason or '').strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для корректировки укажите причину',
        )

    operation = await create_inventory_operation(
        db,
        item=item,
        op_type=payload.type,
        quantity=Decimal(str(payload.quantity)),
        op_date=payload.date,
        created_by=current.id,
        reason=payload.reason,
        supplier=payload.supplier,
        cost=Decimal(str(payload.cost)) if payload.cost is not None else None,
        equipment_id=payload.equipment_id,
        purpose=purpose,
    )
    await log_change(
        db,
        org_id=item.org_id,
        entity_type='inventory_operation',
        entity_id=operation.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(operation),
    )
    await db.commit()
    return operation_to_response(await _load_operation(db, operation.id))


async def _stock_to_equipment(
    *,
    db: AsyncSession,
    org_id: UUID,
    equipment_id: UUID,
    payload: EquipmentStockAction,
    current: Employee,
    purpose: str,
    allowed_categories: set[str] | None,
) -> InventoryOperationResponse:
    from app.models.reference import Equipment

    equipment = await db.get(Equipment, equipment_id)
    if equipment is None or equipment.org_id != org_id or not equipment.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')

    item = await get_item_or_404(db, payload.item_id, org_id)
    if not item.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Позиция неактивна')
    if allowed_categories is not None and item.category not in allowed_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Неподходящая категория товара для этой операции',
        )

    reason_label = 'Заправка' if purpose == 'refuel' else 'Установка на технику'
    operation = await create_inventory_operation(
        db,
        item=item,
        op_type=InventoryOperationType.expense,
        quantity=Decimal(str(payload.quantity)),
        op_date=payload.date,
        created_by=current.id,
        reason=payload.comment or f'{reason_label}: {equipment.name}',
        equipment_id=equipment.id,
        purpose=purpose,
    )
    await log_change(
        db,
        org_id=org_id,
        entity_type='inventory_operation',
        entity_id=operation.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(operation),
    )
    await db.commit()
    return operation_to_response(await _load_operation(db, operation.id))


@router.post(
    '/equipment/{equipment_id}/refuel',
    response_model=InventoryOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def refuel_equipment(
    request: Request,
    equipment_id: UUID,
    payload: EquipmentStockAction,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.operate')),
) -> InventoryOperationResponse:
    return await _stock_to_equipment(
        db=db,
        org_id=get_org_id(request),
        equipment_id=equipment_id,
        payload=payload,
        current=current,
        purpose='refuel',
        allowed_categories={'fuel'},
    )


@router.post(
    '/equipment/{equipment_id}/install',
    response_model=InventoryOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def install_on_equipment(
    request: Request,
    equipment_id: UUID,
    payload: EquipmentStockAction,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.operate')),
) -> InventoryOperationResponse:
    return await _stock_to_equipment(
        db=db,
        org_id=get_org_id(request),
        equipment_id=equipment_id,
        payload=payload,
        current=current,
        purpose='install',
        allowed_categories={
            'parts',
            'chemicals',
            'other',
            'fertilizer',
        },
    )


@router.get('/{item_id}/operations', response_model=list[InventoryOperationResponse])
async def list_item_operations(
    request: Request,
    item_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    exclude_opening: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryOperationResponse]:
    org_id = get_org_id(request)
    await get_item_or_404(db, item_id, org_id)
    query = (
        _operations_query(org_id)
        .where(InventoryOperation.item_id == item_id)
    )
    if exclude_opening:
        query = query.where(InventoryOperation.purpose != 'opening')
    query = query.limit(limit)
    result = await db.execute(query)
    return [operation_to_response(operation) for operation in result.scalars().all()]


@router.get('/{item_id}', response_model=InventoryItemResponse)
async def get_inventory_item(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id, get_org_id(request))
    return item_to_response(item)


@router.post('', response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    request: Request,
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.manage_items')),
) -> InventoryItemResponse:
    item = InventoryItem(
        org_id=get_org_id(request),
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        current_stock=payload.current_stock,
        min_stock=payload.min_stock,
        total_capacity=payload.total_capacity or Decimal('0'),
        is_active=True,
    )
    db.add(item)
    try:
        await db.flush()
        await create_opening_balance_operation(db, item=item, created_by=current.id)
        await log_change(
            db,
            org_id=item.org_id,
            entity_type='inventory_item',
            entity_id=item.id,
            action='create',
            changed_by=current.id,
            after=model_snapshot(item),
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция с таким названием уже существует',
        ) from None
    await db.refresh(item)
    return item_to_response(item)


@router.patch('/{item_id}', response_model=InventoryItemResponse)
async def update_inventory_item(
    request: Request,
    item_id: UUID,
    payload: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.manage_items')),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id, get_org_id(request))
    before = model_snapshot(item)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.add(item)
    try:
        await log_change(
            db,
            org_id=item.org_id,
            entity_type='inventory_item',
            entity_id=item.id,
            action='update',
            changed_by=current.id,
            before=before,
            after=model_snapshot(item),
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция с таким названием уже существует',
        ) from None
    await db.refresh(item)
    return item_to_response(item)


@router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_inventory_item(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.manage_items')),
) -> Response:
    """Archive item (soft delete). History of operations is always preserved."""
    item = await get_item_or_404(db, item_id, get_org_id(request))
    before = model_snapshot(item)
    item.is_active = False
    db.add(item)
    await log_change(
        db,
        org_id=item.org_id,
        entity_type='inventory_item',
        entity_id=item.id,
        action='delete',
        changed_by=current.id,
        before=before,
        after=model_snapshot(item),
        summary=f'Позиция ТМЦ «{item.name}» архивирована (история операций сохранена)',
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
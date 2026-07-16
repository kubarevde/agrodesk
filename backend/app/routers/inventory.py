from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
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

router = APIRouter()


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
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryOperationResponse]:
    org_id = get_org_id(request)
    query = (
        select(InventoryOperation)
        .join(InventoryItem, InventoryOperation.item_id == InventoryItem.id)
        .options(
            selectinload(InventoryOperation.item),
            selectinload(InventoryOperation.equipment),
        )
        .where(InventoryItem.org_id == org_id)
        .order_by(InventoryOperation.date.desc(), InventoryOperation.created_at.desc())
    )

    if item_id is not None:
        query = query.where(InventoryOperation.item_id == item_id)
    if equipment_id is not None:
        query = query.where(InventoryOperation.equipment_id == equipment_id)
    if purpose is not None:
        query = query.where(InventoryOperation.purpose == purpose)
    if from_date is not None:
        query = query.where(InventoryOperation.date >= from_date)
    if to_date is not None:
        query = query.where(InventoryOperation.date <= to_date)
    if operation_type is not None:
        query = query.where(InventoryOperation.type == operation_type)

    result = await db.execute(query)
    return [operation_to_response(operation) for operation in result.scalars().all()]


@router.post('/operations', response_model=InventoryOperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    request: Request,
    payload: InventoryOperationCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> InventoryOperationResponse:
    item = await get_item_or_404(db, payload.item_id, get_org_id(request))
    if not item.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Позиция неактивна')

    if payload.type == InventoryOperationType.expense:
        if item.current_stock < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Недостаточно запасов',
            )
        new_stock = item.current_stock - payload.quantity
    else:
        new_stock = item.current_stock + payload.quantity

    operation = InventoryOperation(
        date=payload.date or datetime.now().date(),
        item_id=item.id,
        type=payload.type,
        quantity=payload.quantity,
        stock_after=new_stock,
        reason=payload.reason,
        supplier=payload.supplier,
        cost=payload.cost,
        created_by=current.id,
        equipment_id=payload.equipment_id,
        purpose=payload.purpose or 'general',
    )
    item.current_stock = new_stock

    db.add(operation)
    db.add(item)
    await db.commit()

    result = await db.execute(
        select(InventoryOperation)
        .options(
            selectinload(InventoryOperation.item),
            selectinload(InventoryOperation.equipment),
        )
        .where(InventoryOperation.id == operation.id)
    )
    operation = result.scalar_one()
    return operation_to_response(operation)


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
    if item.current_stock < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Недостаточно запасов (доступно {float(item.current_stock):g} {item.unit})',
        )

    new_stock = item.current_stock - payload.quantity
    op_date = payload.date or datetime.now().date()
    reason_label = 'Заправка' if purpose == 'refuel' else 'Установка на технику'
    operation = InventoryOperation(
        date=op_date,
        item_id=item.id,
        type=InventoryOperationType.expense,
        quantity=payload.quantity,
        stock_after=new_stock,
        reason=payload.comment or f'{reason_label}: {equipment.name}',
        created_by=current.id,
        equipment_id=equipment.id,
        purpose=purpose,
    )
    item.current_stock = new_stock
    db.add(operation)
    db.add(item)
    await db.commit()

    result = await db.execute(
        select(InventoryOperation)
        .options(
            selectinload(InventoryOperation.item),
            selectinload(InventoryOperation.equipment),
        )
        .where(InventoryOperation.id == operation.id)
    )
    return operation_to_response(result.scalar_one())


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
    current: Employee = Depends(require_manager),
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
    current: Employee = Depends(require_manager),
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
    _: Employee = Depends(require_manager),
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
    _: Employee = Depends(require_manager),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id, get_org_id(request))

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция с таким названием уже существует',
        ) from None
    await db.refresh(item)
    return item_to_response(item)


@router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> None:
    item = await get_item_or_404(db, item_id, get_org_id(request))
    item.is_active = False
    db.add(item)
    await db.commit()

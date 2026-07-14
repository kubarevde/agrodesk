from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.models.employee import Employee
from app.models.inventory import (
    InventoryCategory,
    InventoryItem,
    InventoryOperation,
    InventoryOperationType,
)
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryOperationCreate,
    InventoryOperationResponse,
)

router = APIRouter()


def item_to_response(item: InventoryItem) -> InventoryItemResponse:
    return InventoryItemResponse(
        id=item.id,
        name=item.name,
        category=item.category.value,
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
        item_name=operation.item.name,
        type=operation.type.value,
        quantity=operation.quantity,
        stock_after=operation.stock_after,
        reason=operation.reason,
        supplier=operation.supplier,
        cost=operation.cost,
        created_by=operation.created_by,
    )


async def get_item_or_404(db: AsyncSession, item_id: UUID) -> InventoryItem:
    item = await db.get(InventoryItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Позиция не найдена')
    return item


@router.get('', response_model=list[InventoryItemResponse])
async def list_inventory(
    category: InventoryCategory | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryItemResponse]:
    query = select(InventoryItem)
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
    item_id: UUID | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    operation_type: InventoryOperationType | None = Query(None, alias='type'),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryOperationResponse]:
    query = (
        select(InventoryOperation)
        .options(selectinload(InventoryOperation.item))
        .order_by(InventoryOperation.date.desc(), InventoryOperation.created_at.desc())
    )

    if item_id is not None:
        query = query.where(InventoryOperation.item_id == item_id)
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
    payload: InventoryOperationCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> InventoryOperationResponse:
    item = await get_item_or_404(db, payload.item_id)
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
    )
    item.current_stock = new_stock

    db.add(operation)
    db.add(item)
    await db.commit()

    result = await db.execute(
        select(InventoryOperation)
        .options(selectinload(InventoryOperation.item))
        .where(InventoryOperation.id == operation.id)
    )
    operation = result.scalar_one()
    return operation_to_response(operation)


@router.get('/{item_id}', response_model=InventoryItemResponse)
async def get_inventory_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id)
    return item_to_response(item)


@router.post('', response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> InventoryItemResponse:
    item = InventoryItem(
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
    item_id: UUID,
    payload: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id)

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
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> None:
    item = await get_item_or_404(db, item_id)
    item.is_active = False
    db.add(item)
    await db.commit()

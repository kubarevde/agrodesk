from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.dictionary import OrgDictionary
from app.models.employee import Employee
from app.models.inventory import (
    InventoryItem,
    InventoryOperation,
    InventoryOperationType,
)
from app.schemas.inventory import (
    EquipmentStockAction,
    InventoryItemArchiveRequest,
    InventoryItemCreate,
    InventoryItemDeleteRequest,
    InventoryItemResponse,
    InventoryItemRestoreRequest,
    InventoryItemUpdate,
    InventoryOperationCreate,
    InventoryOperationResponse,
)
from app.services.audit import log_change, model_snapshot
from app.services.action_permissions import require_action
from app.services.harvest_inventory import (
    is_harvest_inventory_category,
    resolve_inventory_crop_code,
)
from app.services.inventory import create_inventory_operation, create_opening_balance_operation
from app.services.inventory_archive import (
    archive_item,
    can_hard_delete,
    count_item_links,
    hard_delete_item,
    restore_item,
)
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('inventory'))])

_OPERATION_LOAD_OPTIONS = (
    selectinload(InventoryOperation.item),
    selectinload(InventoryOperation.equipment),
    selectinload(InventoryOperation.created_by_user),
    selectinload(InventoryOperation.field),
)


def item_to_response(
    item: InventoryItem,
    *,
    variety_name: str | None = None,
    archived_by_name: str | None = None,
    can_hard_delete_flag: bool | None = None,
) -> InventoryItemResponse:
    category = item.category
    if hasattr(category, 'value'):
        category = category.value
    category_str = str(category)
    return InventoryItemResponse(
        id=item.id,
        org_id=item.org_id,
        name=item.name,
        category=category_str,
        unit=item.unit,
        current_stock=item.current_stock,
        min_stock=item.min_stock,
        total_capacity=item.total_capacity,
        is_active=item.is_active,
        is_critical=item.current_stock < item.min_stock,
        crop_code=item.crop_code,
        variety_id=getattr(item, 'variety_id', None),
        variety_name=variety_name,
        is_harvest=is_harvest_inventory_category(category_str),
        archived_at=getattr(item, 'archived_at', None),
        archived_by=getattr(item, 'archived_by', None),
        archived_by_name=archived_by_name,
        archive_reason=getattr(item, 'archive_reason', None),
        can_hard_delete=can_hard_delete_flag,
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
        field_id=operation.field_id,
        field_name=operation.field.name if operation.field else None,
    )


async def _variety_name_for(
    db: AsyncSession, org_id: UUID, variety_id: UUID | None
) -> str | None:
    if variety_id is None:
        return None
    from app.models.crop_variety import CropVariety

    var = await db.get(CropVariety, variety_id)
    if var is None or var.org_id != org_id:
        return None
    return var.name


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
    is_active: bool | None = Query(
        None,
        description='Legacy filter; prefer status=active|archived|all',
    ),
    status_filter: str | None = Query(
        None,
        alias='status',
        description='active (default) | archived | all',
        pattern='^(active|archived|all)$',
    ),
    search: str | None = Query(
        None,
        description='Filter by name; for harvest also crop_code / crop dictionary name',
    ),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[InventoryItemResponse]:
    org_id = get_org_id(request)
    query = (
        select(InventoryItem)
        .options(selectinload(InventoryItem.archived_by_user))
        .where(InventoryItem.org_id == org_id)
    )
    if category is not None:
        query = query.where(InventoryItem.category == category)

    if status_filter == 'archived':
        query = query.where(InventoryItem.is_active.is_(False))
    elif status_filter == 'all':
        pass
    elif status_filter == 'active':
        query = query.where(InventoryItem.is_active.is_(True))
    elif is_active is not None:
        query = query.where(InventoryItem.is_active == is_active)
    else:
        # Default: active only (safe for selects / main warehouse list).
        query = query.where(InventoryItem.is_active.is_(True))

    term = (search or '').strip()
    if term:
        pattern = f'%{term}%'
        crop_name_codes = (
            select(OrgDictionary.code)
            .where(
                OrgDictionary.org_id == org_id,
                OrgDictionary.type == 'crop',
                OrgDictionary.name.ilike(pattern),
            )
            .scalar_subquery()
        )
        harvest_match = and_(
            func.lower(InventoryItem.category) == 'harvest',
            or_(
                InventoryItem.crop_code.ilike(pattern),
                InventoryItem.crop_code.in_(crop_name_codes),
            ),
        )
        query = query.where(or_(InventoryItem.name.ilike(pattern), harvest_match))

    query = query.order_by(
        case((InventoryItem.current_stock < InventoryItem.min_stock, 0), else_=1),
        InventoryItem.name,
    )
    result = await db.execute(query)
    items = list(result.scalars().all())
    variety_ids = {item.variety_id for item in items if getattr(item, 'variety_id', None)}
    variety_names: dict = {}
    if variety_ids:
        from app.models.crop_variety import CropVariety

        rows = (
            await db.execute(
                select(CropVariety.id, CropVariety.name).where(
                    CropVariety.org_id == org_id,
                    CropVariety.id.in_(list(variety_ids)),
                )
            )
        ).all()
        variety_names = {vid: str(name) for vid, name in rows}
    return [
        item_to_response(
            item,
            variety_name=variety_names.get(item.variety_id) if item.variety_id else None,
            archived_by_name=(
                item.archived_by_user.full_name if item.archived_by_user else None
            ),
        )
        for item in items
    ]


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
    org_id = get_org_id(request)
    item = await get_item_or_404(db, item_id, org_id)
    return item_to_response(
        item,
        variety_name=await _variety_name_for(db, org_id, getattr(item, 'variety_id', None)),
    )


@router.post('', response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    request: Request,
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.manage_items')),
) -> InventoryItemResponse:
    org_id = get_org_id(request)
    crop_code = await resolve_inventory_crop_code(
        db,
        org_id,
        category=payload.category,
        crop_code=payload.crop_code,
    )
    variety_id = payload.variety_id
    if variety_id is not None:
        from app.services.field_planting_service import assert_variety_for_crop

        if not crop_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сорт можно указать только вместе с культурой',
            )
        await assert_variety_for_crop(
            db, org_id=org_id, crop_code=crop_code, variety_id=variety_id
        )
    elif not is_harvest_inventory_category(payload.category):
        variety_id = None

    item = InventoryItem(
        org_id=org_id,
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        current_stock=payload.current_stock,
        min_stock=payload.min_stock,
        total_capacity=payload.total_capacity or Decimal('0'),
        is_active=True,
        crop_code=crop_code,
        variety_id=variety_id,
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
    return item_to_response(
        item,
        variety_name=await _variety_name_for(db, org_id, getattr(item, 'variety_id', None)),
    )


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

    data = payload.model_dump(exclude_unset=True)
    if 'is_active' in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'Для архивирования используйте POST /api/inventory/{id}/archive, '
                'для восстановления — POST /api/inventory/{id}/restore'
            ),
        )
    clear_variety = bool(data.pop('clear_variety', False))
    org_id = get_org_id(request)
    next_category = data.get('category', item.category)
    category_changed = (
        'category' in data
        and str(data.get('category') or '') != str(item.category or '')
    )
    if 'crop_code' in data:
        # Explicit crop_code from client (including null) — validate against target category.
        data['crop_code'] = await resolve_inventory_crop_code(
            db,
            org_id,
            category=str(next_category) if next_category is not None else None,
            crop_code=data['crop_code']
            if isinstance(data['crop_code'], str) or data['crop_code'] is None
            else str(data['crop_code']),
        )
    elif category_changed:
        # Category switched — re-validate existing crop against the new category.
        data['crop_code'] = await resolve_inventory_crop_code(
            db,
            org_id,
            category=str(next_category) if next_category is not None else None,
            crop_code=item.crop_code,
        )
    elif (
        is_harvest_inventory_category(str(next_category))
        and not (item.crop_code or '').strip()
    ):
        # Updating a harvest SKU that still has no crop — client must send crop_code.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для позиций «Урожай на складе» необходимо указать культуру.',
        )

    if not is_harvest_inventory_category(str(next_category)):
        data['variety_id'] = None
    elif clear_variety:
        data['variety_id'] = None
    elif 'variety_id' in data and data['variety_id'] is not None:
        from app.services.field_planting_service import assert_variety_for_crop

        next_crop = data.get('crop_code', item.crop_code)
        if not next_crop:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сорт можно указать только вместе с культурой',
            )
        await assert_variety_for_crop(
            db, org_id=org_id, crop_code=str(next_crop), variety_id=data['variety_id']
        )

    # If category is resent unchanged, crop already set, crop_code omitted — keep as-is.
    for field, value in data.items():
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
    return item_to_response(
        item,
        variety_name=await _variety_name_for(db, org_id, getattr(item, 'variety_id', None)),
    )


@router.get('/{item_id}/archive-eligibility')
async def inventory_item_archive_eligibility(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_action('inventory.delete_or_archive')),
) -> dict:
    """UI helper: stock/history gates for archive vs hard delete."""
    item = await get_item_or_404(db, item_id, get_org_id(request))
    links = await count_item_links(db, item.id)
    stock = float(item.current_stock or 0)
    return {
        'item_id': str(item.id),
        'name': item.name,
        'current_stock': stock,
        'is_active': item.is_active,
        'stock_blocks': stock > 0,
        'has_history': links.has_history,
        'can_hard_delete': can_hard_delete(item, links),
        'can_archive': bool(item.is_active) and stock <= 0,
        'links': {
            'operations': links.operations,
            'shipment_requests': links.shipment_requests,
            'tmc_shipments': links.tmc_shipments,
            'purchase_planner_items': links.purchase_planner_items,
            'marketplace_listings': links.marketplace_listings,
        },
    }


@router.post('/{item_id}/archive', response_model=InventoryItemResponse)
async def archive_inventory_item(
    request: Request,
    item_id: UUID,
    payload: InventoryItemArchiveRequest,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.delete_or_archive')),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id, get_org_id(request))
    before = model_snapshot(item)
    stock_before = float(item.current_stock or 0)
    await archive_item(db, item=item, reason=payload.reason, actor_id=current.id)
    await log_change(
        db,
        org_id=item.org_id,
        entity_type='inventory_item',
        entity_id=item.id,
        action='archive',
        changed_by=current.id,
        before=before,
        after=model_snapshot(item),
        summary=(
            f'Позиция ТМЦ «{item.name}» архивирована. '
            f'Остаток на момент: {stock_before}. Причина: {payload.reason.strip()}'
        ),
    )
    await db.commit()
    await db.refresh(item)
    links = await count_item_links(db, item.id)
    return item_to_response(
        item,
        variety_name=await _variety_name_for(
            db, item.org_id, getattr(item, 'variety_id', None)
        ),
        archived_by_name=current.full_name,
        can_hard_delete_flag=can_hard_delete(item, links),
    )


@router.post('/{item_id}/restore', response_model=InventoryItemResponse)
async def restore_inventory_item(
    request: Request,
    item_id: UUID,
    payload: InventoryItemRestoreRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.delete_or_archive')),
) -> InventoryItemResponse:
    item = await get_item_or_404(db, item_id, get_org_id(request))
    before = model_snapshot(item)
    await restore_item(db, item=item)
    comment = (payload.comment or '').strip() if payload else ''
    summary = f'Позиция ТМЦ «{item.name}» восстановлена из архива'
    if comment:
        summary = f'{summary}. Комментарий: {comment}'
    await log_change(
        db,
        org_id=item.org_id,
        entity_type='inventory_item',
        entity_id=item.id,
        action='restore',
        changed_by=current.id,
        before=before,
        after=model_snapshot(item),
        summary=summary,
    )
    await db.commit()
    await db.refresh(item, attribute_names=['archived_by_user'])
    return item_to_response(
        item,
        variety_name=await _variety_name_for(
            db, item.org_id, getattr(item, 'variety_id', None)
        ),
        archived_by_name=(
            item.archived_by_user.full_name
            if getattr(item, 'archived_by_user', None)
            else None
        ),
    )


@router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_inventory_item(
    request: Request,
    item_id: UUID,
    payload: InventoryItemDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.delete_or_archive')),
) -> Response:
    """Hard delete only when item has no history and zero stock."""
    item = await get_item_or_404(db, item_id, get_org_id(request))
    before = model_snapshot(item)
    name = item.name
    stock_before = float(item.current_stock or 0)
    item_uuid = item.id
    org_id = item.org_id
    await hard_delete_item(db, item=item)
    await log_change(
        db,
        org_id=org_id,
        entity_type='inventory_item',
        entity_id=item_uuid,
        action='delete',
        changed_by=current.id,
        before=before,
        after=None,
        summary=(
            f'Позиция ТМЦ «{name}» удалена безвозвратно. '
            f'Остаток: {stock_before}. Причина: {payload.reason.strip()}'
        ),
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
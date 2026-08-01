"""Shipment request business logic — fulfillment posts via inventory service only."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.inventory import InventoryItem, InventoryOperationType
from app.models.shift import Shift, ShiftStatus
from app.models.shipment_request import (
    ShipmentRequest,
    ShipmentRequestAttachment,
    ShipmentRequestStatus,
)
from app.services.harvest_inventory import (
    is_harvest_inventory_category,
    request_kind_for_category,
)
from app.schemas.shipment_requests import (
    ShipmentRequestAttachmentOut,
    ShipmentRequestCreate,
    ShipmentRequestResponse,
    ShipmentRequestUpdate,
)
from app.services.action_permissions import employee_has_action
from app.services.inventory import (
    PURPOSE_SHIPMENT_REQUEST,
    create_inventory_operation,
)

EDITABLE_STATUSES = {ShipmentRequestStatus.new.value, ShipmentRequestStatus.in_progress.value}
ACTIVE_STATUSES = {ShipmentRequestStatus.new.value, ShipmentRequestStatus.in_progress.value}


def load_options():
    return (
        selectinload(ShipmentRequest.inventory_item),
        selectinload(ShipmentRequest.creator),
        selectinload(ShipmentRequest.assignee),
        selectinload(ShipmentRequest.attachments),
    )


def to_response(row: ShipmentRequest) -> ShipmentRequestResponse:
    item = row.inventory_item
    category = str(item.category) if item is not None else None
    if category is not None and hasattr(item.category, 'value'):
        category = str(item.category.value)
    return ShipmentRequestResponse(
        id=row.id,
        org_id=row.org_id,
        inventory_item_id=row.inventory_item_id,
        inventory_item_name=item.name if item else None,
        inventory_item_unit=item.unit if item else None,
        inventory_item_category=category,
        crop_code=item.crop_code if item else None,
        is_harvest=is_harvest_inventory_category(category),
        kind=row.kind or request_kind_for_category(category),
        customer_name=row.customer_name,
        quantity=row.quantity,
        price=row.price,
        planned_at=row.planned_at,
        priority=row.priority,
        status=row.status,
        created_by=row.created_by,
        created_by_name=row.creator.full_name if row.creator else None,
        assigned_to=row.assigned_to,
        assigned_to_name=row.assignee.full_name if row.assignee else None,
        completed_at=row.completed_at,
        shift_id=row.shift_id,
        inventory_operation_id=row.inventory_operation_id,
        cancel_reason=row.cancel_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
        attachments=[
            ShipmentRequestAttachmentOut.model_validate(att)
            for att in (row.attachments or [])
        ],
    )


async def get_request_or_404(
    db: AsyncSession,
    request_id: UUID,
    org_id: UUID,
) -> ShipmentRequest:
    result = await db.execute(
        select(ShipmentRequest)
        .options(*load_options())
        .where(ShipmentRequest.id == request_id, ShipmentRequest.org_id == org_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Заявка не найдена')
    return row


async def get_inventory_item_or_400(
    db: AsyncSession,
    item_id: UUID,
    org_id: UUID,
) -> InventoryItem:
    item = await db.get(InventoryItem, item_id)
    if item is None or item.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Позиция ТМЦ не найдена')
    if not item.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Позиция ТМЦ неактивна')
    return item


async def get_employee_in_org_or_400(
    db: AsyncSession,
    employee_id: UUID,
    org_id: UUID,
) -> Employee:
    employee = await db.get(Employee, employee_id)
    if employee is None or employee.org_id != org_id or not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник не найден в организации',
        )
    return employee


def can_manage(effective: dict) -> bool:
    return employee_has_action(effective, 'shipment_requests.manage')


def can_execute(effective: dict) -> bool:
    return employee_has_action(effective, 'shipment_requests.execute')


def is_visible_to_executor(row: ShipmentRequest, current: Employee) -> bool:
    return row.assigned_to is None or row.assigned_to == current.id


def assert_can_view_request(
    row: ShipmentRequest,
    current: Employee,
    effective: dict,
) -> None:
    if can_manage(effective):
        return
    if not can_execute(effective):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав для просмотра заявки',
        )
    if not is_visible_to_executor(row, current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Заявка назначена другому исполнителю',
        )


def assert_can_execute_request(
    row: ShipmentRequest,
    current: Employee,
    effective: dict,
) -> None:
    if can_manage(effective):
        return
    if not can_execute(effective):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав для исполнения заявки',
        )
    if not is_visible_to_executor(row, current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Заявка назначена другому исполнителю',
        )


def _attachment_filename(image_url: str) -> str:
    name = image_url.rstrip('/').rsplit('/', 1)[-1].strip()
    return name[:255] if name else 'attachment.jpg'


def add_attachments(
    db: AsyncSession,
    *,
    row: ShipmentRequest,
    current: Employee,
    image_urls: list[str],
) -> None:
    for raw_url in image_urls:
        url = str(raw_url or '').strip()
        if not url:
            continue
        if not url.startswith('/uploads/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Некорректный URL вложения',
            )
        db.add(
            ShipmentRequestAttachment(
                id=uuid4(),
                org_id=row.org_id,
                request_id=row.id,
                image_url=url[:500],
                filename=_attachment_filename(url),
                uploaded_by=current.id,
            )
        )


async def assert_stock_sufficient_for_complete(
    item: InventoryItem,
    quantity: Decimal,
) -> None:
    """Hard gate for complete only — create/update may exceed current stock (future harvest)."""
    stock = Decimal(str(item.current_stock or 0))
    qty = Decimal(str(quantity))
    if qty > stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'Недостаточно товара для выполнения заявки: '
                f'доступно {stock}, требуется {qty}'
            ),
        )


async def create_request(
    db: AsyncSession,
    *,
    org_id: UUID,
    current: Employee,
    payload: ShipmentRequestCreate,
) -> ShipmentRequest:
    """Create intent only — no stock write-off and no stock sufficiency check.

    Quantity may exceed current_stock (e.g. planned shipment after harvest).
    Stock is enforced on complete.
    """
    item = await get_inventory_item_or_400(db, payload.inventory_item_id, org_id)
    if not item.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция ТМЦ неактивна',
        )
    category = str(item.category) if item.category is not None else None
    if category is not None and hasattr(item.category, 'value'):
        category = str(item.category.value)

    assigned_to = payload.assigned_to
    if assigned_to is not None:
        await get_employee_in_org_or_400(db, assigned_to, org_id)

    row = ShipmentRequest(
        org_id=org_id,
        inventory_item_id=payload.inventory_item_id,
        kind=request_kind_for_category(category),
        customer_name=payload.customer_name.strip(),
        quantity=Decimal(str(payload.quantity)),
        price=Decimal(str(payload.price)),
        planned_at=payload.planned_at,
        priority=payload.priority,
        status=ShipmentRequestStatus.new.value,
        created_by=current.id,
        assigned_to=assigned_to,
    )
    db.add(row)
    await db.flush()
    return await get_request_or_404(db, row.id, org_id)


async def update_request(
    db: AsyncSession,
    row: ShipmentRequest,
    payload: ShipmentRequestUpdate,
) -> ShipmentRequest:
    """Edit intent fields — quantity is not limited by current stock (same as create)."""
    if row.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя изменить выполненную или отменённую заявку',
        )
    data = payload.model_dump(exclude_unset=True)
    if 'quantity' in data and data['quantity'] is not None:
        row.quantity = Decimal(str(data['quantity']))
    if 'customer_name' in data and data['customer_name'] is not None:
        row.customer_name = str(data['customer_name']).strip()
    if 'price' in data and data['price'] is not None:
        row.price = Decimal(str(data['price']))
    if 'planned_at' in data and data['planned_at'] is not None:
        row.planned_at = data['planned_at']
    if 'priority' in data and data['priority'] is not None:
        row.priority = data['priority']
    db.add(row)
    await db.flush()
    return await get_request_or_404(db, row.id, row.org_id)


async def assign_request(
    db: AsyncSession,
    row: ShipmentRequest,
    assigned_to: UUID,
) -> ShipmentRequest:
    if row.status not in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нельзя назначить исполнителя для этой заявки',
        )
    await get_employee_in_org_or_400(db, assigned_to, row.org_id)
    row.assigned_to = assigned_to
    db.add(row)
    await db.flush()
    return await get_request_or_404(db, row.id, row.org_id)


async def start_request(
    db: AsyncSession,
    row: ShipmentRequest,
    current: Employee,
    effective: dict,
) -> ShipmentRequest:
    assert_can_execute_request(row, current, effective)
    if row.status != ShipmentRequestStatus.new.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Заявку можно взять в работу только из статуса «new»',
        )
    if row.assigned_to is None:
        row.assigned_to = current.id
    row.status = ShipmentRequestStatus.in_progress.value
    db.add(row)
    await db.flush()
    return await get_request_or_404(db, row.id, row.org_id)


async def find_open_shift_id(
    db: AsyncSession,
    *,
    employee_id: UUID,
    org_id: UUID,
) -> UUID | None:
    """Optional link: open shift of the executor at complete time (null if none)."""
    result = await db.execute(
        select(Shift.id)
        .where(
            Shift.employee_id == employee_id,
            Shift.org_id == org_id,
            Shift.status == ShiftStatus.open,
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def complete_request(
    db: AsyncSession,
    row: ShipmentRequest,
    current: Employee,
    effective: dict,
    image_urls: list[str] | None = None,
) -> ShipmentRequest:
    """Mark done and post a single expense via create_inventory_operation.

    Applies to both kind=inventory and kind=harvest (harvest-as-SKU stock write-off).
    Never inserts into ``shipments`` (crop KPI domain stays separate).
    Insufficient stock → HTTP 400 from inventory service (nothing is written off).
    Link is stored on shipment_requests.inventory_operation_id (not on operations table).
    Logical source: purpose='shipment_request', reason includes request id.
    If the executor has an open shift, shift_id is set (never required).
    """
    assert_can_execute_request(row, current, effective)
    if row.status != ShipmentRequestStatus.in_progress.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Выполнить можно только заявку в статусе «in_progress»',
        )
    if row.inventory_operation_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='По этой заявке уже создана операция склада',
        )

    item = await get_inventory_item_or_400(db, row.inventory_item_id, row.org_id)
    qty = Decimal(str(row.quantity))
    await assert_stock_sufficient_for_complete(item, qty)
    unit_price = Decimal(str(row.price))
    total_cost = (qty * unit_price).quantize(Decimal('0.01'))

    operation = await create_inventory_operation(
        db,
        item=item,
        op_type=InventoryOperationType.expense,
        quantity=qty,
        op_date=date.today(),
        created_by=current.id,
        reason=f'Заявка на отгрузку {row.id}',
        supplier=row.customer_name,
        cost=total_cost,
        purpose=PURPOSE_SHIPMENT_REQUEST,
    )

    open_shift_id = await find_open_shift_id(db, employee_id=current.id, org_id=row.org_id)

    row.status = ShipmentRequestStatus.done.value
    row.completed_at = datetime.now(timezone.utc)
    row.inventory_operation_id = operation.id
    row.shift_id = open_shift_id
    if row.assigned_to is None:
        row.assigned_to = current.id
    db.add(row)
    add_attachments(db, row=row, current=current, image_urls=list(image_urls or []))
    await db.flush()
    db.expire(row, ['attachments'])
    return await get_request_or_404(db, row.id, row.org_id)


async def cancel_request(
    db: AsyncSession,
    row: ShipmentRequest,
    *,
    reason: str,
) -> ShipmentRequest:
    if row.status not in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Отменить можно только активную заявку',
        )
    text = (reason or '').strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Укажите причину отмены',
        )
    row.status = ShipmentRequestStatus.cancelled.value
    row.cancel_reason = text[:2000]
    db.add(row)
    await db.flush()
    return await get_request_or_404(db, row.id, row.org_id)

"""TMC (non-harvest) managerial shipments API — table `tmc_shipments` only.

Parallel to crop `shipments`: no inventory_operations on create/update/delete.
Optional `shipment_request_id` → done inventory (non-harvest) request only.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.inventory import InventoryItem
from app.models.shipment_request import ShipmentRequest, ShipmentRequestStatus
from app.models.tmc_shipment import TmcShipment
from app.schemas.tmc_shipment import TmcShipmentCreate, TmcShipmentResponse, TmcShipmentUpdate
from app.services.audit import log_change, model_snapshot
from app.services.dashboard import clear_dashboard_cache
from app.services.harvest_inventory import (
    REQUEST_KIND_INVENTORY,
    is_harvest_inventory_category,
)
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('shipments'))])
logger = logging.getLogger(__name__)


def calc_total_sum(quantity: Decimal, price_per_unit: Decimal | None) -> Decimal | None:
    if price_per_unit is None:
        return None
    return quantity * price_per_unit


def tmc_shipment_to_response(row: TmcShipment) -> TmcShipmentResponse:
    return TmcShipmentResponse(
        id=row.id,
        org_id=row.org_id,
        date=row.date,
        inventory_item_id=row.inventory_item_id,
        item_name=row.item_name,
        category=row.category,
        unit=row.unit,
        quantity=row.quantity,
        destination=row.destination,
        price_per_unit=row.price_per_unit,
        notes=row.notes,
        total_sum=calc_total_sum(row.quantity, row.price_per_unit),
        shipment_request_id=row.shipment_request_id,
    )


async def get_tmc_shipment_or_404(
    db: AsyncSession, shipment_id: UUID, org_id: UUID
) -> TmcShipment:
    result = await db.execute(
        select(TmcShipment).where(TmcShipment.id == shipment_id, TmcShipment.org_id == org_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Отгрузка ТМЦ не найдена')
    return row


async def resolve_inventory_item(
    db: AsyncSession, *, org_id: UUID, item_id: UUID
) -> InventoryItem:
    item = await db.get(InventoryItem, item_id)
    if item is None or item.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция склада не найдена',
        )
    if is_harvest_inventory_category(item.category):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для урожая используйте вкладку «Отгрузки урожая»',
        )
    if item.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция склада неактивна',
        )
    return item


async def resolve_inventory_request_id(
    db: AsyncSession,
    *,
    org_id: UUID,
    request_id: UUID | None,
    inventory_item_id: UUID | None = None,
) -> UUID | None:
    """Allow link only to done inventory (non-harvest) requests."""
    if request_id is None:
        return None
    row = await db.get(ShipmentRequest, request_id)
    if row is None or row.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Заявка на отгрузку не найдена в организации',
        )
    kind = (row.kind or '').strip().lower()
    if kind != REQUEST_KIND_INVENTORY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='К отгрузке ТМЦ можно привязать только заявку на ТМЦ (не урожай)',
        )
    if row.status != ShipmentRequestStatus.done.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Привязать можно только выполненную заявку',
        )
    if inventory_item_id is not None and row.inventory_item_id != inventory_item_id:
        logger.warning(
            'tmc_shipment↔request item mismatch request_id=%s request_item=%s shipment_item=%s',
            row.id,
            row.inventory_item_id,
            inventory_item_id,
        )
    return request_id


@router.get('', response_model=list[TmcShipmentResponse])
async def list_tmc_shipments(
    request: Request,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category: str | None = Query(None),
    inventory_item_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[TmcShipmentResponse]:
    org_id = get_org_id(request)
    query = select(TmcShipment).where(TmcShipment.org_id == org_id)
    if from_date is not None:
        query = query.where(TmcShipment.date >= from_date)
    if to_date is not None:
        query = query.where(TmcShipment.date <= to_date)
    if category is not None:
        query = query.where(TmcShipment.category == category)
    if inventory_item_id is not None:
        query = query.where(TmcShipment.inventory_item_id == inventory_item_id)
    query = query.order_by(TmcShipment.date.desc(), TmcShipment.created_at.desc())
    result = await db.execute(query)
    return [tmc_shipment_to_response(row) for row in result.scalars().all()]


@router.post('', response_model=TmcShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_tmc_shipment(
    request: Request,
    payload: TmcShipmentCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> TmcShipmentResponse:
    org_id = get_org_id(request)
    item = await resolve_inventory_item(db, org_id=org_id, item_id=payload.inventory_item_id)
    linked = await resolve_inventory_request_id(
        db,
        org_id=org_id,
        request_id=payload.shipment_request_id,
        inventory_item_id=item.id,
    )
    row = TmcShipment(
        org_id=org_id,
        date=payload.date,
        inventory_item_id=item.id,
        item_name=item.name,
        category=item.category,
        unit=item.unit or 'шт',
        quantity=payload.quantity,
        price_per_unit=payload.price_per_unit,
        destination=payload.destination,
        notes=payload.notes,
        shipment_request_id=linked,
        created_by=current.id,
    )
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='tmc_shipment',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
    )
    await db.commit()
    await db.refresh(row)
    clear_dashboard_cache()
    return tmc_shipment_to_response(row)


@router.patch('/{shipment_id}', response_model=TmcShipmentResponse)
async def update_tmc_shipment(
    request: Request,
    shipment_id: UUID,
    payload: TmcShipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> TmcShipmentResponse:
    org_id = get_org_id(request)
    row = await get_tmc_shipment_or_404(db, shipment_id, org_id)
    before = model_snapshot(row)
    data = payload.model_dump(exclude_unset=True)

    if 'inventory_item_id' in data and data['inventory_item_id'] is not None:
        item = await resolve_inventory_item(db, org_id=org_id, item_id=data['inventory_item_id'])
        row.inventory_item_id = item.id
        row.item_name = item.name
        row.category = item.category
        row.unit = item.unit or 'шт'

    if 'date' in data and data['date'] is not None:
        row.date = data['date']
    if 'quantity' in data and data['quantity'] is not None:
        row.quantity = data['quantity']
    if 'destination' in data:
        row.destination = data['destination']
    if 'price_per_unit' in data:
        row.price_per_unit = data['price_per_unit']
    if 'notes' in data:
        row.notes = data['notes']
    if 'shipment_request_id' in data:
        row.shipment_request_id = await resolve_inventory_request_id(
            db,
            org_id=org_id,
            request_id=data['shipment_request_id'],
            inventory_item_id=row.inventory_item_id,
        )

    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='tmc_shipment',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
    )
    await db.commit()
    await db.refresh(row)
    clear_dashboard_cache()
    return tmc_shipment_to_response(row)


@router.delete('/{shipment_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_tmc_shipment(
    request: Request,
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> Response:
    org_id = get_org_id(request)
    row = await get_tmc_shipment_or_404(db, shipment_id, org_id)
    before = model_snapshot(row)
    await db.delete(row)
    await log_change(
        db,
        org_id=org_id,
        entity_type='tmc_shipment',
        entity_id=shipment_id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.commit()
    clear_dashboard_cache()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

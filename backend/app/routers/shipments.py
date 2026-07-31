"""Crop / harvest shipments API — ONLY the `shipments` table.

Domain boundary (see docs/shipments.md):
- Module «Отгрузки урожая» is built exclusively on table `shipments`
  (crop_type, quantity_kg) and does NOT use warehouse `inventory_operations`
  for crop kg / KPI / forecast.
- It does NOT create inventory_operations and does NOT mirror shipment_requests.
- Optional `shipment_request_id` is a managerial link only (no stock posting):
  only done harvest requests may be linked.
- ТМЦ / harvest-as-SKU outbound facts live in inventory_operations
  (+ shipment_requests on complete).
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.inventory import InventoryItem
from app.models.shipment import Shipment
from app.models.shipment_request import ShipmentRequest, ShipmentRequestStatus
from app.schemas.shipment import ShipmentCreate, ShipmentResponse, ShipmentUpdate
from app.services.audit import log_change, model_snapshot
from app.services.crop_dictionary import resolve_crop_pair_for_org
from app.services.dashboard import clear_dashboard_cache
from app.services.harvest_inventory import REQUEST_KIND_HARVEST
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('shipments'))])
logger = logging.getLogger(__name__)


def calc_total_sum(quantity_kg: Decimal, price_per_kg: Decimal | None) -> Decimal | None:
    if price_per_kg is None:
        return None
    return quantity_kg * price_per_kg


def shipment_to_response(shipment: Shipment) -> ShipmentResponse:
    return ShipmentResponse(
        id=shipment.id,
        org_id=shipment.org_id,
        date=shipment.date,
        crop_type=shipment.crop_type,
        crop_code=shipment.crop_code,
        quantity_kg=shipment.quantity_kg,
        destination=shipment.destination,
        price_per_kg=shipment.price_per_kg,
        notes=shipment.notes,
        total_sum=calc_total_sum(shipment.quantity_kg, shipment.price_per_kg),
        shipment_request_id=shipment.shipment_request_id,
    )


async def get_shipment_or_404(db: AsyncSession, shipment_id: UUID, org_id: UUID) -> Shipment:
    result = await db.execute(
        select(Shipment).where(Shipment.id == shipment_id, Shipment.org_id == org_id)
    )
    shipment = result.scalar_one_or_none()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Отгрузка не найдена')
    return shipment


def _log_link_mismatch(
    row: ShipmentRequest,
    *,
    quantity_kg: Decimal | None,
    price_per_kg: Decimal | None,
    shipment_crop_code: str | None = None,
    item_crop_code: str | None = None,
) -> None:
    """Soft check — log only, never block save."""
    if quantity_kg is not None:
        req_qty = Decimal(str(row.quantity))
        if abs(req_qty - Decimal(str(quantity_kg))) > Decimal('0.01'):
            logger.warning(
                'shipment↔request qty mismatch request_id=%s request_qty=%s shipment_kg=%s',
                row.id,
                req_qty,
                quantity_kg,
            )
    if price_per_kg is not None:
        req_price = Decimal(str(row.price))
        if abs(req_price - Decimal(str(price_per_kg))) > Decimal('0.01'):
            logger.warning(
                'shipment↔request price mismatch request_id=%s request_price=%s price_per_kg=%s',
                row.id,
                req_price,
                price_per_kg,
            )
    ship_code = (shipment_crop_code or '').strip() or None
    item_code = (item_crop_code or '').strip() or None
    if ship_code and item_code and ship_code != item_code:
        logger.warning(
            'shipment↔request crop mismatch request_id=%s item_crop=%s shipment_crop=%s',
            row.id,
            item_code,
            ship_code,
        )


async def resolve_shipment_request_id(
    db: AsyncSession,
    *,
    org_id: UUID,
    request_id: UUID | None,
    quantity_kg: Decimal | None = None,
    price_per_kg: Decimal | None = None,
    shipment_crop_code: str | None = None,
) -> UUID | None:
    """Allow link only to done harvest requests (managerial, no stock side effects)."""
    if request_id is None:
        return None
    row = await db.get(ShipmentRequest, request_id)
    if row is None or row.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Заявка на отгрузку не найдена в организации',
        )
    kind = (row.kind or '').strip().lower()
    if kind != REQUEST_KIND_HARVEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='К отгрузке урожая можно привязать только заявку kind=harvest',
        )
    if row.status != ShipmentRequestStatus.done.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Привязать можно только выполненную заявку (status=done)',
        )
    if row.inventory_operation_id is None:
        logger.warning(
            'shipment linked to harvest request without inventory_operation_id request_id=%s',
            row.id,
        )

    item_crop: str | None = None
    item = await db.get(InventoryItem, row.inventory_item_id)
    if item is not None:
        item_crop = (item.crop_code or '').strip() or None

    _log_link_mismatch(
        row,
        quantity_kg=quantity_kg,
        price_per_kg=price_per_kg,
        shipment_crop_code=shipment_crop_code,
        item_crop_code=item_crop,
    )
    return request_id


async def _log_similar_unlinked_requests(
    db: AsyncSession,
    *,
    org_id: UUID,
    crop_code: str | None,
    ship_date: date,
) -> None:
    """Soft hint: done harvest requests on same day/crop without blocking create."""
    code = (crop_code or '').strip() or None
    if not code:
        return
    result = await db.execute(
        select(ShipmentRequest.id)
        .join(InventoryItem, InventoryItem.id == ShipmentRequest.inventory_item_id)
        .where(
            ShipmentRequest.org_id == org_id,
            ShipmentRequest.kind == REQUEST_KIND_HARVEST,
            ShipmentRequest.status == ShipmentRequestStatus.done.value,
            InventoryItem.crop_code == code,
            func.date(ShipmentRequest.completed_at) == ship_date,
        )
        .limit(5)
    )
    ids = [str(row[0]) for row in result.all()]
    if ids:
        logger.info(
            'shipment without request: %s similar done harvest request(s) same crop/date %s',
            len(ids),
            ids,
        )


@router.get('', response_model=list[ShipmentResponse])
async def list_shipments(
    request: Request,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    crop_type: str | None = Query(None),
    shipment_request_id: UUID | None = Query(
        None,
        description='Filter by optional managerial link to a harvest request',
    ),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ShipmentResponse]:
    org_id = get_org_id(request)
    query = select(Shipment).where(Shipment.org_id == org_id)

    if from_date is not None:
        query = query.where(Shipment.date >= from_date)
    if to_date is not None:
        query = query.where(Shipment.date <= to_date)
    if crop_type is not None:
        query = query.where(Shipment.crop_type == crop_type)
    if shipment_request_id is not None:
        query = query.where(Shipment.shipment_request_id == shipment_request_id)

    query = query.order_by(Shipment.date.desc(), Shipment.created_at.desc())
    result = await db.execute(query)
    return [shipment_to_response(shipment) for shipment in result.scalars().all()]


@router.get('/{shipment_id}', response_model=ShipmentResponse)
async def get_shipment(
    request: Request,
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> ShipmentResponse:
    shipment = await get_shipment_or_404(db, shipment_id, get_org_id(request))
    return shipment_to_response(shipment)


@router.post('', response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    request: Request,
    payload: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ShipmentResponse:
    org_id = get_org_id(request)
    crop_name, crop_code = await resolve_crop_pair_for_org(
        db,
        org_id,
        crop_type=payload.crop_type,
        crop_code=payload.crop_code,
    )
    if not crop_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Укажите культуру',
        )
    linked_request_id = await resolve_shipment_request_id(
        db,
        org_id=org_id,
        request_id=payload.shipment_request_id,
        quantity_kg=payload.quantity_kg,
        price_per_kg=payload.price_per_kg,
        shipment_crop_code=crop_code,
    )
    if linked_request_id is None:
        await _log_similar_unlinked_requests(
            db,
            org_id=org_id,
            crop_code=crop_code,
            ship_date=payload.date,
        )
    shipment = Shipment(
        org_id=org_id,
        date=payload.date,
        crop_type=crop_name,
        crop_code=crop_code,
        quantity_kg=payload.quantity_kg,
        destination=payload.destination,
        price_per_kg=payload.price_per_kg,
        notes=payload.notes,
        shipment_request_id=linked_request_id,
        created_by=current.id,
    )
    db.add(shipment)
    await db.flush()
    await log_change(
        db,
        org_id=shipment.org_id,
        entity_type='shipment',
        entity_id=shipment.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(shipment),
    )
    await db.commit()
    await db.refresh(shipment)
    clear_dashboard_cache()
    return shipment_to_response(shipment)


@router.patch('/{shipment_id}', response_model=ShipmentResponse)
async def update_shipment(
    request: Request,
    shipment_id: UUID,
    payload: ShipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ShipmentResponse:
    org_id = get_org_id(request)
    shipment = await get_shipment_or_404(db, shipment_id, org_id)
    before = model_snapshot(shipment)

    data = payload.model_dump(exclude_unset=True)
    if 'crop_type' in data or 'crop_code' in data:
        next_type = data['crop_type'] if 'crop_type' in data else shipment.crop_type
        next_code = data['crop_code'] if 'crop_code' in data else shipment.crop_code
        crop_name, crop_code = await resolve_crop_pair_for_org(
            db,
            org_id,
            crop_type=next_type,
            crop_code=next_code,
        )
        if not crop_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите культуру',
            )
        data['crop_type'] = crop_name
        data['crop_code'] = crop_code
    if 'shipment_request_id' in data:
        next_qty = data['quantity_kg'] if 'quantity_kg' in data else shipment.quantity_kg
        next_price = data['price_per_kg'] if 'price_per_kg' in data else shipment.price_per_kg
        next_crop = data['crop_code'] if 'crop_code' in data else shipment.crop_code
        data['shipment_request_id'] = await resolve_shipment_request_id(
            db,
            org_id=org_id,
            request_id=data['shipment_request_id'],
            quantity_kg=next_qty,
            price_per_kg=next_price,
            shipment_crop_code=next_crop,
        )
    for field, value in data.items():
        setattr(shipment, field, value)

    db.add(shipment)
    await log_change(
        db,
        org_id=shipment.org_id,
        entity_type='shipment',
        entity_id=shipment.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(shipment),
    )
    await db.commit()
    await db.refresh(shipment)
    clear_dashboard_cache()
    return shipment_to_response(shipment)


@router.delete('/{shipment_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    request: Request,
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> Response:
    shipment = await get_shipment_or_404(db, shipment_id, get_org_id(request))
    before = model_snapshot(shipment)
    await log_change(
        db,
        org_id=shipment.org_id,
        entity_type='shipment',
        entity_id=shipment.id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.delete(shipment)
    await db.commit()
    clear_dashboard_cache()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

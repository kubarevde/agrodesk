"""Shipment requests API — outbound ТМЦ intents fulfilled via inventory_operations."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.inventory import InventoryItem
from app.models.organization import Organization
from app.models.shipment_request import ShipmentRequest
from app.schemas.shipment_requests import (
    ShipmentRequestAssign,
    ShipmentRequestCancel,
    ShipmentRequestComplete,
    ShipmentRequestCreate,
    ShipmentRequestResponse,
    ShipmentRequestUpdate,
)
from app.services.action_permissions import (
    get_effective_permissions,
    require_action,
    require_any_action,
)
from app.services.audit import log_change, model_snapshot
from app.services.org_features import shipment_requests_enabled
from app.services import shipment_requests as svc


async def require_shipment_requests_enabled(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> None:
    org = await db.get(Organization, get_org_id(request))
    settings = org.settings if org is not None else {}
    if not shipment_requests_enabled(settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Модуль заявок на отгрузку отключён для организации',
        )


router = APIRouter(dependencies=[Depends(require_shipment_requests_enabled)])

@router.get('', response_model=list[ShipmentRequestResponse])
async def list_shipment_requests(
    request: Request,
    status_filter: str | None = Query(None, alias='status'),
    inventory_item_id: UUID | None = Query(None),
    customer_name: str | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    mine_only: bool = Query(
        False,
        description='Only unassigned or assigned to current user (executor inbox)',
    ),
    kind: str | None = Query(
        None,
        description="Filter by request kind: inventory | harvest",
        pattern='^(inventory|harvest)$',
    ),
    crop_code: str | None = Query(
        None,
        description='Filter harvest requests by inventory item crop_code',
    ),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(
        require_any_action('shipment_requests.manage', 'shipment_requests.execute')
    ),
    effective: dict = Depends(get_effective_permissions),
) -> list[ShipmentRequestResponse]:
    org_id = get_org_id(request)
    query = (
        select(ShipmentRequest)
        .options(*svc.load_options())
        .where(ShipmentRequest.org_id == org_id)
    )
    if kind:
        query = query.where(ShipmentRequest.kind == kind)
    if crop_code:
        code = crop_code.strip()
        query = query.join(
            InventoryItem,
            InventoryItem.id == ShipmentRequest.inventory_item_id,
        ).where(InventoryItem.crop_code == code)
    # Executors never see others' assigned rows; mine_only also for managers' inbox.
    # Employees are always scoped (defense in depth even if actions are misconfigured).
    scope_mine = (
        mine_only
        or not svc.can_manage(effective)
        or effective.get('role') == 'employee'
    )
    if scope_mine:
        query = query.where(
            or_(
                ShipmentRequest.assigned_to.is_(None),
                ShipmentRequest.assigned_to == current.id,
            )
        )
    if status_filter:
        query = query.where(ShipmentRequest.status == status_filter)
    if inventory_item_id is not None:
        query = query.where(ShipmentRequest.inventory_item_id == inventory_item_id)
    if customer_name:
        query = query.where(ShipmentRequest.customer_name.ilike(f'%{customer_name.strip()}%'))
    if from_date is not None:
        query = query.where(
            ShipmentRequest.planned_at
            >= datetime.combine(from_date, time.min, tzinfo=timezone.utc)
        )
    if to_date is not None:
        query = query.where(
            ShipmentRequest.planned_at
            <= datetime.combine(to_date, time.max, tzinfo=timezone.utc)
        )
    query = query.order_by(ShipmentRequest.planned_at.desc(), ShipmentRequest.created_at.desc())
    result = await db.execute(query)
    rows = list(result.scalars().unique().all())
    if scope_mine:
        rows = [
            row
            for row in rows
            if row.assigned_to is None or row.assigned_to == current.id
        ]
    return [svc.to_response(row) for row in rows]


@router.post('', response_model=ShipmentRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment_request(
    request: Request,
    payload: ShipmentRequestCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('shipment_requests.manage')),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.create_request(db, org_id=org_id, current=current, payload=payload)
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))


@router.get('/{request_id}', response_model=ShipmentRequestResponse)
async def get_shipment_request(
    request: Request,
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(
        require_any_action('shipment_requests.manage', 'shipment_requests.execute')
    ),
    effective: dict = Depends(get_effective_permissions),
) -> ShipmentRequestResponse:
    row = await svc.get_request_or_404(db, request_id, get_org_id(request))
    svc.assert_can_view_request(row, current, effective)
    return svc.to_response(row)


@router.patch('/{request_id}', response_model=ShipmentRequestResponse)
async def patch_shipment_request(
    request: Request,
    request_id: UUID,
    payload: ShipmentRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('shipment_requests.manage')),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.get_request_or_404(db, request_id, org_id)
    before = model_snapshot(row)
    row = await svc.update_request(db, row, payload)
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))


@router.post('/{request_id}/assign', response_model=ShipmentRequestResponse)
async def assign_shipment_request(
    request: Request,
    request_id: UUID,
    payload: ShipmentRequestAssign,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('shipment_requests.manage')),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.get_request_or_404(db, request_id, org_id)
    before = model_snapshot(row)
    row = await svc.assign_request(db, row, payload.assigned_to)
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary='Назначен исполнитель заявки на отгрузку',
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))


@router.post('/{request_id}/start', response_model=ShipmentRequestResponse)
async def start_shipment_request(
    request: Request,
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(
        require_any_action('shipment_requests.manage', 'shipment_requests.execute')
    ),
    effective: dict = Depends(get_effective_permissions),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.get_request_or_404(db, request_id, org_id)
    before = model_snapshot(row)
    row = await svc.start_request(db, row, current, effective)
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary='Заявка на отгрузку взята в работу',
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))


@router.post('/{request_id}/complete', response_model=ShipmentRequestResponse)
async def complete_shipment_request(
    request: Request,
    request_id: UUID,
    payload: ShipmentRequestComplete,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(
        require_any_action('shipment_requests.manage', 'shipment_requests.execute')
    ),
    effective: dict = Depends(get_effective_permissions),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.get_request_or_404(db, request_id, org_id)
    before = model_snapshot(row)
    row = await svc.complete_request(
        db, row, current, effective, image_urls=list(payload.image_urls or [])
    )
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary='Заявка на отгрузку выполнена (списание ТМЦ)',
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))


@router.post('/{request_id}/cancel', response_model=ShipmentRequestResponse)
async def cancel_shipment_request(
    request: Request,
    request_id: UUID,
    payload: ShipmentRequestCancel,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('shipment_requests.manage')),
) -> ShipmentRequestResponse:
    org_id = get_org_id(request)
    row = await svc.get_request_or_404(db, request_id, org_id)
    before = model_snapshot(row)
    row = await svc.cancel_request(db, row, reason=payload.reason)
    await log_change(
        db,
        org_id=org_id,
        entity_type='shipment_request',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary='Заявка на отгрузку отменена',
    )
    await db.commit()
    return svc.to_response(await svc.get_request_or_404(db, row.id, org_id))

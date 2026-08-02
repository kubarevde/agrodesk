"""Marketplace seller API — org-scoped cabinet + warehouse import (read-only).

Uses OrgContextMiddleware + JWT + marketplace.manage (no parallel auth).
Does NOT modify /api/inventory or /api/shipments.
Showcase orders report lives here — not under /api/reports (farm isolation).
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.marketplace import (
    MarketImportSourcesResponse,
    MarketListingCreate,
    MarketListingFromSource,
    MarketListingListResponse,
    MarketListingResponse,
    MarketListingUpdate,
    MarketOrdersReportRequest,
    MarketOrdersReportResponse,
    SellerOrderResponse,
    SellerOrderUpdate,
    SellerProfileResponse,
    SellerProfileUpdate,
)
from app.services.action_permissions import require_action
from app.services import marketplace_import as import_svc
from app.services import marketplace_reports as reports_svc
from app.services import marketplace_seller as seller_svc
from app.services.reports import workbook_response

router = APIRouter()
_manage = Depends(require_action('marketplace.manage'))


@router.get('/seller-profile', response_model=SellerProfileResponse)
async def get_seller_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> SellerProfileResponse:
    profile = await seller_svc.get_seller_profile(db, get_org_id(request))
    await db.commit()
    return profile


@router.patch('/seller-profile', response_model=SellerProfileResponse)
async def patch_seller_profile(
    request: Request,
    payload: SellerProfileUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> SellerProfileResponse:
    profile = await seller_svc.update_seller_profile(db, get_org_id(request), payload)
    await db.commit()
    return profile


@router.get('/listings', response_model=MarketListingListResponse)
async def list_listings(
    request: Request,
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingListResponse:
    return await seller_svc.list_org_listings(
        db, get_org_id(request), status_filter=status
    )


@router.get('/listings/{listing_id}', response_model=MarketListingResponse)
async def get_listing(
    request: Request,
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    await seller_svc.require_marketplace_enabled(db, get_org_id(request))
    row = await seller_svc.get_org_listing(db, get_org_id(request), listing_id)
    return await import_svc.listing_to_response_async(db, row)


@router.post('/listings', response_model=MarketListingResponse, status_code=201)
async def create_listing(
    request: Request,
    payload: MarketListingCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    row = await seller_svc.create_manual_listing(db, get_org_id(request), payload)
    await db.commit()
    return row


@router.patch('/listings/{listing_id}', response_model=MarketListingResponse)
async def patch_listing(
    request: Request,
    listing_id: UUID,
    payload: MarketListingUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    row = await seller_svc.update_listing(db, get_org_id(request), listing_id, payload)
    await db.commit()
    return row


@router.post('/listings/{listing_id}/submit', response_model=MarketListingResponse)
async def submit_listing(
    request: Request,
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    row = await seller_svc.submit_listing(db, get_org_id(request), listing_id)
    await db.commit()
    return row


@router.post('/listings/{listing_id}/archive', response_model=MarketListingResponse)
async def archive_listing(
    request: Request,
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    row = await seller_svc.archive_listing(db, get_org_id(request), listing_id)
    await db.commit()
    return row


@router.get('/orders', response_model=list[SellerOrderResponse])
async def list_orders(
    request: Request,
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> list[SellerOrderResponse]:
    return await seller_svc.list_org_orders(
        db, get_org_id(request), status_filter=status
    )


@router.patch('/orders/{order_id}', response_model=SellerOrderResponse)
async def patch_order(
    request: Request,
    order_id: UUID,
    payload: SellerOrderUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> SellerOrderResponse:
    row = await seller_svc.update_order_status(
        db, get_org_id(request), order_id, payload.status
    )
    await db.commit()
    return row


@router.get(
    '/reports/orders',
    response_model=MarketOrdersReportResponse,
    summary='Showcase orders report (JSON) — not farm KPI',
)
async def get_orders_report(
    request: Request,
    from_date: date = Query(...),
    to_date: date = Query(...),
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketOrdersReportResponse:
    """Org-scoped marketplace orders for the period. Estimated amounts ≠ revenue."""
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='to_date must be >= from_date',
        )
    report = await reports_svc.fetch_market_orders_report(
        db,
        get_org_id(request),
        from_date,
        to_date,
        status_filter=status,
    )
    return MarketOrdersReportResponse.model_validate(
        {
            'from_date': report.from_date,
            'to_date': report.to_date,
            'org_id': report.org_id,
            'seller_display_name': report.seller_display_name,
            'orders_count': report.orders_count,
            'quantity_sum': report.quantity_sum,
            'estimated_amount_sum': report.estimated_amount_sum,
            'status_breakdown': report.status_breakdown,
            'rows': report.rows,
            'amount_disclaimer': report.amount_disclaimer,
        }
    )


@router.post(
    '/reports/orders/export',
    summary='Showcase orders Excel — not under /api/reports',
)
async def export_orders_report(
    request: Request,
    payload: MarketOrdersReportRequest,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
):
    workbook = await reports_svc.build_market_orders_workbook(
        db,
        get_org_id(request),
        payload.from_date,
        payload.to_date,
        status_filter=payload.status,
    )
    return workbook_response(
        workbook,
        f'marketplace_orders_{payload.from_date}_{payload.to_date}.xlsx',
    )


@router.get(
    '/import-sources',
    response_model=MarketImportSourcesResponse,
    summary='Sources available for marketplace import (read-only)',
)
async def get_import_sources(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketImportSourcesResponse:
    """List inventory items and crop shipments for one-click draft import.

    SELECT only — no locks/writes on inventory_items or shipments.
    """
    return await import_svc.list_import_sources(db, get_org_id(request))


@router.post(
    '/listings/from-source',
    response_model=MarketListingResponse,
    status_code=201,
    summary='Create draft listing linked to inventory or shipment',
)
async def create_listing_from_source(
    request: Request,
    payload: MarketListingFromSource,
    db: AsyncSession = Depends(get_db),
    _: Employee = _manage,
) -> MarketListingResponse:
    """Create ``draft`` with soft source link; displayed qty resolves live on read."""
    org_id = get_org_id(request)
    row = await import_svc.create_listing_from_source(
        db,
        org_id,
        source_type=payload.source_type,
        source_id=payload.source_id,
    )
    await db.commit()
    return await import_svc.listing_to_response_async(db, row)

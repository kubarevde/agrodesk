"""Superadmin marketplace moderation API (existing SuperAdmin JWT)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.superadmin import require_superadmin
from app.models.organization import SuperAdminUser
from app.schemas.marketplace import (
    AdminCategoryCreate,
    AdminCategoryMappingItem,
    AdminCategoryMappingUpsert,
    AdminCategoryResponse,
    AdminCategoryUpdate,
    AdminOrderItem,
    AdminSellerItem,
    AdminSellerUpdate,
    ListingRejectRequest,
    ModerationListingItem,
)
from app.services import marketplace_category_mapping as mapping_svc
from app.services import marketplace_moderation as svc

router = APIRouter(prefix='/marketplace', tags=['superadmin-marketplace'])


@router.get('/listings', response_model=list[ModerationListingItem])
async def list_listings(
    status: str | None = Query(default='pending_review'),
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[ModerationListingItem]:
    return await svc.list_moderation_listings(db, status_filter=status)


@router.post('/listings/{listing_id}/approve', response_model=ModerationListingItem)
async def approve_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> ModerationListingItem:
    row = await svc.approve_listing(db, listing_id)
    await db.commit()
    return row


@router.post('/listings/{listing_id}/reject', response_model=ModerationListingItem)
async def reject_listing(
    listing_id: UUID,
    payload: ListingRejectRequest,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> ModerationListingItem:
    row = await svc.reject_listing(db, listing_id, reason=payload.rejection_reason)
    await db.commit()
    return row


@router.get('/categories', response_model=list[AdminCategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[AdminCategoryResponse]:
    return await svc.list_categories(db)


@router.post('/categories', response_model=AdminCategoryResponse, status_code=201)
async def create_category(
    payload: AdminCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> AdminCategoryResponse:
    row = await svc.create_category(db, payload)
    await db.commit()
    return row


@router.patch('/categories/{category_id}', response_model=AdminCategoryResponse)
async def patch_category(
    category_id: UUID,
    payload: AdminCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> AdminCategoryResponse:
    row = await svc.update_category(db, category_id, payload)
    await db.commit()
    return row


@router.get('/category-mappings', response_model=list[AdminCategoryMappingItem])
async def list_category_mappings(
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[AdminCategoryMappingItem]:
    """Inventory dictionary code → market category (does not alter warehouse)."""
    return await mapping_svc.list_mappings(db)


@router.put('/category-mappings', response_model=AdminCategoryMappingItem)
async def upsert_category_mapping(
    payload: AdminCategoryMappingUpsert,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> AdminCategoryMappingItem:
    row = await mapping_svc.upsert_mapping(db, payload)
    await db.commit()
    return row


@router.delete('/category-mappings/{mapping_id}', status_code=204, response_class=Response)
async def delete_category_mapping(
    mapping_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> Response:
    await mapping_svc.delete_mapping(db, mapping_id)
    await db.commit()
    return Response(status_code=204)


@router.get('/sellers', response_model=list[AdminSellerItem])
async def list_sellers(
    org_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[AdminSellerItem]:
    return await svc.list_sellers(db, org_id=org_id)


@router.patch('/sellers/{seller_id}', response_model=AdminSellerItem)
async def patch_seller(
    seller_id: UUID,
    payload: AdminSellerUpdate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> AdminSellerItem:
    """Toggle is_verified / is_active (block shop → public vitrine hides listings)."""
    row = await svc.update_seller(db, seller_id, payload)
    await db.commit()
    return row


@router.get('/orders', response_model=list[AdminOrderItem])
async def list_orders(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[AdminOrderItem]:
    return await svc.list_all_orders(db, status_filter=status)

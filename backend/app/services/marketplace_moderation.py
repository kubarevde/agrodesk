"""Superadmin marketplace moderation — listings, categories, sellers, orders.

Uses SuperAdmin JWT (require_superadmin). Does not touch org-scoped /api/* auth.
Blocking a seller (is_active=false) hides published listings on the public vitrine
via marketplace_public filters (seller profile is_active check).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeRole
from app.models.marketplace import (
    MarketCategory,
    MarketListing,
    MarketOrder,
    MarketSellerProfile,
)
from app.models.notification import Notification
from app.models.organization import Organization
from app.schemas.marketplace import (
    AdminCategoryCreate,
    AdminCategoryResponse,
    AdminCategoryUpdate,
    AdminOrderItem,
    AdminSellerItem,
    AdminSellerUpdate,
    ModerationListingItem,
)


def listing_to_moderation_item(
    listing: MarketListing,
    *,
    org_name: str,
    seller_display_name: str,
) -> ModerationListingItem:
    photos = listing.photos if isinstance(listing.photos, list) else []
    return ModerationListingItem(
        id=listing.id,
        org_id=listing.org_id,
        org_name=org_name,
        seller_profile_id=listing.seller_profile_id,
        seller_display_name=seller_display_name,
        category_id=listing.category_id,
        title=listing.title,
        description=listing.description,
        price=Decimal(str(listing.price)),
        unit=listing.unit,
        quantity_available=Decimal(str(listing.quantity_available)),
        photos=photos,
        status=listing.status,
        rejection_reason=listing.rejection_reason,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        published_at=listing.published_at,
    )


async def notify_org_marketplace_managers(
    db: AsyncSession,
    *,
    org_id: UUID,
    title: str,
    body: str,
    listing_id: UUID,
) -> None:
    """Inbox notifications for org admins/managers (seller cabinet audience)."""
    recipients = (
        await db.execute(
            select(Employee.id).where(
                Employee.org_id == org_id,
                Employee.is_active.is_(True),
                Employee.role.in_([EmployeeRole.admin, EmployeeRole.manager]),
            )
        )
    ).scalars().all()
    for employee_id in recipients:
        db.add(
            Notification(
                employee_id=employee_id,
                type='marketplace_moderation',
                title=title[:200],
                body=body,
                link=f'/marketplace/listings/{listing_id}',
                is_read=False,
            )
        )


async def list_moderation_listings(
    db: AsyncSession,
    *,
    status_filter: str | None,
) -> list[ModerationListingItem]:
    query = (
        select(MarketListing, Organization.name, MarketSellerProfile.display_name)
        .join(Organization, Organization.id == MarketListing.org_id)
        .join(
            MarketSellerProfile,
            MarketSellerProfile.id == MarketListing.seller_profile_id,
        )
    )
    if status_filter:
        query = query.where(MarketListing.status == status_filter)
    rows = (
        await db.execute(query.order_by(MarketListing.updated_at.desc()))
    ).all()
    return [
        listing_to_moderation_item(
            listing, org_name=org_name, seller_display_name=seller_name
        )
        for listing, org_name, seller_name in rows
    ]


async def approve_listing(db: AsyncSession, listing_id: UUID) -> ModerationListingItem:
    listing = await db.get(MarketListing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Объявление не найдено')
    if listing.status != 'pending_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Ожидался статус pending_review, сейчас «{listing.status}»',
        )
    listing.status = 'published'
    listing.published_at = datetime.now(timezone.utc)
    listing.rejection_reason = None
    await db.flush()
    await db.refresh(listing)

    org = await db.get(Organization, listing.org_id)
    seller = await db.get(MarketSellerProfile, listing.seller_profile_id)
    await notify_org_marketplace_managers(
        db,
        org_id=listing.org_id,
        title='Объявление опубликовано',
        body=f'«{listing.title}» прошло модерацию и опубликовано на витрине.',
        listing_id=listing.id,
    )
    return listing_to_moderation_item(
        listing,
        org_name=org.name if org else '',
        seller_display_name=seller.display_name if seller else '',
    )


async def reject_listing(
    db: AsyncSession,
    listing_id: UUID,
    *,
    reason: str,
) -> ModerationListingItem:
    listing = await db.get(MarketListing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Объявление не найдено')
    if listing.status != 'pending_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Ожидался статус pending_review, сейчас «{listing.status}»',
        )
    listing.status = 'rejected'
    listing.rejection_reason = reason.strip()
    await db.flush()
    await db.refresh(listing)

    org = await db.get(Organization, listing.org_id)
    seller = await db.get(MarketSellerProfile, listing.seller_profile_id)
    await notify_org_marketplace_managers(
        db,
        org_id=listing.org_id,
        title='Объявление отклонено',
        body=f'«{listing.title}» отклонено. Причина: {listing.rejection_reason}',
        listing_id=listing.id,
    )
    return listing_to_moderation_item(
        listing,
        org_name=org.name if org else '',
        seller_display_name=seller.display_name if seller else '',
    )


async def list_categories(db: AsyncSession) -> list[AdminCategoryResponse]:
    rows = (
        await db.execute(
            select(MarketCategory).order_by(MarketCategory.sort_order, MarketCategory.name)
        )
    ).scalars().all()
    return [AdminCategoryResponse.model_validate(row) for row in rows]


async def create_category(
    db: AsyncSession,
    payload: AdminCategoryCreate,
) -> AdminCategoryResponse:
    if payload.parent_id is not None:
        parent = await db.get(MarketCategory, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=400, detail='Родительская категория не найдена')
    existing = await db.scalar(
        select(MarketCategory.id).where(MarketCategory.slug == payload.slug.strip())
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail='Slug уже занят')
    row = MarketCategory(
        id=uuid4(),
        name=payload.name.strip()[:120],
        slug=payload.slug.strip()[:120],
        parent_id=payload.parent_id,
        icon=payload.icon,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(row)
    await db.flush()
    return AdminCategoryResponse.model_validate(row)


async def update_category(
    db: AsyncSession,
    category_id: UUID,
    payload: AdminCategoryUpdate,
) -> AdminCategoryResponse:
    row = await db.get(MarketCategory, category_id)
    if row is None:
        raise HTTPException(status_code=404, detail='Категория не найдена')
    data = payload.model_dump(exclude_unset=True)
    if 'parent_id' in data and data['parent_id'] is not None:
        if data['parent_id'] == category_id:
            raise HTTPException(status_code=400, detail='Категория не может быть родителем себе')
        parent = await db.get(MarketCategory, data['parent_id'])
        if parent is None:
            raise HTTPException(status_code=400, detail='Родительская категория не найдена')
    if 'slug' in data and data['slug']:
        clash = await db.scalar(
            select(MarketCategory.id).where(
                MarketCategory.slug == data['slug'].strip(),
                MarketCategory.id != category_id,
            )
        )
        if clash is not None:
            raise HTTPException(status_code=409, detail='Slug уже занят')
        data['slug'] = data['slug'].strip()[:120]
    if 'name' in data and isinstance(data['name'], str):
        data['name'] = data['name'].strip()[:120]
    for key, value in data.items():
        setattr(row, key, value)
    await db.flush()
    return AdminCategoryResponse.model_validate(row)


async def list_sellers(
    db: AsyncSession,
    *,
    org_id: UUID | None,
) -> list[AdminSellerItem]:
    published_count = (
        select(
            MarketListing.seller_profile_id.label('sid'),
            func.count(MarketListing.id).label('cnt'),
        )
        .where(MarketListing.status == 'published')
        .group_by(MarketListing.seller_profile_id)
        .subquery()
    )

    query = (
        select(
            MarketSellerProfile,
            Organization.name,
            func.coalesce(published_count.c.cnt, 0),
        )
        .join(Organization, Organization.id == MarketSellerProfile.org_id)
        .outerjoin(
            published_count,
            published_count.c.sid == MarketSellerProfile.id,
        )
    )
    if org_id is not None:
        query = query.where(MarketSellerProfile.org_id == org_id)

    rows = (
        await db.execute(query.order_by(MarketSellerProfile.created_at.desc()))
    ).all()

    return [
        AdminSellerItem(
            id=seller.id,
            org_id=seller.org_id,
            org_name=org_name,
            display_name=seller.display_name,
            description=seller.description,
            logo_url=seller.logo_url,
            phone=seller.phone,
            is_verified=bool(seller.is_verified),
            is_active=bool(seller.is_active),
            created_at=seller.created_at,
            published_listings=int(cnt or 0),
        )
        for seller, org_name, cnt in rows
    ]


async def update_seller(
    db: AsyncSession,
    seller_id: UUID,
    payload: AdminSellerUpdate,
) -> AdminSellerItem:
    seller = await db.get(MarketSellerProfile, seller_id)
    if seller is None:
        raise HTTPException(status_code=404, detail='Магазин не найден')
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(seller, key, value)
    await db.flush()

    org = await db.get(Organization, seller.org_id)
    published = await db.scalar(
        select(func.count(MarketListing.id)).where(
            MarketListing.seller_profile_id == seller.id,
            MarketListing.status == 'published',
        )
    )
    return AdminSellerItem(
        id=seller.id,
        org_id=seller.org_id,
        org_name=org.name if org else '',
        display_name=seller.display_name,
        description=seller.description,
        logo_url=seller.logo_url,
        phone=seller.phone,
        is_verified=bool(seller.is_verified),
        is_active=bool(seller.is_active),
        created_at=seller.created_at,
        published_listings=int(published or 0),
    )


async def list_all_orders(
    db: AsyncSession,
    *,
    status_filter: str | None,
) -> list[AdminOrderItem]:
    query = (
        select(
            MarketOrder,
            MarketListing.title,
            MarketListing.org_id,
            Organization.name,
            MarketSellerProfile.display_name,
        )
        .join(MarketListing, MarketListing.id == MarketOrder.listing_id)
        .join(Organization, Organization.id == MarketListing.org_id)
        .join(
            MarketSellerProfile,
            MarketSellerProfile.id == MarketListing.seller_profile_id,
        )
    )
    if status_filter:
        query = query.where(MarketOrder.status == status_filter)
    rows = (
        await db.execute(
            query.order_by(MarketOrder.created_at.desc()).limit(500)
        )
    ).all()
    return [
        AdminOrderItem(
            id=order.id,
            listing_id=order.listing_id,
            listing_title=title,
            org_id=org_id,
            org_name=org_name,
            seller_display_name=seller_name,
            buyer_name=order.buyer_name,
            buyer_phone=order.buyer_phone,
            buyer_comment=order.buyer_comment,
            quantity=Decimal(str(order.quantity)),
            status=order.status,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        for order, title, org_id, org_name, seller_name in rows
    ]

"""Public marketplace vitrine — published listings only, no JWT.

Visibility rules (every query):
- market_listings.status = 'published'
- organizations.is_active = true
- organizations.settings.marketplace_enabled = true
- market_seller_profiles.is_active = true

Never expose warehouse stock, purchase costs, source_id, or other internal org data.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import (
    MarketCategory,
    MarketListing,
    MarketOrder,
    MarketReview,
    MarketSellerProfile,
)
from app.models.organization import Organization
from app.schemas.marketplace import (
    PublicCategoryNode,
    PublicListingCard,
    PublicListingListResponse,
    PublicOrderResponse,
    PublicReviewCard,
    PublicSellerBrief,
    PublicSellerProfileResponse,
)
from app.services.org_features import MARKETPLACE_ENABLED_KEY
from app.services.marketplace_order_notify import notify_new_market_order


def _marketplace_org_filter():
    """Org is active and marketplace_enabled JSONB flag is true."""
    return and_(
        Organization.is_active.is_(True),
        Organization.settings.contains({MARKETPLACE_ENABLED_KEY: True}),
    )


def _published_listing_filters():
    return and_(
        MarketListing.status == 'published',
        MarketSellerProfile.is_active.is_(True),
        _marketplace_org_filter(),
    )


def listing_to_public_card(
    listing: MarketListing,
    seller: MarketSellerProfile,
) -> PublicListingCard:
    photos = listing.photos if isinstance(listing.photos, list) else []
    return PublicListingCard(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        price=Decimal(str(listing.price)),
        unit=listing.unit,
        quantity_available=Decimal(str(listing.quantity_available)),
        photos=photos,
        category_id=listing.category_id,
        published_at=listing.published_at,
        seller=PublicSellerBrief(
            id=seller.id,
            display_name=seller.display_name,
            is_verified=bool(seller.is_verified),
        ),
    )


async def list_published_listings(
    db: AsyncSession,
    *,
    category_id: UUID | None,
    min_price: Decimal | None,
    max_price: Decimal | None,
    q: str | None,
    page: int,
    page_size: int,
) -> PublicListingListResponse:
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    offset = (page - 1) * page_size

    filters = [_published_listing_filters()]
    if category_id is not None:
        filters.append(MarketListing.category_id == category_id)
    if min_price is not None:
        filters.append(MarketListing.price >= min_price)
    if max_price is not None:
        filters.append(MarketListing.price <= max_price)
    if q is not None and q.strip():
        term = f'%{q.strip()}%'
        filters.append(
            or_(
                MarketListing.title.ilike(term),
                MarketListing.description.ilike(term),
            )
        )

    where_clause = and_(*filters)
    total = await db.scalar(
        select(func.count(MarketListing.id))
        .join(
            MarketSellerProfile,
            MarketSellerProfile.id == MarketListing.seller_profile_id,
        )
        .join(Organization, Organization.id == MarketListing.org_id)
        .where(where_clause)
    )
    rows = (
        await db.execute(
            select(MarketListing, MarketSellerProfile)
            .join(
                MarketSellerProfile,
                MarketSellerProfile.id == MarketListing.seller_profile_id,
            )
            .join(Organization, Organization.id == MarketListing.org_id)
            .where(where_clause)
            .order_by(
                MarketListing.published_at.desc().nullslast(),
                MarketListing.created_at.desc(),
            )
            .offset(offset)
            .limit(page_size)
        )
    ).all()

    items = [listing_to_public_card(listing, seller) for listing, seller in rows]
    return PublicListingListResponse(
        items=items,
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


async def get_published_listing(
    db: AsyncSession,
    listing_id: UUID,
) -> PublicListingCard:
    row = (
        await db.execute(
            select(MarketListing, MarketSellerProfile)
            .join(
                MarketSellerProfile,
                MarketSellerProfile.id == MarketListing.seller_profile_id,
            )
            .join(Organization, Organization.id == MarketListing.org_id)
            .where(
                MarketListing.id == listing_id,
                _published_listing_filters(),
            )
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Объявление не найдено',
        )
    listing, seller = row
    return listing_to_public_card(listing, seller)


async def list_category_tree(db: AsyncSession) -> list[PublicCategoryNode]:
    rows = (
        await db.execute(
            select(MarketCategory)
            .where(MarketCategory.is_active.is_(True))
            .order_by(MarketCategory.sort_order, MarketCategory.name)
        )
    ).scalars().all()

    by_parent: dict[UUID | None, list[MarketCategory]] = {}
    for cat in rows:
        by_parent.setdefault(cat.parent_id, []).append(cat)

    def build(parent_id: UUID | None) -> list[PublicCategoryNode]:
        return [
            PublicCategoryNode(
                id=cat.id,
                name=cat.name,
                slug=cat.slug,
                icon=cat.icon,
                sort_order=cat.sort_order,
                children=build(cat.id),
            )
            for cat in by_parent.get(parent_id, [])
        ]

    return build(None)


async def get_public_seller(
    db: AsyncSession,
    seller_id: UUID,
) -> PublicSellerProfileResponse:
    seller = await db.scalar(
        select(MarketSellerProfile)
        .join(Organization, Organization.id == MarketSellerProfile.org_id)
        .where(
            MarketSellerProfile.id == seller_id,
            MarketSellerProfile.is_active.is_(True),
            _marketplace_org_filter(),
        )
    )
    if seller is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Продавец не найден',
        )

    listing_rows = (
        await db.execute(
            select(MarketListing)
            .where(
                MarketListing.seller_profile_id == seller.id,
                MarketListing.status == 'published',
            )
            .order_by(
                MarketListing.published_at.desc().nullslast(),
                MarketListing.created_at.desc(),
            )
        )
    ).scalars().all()

    review_rows = (
        await db.execute(
            select(MarketReview)
            .where(
                MarketReview.org_id == seller.org_id,
                MarketReview.is_visible.is_(True),
            )
            .order_by(MarketReview.created_at.desc())
            .limit(50)
        )
    ).scalars().all()

    return PublicSellerProfileResponse(
        id=seller.id,
        display_name=seller.display_name,
        description=seller.description,
        logo_url=seller.logo_url,
        phone=seller.phone,
        is_verified=bool(seller.is_verified),
        listings=[listing_to_public_card(row, seller) for row in listing_rows],
        reviews=[
            PublicReviewCard(
                id=rev.id,
                author_name=rev.author_name,
                rating=int(rev.rating),
                comment=rev.comment,
                created_at=rev.created_at,
            )
            for rev in review_rows
        ],
    )


async def create_public_order(
    db: AsyncSession,
    *,
    listing_id: UUID,
    buyer_name: str,
    buyer_phone: str,
    buyer_comment: str | None,
    quantity: Decimal,
) -> tuple[PublicOrderResponse, list[UUID], dict[str, str | Decimal]]:
    """Create order + inbox notifications. Returns (response, recipient_ids, telegram_ctx)."""
    row = (
        await db.execute(
            select(MarketListing)
            .join(
                MarketSellerProfile,
                MarketSellerProfile.id == MarketListing.seller_profile_id,
            )
            .join(Organization, Organization.id == MarketListing.org_id)
            .where(
                MarketListing.id == listing_id,
                _published_listing_filters(),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Объявление не найдено или недоступно',
        )

    available = Decimal(str(row.quantity_available))
    if quantity > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Доступно не более {available} {row.unit}',
        )

    order = MarketOrder(
        id=uuid4(),
        listing_id=row.id,
        buyer_name=buyer_name.strip()[:200],
        buyer_phone=buyer_phone.strip()[:40],
        buyer_comment=(buyer_comment.strip() if buyer_comment else None),
        quantity=quantity,
        status='new',
    )
    db.add(order)
    await db.flush()

    recipient_ids = await notify_new_market_order(
        db,
        org_id=row.org_id,
        listing_title=row.title,
        buyer_name=order.buyer_name,
        buyer_phone=order.buyer_phone,
        quantity=Decimal(str(order.quantity)),
        unit=row.unit,
    )

    response = PublicOrderResponse(
        id=order.id,
        listing_id=order.listing_id,
        buyer_name=order.buyer_name,
        quantity=Decimal(str(order.quantity)),
        status=order.status,
        created_at=order.created_at,
    )
    telegram_ctx: dict[str, str | Decimal] = {
        'listing_title': row.title,
        'buyer_name': order.buyer_name,
        'buyer_phone': order.buyer_phone,
        'quantity': Decimal(str(order.quantity)),
        'unit': row.unit,
    }
    return response, recipient_ids, telegram_ctx

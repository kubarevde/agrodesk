"""Anonymous marketplace vitrine — excluded from OrgContextMiddleware via /api/public."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.marketplace import (
    PublicCategoryNode,
    PublicListingCard,
    PublicListingListResponse,
    PublicOrderCreate,
    PublicOrderResponse,
    PublicSellerProfileResponse,
)
from app.services import marketplace_public as svc
from app.services.marketplace_order_notify import send_optional_telegram_new_market_order
from app.services.rate_limit import marketplace_order_limiter

router = APIRouter()


@router.get('/listings', response_model=PublicListingListResponse)
async def list_listings(
    category_id: UUID | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PublicListingListResponse:
    """Published listings only (marketplace_enabled orgs)."""
    return await svc.list_published_listings(
        db,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        q=q,
        page=page,
        page_size=page_size,
    )


@router.get('/listings/{listing_id}', response_model=PublicListingCard)
async def get_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> PublicListingCard:
    """Card by id — draft / pending / disabled-org → 404."""
    return await svc.get_published_listing(db, listing_id)


@router.get('/categories', response_model=list[PublicCategoryNode])
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> list[PublicCategoryNode]:
    return await svc.list_category_tree(db)


@router.get('/sellers/{seller_id}', response_model=PublicSellerProfileResponse)
async def get_seller(
    seller_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> PublicSellerProfileResponse:
    return await svc.get_public_seller(db, seller_id)


@router.post('/orders', response_model=PublicOrderResponse, status_code=201)
async def create_order(
    payload: PublicOrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> PublicOrderResponse:
    client_host = request.client.host if request.client else 'unknown'
    if not marketplace_order_limiter.allow(client_host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail='Слишком много заявок. Подождите минуту.',
        )
    order, recipient_ids, telegram_ctx = await svc.create_public_order(
        db,
        listing_id=payload.listing_id,
        buyer_name=payload.buyer_name,
        buyer_phone=payload.buyer_phone,
        buyer_comment=payload.buyer_comment,
        quantity=payload.quantity,
    )
    await db.commit()

    # Best-effort Telegram; must not break the public order response.
    notifier = getattr(request.app.state, 'notifier', None)
    web_base = settings.cors_origins[0] if settings.cors_origins else None
    await send_optional_telegram_new_market_order(
        notifier,
        db,
        recipient_ids=recipient_ids,
        listing_title=str(telegram_ctx['listing_title']),
        buyer_name=str(telegram_ctx['buyer_name']),
        buyer_phone=str(telegram_ctx['buyer_phone']),
        quantity=Decimal(str(telegram_ctx['quantity'])),
        unit=str(telegram_ctx['unit']),
        web_base=web_base,
    )
    return order

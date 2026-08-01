"""Public marketplace vitrine (no JWT) + org middleware still protects /api/*."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.middleware.org_context import _should_skip
from app.models.marketplace import MarketCategory, MarketListing, MarketSellerProfile
from app.models.organization import Organization
from app.services.org_features import MARKETPLACE_ENABLED_KEY, settings_dict


async def _with_session(coro_factory):
    """Isolated engine/session — avoids AsyncSessionLocal + asyncio.run loop reuse bugs."""
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as db:
            result = await coro_factory(db)
            await db.commit()
            return result
    finally:
        await engine.dispose()


async def _seed_listings(db: AsyncSession, org_id: UUID) -> dict[str, str]:
    org = await db.get(Organization, org_id)
    assert org is not None
    settings_bag = settings_dict(org.settings)
    settings_bag[MARKETPLACE_ENABLED_KEY] = True
    org.settings = dict(settings_bag)

    category = MarketCategory(
        id=uuid4(),
        name=f'Test cat {uuid4().hex[:6]}',
        slug=f'test-cat-{uuid4().hex[:8]}',
        is_active=True,
        sort_order=0,
    )
    db.add(category)

    seller = await db.scalar(
        select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
    )
    if seller is None:
        seller = MarketSellerProfile(
            id=uuid4(),
            org_id=org_id,
            display_name='Публичный магазин',
            is_verified=True,
            is_active=True,
        )
        db.add(seller)
        await db.flush()

    published = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=category.id,
        title=f'Мёд {uuid4().hex[:6]}',
        description='Натуральный мёд',
        price=Decimal('350.00'),
        unit='кг',
        quantity_available=Decimal('10'),
        photos=[],
        status='published',
        published_at=datetime.now(timezone.utc),
    )
    draft = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=category.id,
        title=f'Черновик {uuid4().hex[:6]}',
        description='Не для витрины',
        price=Decimal('100.00'),
        unit='кг',
        quantity_available=Decimal('5'),
        photos=[],
        status='draft',
    )
    db.add(published)
    db.add(draft)
    await db.flush()
    return {
        'published_id': str(published.id),
        'draft_id': str(draft.id),
        'seller_id': str(seller.id),
        'category_id': str(category.id),
        'title': published.title,
    }


async def _set_marketplace_enabled(db: AsyncSession, org_id: UUID, enabled: bool) -> None:
    org = await db.get(Organization, org_id)
    assert org is not None
    settings_bag = settings_dict(org.settings)
    settings_bag[MARKETPLACE_ENABLED_KEY] = enabled
    org.settings = dict(settings_bag)


@pytest.fixture
def seeded_listings(demo_org_id: str) -> dict[str, str]:
    return asyncio.run(
        _with_session(lambda db: _seed_listings(db, UUID(demo_org_id)))
    )


def test_middleware_skips_public_but_not_org_api() -> None:
    assert _should_skip('/api/public/marketplace/listings') is True
    assert _should_skip('/api/public/marketplace/orders') is True
    assert _should_skip('/api/auth/login') is True
    assert _should_skip('/api/inventory') is False
    assert _should_skip('/api/shifts') is False
    assert _should_skip('/api/marketplace/import-sources') is False


def test_protected_api_still_requires_jwt(client: httpx.Client) -> None:
    """Adding /api/public must not weaken JWT requirement for org-scoped routes."""
    for path in ('/api/shifts', '/api/inventory', '/api/marketplace/import-sources'):
        response = client.get(path)
        assert response.status_code == 401, f'{path}: {response.text}'


def test_draft_listing_not_public_by_id(
    client: httpx.Client, seeded_listings: dict[str, str]
) -> None:
    draft_id = seeded_listings['draft_id']
    response = client.get(f'/api/public/marketplace/listings/{draft_id}')
    assert response.status_code == 404, response.text


def test_published_listing_visible_and_order_created(
    client: httpx.Client, seeded_listings: dict[str, str]
) -> None:
    listing_id = seeded_listings['published_id']
    card = client.get(f'/api/public/marketplace/listings/{listing_id}')
    assert card.status_code == 200, card.text
    body = card.json()
    assert body['id'] == listing_id
    assert body['title'] == seeded_listings['title']
    assert 'org_id' not in body
    assert 'source_id' not in body
    assert body['seller']['display_name']
    assert 'is_verified' in body['seller']

    catalog = client.get(
        '/api/public/marketplace/listings',
        params={'q': seeded_listings['title'][:8]},
    )
    assert catalog.status_code == 200, catalog.text
    ids = {item['id'] for item in catalog.json()['items']}
    assert listing_id in ids
    assert seeded_listings['draft_id'] not in ids

    order = client.post(
        '/api/public/marketplace/orders',
        json={
            'listing_id': listing_id,
            'buyer_name': 'Иван Покупатель',
            'buyer_phone': '+79001234567',
            'buyer_comment': 'Позвоните после 18:00',
            'quantity': 1,
        },
    )
    assert order.status_code == 201, order.text
    payload = order.json()
    assert payload['listing_id'] == listing_id
    assert payload['status'] == 'new'
    assert Decimal(str(payload['quantity'])) == Decimal('1')


def test_disabled_marketplace_org_listing_hidden(
    client: httpx.Client, demo_org_id: str, seeded_listings: dict[str, str]
) -> None:
    listing_id = seeded_listings['published_id']
    try:
        asyncio.run(
            _with_session(
                lambda db: _set_marketplace_enabled(db, UUID(demo_org_id), False)
            )
        )
        response = client.get(f'/api/public/marketplace/listings/{listing_id}')
        assert response.status_code == 404, response.text
        catalog = client.get('/api/public/marketplace/listings')
        assert catalog.status_code == 200, catalog.text
        ids = {item['id'] for item in catalog.json()['items']}
        assert listing_id not in ids
    finally:
        asyncio.run(
            _with_session(
                lambda db: _set_marketplace_enabled(db, UUID(demo_org_id), True)
            )
        )


def test_public_categories_without_auth(client: httpx.Client) -> None:
    response = client.get('/api/public/marketplace/categories')
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)

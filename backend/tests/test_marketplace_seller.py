"""Seller cabinet CRUD — org isolation, submit validation, order status."""

from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.marketplace import MarketCategory, MarketListing, MarketOrder, MarketSellerProfile
from app.models.organization import Organization
from app.services.org_features import MARKETPLACE_ENABLED_KEY, settings_dict


async def _with_session(coro_factory):
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as db:
            result = await coro_factory(db)
            await db.commit()
            return result
    finally:
        await engine.dispose()


async def _enable_marketplace(db: AsyncSession, org_id: UUID) -> None:
    org = await db.get(Organization, org_id)
    assert org is not None
    bag = settings_dict(org.settings)
    bag[MARKETPLACE_ENABLED_KEY] = True
    org.settings = dict(bag)


async def _seed_foreign_listing(db: AsyncSession, demo_org_id: UUID) -> str:
    """Create a listing belonging to a different org."""
    other = Organization(
        id=uuid4(),
        name=f'Other shop {uuid4().hex[:6]}',
        slug=f'other-{uuid4().hex[:10]}',
        plan='trial',
        is_active=True,
        settings={MARKETPLACE_ENABLED_KEY: True},
    )
    db.add(other)
    await db.flush()

    cat = MarketCategory(
        id=uuid4(),
        name=f'Foreign cat {uuid4().hex[:6]}',
        slug=f'foreign-{uuid4().hex[:8]}',
        is_active=True,
        sort_order=0,
    )
    db.add(cat)
    seller = MarketSellerProfile(
        id=uuid4(),
        org_id=other.id,
        display_name='Чужой магазин',
        is_verified=False,
        is_active=True,
    )
    db.add(seller)
    await db.flush()
    listing = MarketListing(
        id=uuid4(),
        org_id=other.id,
        seller_profile_id=seller.id,
        category_id=cat.id,
        title='Чужой товар',
        description='x',
        price=Decimal('10'),
        unit='кг',
        quantity_available=Decimal('1'),
        photos=['/uploads/marketplace/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg'],
        status='published',
    )
    db.add(listing)
    await db.flush()
    assert listing.org_id != demo_org_id
    return str(listing.id)


@pytest.fixture
def marketplace_ready(demo_org_id: str) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))


@pytest.fixture
def foreign_listing_id(demo_org_id: str, marketplace_ready: None) -> str:
    return asyncio.run(
        _with_session(lambda db: _seed_foreign_listing(db, UUID(demo_org_id)))
    )


def test_cannot_patch_or_archive_foreign_listing(
    client: httpx.Client,
    admin_headers: dict[str, str],
    foreign_listing_id: str,
    marketplace_ready: None,
) -> None:
    patched = client.patch(
        f'/api/marketplace/listings/{foreign_listing_id}',
        headers=admin_headers,
        json={'title': 'Взлом'},
    )
    assert patched.status_code == 404, patched.text

    archived = client.post(
        f'/api/marketplace/listings/{foreign_listing_id}/archive',
        headers=admin_headers,
    )
    assert archived.status_code == 404, archived.text


def test_submit_incomplete_listing_returns_validation_error(
    client: httpx.Client,
    admin_headers: dict[str, str],
    marketplace_ready: None,
) -> None:
    created = client.post(
        '/api/marketplace/listings',
        headers=admin_headers,
        json={
            'title': f'Неполный {uuid4().hex[:6]}',
            'unit': 'кг',
            'price': 0,
            'quantity_available': 0,
            'photos': [],
        },
    )
    assert created.status_code == 201, created.text
    listing_id = created.json()['id']

    submitted = client.post(
        f'/api/marketplace/listings/{listing_id}/submit',
        headers=admin_headers,
    )
    assert submitted.status_code == 422, submitted.text
    detail = submitted.json()['detail']
    assert isinstance(detail, dict)
    assert 'errors' in detail
    assert detail['errors']


def test_order_status_update_persists(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
    marketplace_ready: None,
) -> None:
    async def seed_order(db: AsyncSession) -> str:
        await _enable_marketplace(db, UUID(demo_org_id))
        org_id = UUID(demo_org_id)
        seller = await db.scalar(
            select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
        )
        if seller is None:
            seller = MarketSellerProfile(
                id=uuid4(),
                org_id=org_id,
                display_name='Demo shop',
                is_active=True,
            )
            db.add(seller)
            await db.flush()
        cat = MarketCategory(
            id=uuid4(),
            name=f'Ord cat {uuid4().hex[:6]}',
            slug=f'ord-{uuid4().hex[:8]}',
            is_active=True,
            sort_order=0,
        )
        db.add(cat)
        listing = MarketListing(
            id=uuid4(),
            org_id=org_id,
            seller_profile_id=seller.id,
            category_id=cat.id,
            title='Товар для заказа',
            price=Decimal('50'),
            unit='шт',
            quantity_available=Decimal('3'),
            photos=['/uploads/marketplace/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg'],
            status='published',
        )
        db.add(listing)
        await db.flush()
        order = MarketOrder(
            id=uuid4(),
            listing_id=listing.id,
            buyer_name='Покупатель',
            buyer_phone='+79001112233',
            quantity=Decimal('1'),
            status='new',
        )
        db.add(order)
        await db.flush()
        return str(order.id)

    order_id = asyncio.run(_with_session(seed_order))

    updated = client.patch(
        f'/api/marketplace/orders/{order_id}',
        headers=admin_headers,
        json={'status': 'contacted'},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()['status'] == 'contacted'

    listed = client.get('/api/marketplace/orders', headers=admin_headers)
    assert listed.status_code == 200, listed.text
    match = next((o for o in listed.json() if o['id'] == order_id), None)
    assert match is not None
    assert match['status'] == 'contacted'


def test_seller_profile_get_patch(
    client: httpx.Client,
    admin_headers: dict[str, str],
    marketplace_ready: None,
) -> None:
    got = client.get('/api/marketplace/seller-profile', headers=admin_headers)
    assert got.status_code == 200, got.text
    name = f'Магазин {uuid4().hex[:6]}'
    patched = client.patch(
        '/api/marketplace/seller-profile',
        headers=admin_headers,
        json={'display_name': name, 'phone': '+79005554433'},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()['display_name'] == name
    assert patched.json()['phone'] == '+79005554433'

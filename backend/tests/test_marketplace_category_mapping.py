"""Import category mapping via service (authoritative) + HTTP no-mapping smoke."""

from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.inventory import InventoryItem
from app.models.marketplace import MarketCategory, MarketCategoryMapping, MarketListing
from app.models.organization import Organization
from app.services.marketplace_category_mapping import resolve_market_category_id
from app.services.marketplace_import import create_listing_from_source
from app.services.org_features import MARKETPLACE_ENABLED_KEY, settings_dict


def _create_inventory_item(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    category: str,
    stock: float = 42.5,
    unit: str = 'л',
) -> dict:
    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'ГСМ map {uuid4().hex[:8]}',
            'category': category,
            'unit': unit,
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 1000,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


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


async def _ensure_marketplace(db: AsyncSession, org_id: UUID) -> None:
    org = await db.get(Organization, org_id)
    assert org is not None
    bag = settings_dict(org.settings)
    bag[MARKETPLACE_ENABLED_KEY] = True
    org.settings = dict(bag)


async def _org_id(db: AsyncSession) -> UUID:
    org = await db.scalar(
        select(Organization).where(Organization.slug.in_(('demo', 'main'))).limit(1)
    )
    if org is None:
        org = await db.scalar(select(Organization).limit(1))
    assert org is not None
    await _ensure_marketplace(db, org.id)
    return org.id


def test_import_without_mapping_leaves_category_empty(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    inv_code = f'unmap_{uuid4().hex[:8]}'
    asyncio.run(_with_session(lambda db: _ensure_marketplace(db, UUID(demo_org_id))))
    asyncio.run(
        _with_session(
            lambda db: db.execute(
                delete(MarketCategoryMapping).where(
                    MarketCategoryMapping.inventory_category_value == inv_code
                )
            )
        )
    )

    item = _create_inventory_item(client, admin_headers, category=inv_code, stock=11)
    stock_before = Decimal(str(item['current_stock']))

    created = client.post(
        '/api/marketplace/listings/from-source',
        headers=admin_headers,
        json={'source_type': 'inventory', 'source_id': item['id']},
    )
    assert created.status_code == 201, created.text
    listing = created.json()
    assert listing['status'] == 'draft'
    assert listing['category_id'] is None

    after = client.get(f"/api/inventory/{item['id']}", headers=admin_headers)
    assert after.status_code == 200
    assert Decimal(str(after.json()['current_stock'])) == stock_before
    assert after.json()['category'] == inv_code


def test_import_with_mapping_sets_market_category_service() -> None:
    """Mapping present → draft gets market_category_id; inventory row unchanged."""

    async def run() -> None:
        engine = create_async_engine(settings.DATABASE_URL)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with factory() as db:
                org_id = await _org_id(db)
                inv_code = f'map_{uuid4().hex[:8]}'
                cat = MarketCategory(
                    id=uuid4(),
                    name=f'Map {uuid4().hex[:6]}',
                    slug=f'map-{uuid4().hex[:8]}',
                    is_active=True,
                    sort_order=0,
                )
                db.add(cat)
                await db.flush()
                db.add(
                    MarketCategoryMapping(
                        id=uuid4(),
                        inventory_category_value=inv_code,
                        market_category_id=cat.id,
                    )
                )
                item = InventoryItem(
                    id=uuid4(),
                    org_id=org_id,
                    name=f'Map item {uuid4().hex[:6]}',
                    category=inv_code,
                    unit='кг',
                    current_stock=Decimal('19.5'),
                    min_stock=Decimal('0'),
                    total_capacity=Decimal('100'),
                )
                db.add(item)
                await db.flush()
                stock_before = Decimal(str(item.current_stock))
                category_before = item.category

                assert await resolve_market_category_id(db, inv_code) == cat.id

                listing = await create_listing_from_source(
                    db,
                    org_id,
                    source_type='inventory',
                    source_id=item.id,
                )
                assert isinstance(listing, MarketListing)
                assert listing.category_id == cat.id
                assert listing.status == 'draft'

                await db.refresh(item)
                assert Decimal(str(item.current_stock)) == stock_before
                assert item.category == category_before
                await db.commit()
        finally:
            await engine.dispose()

    asyncio.run(run())


def test_resolve_unmapped_returns_none() -> None:
    async def run() -> None:
        engine = create_async_engine(settings.DATABASE_URL)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with factory() as db:
                assert await resolve_market_category_id(db, f'none_{uuid4().hex[:8]}') is None
                assert await resolve_market_category_id(db, '') is None
                assert await resolve_market_category_id(db, None) is None
        finally:
            await engine.dispose()

    asyncio.run(run())

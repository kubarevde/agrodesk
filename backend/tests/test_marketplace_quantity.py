"""Live quantity for source-linked marketplace listings (warehouse remains SoT).

No inventory write-back; no reservation; 409 re-import preserved.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.inventory import InventoryItem
from app.models.marketplace import MarketListing
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


def _create_inventory_item(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    stock: float = 42.5,
) -> dict:
    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'Qty sync {uuid4().hex[:8]}',
            'category': 'fuel',
            'unit': 'л',
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 1000,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _import_inventory(
    client: httpx.Client, headers: dict[str, str], source_id: str
) -> dict:
    created = client.post(
        '/api/marketplace/listings/from-source',
        headers=headers,
        json={'source_type': 'inventory', 'source_id': source_id},
    )
    assert created.status_code == 201, created.text
    return created.json()


def test_source_linked_listing_reads_live_inventory_quantity(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=55)
    listing = _import_inventory(client, admin_headers, item['id'])
    assert listing['quantity_mode'] == 'source'
    assert listing['source_missing'] is False
    assert Decimal(str(listing['quantity_available'])) == Decimal('55')

    async def _bump_stock(db: AsyncSession) -> None:
        row = await db.get(InventoryItem, UUID(item['id']))
        assert row is not None
        row.current_stock = Decimal('12.5')

    asyncio.run(_with_session(_bump_stock))

    got = client.get(f"/api/marketplace/listings/{listing['id']}", headers=admin_headers)
    assert got.status_code == 200, got.text
    body = got.json()
    assert body['quantity_mode'] == 'source'
    assert Decimal(str(body['quantity_available'])) == Decimal('12.5')
    assert body['status'] == 'draft'

    # Stored snapshot column is not the API effective qty after stock change.
    async def _stored(db: AsyncSession) -> Decimal:
        row = await db.get(MarketListing, UUID(listing['id']))
        assert row is not None
        return Decimal(str(row.quantity_available))

    stored = asyncio.run(_with_session(_stored))
    assert stored == Decimal('55')


def test_manual_listing_quantity_unaffected(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    created = client.post(
        '/api/marketplace/listings',
        headers=admin_headers,
        json={
            'title': f'Manual qty {uuid4().hex[:6]}',
            'price': 10,
            'unit': 'кг',
            'quantity_available': 3,
            'photos': [],
        },
    )
    assert created.status_code == 201, created.text
    listing = created.json()
    assert listing['quantity_mode'] == 'manual'
    assert listing['source_missing'] is False
    assert Decimal(str(listing['quantity_available'])) == Decimal('3')

    patched = client.patch(
        f"/api/marketplace/listings/{listing['id']}",
        headers=admin_headers,
        json={'quantity_available': 9},
    )
    assert patched.status_code == 200, patched.text
    assert Decimal(str(patched.json()['quantity_available'])) == Decimal('9')
    assert patched.json()['quantity_mode'] == 'manual'


def test_source_linked_rejects_quantity_patch(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=20)
    listing = _import_inventory(client, admin_headers, item['id'])

    patched = client.patch(
        f"/api/marketplace/listings/{listing['id']}",
        headers=admin_headers,
        json={'quantity_available': 1},
    )
    assert patched.status_code == 400, patched.text
    assert 'синхрониз' in patched.json()['detail'].lower()


def test_inactive_source_shows_missing_without_status_change(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=8)
    listing = _import_inventory(client, admin_headers, item['id'])

    async def _deactivate(db: AsyncSession) -> None:
        row = await db.get(InventoryItem, UUID(item['id']))
        assert row is not None
        row.is_active = False

    asyncio.run(_with_session(_deactivate))

    got = client.get(f"/api/marketplace/listings/{listing['id']}", headers=admin_headers)
    assert got.status_code == 200, got.text
    body = got.json()
    assert body['quantity_mode'] == 'source'
    assert body['source_missing'] is True
    assert Decimal(str(body['quantity_available'])) == Decimal('0')
    assert body['status'] == 'draft'


def test_public_order_does_not_mutate_inventory_stock(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=40)
    listing = _import_inventory(client, admin_headers, item['id'])
    listing_id = listing['id']
    item_id = item['id']

    async def _publish(db: AsyncSession) -> None:
        row = await db.get(MarketListing, UUID(listing_id))
        assert row is not None
        row.status = 'published'
        row.published_at = datetime.now(timezone.utc)
        row.photos = ['https://example.com/q.jpg']

    asyncio.run(_with_session(_publish))

    order = client.post(
        '/api/public/marketplace/orders',
        json={
            'listing_id': listing_id,
            'buyer_name': 'Тест',
            'buyer_phone': '+79001234567',
            'quantity': 2,
        },
    )
    assert order.status_code == 201, order.text

    after = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert after.status_code == 200, after.text
    assert Decimal(str(after.json()['current_stock'])) == Decimal('40')

    public = client.get(f'/api/public/marketplace/listings/{listing_id}')
    assert public.status_code == 200, public.text
    assert Decimal(str(public.json()['quantity_available'])) == Decimal('40')
    assert 'quantity_mode' not in public.json()
    assert 'source_missing' not in public.json()
    assert 'source_id' not in public.json()


def test_reimport_409_still_blocks_active_source(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=5)
    first = _import_inventory(client, admin_headers, item['id'])
    second = client.post(
        '/api/marketplace/listings/from-source',
        headers=admin_headers,
        json={'source_type': 'inventory', 'source_id': item['id']},
    )
    assert second.status_code == 409, second.text
    assert second.json()['detail']['listing_id'] == first['id']

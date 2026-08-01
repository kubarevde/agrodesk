"""Marketplace one-way import from inventory/shipments.

Creates a source-linked draft; displayed qty is live on read.
Does not mutate warehouse rows; re-import of an active source returns 409.
"""

from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
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
    unit: str = 'л',
) -> dict:
    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'ГСМ импорт {uuid4().hex[:8]}',
            'category': 'fuel',
            'unit': unit,
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 1000,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_import_sources_lists_inventory(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=15)
    sources = client.get('/api/marketplace/import-sources', headers=admin_headers)
    assert sources.status_code == 200, sources.text
    body = sources.json()
    assert 'inventory' in body and 'shipments' in body
    match = next((row for row in body['inventory'] if row['source_id'] == item['id']), None)
    assert match is not None
    assert match['name'] == item['name']
    assert Decimal(str(match['quantity'])) == Decimal(str(item['current_stock']))
    assert match['unit'] == item['unit']
    assert match['already_imported'] is False


def test_import_from_inventory_creates_source_link_without_mutating_stock(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=77.25, unit='л')
    item_id = item['id']
    stock_before = Decimal(str(item['current_stock']))

    created = client.post(
        '/api/marketplace/listings/from-source',
        headers=admin_headers,
        json={'source_type': 'inventory', 'source_id': item_id},
    )
    assert created.status_code == 201, created.text
    listing = created.json()
    assert listing['status'] == 'draft'
    assert listing['source_type'] == 'inventory'
    assert listing['source_id'] == item_id
    assert listing['title'] == item['name']
    assert listing['unit'] == 'л'
    assert listing['quantity_mode'] == 'source'
    assert listing['source_missing'] is False
    assert Decimal(str(listing['quantity_available'])) == stock_before
    assert listing['category_id'] is None
    assert Decimal(str(listing['price'])) == Decimal('0')

    after = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert after.status_code == 200, after.text
    item_after = after.json()
    assert Decimal(str(item_after['current_stock'])) == stock_before
    assert item_after['name'] == item['name']
    assert item_after['unit'] == item['unit']

    sources = client.get('/api/marketplace/import-sources', headers=admin_headers)
    assert sources.status_code == 200, sources.text
    match = next(
        (row for row in sources.json()['inventory'] if row['source_id'] == item_id),
        None,
    )
    assert match is not None
    assert match['already_imported'] is True


def test_reimport_same_inventory_source_returns_conflict(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    item = _create_inventory_item(client, admin_headers, stock=10)
    item_id = item['id']

    first = client.post(
        '/api/marketplace/listings/from-source',
        headers=admin_headers,
        json={'source_type': 'inventory', 'source_id': item_id},
    )
    assert first.status_code == 201, first.text
    listing_id = first.json()['id']

    second = client.post(
        '/api/marketplace/listings/from-source',
        headers=admin_headers,
        json={'source_type': 'inventory', 'source_id': item_id},
    )
    assert second.status_code == 409, second.text
    detail = second.json()['detail']
    assert isinstance(detail, dict)
    assert detail.get('listing_id') == listing_id
    assert detail.get('status') == 'draft'


def test_import_requires_marketplace_manage(
    client: httpx.Client, demo_org_id: str
) -> None:
    """Employee without marketplace.manage must be rejected (403)."""
    login = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert login.status_code == 200, login.text
    headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

    sources = client.get('/api/marketplace/import-sources', headers=headers)
    assert sources.status_code == 403, sources.text


def test_manager_without_group_cannot_manage_marketplace(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    """marketplace.manage is not a default manager grant — access group required."""
    asyncio.run(_with_session(lambda db: _enable_marketplace(db, UUID(demo_org_id))))
    sources = client.get('/api/marketplace/import-sources', headers=manager_headers)
    assert sources.status_code == 403, sources.text

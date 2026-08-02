"""Marketplace showcase orders report — isolated from farm /api/reports."""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
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


async def _set_marketplace(db: AsyncSession, org_id: UUID, enabled: bool) -> None:
    org = await db.get(Organization, org_id)
    assert org is not None
    bag = settings_dict(org.settings)
    bag[MARKETPLACE_ENABLED_KEY] = enabled
    org.settings = dict(bag)


async def _seed_orders(db: AsyncSession, org_id: UUID) -> dict[str, str]:
    await _set_marketplace(db, org_id, True)
    seller = await db.scalar(
        select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
    )
    if seller is None:
        seller = MarketSellerProfile(
            id=uuid4(),
            org_id=org_id,
            display_name='Отчётный магазин',
            is_active=True,
        )
        db.add(seller)
        await db.flush()
    else:
        seller.display_name = 'Отчётный магазин'
    cat = MarketCategory(
        id=uuid4(),
        name=f'Report cat {uuid4().hex[:6]}',
        slug=f'rep-{uuid4().hex[:8]}',
        is_active=True,
        sort_order=0,
    )
    db.add(cat)
    listing = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=cat.id,
        title='Мёд отчётный',
        price=Decimal('100.00'),
        unit='кг',
        quantity_available=Decimal('50'),
        photos=['/uploads/marketplace/cccccccccccccccccccccccccccccccc.jpg'],
        status='published',
    )
    db.add(listing)
    await db.flush()

    new_order = MarketOrder(
        id=uuid4(),
        listing_id=listing.id,
        buyer_name='Алексей',
        buyer_phone='+79001110001',
        quantity=Decimal('2'),
        status='new',
    )
    completed = MarketOrder(
        id=uuid4(),
        listing_id=listing.id,
        buyer_name='Борис',
        buyer_phone='+79001110002',
        quantity=Decimal('3'),
        status='completed',
    )
    cancelled = MarketOrder(
        id=uuid4(),
        listing_id=listing.id,
        buyer_name='Виктор',
        buyer_phone='+79001110003',
        quantity=Decimal('1'),
        status='cancelled',
    )
    db.add_all([new_order, completed, cancelled])
    await db.flush()
    return {
        'listing_id': str(listing.id),
        'new_id': str(new_order.id),
        'completed_id': str(completed.id),
        'cancelled_id': str(cancelled.id),
    }


@pytest.fixture
def report_seed(demo_org_id: str) -> dict[str, str]:
    return asyncio.run(_with_session(lambda db: _seed_orders(db, UUID(demo_org_id))))


def _period_params() -> dict[str, str]:
    today = date.today()
    return {
        'from_date': (today - timedelta(days=1)).isoformat(),
        'to_date': (today + timedelta(days=1)).isoformat(),
    }


def test_orders_report_aggregates_and_estimates(
    client: httpx.Client,
    admin_headers: dict[str, str],
    report_seed: dict[str, str],
) -> None:
    params = _period_params()
    res = client.get(
        '/api/marketplace/reports/orders',
        headers=admin_headers,
        params=params,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body['orders_count'] >= 3
    disclaimer = body['amount_disclaimer'].lower()
    assert 'не выручка' in disclaimer
    assert 'оценк' in disclaimer
    assert 'оплат' in disclaimer or 'не выручка' in disclaimer

    by_status = {row['status']: row['orders_count'] for row in body['status_breakdown']}
    assert by_status['new'] >= 1
    assert by_status['completed'] >= 1
    assert by_status['cancelled'] >= 1

    match = next(r for r in body['rows'] if r['order_id'] == report_seed['new_id'])
    assert Decimal(str(match['listing_price'])) == Decimal('100.00')
    assert Decimal(str(match['quantity'])) == Decimal('2')
    assert Decimal(str(match['estimated_amount'])) == Decimal('200.00')
    assert match['listing_title'] == 'Мёд отчётный'


def test_orders_report_status_filter(
    client: httpx.Client,
    admin_headers: dict[str, str],
    report_seed: dict[str, str],
) -> None:
    params = {**_period_params(), 'status': 'completed'}
    res = client.get(
        '/api/marketplace/reports/orders',
        headers=admin_headers,
        params=params,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert all(row['status'] == 'completed' for row in body['rows'])
    assert any(row['order_id'] == report_seed['completed_id'] for row in body['rows'])
    assert body['status_breakdown']


def test_orders_report_requires_marketplace_enabled(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
    report_seed: dict[str, str],
) -> None:
    asyncio.run(_with_session(lambda db: _set_marketplace(db, UUID(demo_org_id), False)))
    try:
        res = client.get(
            '/api/marketplace/reports/orders',
            headers=admin_headers,
            params=_period_params(),
        )
        assert res.status_code == 403, res.text
        assert 'маркетплейс' in res.json()['detail'].lower()
    finally:
        asyncio.run(_with_session(lambda db: _set_marketplace(db, UUID(demo_org_id), True)))


def test_orders_report_export_xlsx_contract(
    client: httpx.Client,
    admin_headers: dict[str, str],
    report_seed: dict[str, str],
) -> None:
    params = _period_params()
    res = client.post(
        '/api/marketplace/reports/orders/export',
        headers=admin_headers,
        json=params,
    )
    assert res.status_code == 200, res.text
    ctype = res.headers.get('content-type', '')
    assert 'spreadsheetml' in ctype or 'octet-stream' in ctype
    assert res.content[:2] == b'PK'  # zip/xlsx magic
    assert 'marketplace_orders_' in res.headers.get('content-disposition', '')


def test_orders_report_not_on_farm_reports_path(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Farm reports registry must not grow a marketplace endpoint."""
    res = client.post(
        '/api/reports/marketplace-orders',
        headers=admin_headers,
        json=_period_params(),
    )
    assert res.status_code in (404, 405, 422)


def test_farm_shipments_report_still_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
    report_seed: dict[str, str],
) -> None:
    """Regression: ordinary farm Excel reports remain reachable."""
    params = _period_params()
    res = client.post(
        '/api/reports/shipments',
        headers=admin_headers,
        json=params,
    )
    assert res.status_code == 200, res.text
    assert res.content[:2] == b'PK'

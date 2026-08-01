"""Superadmin marketplace moderation — approve/reject, block seller, access control."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.marketplace import MarketCategory, MarketListing, MarketSellerProfile
from app.models.organization import Organization
from app.services.org_features import MARKETPLACE_ENABLED_KEY, settings_dict


def _load_dotenv_if_present() -> None:
    env_path = Path(__file__).resolve().parents[1] / '.env'
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        raw = line.strip()
        if not raw or raw.startswith('#') or '=' not in raw:
            continue
        key, _, value = raw.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _superadmin_headers(client: httpx.Client) -> dict[str, str] | None:
    _load_dotenv_if_present()
    email = (os.environ.get('SUPERADMIN_EMAIL') or '').strip()
    password = (os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
    if not email or not password:
        return None
    r = client.post(
        '/superadmin/api/auth/login',
        json={'email': email, 'password': password},
    )
    if r.status_code != 200:
        return None
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


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


async def _seed_pending_and_published(db: AsyncSession, org_id: UUID) -> dict[str, str]:
    org = await db.get(Organization, org_id)
    assert org is not None
    bag = settings_dict(org.settings)
    bag[MARKETPLACE_ENABLED_KEY] = True
    org.settings = dict(bag)

    from sqlalchemy import select

    seller = await db.scalar(
        select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
    )
    if seller is None:
        seller = MarketSellerProfile(
            id=uuid4(),
            org_id=org_id,
            display_name='Модерация магазин',
            is_verified=False,
            is_active=True,
        )
        db.add(seller)
        await db.flush()
    else:
        seller.is_active = True

    cat = MarketCategory(
        id=uuid4(),
        name=f'Mod cat {uuid4().hex[:6]}',
        slug=f'mod-{uuid4().hex[:8]}',
        is_active=True,
        sort_order=0,
    )
    db.add(cat)
    pending = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=cat.id,
        title=f'На модерации {uuid4().hex[:6]}',
        description='Описание',
        price=Decimal('120'),
        unit='кг',
        quantity_available=Decimal('5'),
        photos=['/uploads/marketplace/cccccccccccccccccccccccccccccccc.jpg'],
        status='pending_review',
    )
    published = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=cat.id,
        title=f'Опубликован {uuid4().hex[:6]}',
        description='Витрина',
        price=Decimal('200'),
        unit='кг',
        quantity_available=Decimal('2'),
        photos=['/uploads/marketplace/dddddddddddddddddddddddddddddddd.jpg'],
        status='published',
        published_at=datetime.now(timezone.utc),
    )
    db.add(pending)
    db.add(published)
    await db.flush()
    return {
        'pending_id': str(pending.id),
        'published_id': str(published.id),
        'seller_id': str(seller.id),
    }


@pytest.fixture
def seeded(demo_org_id: str) -> dict[str, str]:
    return asyncio.run(
        _with_session(lambda db: _seed_pending_and_published(db, UUID(demo_org_id)))
    )


def test_org_user_cannot_access_superadmin_marketplace(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    r = client.get(
        '/superadmin/api/marketplace/listings',
        headers=admin_headers,
    )
    assert r.status_code in (401, 403), r.text


def test_approve_and_reject_change_status(
    client: httpx.Client, demo_org_id: str, seeded: dict[str, str]
) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    pending_id = seeded['pending_id']
    queue = client.get(
        '/superadmin/api/marketplace/listings',
        params={'status': 'pending_review'},
        headers=staff,
    )
    assert queue.status_code == 200, queue.text
    ids = {row['id'] for row in queue.json()}
    assert pending_id in ids

    approved = client.post(
        f'/superadmin/api/marketplace/listings/{pending_id}/approve',
        headers=staff,
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()['status'] == 'published'
    assert approved.json()['published_at'] is not None

    # Second pending for reject
    more = asyncio.run(
        _with_session(lambda db: _seed_pending_and_published(db, UUID(demo_org_id)))
    )
    rejected = client.post(
        f'/superadmin/api/marketplace/listings/{more["pending_id"]}/reject',
        headers=staff,
        json={'rejection_reason': 'Недостаточно фото и описания'},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()['status'] == 'rejected'
    assert 'фото' in rejected.json()['rejection_reason'].lower() or rejected.json()[
        'rejection_reason'
    ]


def test_block_seller_hides_public_listings(
    client: httpx.Client, seeded: dict[str, str]
) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    listing_id = seeded['published_id']
    seller_id = seeded['seller_id']

    before = client.get(f'/api/public/marketplace/listings/{listing_id}')
    assert before.status_code == 200, before.text

    blocked = client.patch(
        f'/superadmin/api/marketplace/sellers/{seller_id}',
        headers=staff,
        json={'is_active': False},
    )
    assert blocked.status_code == 200, blocked.text
    assert blocked.json()['is_active'] is False

    after = client.get(f'/api/public/marketplace/listings/{listing_id}')
    assert after.status_code == 404, after.text

    # restore for other tests
    client.patch(
        f'/superadmin/api/marketplace/sellers/{seller_id}',
        headers=staff,
        json={'is_active': True},
    )

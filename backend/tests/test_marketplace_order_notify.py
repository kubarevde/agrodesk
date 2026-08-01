"""new_market_order inbox notifications on public vitrine orders."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.marketplace import MarketCategory, MarketListing, MarketSellerProfile
from app.models.notification import Notification
from app.models.organization import Organization
from app.services.action_permissions import (
    employee_has_action,
    resolve_effective_permissions,
)
from app.services.marketplace_order_notify import (
    NEW_MARKET_ORDER_TYPE,
    list_employees_with_marketplace_manage,
    notify_new_market_order,
    send_optional_telegram_new_market_order,
)
from app.services.marketplace_public import create_public_order
from app.services.org_features import MARKETPLACE_ENABLED_KEY, settings_dict
from app.services.telegram_notify import (
    TelegramNotifier,
    format_new_market_order_telegram_text,
)


async def _with_session(coro_factory):
    engine = create_async_engine(settings.DATABASE_URL)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as db:
            result = await coro_factory(db)
            await db.commit()
            return result
    finally:
        await engine.dispose()


async def _seed_published(db: AsyncSession, org_id: UUID) -> str:
    org = await db.get(Organization, org_id)
    assert org is not None
    bag = settings_dict(org.settings)
    bag[MARKETPLACE_ENABLED_KEY] = True
    org.settings = dict(bag)

    seller = await db.scalar(
        select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
    )
    if seller is None:
        seller = MarketSellerProfile(
            id=uuid4(),
            org_id=org_id,
            display_name='Notify shop',
            is_active=True,
        )
        db.add(seller)
        await db.flush()

    cat = MarketCategory(
        id=uuid4(),
        name=f'Ncat {uuid4().hex[:6]}',
        slug=f'ncat-{uuid4().hex[:8]}',
        is_active=True,
        sort_order=0,
    )
    db.add(cat)
    listing = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=seller.id,
        category_id=cat.id,
        title=f'Notify honey {uuid4().hex[:6]}',
        description='x',
        price=Decimal('100'),
        unit='кг',
        quantity_available=Decimal('20'),
        photos=[],
        status='published',
        published_at=datetime.now(timezone.utc),
    )
    db.add(listing)
    await db.flush()
    return str(listing.id)


def test_format_new_market_order_telegram_text() -> None:
    text = format_new_market_order_telegram_text(
        listing_title='Мёд',
        buyer_name='Иван',
        buyer_phone='+7900',
        quantity=2,
        unit='кг',
        web_base='http://localhost:5173',
    )
    assert 'Новая заявка с витрины' in text
    assert 'Мёд' in text
    assert '+7900' in text
    assert 'http://localhost:5173/seller-market/orders' in text


def test_create_order_notifies_each_marketplace_manage_employee(demo_org_id: str) -> None:
    listing_id = asyncio.run(_with_session(lambda db: _seed_published(db, UUID(demo_org_id))))
    phone = f'+7999{uuid4().hex[:7]}'

    async def run() -> None:
        engine = create_async_engine(settings.DATABASE_URL)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with factory() as db:
                org_id = UUID(demo_org_id)
                expected = await list_employees_with_marketplace_manage(db, org_id)
                assert expected, 'demo org should have marketplace.manage recipients'
                expected_ids = {e.id for e in expected}

                for emp in expected:
                    effective = await resolve_effective_permissions(db, emp)
                    assert employee_has_action(effective, 'marketplace.manage')

                before = int(
                    await db.scalar(
                        select(func.count())
                        .select_from(Notification)
                        .where(Notification.type == NEW_MARKET_ORDER_TYPE)
                    )
                    or 0
                )

                response, recipient_ids, _ctx = await create_public_order(
                    db,
                    listing_id=UUID(listing_id),
                    buyer_name='Покупатель Тест',
                    buyer_phone=phone,
                    buyer_comment=None,
                    quantity=Decimal('1'),
                )
                assert response.status == 'new'
                assert set(recipient_ids) == expected_ids
                assert len(recipient_ids) == len(expected_ids)

                batch = (
                    await db.execute(
                        select(Notification).where(
                            Notification.type == NEW_MARKET_ORDER_TYPE,
                            Notification.body.contains(phone),
                        )
                    )
                ).scalars().all()
                assert len(batch) == len(expected_ids)
                assert {row.employee_id for row in batch} == expected_ids
                assert all(row.link == '/seller-market/orders' for row in batch)

                after = int(
                    await db.scalar(
                        select(func.count())
                        .select_from(Notification)
                        .where(Notification.type == NEW_MARKET_ORDER_TYPE)
                    )
                    or 0
                )
                assert after == before + len(expected_ids)

                await db.commit()
        finally:
            await engine.dispose()

    asyncio.run(run())


def test_telegram_disabled_does_not_break_notify() -> None:
    async def run() -> None:
        engine = create_async_engine(settings.DATABASE_URL)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with factory() as db:
                notifier = TelegramNotifier(None)
                assert notifier.enabled is False
                await send_optional_telegram_new_market_order(
                    notifier,
                    db,
                    recipient_ids=[uuid4()],
                    listing_title='X',
                    buyer_name='Y',
                    buyer_phone='1',
                    quantity=Decimal('1'),
                    unit='кг',
                    web_base=None,
                )
                await send_optional_telegram_new_market_order(
                    None,
                    db,
                    recipient_ids=[uuid4()],
                    listing_title='X',
                    buyer_name='Y',
                    buyer_phone='1',
                    quantity=Decimal('1'),
                    unit='кг',
                    web_base=None,
                )
        finally:
            await engine.dispose()

    asyncio.run(run())


def test_notify_new_market_order_one_per_recipient(demo_org_id: str) -> None:
    async def run() -> None:
        engine = create_async_engine(settings.DATABASE_URL)
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with factory() as db:
                org_id = UUID(demo_org_id)
                recipients = await list_employees_with_marketplace_manage(db, org_id)
                ids = await notify_new_market_order(
                    db,
                    org_id=org_id,
                    listing_title='Test',
                    buyer_name='B',
                    buyer_phone='123',
                    quantity=Decimal('3'),
                    unit='л',
                )
                assert len(ids) == len(recipients)
                assert len(set(ids)) == len(ids)
                await db.rollback()
        finally:
            await engine.dispose()

    asyncio.run(run())

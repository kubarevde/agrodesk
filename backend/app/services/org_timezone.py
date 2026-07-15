"""Organization timezone helpers — single place for 'now' / 'today' in tenant context."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization

DEFAULT_TIMEZONE = 'Asia/Bangkok'


def timezone_from_settings(settings: Any) -> str:
    if isinstance(settings, dict):
        value = settings.get('timezone')
        if isinstance(value, str) and value.strip():
            return value.strip()
    return DEFAULT_TIMEZONE


def zoneinfo_or_default(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


async def get_org_timezone(db: AsyncSession, org_id: UUID) -> str:
    result = await db.execute(select(Organization.settings).where(Organization.id == org_id))
    raw = result.scalar_one_or_none()
    return timezone_from_settings(raw)


async def now_in_org(db: AsyncSession, org_id: UUID) -> datetime:
    tz_name = await get_org_timezone(db, org_id)
    return datetime.now(zoneinfo_or_default(tz_name)).replace(tzinfo=None)


async def today_in_org(db: AsyncSession, org_id: UUID) -> date:
    return (await now_in_org(db, org_id)).date()

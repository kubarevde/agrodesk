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

# Curated IANA zones for RF + CIS / adjacent regions + current product default (Bangkok).
# Order: west → east for Russia, then neighbours, then product default / UTC.
AVAILABLE_TIMEZONES: tuple[str, ...] = (
    # Russia
    'Europe/Kaliningrad',
    'Europe/Moscow',
    'Europe/Samara',
    'Europe/Volgograd',
    'Asia/Yekaterinburg',
    'Asia/Omsk',
    'Asia/Novosibirsk',
    'Asia/Barnaul',
    'Asia/Tomsk',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Chita',
    'Asia/Yakutsk',
    'Asia/Vladivostok',
    'Asia/Sakhalin',
    'Asia/Magadan',
    'Asia/Srednekolymsk',
    'Asia/Kamchatka',
    'Asia/Anadyr',
    # CIS / adjacent
    'Europe/Minsk',
    'Europe/Kyiv',
    'Asia/Almaty',
    'Asia/Qostanay',
    'Asia/Aqtobe',
    'Asia/Tashkent',
    'Asia/Samarkand',
    'Asia/Bishkek',
    'Asia/Dushanbe',
    'Asia/Ashgabat',
    'Asia/Baku',
    'Asia/Tbilisi',
    'Asia/Yerevan',
    # Product default / SEA usage
    'Asia/Bangkok',
    'Asia/Ho_Chi_Minh',
    'UTC',
)

TIMEZONE_LABELS_RU: dict[str, str] = {
    'Europe/Kaliningrad': 'Калининград (UTC+2)',
    'Europe/Moscow': 'Москва (UTC+3)',
    'Europe/Samara': 'Самара (UTC+4)',
    'Europe/Volgograd': 'Волгоград (UTC+3)',
    'Asia/Yekaterinburg': 'Екатеринбург (UTC+5)',
    'Asia/Omsk': 'Омск (UTC+6)',
    'Asia/Novosibirsk': 'Новосибирск (UTC+7)',
    'Asia/Barnaul': 'Барнаул (UTC+7)',
    'Asia/Tomsk': 'Томск (UTC+7)',
    'Asia/Krasnoyarsk': 'Красноярск (UTC+7)',
    'Asia/Irkutsk': 'Иркутск (UTC+8)',
    'Asia/Chita': 'Чита (UTC+9)',
    'Asia/Yakutsk': 'Якутск (UTC+9)',
    'Asia/Vladivostok': 'Владивосток (UTC+10)',
    'Asia/Sakhalin': 'Сахалин (UTC+11)',
    'Asia/Magadan': 'Магадан (UTC+11)',
    'Asia/Srednekolymsk': 'Среднеколымск (UTC+11)',
    'Asia/Kamchatka': 'Камчатка (UTC+12)',
    'Asia/Anadyr': 'Анадырь (UTC+12)',
    'Europe/Minsk': 'Минск (UTC+3)',
    'Europe/Kyiv': 'Киев (UTC+2)',
    'Asia/Almaty': 'Алматы (UTC+5)',
    'Asia/Qostanay': 'Костанай (UTC+5)',
    'Asia/Aqtobe': 'Актобе (UTC+5)',
    'Asia/Tashkent': 'Ташкент (UTC+5)',
    'Asia/Samarkand': 'Самарканд (UTC+5)',
    'Asia/Bishkek': 'Бишкек (UTC+6)',
    'Asia/Dushanbe': 'Душанбе (UTC+5)',
    'Asia/Ashgabat': 'Ашхабад (UTC+5)',
    'Asia/Baku': 'Баку (UTC+4)',
    'Asia/Tbilisi': 'Тбилиси (UTC+4)',
    'Asia/Yerevan': 'Ереван (UTC+4)',
    'Asia/Bangkok': 'Бангкок (UTC+7)',
    'Asia/Ho_Chi_Minh': 'Хошимин (UTC+7)',
    'UTC': 'UTC',
}


def timezone_label(tz: str) -> str:
    return TIMEZONE_LABELS_RU.get(tz, tz)


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


def validate_timezone_name(name: str) -> str:
    """Return normalized IANA name or raise ValueError."""
    tz = name.strip()
    if not tz:
        raise ValueError('empty')
    if tz in AVAILABLE_TIMEZONES:
        return tz
    try:
        ZoneInfo(tz)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f'unknown timezone: {tz}') from exc
    return tz


async def get_org_timezone(db: AsyncSession, org_id: UUID) -> str:
    result = await db.execute(select(Organization.settings).where(Organization.id == org_id))
    raw = result.scalar_one_or_none()
    return timezone_from_settings(raw)


async def now_in_org(db: AsyncSession, org_id: UUID) -> datetime:
    tz_name = await get_org_timezone(db, org_id)
    return datetime.now(zoneinfo_or_default(tz_name)).replace(tzinfo=None)


async def today_in_org(db: AsyncSession, org_id: UUID) -> date:
    return (await now_in_org(db, org_id)).date()

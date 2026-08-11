"""System work location «Полевая работа» — sentinel for field-work shift types."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference import Location

FIELD_WORK_LOCATION_CODE = 'field_work'
FIELD_WORK_LOCATION_NAME = 'Полевая работа'
FIELD_WORK_LOCATION_DESCRIPTION = (
    'Системное место работы для типов с признаком «полевая работа» (агрокалендарь)'
)


def is_system_field_work_location(location: Location) -> bool:
    return bool(getattr(location, 'is_system', False)) or (
        getattr(location, 'code', None) == FIELD_WORK_LOCATION_CODE
    )


async def ensure_field_work_location(db: AsyncSession, org_id: UUID) -> Location:
    """Return (and create if missing) the protected system location for an org."""
    result = await db.execute(
        select(Location).where(
            Location.org_id == org_id,
            Location.code == FIELD_WORK_LOCATION_CODE,
        )
    )
    item = result.scalar_one_or_none()
    if item is not None:
        changed = False
        if not item.is_system:
            item.is_system = True
            changed = True
        if item.kind != 'object':
            item.kind = 'object'
            changed = True
        if not item.is_active:
            item.is_active = True
            changed = True
        if item.name != FIELD_WORK_LOCATION_NAME:
            item.name = FIELD_WORK_LOCATION_NAME
            changed = True
        if changed:
            db.add(item)
            await db.flush()
        return item

    by_name = await db.execute(
        select(Location).where(
            Location.org_id == org_id,
            Location.name == FIELD_WORK_LOCATION_NAME,
        )
    )
    existing = by_name.scalar_one_or_none()
    if existing is not None:
        existing.code = FIELD_WORK_LOCATION_CODE
        existing.is_system = True
        existing.kind = 'object'
        existing.is_active = True
        if not existing.description:
            existing.description = FIELD_WORK_LOCATION_DESCRIPTION
        db.add(existing)
        await db.flush()
        return existing

    item = Location(
        org_id=org_id,
        name=FIELD_WORK_LOCATION_NAME,
        description=FIELD_WORK_LOCATION_DESCRIPTION,
        kind='object',
        code=FIELD_WORK_LOCATION_CODE,
        is_system=True,
        is_active=True,
    )
    db.add(item)
    await db.flush()
    return item


def raise_if_system_location_locked(
    item: Location,
    *,
    updates: dict | None = None,
    deleting: bool = False,
) -> None:
    """Block deactivate / delete / rename of the system field-work location."""
    if not is_system_field_work_location(item):
        return
    if deleting:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Системное место работы «Полевая работа» нельзя удалить',
        )
    if updates is None:
        return
    if 'is_active' in updates and updates['is_active'] is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Системное место работы «Полевая работа» нельзя деактивировать',
        )
    if 'name' in updates and updates['name'] is not None:
        if updates['name'] != FIELD_WORK_LOCATION_NAME:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Нельзя переименовать системное место работы «Полевая работа»',
            )
    if 'code' in updates or 'is_system' in updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Системные признаки места работы нельзя изменить',
        )


async def resolve_shift_location_id(
    db: AsyncSession,
    org_id: UUID,
    *,
    work_type_is_field: bool,
    location_id: UUID,
) -> UUID:
    """For field-work types, bind shift to the system location (no manual pick)."""
    if not work_type_is_field:
        return location_id
    system = await ensure_field_work_location(db, org_id)
    return system.id

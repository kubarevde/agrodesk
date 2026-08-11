"""Partial-field sharing geometry: validate shared plot inside source field."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference import Location
from app.models.sharing import SharingListing
from app.services.field_geometry import (
    MIN_POLYGON_AREA_HA,
    normalize_polygon,
    polygon_area_ha,
    polygon_centroid,
    polygon_contains_polygon,
)

SharingScope = Literal['full_field', 'partial_field']

FIELD_CONTOUR_CHANGED_BLOCK_MESSAGE = (
    'Нельзя изменить контур поля: в активном объявлении шеринга есть участок, '
    'который выйдет за новые границы. Сначала измените или снимите объявление'
)


def _field_area_ha(location: Location) -> float | None:
    if location.area_ha is not None:
        return float(location.area_ha)
    try:
        poly = normalize_polygon(location.polygon) if location.polygon else None
    except HTTPException:
        return None
    if poly:
        return polygon_area_ha(poly)
    return None


def effective_geometry(
    listing: SharingListing,
    location: Location | None,
) -> tuple[list[list[float]] | None, float | None]:
    """Polygon/area shown to clients — never the full field for partial listings."""
    scope = getattr(listing, 'sharing_scope', None) or 'full_field'
    if scope == 'partial_field':
        try:
            poly = normalize_polygon(listing.shared_polygon) if listing.shared_polygon else None
        except HTTPException:
            poly = None
        area = float(listing.shared_area_ha) if listing.shared_area_ha is not None else None
        if area is None and poly:
            area = polygon_area_ha(poly)
        return poly, area

    if location is None:
        return None, None
    try:
        poly = normalize_polygon(location.polygon) if location.polygon else None
    except HTTPException:
        poly = None
    return poly, _field_area_ha(location)


def apply_sharing_scope(
    *,
    listing_type: str,
    scope: SharingScope | None,
    shared_polygon_raw: Any,
    field: Location | None,
) -> tuple[SharingScope, list[list[float]] | None, Decimal | None, float | None, float | None]:
    """Return (scope, shared_polygon, shared_area_ha, lat, lng) for persistence.

    Client-supplied area is ignored; server recomputes from shared_polygon.
    """
    resolved: SharingScope = scope or 'full_field'
    if listing_type != 'field':
        return 'full_field', None, None, None, None

    if resolved == 'full_field':
        return 'full_field', None, None, None, None

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для части поля укажите исходное поле',
        )
    if not field.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Исходное поле неактивно',
        )

    try:
        field_poly = normalize_polygon(field.polygon) if field.polygon else None
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='У исходного поля нет корректного контура',
        ) from exc
    if not field_poly:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='У исходного поля нет контура — нельзя разместить часть поля',
        )

    shared = normalize_polygon(shared_polygon_raw)
    if not shared:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Нарисуйте участок для шеринга внутри контура поля',
        )

    if not polygon_contains_polygon(field_poly, shared):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Участок должен полностью находиться внутри границ выбранного поля',
        )

    area = polygon_area_ha(shared)
    if area < MIN_POLYGON_AREA_HA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Площадь участка слишком мала (минимум {MIN_POLYGON_AREA_HA} га)',
        )

    c_lat, c_lon = polygon_centroid(shared)
    return 'partial_field', shared, Decimal(str(area)), c_lat, c_lon


async def assert_field_polygon_keeps_partial_listings(
    db: AsyncSession,
    *,
    location_id: UUID,
    new_polygon: list[list[float]] | None,
) -> None:
    """Block field contour change when an active partial plot would leave the field."""
    if new_polygon is None:
        # Clearing contour always invalidates partial plots.
        result = await db.execute(
            select(SharingListing.id).where(
                SharingListing.location_id == location_id,
                SharingListing.type == 'field',
                SharingListing.status == 'active',
                SharingListing.sharing_scope == 'partial_field',
            ).limit(1)
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=FIELD_CONTOUR_CHANGED_BLOCK_MESSAGE,
            )
        return

    result = await db.execute(
        select(SharingListing).where(
            SharingListing.location_id == location_id,
            SharingListing.type == 'field',
            SharingListing.status == 'active',
            SharingListing.sharing_scope == 'partial_field',
        )
    )
    for listing in result.scalars().all():
        try:
            shared = normalize_polygon(listing.shared_polygon) if listing.shared_polygon else None
        except HTTPException:
            shared = None
        if not shared or not polygon_contains_polygon(new_polygon, shared):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=FIELD_CONTOUR_CHANGED_BLOCK_MESSAGE,
            )


async def archive_active_listings_for_field(db: AsyncSession, location_id: UUID) -> int:
    """Soft-archive active field listings when the source field is deactivated."""
    result = await db.execute(
        select(SharingListing).where(
            SharingListing.location_id == location_id,
            SharingListing.type == 'field',
            SharingListing.status == 'active',
        )
    )
    count = 0
    for listing in result.scalars().all():
        listing.status = 'archived'
        db.add(listing)
        count += 1
    return count

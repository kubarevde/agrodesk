"""Business rules for field plantings (area, duplicates, harvest lock)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crop_variety import CropVariety
from app.models.dictionary import OrgDictionary
from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting
from app.models.inventory import InventoryItem, InventoryOperation
from app.models.reference import Location
from app.services.field_geometry import (
    normalize_polygon,
    polygon_area_ha,
    polygon_is_within_field,
    polygons_overlap,
    validate_polygon,
)
from app.services.inventory import PURPOSE_HARVEST_INCOME


def _dec(value: object) -> Decimal:
    return Decimal(str(value))


def _crop_label(crop_code: str, crop_name: str | None = None) -> str:
    name = (crop_name or '').strip()
    return name or crop_code


async def list_active_season_plantings(
    db: AsyncSession,
    *,
    field_id: UUID,
    season_year: int,
    exclude_planting_id: UUID | None = None,
) -> list[FieldPlanting]:
    query = select(FieldPlanting).where(
        FieldPlanting.field_id == field_id,
        FieldPlanting.season_year == season_year,
        FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
    )
    if exclude_planting_id is not None:
        query = query.where(FieldPlanting.id != exclude_planting_id)
    return list((await db.execute(query)).scalars().all())


async def assert_planting_geometry(
    db: AsyncSession,
    *,
    field: Location,
    season_year: int,
    polygon: list[list[float]] | None,
    occupies_whole_field: bool = False,
    exclude_planting_id: UUID | None = None,
    crop_names: dict[str, str] | None = None,
) -> tuple[list[list[float]] | None, Decimal | None]:
    """Validate planting polygon vs field and siblings.

    Returns (normalized_polygon, area_from_geometry_or_None).
    Plantings without polygon remain allowed (legacy / area-only).
    """
    siblings = await list_active_season_plantings(
        db,
        field_id=field.id,
        season_year=season_year,
        exclude_planting_id=exclude_planting_id,
    )
    names = crop_names or {}

    field_poly = None
    if field.polygon:
        try:
            field_poly = normalize_polygon(field.polygon)
        except HTTPException:
            field_poly = None

    if occupies_whole_field:
        if field_poly is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Нельзя занять всё поле: у поля нет корректного контура',
            )
        if siblings:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    'Нельзя занять всё поле: часть площади уже занята '
                    'другими культурами/посевами'
                ),
            )
        area = Decimal(str(polygon_area_ha(field_poly)))
        if area <= 0 and field.area_ha is not None:
            area = _dec(field.area_ha)
        return field_poly, area

    if polygon is None:
        return None, None

    planting_poly = validate_polygon(polygon)
    if field_poly is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Контур культуры выходит за границы выбранного поля',
        )
    if not polygon_is_within_field(field_poly, planting_poly):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Контур культуры выходит за границы выбранного поля',
        )

    for sibling in siblings:
        if not sibling.polygon:
            continue
        try:
            other = normalize_polygon(sibling.polygon)
        except HTTPException:
            continue
        if other is None:
            continue
        if polygons_overlap(planting_poly, other):
            label = _crop_label(sibling.crop_code, names.get(sibling.crop_code))
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f'Контур культуры пересекается с контуром культуры «{label}»',
            )

    return planting_poly, Decimal(str(polygon_area_ha(planting_poly)))


async def assert_field_polygon_keeps_plantings(
    db: AsyncSession,
    *,
    field_id: UUID,
    new_polygon: list[list[float]] | None,
) -> None:
    """Block field contour shrink that would leave active plantings outside."""
    if new_polygon is None:
        # Clearing field contour while plantings have contours — block if any have polygon
        rows = (
            await db.execute(
                select(FieldPlanting).where(
                    FieldPlanting.field_id == field_id,
                    FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
                    FieldPlanting.polygon.is_not(None),
                )
            )
        ).scalars().all()
        if rows:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    'Нельзя изменить контур поля: один или несколько активных контуров '
                    'культур выйдут за его новые границы. Сначала измените или завершите '
                    'соответствующие посевы'
                ),
            )
        return

    field_poly = validate_polygon(new_polygon, label='Контур поля')
    rows = (
        await db.execute(
            select(FieldPlanting).where(
                FieldPlanting.field_id == field_id,
                FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
                FieldPlanting.polygon.is_not(None),
            )
        )
    ).scalars().all()
    for row in rows:
        try:
            planting_poly = normalize_polygon(row.polygon)
        except HTTPException:
            continue
        if planting_poly is None:
            continue
        if not polygon_is_within_field(field_poly, planting_poly):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    'Нельзя изменить контур поля: один или несколько активных контуров '
                    'культур выйдут за его новые границы. Сначала измените или завершите '
                    'соответствующие посевы'
                ),
            )


async def allocated_area_ha(
    db: AsyncSession,
    *,
    field_id: UUID,
    season_year: int,
    exclude_planting_id: UUID | None = None,
) -> Decimal:
    query = select(func.coalesce(func.sum(FieldPlanting.area_ha), 0)).where(
        FieldPlanting.field_id == field_id,
        FieldPlanting.season_year == season_year,
        FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
    )
    if exclude_planting_id is not None:
        query = query.where(FieldPlanting.id != exclude_planting_id)
    total = await db.scalar(query)
    return _dec(total or 0)


async def assert_area_fits(
    db: AsyncSession,
    *,
    field: Location,
    season_year: int,
    new_area: Decimal,
    exclude_planting_id: UUID | None = None,
) -> None:
    if new_area <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Площадь посева должна быть больше нуля',
        )
    field_area = field.area_ha
    if field_area is None:
        return
    field_ha = _dec(field_area)
    if field_ha <= 0:
        return
    allocated = await allocated_area_ha(
        db,
        field_id=field.id,
        season_year=season_year,
        exclude_planting_id=exclude_planting_id,
    )
    remaining = field_ha - allocated
    if new_area > remaining + Decimal('0.0001'):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f'Нельзя распределить {new_area} га: площадь поля {field_ha} га, '
                f'уже распределено {allocated} га, доступный остаток {remaining} га.'
            ),
        )


async def assert_crop_exists(db: AsyncSession, org_id: UUID, crop_code: str) -> OrgDictionary:
    row = (
        await db.execute(
            select(OrgDictionary).where(
                OrgDictionary.org_id == org_id,
                OrgDictionary.type == 'crop',
                OrgDictionary.code == crop_code,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Культура не найдена в справочнике организации',
        )
    return row


async def assert_variety_for_crop(
    db: AsyncSession,
    *,
    org_id: UUID,
    crop_code: str,
    variety_id: UUID | None,
) -> CropVariety | None:
    if variety_id is None:
        return None
    row = (
        await db.execute(
            select(CropVariety).where(
                CropVariety.id == variety_id,
                CropVariety.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сорт не найден')
    if row.crop_code != crop_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сорт не принадлежит выбранной культуре',
        )
    return row


async def assert_no_silent_duplicate(
    db: AsyncSession,
    *,
    field_id: UUID,
    crop_code: str,
    variety_id: UUID | None,
    season_year: int,
    comment: str | None,
    exclude_planting_id: UUID | None = None,
) -> None:
    query = select(FieldPlanting).where(
        FieldPlanting.field_id == field_id,
        FieldPlanting.crop_code == crop_code,
        FieldPlanting.season_year == season_year,
        FieldPlanting.status != 'cancelled',
    )
    if variety_id is None:
        query = query.where(FieldPlanting.variety_id.is_(None))
    else:
        query = query.where(FieldPlanting.variety_id == variety_id)
    if exclude_planting_id is not None:
        query = query.where(FieldPlanting.id != exclude_planting_id)
    existing = (await db.execute(query)).scalars().first()
    if existing is None:
        return
    if not (comment or '').strip():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                'Такая культура и сорт уже есть на поле в этом сезоне. '
                'Для отдельного участка укажите комментарий (например, «северный клин»).'
            ),
        )


async def harvest_qty_by_crop_year(
    db: AsyncSession,
    *,
    field_id: UUID,
) -> dict[tuple[str, int], Decimal]:
    """Sum harvest_income qty keyed by (crop_code, year) for a field (legacy attribution)."""
    result = await db.execute(
        select(
            InventoryItem.crop_code,
            extract('year', InventoryOperation.date).label('year'),
            func.coalesce(func.sum(InventoryOperation.quantity), 0),
        )
        .join(InventoryItem, InventoryItem.id == InventoryOperation.item_id)
        .where(
            InventoryOperation.field_id == field_id,
            InventoryOperation.type == 'income',
            InventoryOperation.purpose == PURPOSE_HARVEST_INCOME,
            InventoryItem.crop_code.is_not(None),
            InventoryOperation.field_planting_id.is_(None),
        )
        .group_by(InventoryItem.crop_code, extract('year', InventoryOperation.date))
    )
    out: dict[tuple[str, int], Decimal] = {}
    for crop_code, year, qty in result.all():
        if crop_code is None or year is None:
            continue
        out[(str(crop_code), int(year))] = _dec(qty)
    return out


async def harvest_qty_by_planting(
    db: AsyncSession,
    *,
    planting_ids: list[UUID],
) -> dict[UUID, Decimal]:
    """Gross harvest (kg) keyed by field_planting_id. Single source for yield."""
    if not planting_ids:
        return {}
    result = await db.execute(
        select(
            InventoryOperation.field_planting_id,
            func.coalesce(func.sum(InventoryOperation.quantity), 0),
        ).where(
            InventoryOperation.field_planting_id.in_(planting_ids),
            InventoryOperation.type == 'income',
            InventoryOperation.purpose == PURPOSE_HARVEST_INCOME,
        ).group_by(InventoryOperation.field_planting_id)
    )
    out: dict[UUID, Decimal] = {}
    for planting_id, qty in result.all():
        if planting_id is None:
            continue
        out[planting_id] = _dec(qty)
    return out


async def last_harvest_date_by_planting(
    db: AsyncSession,
    *,
    planting_ids: list[UUID],
) -> dict[UUID, object]:
    if not planting_ids:
        return {}
    result = await db.execute(
        select(
            InventoryOperation.field_planting_id,
            func.max(InventoryOperation.date),
        ).where(
            InventoryOperation.field_planting_id.in_(planting_ids),
            InventoryOperation.type == 'income',
            InventoryOperation.purpose == PURPOSE_HARVEST_INCOME,
        ).group_by(InventoryOperation.field_planting_id)
    )
    return {pid: d for pid, d in result.all() if pid is not None}


async def planting_has_harvest_ops(
    db: AsyncSession,
    *,
    field_id: UUID,
    crop_code: str,
    season_year: int,
    planting_id: UUID | None = None,
) -> bool:
    if planting_id is not None:
        qty_map = await harvest_qty_by_planting(db, planting_ids=[planting_id])
        if qty_map.get(planting_id, Decimal(0)) > 0:
            return True
    totals = await harvest_qty_by_crop_year(db, field_id=field_id)
    return totals.get((crop_code, season_year), Decimal(0)) > 0


def yield_kg_per_ha(harvested_qty: Decimal | None, area_ha: Decimal) -> Decimal | None:
    """Yield = gross harvest for this planting / planting area. Never field-wide area."""
    if harvested_qty is None or harvested_qty <= 0 or area_ha <= 0:
        return None
    return (harvested_qty / area_ha).quantize(Decimal('0.01'))

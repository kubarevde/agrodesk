"""CRUD for field plantings (cultures on a field)."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.crop_variety import CropVariety
from app.models.dictionary import OrgDictionary
from app.models.employee import Employee
from app.models.field_planting import PLANTING_STATUSES, FieldPlanting
from app.models.shipment import Shipment
from app.models.shipment_request import ShipmentRequest
from app.services.audit import log_change, model_snapshot
from app.services.field_geometry import normalize_polygon
from app.services.field_planting_service import (
    allocated_area_ha,
    assert_area_fits,
    assert_crop_exists,
    assert_no_silent_duplicate,
    assert_planting_geometry,
    assert_variety_for_crop,
    harvest_qty_by_crop_year,
    harvest_qty_by_planting,
    planting_has_harvest_ops,
    yield_kg_per_ha,
)
from app.services.field_rotation_service import link_plan_to_planting_if_match
from app.routers.fields import get_field_or_404
from sqlalchemy import func

router = APIRouter()


_MAP_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')
_DEFAULT_MAP_COLOR = '#01696F'


def _normalize_map_color(value: str | None) -> str | None:
    if value is None:
        return None
    color = value.strip()
    if not color:
        return None
    if not _MAP_COLOR_RE.match(color):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Цвет карты: укажите HEX вида #01696F',
        )
    return color.upper()


class FieldPlantingCreate(BaseModel):
    crop_code: str = Field(min_length=1, max_length=80)
    variety_id: UUID | None = None
    area_ha: Decimal = Field(gt=0)
    planted_at: date | None = None
    status: str = 'planted'
    season_year: int = Field(ge=2000, le=2100)
    comment: str | None = Field(default=None, max_length=2000)
    polygon: list[list[float]] | None = None
    map_color: str | None = Field(default=None, max_length=20)
    occupies_whole_field: bool = False


class FieldPlantingUpdate(BaseModel):
    crop_code: str | None = Field(default=None, min_length=1, max_length=80)
    variety_id: UUID | None = None
    area_ha: Decimal | None = Field(default=None, gt=0)
    planted_at: date | None = None
    harvested_at: date | None = None
    status: str | None = None
    season_year: int | None = Field(default=None, ge=2000, le=2100)
    comment: str | None = Field(default=None, max_length=2000)
    polygon: list[list[float]] | None = None
    map_color: str | None = Field(default=None, max_length=20)
    clear_variety: bool = False
    occupies_whole_field: bool = False


class FieldPlantingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_id: UUID
    crop_code: str
    crop_name: str | None = None
    variety_id: UUID | None
    variety_name: str | None = None
    area_ha: Decimal
    planted_at: date | None
    harvested_at: date | None
    status: str
    season_year: int
    comment: str | None
    polygon: list[list[float]] | None = None
    map_color: str | None = None
    harvested_qty: Decimal | None = None
    yield_kg_per_ha: Decimal | None = None
    has_harvest: bool = False
    crop_locked: bool = False
    requested_qty: Decimal | None = None
    shipped_qty: Decimal | None = None


class FieldPlantingsSummary(BaseModel):
    field_id: UUID
    field_area_ha: Decimal | None
    season_year: int
    allocated_ha: Decimal
    remaining_ha: Decimal | None
    legacy_crop_code: str | None
    legacy_crop_type: str | None
    legacy_note: str | None


def _validate_status(value: str) -> str:
    if value not in PLANTING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Неизвестный статус. Допустимо: {", ".join(PLANTING_STATUSES)}',
        )
    return value


def _polygon_or_none(raw: list[list[float]] | None) -> list[list[float]] | None:
    if raw is None:
        return None
    if len(raw) == 0:
        return None
    return normalize_polygon(raw)


async def _crop_name_map(db: AsyncSession, org_id: UUID) -> dict[str, str]:
    rows = (
        await db.execute(
            select(OrgDictionary.code, OrgDictionary.name).where(
                OrgDictionary.org_id == org_id,
                OrgDictionary.type == 'crop',
            )
        )
    ).all()
    return {str(code): str(name) for code, name in rows}


async def _variety_name_map(db: AsyncSession, org_id: UUID) -> dict[UUID, str]:
    rows = (
        await db.execute(select(CropVariety.id, CropVariety.name).where(CropVariety.org_id == org_id))
    ).all()
    return {row_id: str(name) for row_id, name in rows}


def _to_response(
    row: FieldPlanting,
    *,
    crop_names: dict[str, str],
    variety_names: dict[UUID, str],
    harvested_qty: Decimal | None,
    has_harvest: bool,
    requested_qty: Decimal | None = None,
    shipped_qty: Decimal | None = None,
) -> FieldPlantingResponse:
    area = Decimal(str(row.area_ha))
    return FieldPlantingResponse(
        id=row.id,
        field_id=row.field_id,
        crop_code=row.crop_code,
        crop_name=crop_names.get(row.crop_code),
        variety_id=row.variety_id,
        variety_name=variety_names.get(row.variety_id) if row.variety_id else None,
        area_ha=area,
        planted_at=row.planted_at,
        harvested_at=row.harvested_at,
        status=row.status,
        season_year=int(row.season_year),
        comment=row.comment,
        polygon=row.polygon if isinstance(row.polygon, list) else None,
        map_color=row.map_color or _DEFAULT_MAP_COLOR,
        harvested_qty=harvested_qty,
        yield_kg_per_ha=yield_kg_per_ha(harvested_qty, area),
        has_harvest=has_harvest,
        crop_locked=has_harvest,
        requested_qty=requested_qty,
        shipped_qty=shipped_qty,
    )


@router.get('/{field_id}/plantings/summary', response_model=FieldPlantingsSummary)
async def get_plantings_summary(
    request: Request,
    field_id: UUID,
    season_year: int | None = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> FieldPlantingsSummary:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    year = season_year or date.today().year
    allocated = await allocated_area_ha(db, field_id=field.id, season_year=year)
    field_ha = Decimal(str(field.area_ha)) if field.area_ha is not None else None
    remaining = (field_ha - allocated) if field_ha is not None else None
    legacy_code = (field.crop_code or '').strip() or None
    legacy_type = (field.crop_type or '').strip() or None
    legacy_note = None
    if legacy_code or legacy_type:
        legacy_note = (
            f'Устаревшая запись культуры на поле: {legacy_type or legacy_code}. '
            'Она не является актуальной. Добавьте или актуализируйте карточку культуры/посева '
            'во вкладке «Культуры».'
        )
    return FieldPlantingsSummary(
        field_id=field.id,
        field_area_ha=field_ha,
        season_year=year,
        allocated_ha=allocated,
        remaining_ha=remaining,
        legacy_crop_code=legacy_code,
        legacy_crop_type=legacy_type,
        legacy_note=legacy_note,
    )


@router.get('/{field_id}/plantings', response_model=list[FieldPlantingResponse])
async def list_plantings(
    request: Request,
    field_id: UUID,
    season_year: int | None = Query(None, ge=2000, le=2100),
    include_cancelled: bool = Query(False),
    include_harvest: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> list[FieldPlantingResponse]:
    org_id = get_org_id(request)
    await get_field_or_404(db, field_id, org_id)
    query = select(FieldPlanting).where(
        FieldPlanting.org_id == org_id,
        FieldPlanting.field_id == field_id,
    )
    if season_year is not None:
        query = query.where(FieldPlanting.season_year == season_year)
    if not include_cancelled:
        query = query.where(FieldPlanting.status != 'cancelled')
    query = query.order_by(
        FieldPlanting.season_year.desc(),
        FieldPlanting.planted_at.desc().nullslast(),
        FieldPlanting.created_at.desc(),
    )
    rows = (await db.execute(query)).scalars().all()
    crop_names = await _crop_name_map(db, org_id)
    variety_names = await _variety_name_map(db, org_id)
    planting_ids = [row.id for row in rows]
    by_planting = (
        await harvest_qty_by_planting(db, planting_ids=planting_ids) if include_harvest else {}
    )
    legacy_map = (
        await harvest_qty_by_crop_year(db, field_id=field_id) if include_harvest else {}
    )

    crop_year_counts: dict[tuple[str, int], int] = {}
    for row in rows:
        if row.status == 'cancelled':
            continue
        key = (row.crop_code, int(row.season_year))
        crop_year_counts[key] = crop_year_counts.get(key, 0) + 1

    requested_map: dict[UUID, Decimal] = {}
    shipped_map: dict[UUID, Decimal] = {}
    if include_harvest and planting_ids:
        req_rows = (
            await db.execute(
                select(
                    ShipmentRequest.field_planting_id,
                    func.coalesce(func.sum(ShipmentRequest.quantity), 0),
                ).where(
                    ShipmentRequest.field_planting_id.in_(planting_ids),
                    ShipmentRequest.status.in_(('new', 'in_progress')),
                ).group_by(ShipmentRequest.field_planting_id)
            )
        ).all()
        requested_map = {pid: Decimal(str(q)) for pid, q in req_rows if pid}
        ship_rows = (
            await db.execute(
                select(
                    Shipment.field_planting_id,
                    func.coalesce(func.sum(Shipment.quantity_kg), 0),
                ).where(
                    Shipment.field_planting_id.in_(planting_ids),
                ).group_by(Shipment.field_planting_id)
            )
        ).all()
        shipped_map = {pid: Decimal(str(q)) for pid, q in ship_rows if pid}

    out: list[FieldPlantingResponse] = []
    for row in rows:
        key = (row.crop_code, int(row.season_year))
        planting_qty = by_planting.get(row.id)
        legacy_qty = legacy_map.get(key)
        qty = planting_qty
        if qty is None and crop_year_counts.get(key, 0) == 1 and legacy_qty is not None:
            qty = legacy_qty
        has_harvest = False
        if include_harvest:
            has_harvest = (planting_qty is not None and planting_qty > 0) or (
                legacy_qty is not None and legacy_qty > 0
            )
        attributed = qty if include_harvest and has_harvest and (
            planting_qty is not None or crop_year_counts.get(key, 0) == 1
        ) else None
        out.append(
            _to_response(
                row,
                crop_names=crop_names,
                variety_names=variety_names,
                harvested_qty=attributed,
                has_harvest=has_harvest,
                requested_qty=requested_map.get(row.id) if include_harvest else None,
                shipped_qty=shipped_map.get(row.id) if include_harvest else None,
            )
        )
    return out


@router.post(
    '/{field_id}/plantings',
    response_model=FieldPlantingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_planting(
    request: Request,
    field_id: UUID,
    payload: FieldPlantingCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> FieldPlantingResponse:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    crop_code = payload.crop_code.strip()
    await assert_crop_exists(db, org_id, crop_code)
    await assert_variety_for_crop(
        db, org_id=org_id, crop_code=crop_code, variety_id=payload.variety_id
    )
    status_value = _validate_status(payload.status)
    crop_names = await _crop_name_map(db, org_id)
    polygon, geo_area = await assert_planting_geometry(
        db,
        field=field,
        season_year=payload.season_year,
        polygon=None if payload.occupies_whole_field else payload.polygon,
        occupies_whole_field=payload.occupies_whole_field,
        crop_names=crop_names,
    )
    area = geo_area if geo_area is not None else Decimal(str(payload.area_ha))
    await assert_area_fits(
        db, field=field, season_year=payload.season_year, new_area=area
    )
    await assert_no_silent_duplicate(
        db,
        field_id=field.id,
        crop_code=crop_code,
        variety_id=payload.variety_id,
        season_year=payload.season_year,
        comment=payload.comment,
    )
    map_color = _normalize_map_color(payload.map_color) or _DEFAULT_MAP_COLOR
    row = FieldPlanting(
        org_id=org_id,
        field_id=field.id,
        crop_code=crop_code,
        variety_id=payload.variety_id,
        area_ha=area,
        planted_at=payload.planted_at,
        status=status_value,
        season_year=payload.season_year,
        comment=(payload.comment or '').strip() or None,
        polygon=polygon,
        map_color=map_color,
    )
    db.add(row)
    await db.flush()
    await link_plan_to_planting_if_match(db, planting=row)
    await log_change(
        db,
        org_id=org_id,
        entity_type='field_planting',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
        summary=f'Посев {crop_code} на поле «{field.name}» ({area} га)',
    )
    await db.commit()
    await db.refresh(row)
    variety_names = await _variety_name_map(db, org_id)
    return _to_response(
        row,
        crop_names=crop_names,
        variety_names=variety_names,
        harvested_qty=None,
        has_harvest=False,
    )


@router.patch('/{field_id}/plantings/{planting_id}', response_model=FieldPlantingResponse)
async def update_planting(
    request: Request,
    field_id: UUID,
    planting_id: UUID,
    payload: FieldPlantingUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> FieldPlantingResponse:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    row = (
        await db.execute(
            select(FieldPlanting).where(
                FieldPlanting.id == planting_id,
                FieldPlanting.field_id == field.id,
                FieldPlanting.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Посев не найден')

    before = model_snapshot(row)
    data = payload.model_dump(exclude_unset=True)
    clear_variety = bool(data.pop('clear_variety', False))

    has_harvest = await planting_has_harvest_ops(
        db,
        field_id=field.id,
        crop_code=row.crop_code,
        season_year=int(row.season_year),
        planting_id=row.id,
    )

    if 'status' in data and data['status'] is not None:
        data['status'] = _validate_status(data['status'])

    next_crop = row.crop_code
    if 'crop_code' in data and data['crop_code'] is not None:
        next_crop = str(data['crop_code']).strip()
        data['crop_code'] = next_crop
        await assert_crop_exists(db, org_id, next_crop)

    if clear_variety:
        data['variety_id'] = None
    next_variety = row.variety_id
    if 'variety_id' in data or clear_variety:
        next_variety = data.get('variety_id')
    await assert_variety_for_crop(
        db, org_id=org_id, crop_code=str(next_crop), variety_id=next_variety
    )

    crop_changing = next_crop != row.crop_code
    variety_changing = next_variety != row.variety_id
    if has_harvest and (crop_changing or variety_changing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                'По этой культуре уже есть сбор урожая: нельзя менять культуру или сорт. '
                'Скорректируйте площадь, статус, даты, цвет или комментарий.'
            ),
        )
    # Do not send identity fields unless they actually change (keeps patch minimal).
    if 'crop_code' in data and not crop_changing:
        data.pop('crop_code')
    if 'variety_id' in data and not variety_changing:
        data.pop('variety_id')

    next_season = int(data.get('season_year', row.season_year))
    next_status = data.get('status', row.status)
    occupies_whole = bool(data.pop('occupies_whole_field', False))

    crop_names = await _crop_name_map(db, org_id)
    if occupies_whole:
        next_polygon_raw: list[list[float]] | None = None
    elif 'polygon' in data:
        next_polygon_raw = data['polygon']
    else:
        next_polygon_raw = row.polygon if isinstance(row.polygon, list) else None

    if next_status != 'cancelled':
        polygon, geo_area = await assert_planting_geometry(
            db,
            field=field,
            season_year=next_season,
            polygon=next_polygon_raw,
            occupies_whole_field=occupies_whole,
            exclude_planting_id=row.id,
            crop_names=crop_names,
        )
        if 'polygon' in data or occupies_whole:
            data['polygon'] = polygon
        next_area = (
            geo_area
            if geo_area is not None
            else (
                Decimal(str(data['area_ha']))
                if 'area_ha' in data
                else Decimal(str(row.area_ha))
            )
        )
        if geo_area is not None:
            data['area_ha'] = geo_area
        await assert_area_fits(
            db,
            field=field,
            season_year=next_season,
            new_area=next_area,
            exclude_planting_id=row.id,
        )
        await assert_no_silent_duplicate(
            db,
            field_id=field.id,
            crop_code=str(next_crop),
            variety_id=next_variety,
            season_year=next_season,
            comment=data['comment'] if 'comment' in data else row.comment,
            exclude_planting_id=row.id,
        )
    elif 'polygon' in data:
        data['polygon'] = _polygon_or_none(data['polygon'])

    if 'map_color' in data:
        data['map_color'] = _normalize_map_color(data['map_color']) or _DEFAULT_MAP_COLOR
    if 'comment' in data and data['comment'] is not None:
        data['comment'] = data['comment'].strip() or None

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='field_planting',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary=f'Обновлён посев {row.crop_code} на поле «{field.name}»',
    )
    await db.commit()
    await db.refresh(row)

    harvest_map = await harvest_qty_by_crop_year(db, field_id=field.id)
    qty = harvest_map.get((row.crop_code, int(row.season_year)))
    has = qty is not None and qty > 0
    variety_names = await _variety_name_map(db, org_id)
    return _to_response(
        row,
        crop_names=crop_names,
        variety_names=variety_names,
        harvested_qty=qty if has else None,
        has_harvest=has,
    )

from decimal import Decimal
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.dictionary import normalize_name
from app.models.employee import Employee
from app.models.inventory import InventoryOperation
from app.models.reference import Location
from app.routers.inventory import operation_to_response
from app.schemas.field import FieldCreate, FieldHarvestCreate, FieldResponse, FieldUpdate
from app.schemas.inventory import InventoryOperationResponse
from app.services.action_permissions import require_action
from app.services.audit import log_change, model_snapshot
from app.services.field_geometry import apply_geometry_on_write
from app.services.field_planting_service import assert_field_polygon_keeps_plantings
from app.services.sharing_partial import (
    archive_active_listings_for_field,
    assert_field_polygon_keeps_partial_listings,
)
from app.services.harvest_service import create_field_harvest

# Read (list/get) is available to any authenticated employee — needed for open-shift
# field selection (my-shift). Mutations stay manager-only below.
router = APIRouter()
logger = logging.getLogger(__name__)


def _num(value: Decimal | float | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _polygon(value: object | None) -> list[list[float]] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        return None
    result: list[list[float]] = []
    for point in value:
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            result.append([float(point[0]), float(point[1])])
    return result or None


def location_to_field(location: Location) -> FieldResponse:
    sharing_status = None
    for listing in location.sharing_listings or []:
        if listing.type == 'field' and listing.status == 'active':
            sharing_status = 'active'
            break

    return FieldResponse(
        id=location.id,
        name=location.name,
        crop_type=location.crop_type,
        crop_code=location.crop_code,
        area_ha=_num(location.area_ha),
        soil_type=None,
        description=location.description,
        latitude=_num(location.latitude),
        longitude=_num(location.longitude),
        polygon=_polygon(location.polygon),
        sharing_status=sharing_status,
        is_active=bool(location.is_active),
    )


def field_load_options():
    return (selectinload(Location.sharing_listings),)


async def get_field_or_404(db: AsyncSession, field_id: UUID, org_id: UUID) -> Location:
    result = await db.execute(
        select(Location)
        .options(*field_load_options())
        .where(Location.id == field_id, Location.org_id == org_id)
    )
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Поле не найдено')
    return location


from app.services.field_work_location import (
    FIELD_WORK_LOCATION_CODE,
    is_system_field_work_location,
)


def is_field_location(location: Location) -> bool:
    """True for real fields only — never the system «Полевая работа» work location."""
    if is_system_field_work_location(location):
        return False
    if getattr(location, 'kind', None) == 'field':
        return True
    # Legacy rows: crop set, but still a work-object kind must not become a field
    if getattr(location, 'kind', None) == 'object':
        return False
    if location.crop_type:
        return True
    return False


def _fields_list_filter():
    """Fields = kind=field (or legacy non-object with crop). Never work objects / system."""
    return (
        Location.is_active.is_(True),
        Location.is_system.is_(False),
        or_(
            Location.code.is_(None),
            Location.code != FIELD_WORK_LOCATION_CODE,
        ),
        or_(
            Location.kind == 'field',
            # Legacy pre-kind rows that look like fields, but never kind=object
            and_(Location.crop_type.is_not(None), Location.kind != 'object'),
        ),
    )


@router.get('', response_model=list[FieldResponse])
async def list_fields(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[FieldResponse]:
    org_id = get_org_id(request)
    result = await db.execute(
        select(Location)
        .options(*field_load_options())
        .where(
            Location.org_id == org_id,
            *_fields_list_filter(),
        )
        .order_by(Location.name)
    )
    return [location_to_field(row) for row in result.scalars().all()]


class SeasonPlantingOverlay(BaseModel):
    id: UUID
    field_id: UUID
    field_name: str
    crop_code: str
    crop_name: str | None = None
    variety_id: UUID | None = None
    variety_name: str | None = None
    area_ha: float
    map_color: str | None = None
    polygon: list[list[float]] | None = None
    season_year: int
    status: str


@router.get('/season-plantings', response_model=list[SeasonPlantingOverlay])
async def list_season_planting_overlays(
    request: Request,
    season_year: int | None = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[SeasonPlantingOverlay]:
    """Active plantings for maps — must stay before /{field_id}."""
    from datetime import date as date_cls

    from app.models.crop_variety import CropVariety
    from app.models.dictionary import OrgDictionary
    from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting

    org_id = get_org_id(request)
    year = season_year or date_cls.today().year

    field_rows = (
        await db.execute(
            select(Location.id, Location.name).where(
                Location.org_id == org_id,
                *_fields_list_filter(),
            )
        )
    ).all()
    if not field_rows:
        return []
    id_to_name = {row_id: str(name) for row_id, name in field_rows}
    ids = list(id_to_name.keys())

    plantings = (
        await db.execute(
            select(FieldPlanting).where(
                FieldPlanting.org_id == org_id,
                FieldPlanting.field_id.in_(ids),
                FieldPlanting.season_year == year,
                FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
            )
        )
    ).scalars().all()

    crop_names = {
        str(c): str(n)
        for c, n in (
            await db.execute(
                select(OrgDictionary.code, OrgDictionary.name).where(
                    OrgDictionary.org_id == org_id,
                    OrgDictionary.type == 'crop',
                )
            )
        ).all()
    }
    variety_names = {
        i: str(n)
        for i, n in (
            await db.execute(
                select(CropVariety.id, CropVariety.name).where(CropVariety.org_id == org_id)
            )
        ).all()
    }

    out: list[SeasonPlantingOverlay] = []
    for row in plantings:
        poly = row.polygon if isinstance(row.polygon, list) else None
        out.append(
            SeasonPlantingOverlay(
                id=row.id,
                field_id=row.field_id,
                field_name=id_to_name.get(row.field_id, ''),
                crop_code=row.crop_code,
                crop_name=crop_names.get(row.crop_code),
                variety_id=row.variety_id,
                variety_name=variety_names.get(row.variety_id) if row.variety_id else None,
                area_ha=float(row.area_ha),
                map_color=row.map_color,
                polygon=poly,
                season_year=int(row.season_year),
                status=row.status,
            )
        )
    return out


@router.get('/{field_id}', response_model=FieldResponse)
async def get_field(
    request: Request,
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> FieldResponse:
    location = await get_field_or_404(db, field_id, get_org_id(request))
    if not is_field_location(location):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Поле не найдено')
    return location_to_field(location)


@router.post('', response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(
    request: Request,
    payload: FieldCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> FieldResponse:
    org_id = get_org_id(request)
    name = normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Укажите название поля')

    clear_polygon = payload.polygon is not None and len(payload.polygon) == 0
    lat, lon, polygon, area_ha = apply_geometry_on_write(
        latitude=payload.latitude,
        longitude=payload.longitude,
        polygon=None if clear_polygon else payload.polygon,
        area_ha=payload.area_ha,
        clear_polygon=clear_polygon,
    )

    # Crop/variety live on field_plantings only. Legacy crop_* on Location is not written.
    if payload.crop_type or payload.crop_code:
        logger.info('Ignoring legacy crop on FieldCreate (org=%s name=%s)', org_id, name)

    location = Location(
        org_id=org_id,
        name=name,
        kind='field',
        crop_type=None,
        crop_code=None,
        area_ha=Decimal(str(area_ha)) if area_ha is not None else None,
        soil_type=None,
        description=payload.description,
        latitude=Decimal(str(lat)) if lat is not None else None,
        longitude=Decimal(str(lon)) if lon is not None else None,
        polygon=polygon,
        is_active=True,
    )
    db.add(location)
    try:
        await db.flush()
        await log_change(
            db,
            org_id=org_id,
            entity_type='location',
            entity_id=location.id,
            action='create',
            changed_by=current.id,
            after=model_snapshot(location),
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Поле с таким названием уже существует в организации',
        ) from None

    location = await get_field_or_404(db, location.id, org_id)
    return location_to_field(location)


@router.patch('/{field_id}', response_model=FieldResponse)
async def update_field(
    request: Request,
    field_id: UUID,
    payload: FieldUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> FieldResponse:
    org_id = get_org_id(request)
    location = await get_field_or_404(db, field_id, org_id)
    before = model_snapshot(location)
    if not is_field_location(location):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Поле не найдено')

    updates = payload.model_dump(exclude_unset=True)
    updates.pop('soil_type', None)
    # Do not write culture onto the field — plantings are the source of truth.
    if 'crop_type' in updates or 'crop_code' in updates:
        logger.info('Ignoring legacy crop on FieldUpdate (field_id=%s)', field_id)
        updates.pop('crop_type', None)
        updates.pop('crop_code', None)

    if 'name' in updates and updates['name'] is not None:
        updates['name'] = normalize_name(updates['name'])
        if not updates['name']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите название поля',
            )
    polygon_in_payload = 'polygon' in updates
    raw_polygon = updates.pop('polygon', None) if polygon_in_payload else None
    clear_polygon = polygon_in_payload and (
        raw_polygon is None or (isinstance(raw_polygon, list) and len(raw_polygon) == 0)
    )

    lat_src = updates.pop('latitude') if 'latitude' in updates else _num(location.latitude)
    lon_src = updates.pop('longitude') if 'longitude' in updates else _num(location.longitude)
    area_src = updates.pop('area_ha') if 'area_ha' in updates else _num(location.area_ha)

    geometry_polygon = location.polygon
    if polygon_in_payload:
        geometry_polygon = None if clear_polygon else raw_polygon

    lat, lon, polygon, area_ha = apply_geometry_on_write(
        latitude=lat_src,
        longitude=lon_src,
        polygon=geometry_polygon,
        area_ha=area_src,
        clear_polygon=clear_polygon,
    )

    if polygon_in_payload:
        await assert_field_polygon_keeps_partial_listings(
            db,
            location_id=location.id,
            new_polygon=polygon,
        )
        await assert_field_polygon_keeps_plantings(
            db,
            field_id=location.id,
            new_polygon=polygon,
        )

    location.kind = 'field'
    location.latitude = Decimal(str(lat)) if lat is not None else None
    location.longitude = Decimal(str(lon)) if lon is not None else None
    location.area_ha = Decimal(str(area_ha)) if area_ha is not None else None
    if polygon_in_payload:
        location.polygon = polygon

    for field, value in updates.items():
        setattr(location, field, value)

    db.add(location)
    try:
        await log_change(
            db,
            org_id=org_id,
            entity_type='location',
            entity_id=location.id,
            action='update',
            changed_by=current.id,
            before=before,
            after=model_snapshot(location),
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Поле с таким названием уже существует в организации',
        ) from None

    location = await get_field_or_404(db, field_id, org_id)
    return location_to_field(location)


@router.post(
    '/{field_id}/harvest',
    response_model=InventoryOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def harvest_from_field(
    request: Request,
    field_id: UUID,
    payload: FieldHarvestCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_action('inventory.operate')),
) -> InventoryOperationResponse:
    """Collect harvest from a field → income on harvest inventory SKU (not shipments)."""
    org_id = get_org_id(request)
    location = await get_field_or_404(db, field_id, org_id)
    if not is_field_location(location):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Поле не найдено')

    operation = await create_field_harvest(
        db,
        field=location,
        item_id=payload.inventory_item_id,
        quantity=Decimal(str(payload.quantity)),
        op_date=payload.date,
        user_id=current.id,
        org_id=org_id,
        field_planting_id=payload.field_planting_id,
        harvest_status=payload.harvest_status,
    )
    await log_change(
        db,
        org_id=org_id,
        entity_type='inventory_operation',
        entity_id=operation.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(operation),
    )
    await db.commit()

    result = await db.execute(
        select(InventoryOperation)
        .options(
            selectinload(InventoryOperation.item),
            selectinload(InventoryOperation.equipment),
            selectinload(InventoryOperation.created_by_user),
            selectinload(InventoryOperation.field),
        )
        .where(InventoryOperation.id == operation.id)
    )
    loaded = result.scalar_one()
    return operation_to_response(loaded)


@router.delete('/{field_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    request: Request,
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> None:
    location = await get_field_or_404(db, field_id, get_org_id(request))
    before = model_snapshot(location)
    location.is_active = False
    db.add(location)
    await archive_active_listings_for_field(db, location.id)
    await log_change(
        db,
        org_id=location.org_id,
        entity_type='location',
        entity_id=location.id,
        action='delete',
        changed_by=current.id,
        before=before,
        after=model_snapshot(location),
    )
    await db.commit()

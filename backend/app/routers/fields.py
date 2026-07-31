from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
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
from app.services.crop_dictionary import resolve_crop_pair_for_org
from app.services.field_geometry import apply_geometry_on_write
from app.services.harvest_service import create_field_harvest

# Read (list/get) is available to any authenticated employee — needed for open-shift
# field selection (my-shift). Mutations stay manager-only below.
router = APIRouter()


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


def is_field_location(location: Location) -> bool:
    if getattr(location, 'kind', None) == 'field':
        return True
    if location.crop_type:
        return True
    return location.name.startswith('Поле')


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
            Location.is_active.is_(True),
            or_(
                Location.kind == 'field',
                Location.crop_type.is_not(None),
                Location.name.like('Поле%'),
            ),
        )
        .order_by(Location.name)
    )
    return [location_to_field(row) for row in result.scalars().all()]


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

    crop_name, crop_code = await resolve_crop_pair_for_org(
        db,
        org_id,
        crop_type=payload.crop_type,
        crop_code=payload.crop_code,
    )

    location = Location(
        org_id=org_id,
        name=name,
        kind='field',
        crop_type=crop_name,
        crop_code=crop_code,
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

    if 'name' in updates and updates['name'] is not None:
        updates['name'] = normalize_name(updates['name'])
        if not updates['name']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите название поля',
            )
    if 'crop_type' in updates or 'crop_code' in updates:
        next_type = updates['crop_type'] if 'crop_type' in updates else location.crop_type
        next_code = updates['crop_code'] if 'crop_code' in updates else location.crop_code
        crop_name, crop_code = await resolve_crop_pair_for_org(
            db,
            org_id,
            crop_type=next_type,
            crop_code=next_code,
        )
        updates['crop_type'] = crop_name
        updates['crop_code'] = crop_code

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

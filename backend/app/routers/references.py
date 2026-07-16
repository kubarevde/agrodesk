from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.equipment_log import EquipmentMeterLog
from app.models.reference import Equipment, Location, WorkType
from app.schemas.reference import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    LocationCreate,
    LocationResponse,
    LocationUpdate,
    WorkTypeCreate,
    WorkTypeResponse,
    WorkTypeUpdate,
)

from app.services.equipment_meters import calc_meter_label
from app.services.maintenance import (
    build_maintenance_summary,
    calculate_next_service_hours,
)


def equipment_to_response(item: Equipment) -> EquipmentResponse:
    current = float(item.current_meter or 0)
    interval = float(item.to_interval) if item.to_interval is not None else None
    summary = build_maintenance_summary(
        current_hours=current,
        interval_hours=interval,
        next_service_hours=float(item.next_to_at) if item.next_to_at is not None else None,
    )
    next_to = summary['next_service_hours']
    return EquipmentResponse(
        id=item.id,
        name=item.name,
        type=item.type,
        year_of_manufacture=item.year_of_manufacture,
        serial_number=item.serial_number,
        meter_type=item.meter_type or 'motohours',
        current_meter=current,
        to_interval=interval,
        next_to_at=float(next_to) if next_to is not None else None,
        latitude=float(item.latitude) if item.latitude is not None else None,
        longitude=float(item.longitude) if item.longitude is not None else None,
        is_active=bool(item.is_active),
        image_url=item.image_url,
        to_status=str(summary['status']),
        meter_label=calc_meter_label(item.meter_type),
        maintenance={
            'current_hours': summary['current_hours'],
            'service_interval_hours': summary['service_interval_hours'],
            'next_service_hours': summary['next_service_hours'],
            'hours_to_next_service': summary['hours_to_next_service'],
            'progress_percent': summary['progress_percent'],
            'status': summary['status'],
        },
    )


def resolve_next_to_at(
    *,
    current_meter: float | Decimal | None,
    to_interval: float | Decimal | None,
    next_to_at: float | Decimal | None = None,
) -> Decimal | None:
    """Prefer ceil formula from interval; explicit next_to_at only if no interval."""
    if to_interval is not None and float(to_interval) > 0:
        nxt = calculate_next_service_hours(current_meter, to_interval)
        return Decimal(str(nxt)) if nxt is not None else None
    if next_to_at is not None:
        return Decimal(str(next_to_at))
    return None


def build_reference_router(
    *,
    model: type[Any],
    response_model: type[BaseModel],
    create_model: type[BaseModel],
    update_model: type[BaseModel],
) -> APIRouter:
    router = APIRouter()

    @router.get('', response_model=list[response_model])
    async def list_items(
        request: Request,
        is_active: bool | None = Query(None),
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> list[Any]:
        org_id = get_org_id(request)
        query = select(model).where(model.org_id == org_id)
        if is_active is not None:
            query = query.where(model.is_active == is_active)
        query = query.order_by(model.name)
        result = await db.execute(query)
        return list(result.scalars().all())

    @router.get('/{item_id}', response_model=response_model)
    async def get_item(
        request: Request,
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> Any:
        return await _get_item_or_404(db, model, item_id, get_org_id(request))

    @router.post('', response_model=response_model, status_code=status.HTTP_201_CREATED)
    async def create_item(
        request: Request,
        payload: create_model,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> Any:
        item = model(**payload.model_dump(), org_id=get_org_id(request))
        db.add(item)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Запись с таким названием уже существует',
            ) from None
        await db.refresh(item)
        return item

    @router.patch('/{item_id}', response_model=response_model)
    async def update_item(
        request: Request,
        item_id: UUID,
        payload: update_model,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> Any:
        item = await _get_item_or_404(db, model, item_id, get_org_id(request))
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        db.add(item)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Запись с таким названием уже существует',
            ) from None
        await db.refresh(item)
        return item

    @router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
    async def delete_item(
        request: Request,
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> None:
        item = await _get_item_or_404(db, model, item_id, get_org_id(request))
        item.is_active = False
        db.add(item)
        await db.commit()

    return router


async def _get_item_or_404(
    db: AsyncSession, model: type[Any], item_id: UUID, org_id: UUID
) -> Any:
    result = await db.execute(
        select(model).where(model.id == item_id, model.org_id == org_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Не найдено')
    return item


def build_equipment_router() -> APIRouter:
    router = APIRouter()

    @router.get('', response_model=list[EquipmentResponse])
    async def list_equipment(
        request: Request,
        is_active: bool | None = Query(None),
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> list[EquipmentResponse]:
        org_id = get_org_id(request)
        query = select(Equipment).where(Equipment.org_id == org_id)
        if is_active is not None:
            query = query.where(Equipment.is_active == is_active)
        query = query.order_by(Equipment.name)
        result = await db.execute(query)
        return [equipment_to_response(item) for item in result.scalars().all()]

    @router.get('/{item_id}', response_model=EquipmentResponse)
    async def get_equipment(
        request: Request,
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> EquipmentResponse:
        item = await _get_item_or_404(db, Equipment, item_id, get_org_id(request))
        return equipment_to_response(item)

    @router.post('', response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
    async def create_equipment(
        request: Request,
        payload: EquipmentCreate,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> EquipmentResponse:
        data = payload.model_dump()
        data['org_id'] = get_org_id(request)
        data['next_to_at'] = resolve_next_to_at(
            current_meter=data.get('current_meter'),
            to_interval=data.get('to_interval'),
            next_to_at=data.get('next_to_at'),
        )
        item = Equipment(**data)
        db.add(item)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Запись с таким названием уже существует',
            ) from None
        await db.refresh(item)
        return equipment_to_response(item)

    @router.patch('/{item_id}', response_model=EquipmentResponse)
    async def update_equipment(
        request: Request,
        item_id: UUID,
        payload: EquipmentUpdate,
        db: AsyncSession = Depends(get_db),
        current: Employee = Depends(require_manager),
    ) -> EquipmentResponse:
        item = await _get_item_or_404(db, Equipment, item_id, get_org_id(request))
        updates = payload.model_dump(exclude_unset=True)
        previous_meter = Decimal(str(item.current_meter or 0))

        if 'current_meter' in updates and updates['current_meter'] is not None:
            new_meter = Decimal(str(updates['current_meter']))
            value_added = new_meter - previous_meter
            if value_added != 0:
                db.add(
                    EquipmentMeterLog(
                        equipment_id=item.id,
                        date=date.today(),
                        value_added=value_added,
                        meter_after=new_meter,
                        note='Обновление счётчика',
                        created_by=current.id,
                    )
                )

        for field, value in updates.items():
            setattr(item, field, value)

        if 'next_to_at' not in updates and item.next_to_at is None and item.to_interval is not None:
            item.next_to_at = resolve_next_to_at(
                current_meter=item.current_meter,
                to_interval=item.to_interval,
                next_to_at=None,
            )

        db.add(item)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Запись с таким названием уже существует',
            ) from None
        await db.refresh(item)
        return equipment_to_response(item)

    @router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
    async def delete_equipment(
        request: Request,
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> None:
        item = await _get_item_or_404(db, Equipment, item_id, get_org_id(request))
        item.is_active = False
        db.add(item)
        await db.commit()

    return router


locations_router = APIRouter()


@locations_router.get('', response_model=list[LocationResponse])
async def list_locations(
    request: Request,
    is_active: bool | None = Query(None),
    kind: str | None = Query(
        'object',
        description="object = места работы; field = поля; all = всё",
    ),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[LocationResponse]:
    """Work objects only by default — fields live under /api/fields."""
    org_id = get_org_id(request)
    query = select(Location).where(Location.org_id == org_id)
    if is_active is not None:
        query = query.where(Location.is_active == is_active)
    if kind and kind != 'all':
        query = query.where(Location.kind == kind)
    query = query.order_by(Location.name)
    result = await db.execute(query)
    return [
        LocationResponse(
            id=row.id,
            name=row.name,
            description=row.description,
            is_active=bool(row.is_active),
        )
        for row in result.scalars().all()
    ]


@locations_router.get('/{item_id}', response_model=LocationResponse)
async def get_location(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> LocationResponse:
    item = await _get_item_or_404(db, Location, item_id, get_org_id(request))
    return LocationResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        is_active=bool(item.is_active),
    )


@locations_router.post('', response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    request: Request,
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> LocationResponse:
    from app.models.dictionary import normalize_name

    name = normalize_name(payload.name)
    item = Location(
        org_id=get_org_id(request),
        name=name,
        description=payload.description,
        kind='object',
        is_active=True,
    )
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Объект с таким названием уже существует',
        ) from None
    await db.refresh(item)
    return LocationResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        is_active=bool(item.is_active),
    )


@locations_router.patch('/{item_id}', response_model=LocationResponse)
async def update_location(
    request: Request,
    item_id: UUID,
    payload: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> LocationResponse:
    from app.models.dictionary import normalize_name

    item = await _get_item_or_404(db, Location, item_id, get_org_id(request))
    updates = payload.model_dump(exclude_unset=True)
    if 'name' in updates and updates['name'] is not None:
        updates['name'] = normalize_name(updates['name'])
    for key, value in updates.items():
        setattr(item, key, value)
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Объект с таким названием уже существует',
        ) from None
    await db.refresh(item)
    return LocationResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        is_active=bool(item.is_active),
    )


@locations_router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    request: Request,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> None:
    item = await _get_item_or_404(db, Location, item_id, get_org_id(request))
    item.is_active = False
    db.add(item)
    await db.commit()


work_types_router = build_reference_router(
    model=WorkType,
    response_model=WorkTypeResponse,
    create_model=WorkTypeCreate,
    update_model=WorkTypeUpdate,
)

equipment_router = build_equipment_router()

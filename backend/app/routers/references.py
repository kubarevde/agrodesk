from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
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

ModelT = Any
CreateT = type[BaseModel]
UpdateT = type[BaseModel]
ResponseT = type[BaseModel]

METER_LABELS = {
    'motohours': 'мч',
    'km': 'км',
    'shift_hours': 'ч',
}


def calc_to_status(current_meter: float | None, next_to_at: float | None) -> str:
    if next_to_at is None:
        return 'no_data'
    current = float(current_meter or 0)
    threshold = float(next_to_at)
    if current >= threshold:
        return 'overdue'
    if current >= threshold * 0.9:
        return 'warning'
    return 'ok'


def calc_meter_label(meter_type: str | None) -> str:
    return METER_LABELS.get(meter_type or 'motohours', 'мч')


def equipment_to_response(item: Equipment) -> EquipmentResponse:
    current = float(item.current_meter or 0)
    next_to = float(item.next_to_at) if item.next_to_at is not None else None
    return EquipmentResponse(
        id=item.id,
        name=item.name,
        type=item.type,
        year_of_manufacture=item.year_of_manufacture,
        serial_number=item.serial_number,
        meter_type=item.meter_type or 'motohours',
        current_meter=current,
        to_interval=float(item.to_interval) if item.to_interval is not None else None,
        next_to_at=next_to,
        latitude=float(item.latitude) if item.latitude is not None else None,
        longitude=float(item.longitude) if item.longitude is not None else None,
        is_active=bool(item.is_active),
        image_url=item.image_url,
        to_status=calc_to_status(current, next_to),
        meter_label=calc_meter_label(item.meter_type),
    )


def resolve_next_to_at(
    *,
    current_meter: float | Decimal | None,
    to_interval: float | Decimal | None,
    next_to_at: float | Decimal | None,
) -> Decimal | None:
    if next_to_at is not None:
        return Decimal(str(next_to_at))
    if to_interval is None:
        return None
    current = Decimal(str(current_meter or 0))
    return current + Decimal(str(to_interval))


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
        is_active: bool | None = Query(None),
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> list[Any]:
        query = select(model)
        if is_active is not None:
            query = query.where(model.is_active == is_active)
        query = query.order_by(model.name)
        result = await db.execute(query)
        return list(result.scalars().all())

    @router.get('/{item_id}', response_model=response_model)
    async def get_item(
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> Any:
        return await _get_item_or_404(db, model, item_id)

    @router.post('', response_model=response_model, status_code=status.HTTP_201_CREATED)
    async def create_item(
        payload: create_model,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> Any:
        item = model(**payload.model_dump())
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
        item_id: UUID,
        payload: update_model,  # type: ignore[valid-type]
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> Any:
        item = await _get_item_or_404(db, model, item_id)
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
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> None:
        item = await _get_item_or_404(db, model, item_id)
        item.is_active = False
        db.add(item)
        await db.commit()

    return router


async def _get_item_or_404(db: AsyncSession, model: type[Any], item_id: UUID) -> Any:
    result = await db.execute(select(model).where(model.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Не найдено')
    return item


def build_equipment_router() -> APIRouter:
    router = APIRouter()

    @router.get('', response_model=list[EquipmentResponse])
    async def list_equipment(
        is_active: bool | None = Query(None),
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> list[EquipmentResponse]:
        query = select(Equipment)
        if is_active is not None:
            query = query.where(Equipment.is_active == is_active)
        query = query.order_by(Equipment.name)
        result = await db.execute(query)
        return [equipment_to_response(item) for item in result.scalars().all()]

    @router.get('/{item_id}', response_model=EquipmentResponse)
    async def get_equipment(
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(get_current_employee),
    ) -> EquipmentResponse:
        item = await _get_item_or_404(db, Equipment, item_id)
        return equipment_to_response(item)

    @router.post('', response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
    async def create_equipment(
        payload: EquipmentCreate,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> EquipmentResponse:
        data = payload.model_dump()
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
        item_id: UUID,
        payload: EquipmentUpdate,
        db: AsyncSession = Depends(get_db),
        current: Employee = Depends(require_manager),
    ) -> EquipmentResponse:
        item = await _get_item_or_404(db, Equipment, item_id)
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
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        _: Employee = Depends(require_manager),
    ) -> None:
        item = await _get_item_or_404(db, Equipment, item_id)
        item.is_active = False
        db.add(item)
        await db.commit()

    return router


locations_router = build_reference_router(
    model=Location,
    response_model=LocationResponse,
    create_model=LocationCreate,
    update_model=LocationUpdate,
)

work_types_router = build_reference_router(
    model=WorkType,
    response_model=WorkTypeResponse,
    create_model=WorkTypeCreate,
    update_model=WorkTypeUpdate,
)

equipment_router = build_equipment_router()

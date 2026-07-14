from typing import Any, TypeVar
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.models.employee import Employee
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

ModelT = TypeVar('ModelT')
CreateT = TypeVar('CreateT', bound=BaseModel)
UpdateT = TypeVar('UpdateT', bound=BaseModel)
ResponseT = TypeVar('ResponseT', bound=BaseModel)


def build_reference_router(
    *,
    model: type[ModelT],
    response_model: type[ResponseT],
    create_model: type[CreateT],
    update_model: type[UpdateT],
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
        item = await _get_item_or_404(db, model, item_id)
        return item

    @router.post('', response_model=response_model, status_code=status.HTTP_201_CREATED)
    async def create_item(
        payload: create_model,
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
        payload: update_model,
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


async def _get_item_or_404(db: AsyncSession, model: type[ModelT], item_id: UUID) -> ModelT:
    result = await db.execute(select(model).where(model.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Не найдено')
    return item


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

equipment_router = build_reference_router(
    model=Equipment,
    response_model=EquipmentResponse,
    create_model=EquipmentCreate,
    update_model=EquipmentUpdate,
)

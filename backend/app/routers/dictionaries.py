"""CRUD for organization dictionaries (crops, categories)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.dictionary import (
    DICTIONARY_TYPES,
    OrgDictionary,
    ensure_default_dictionaries,
    normalize_name,
    slugify_code,
)
from app.models.employee import Employee
from app.services.dictionary_usage import dictionary_usage_count

router = APIRouter()


async def _assert_can_deactivate(
    db: AsyncSession,
    *,
    org_id: UUID,
    item: OrgDictionary,
) -> None:
    used = await dictionary_usage_count(db, org_id=org_id, item=item)
    if used > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f'Нельзя деактивировать «{item.name}»: используется в {used} записях. '
                'Сначала смените значение у связанных сущностей или оставьте справочник активным '
                'для истории.'
            ),
        )


class DictionaryItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: str | None = Field(default=None, max_length=80)
    sort_order: int | None = None


class DictionaryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    sort_order: int | None = None


class DictionaryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    name: str
    code: str
    is_active: bool
    sort_order: int


def _to_response(item: OrgDictionary) -> DictionaryItemResponse:
    return DictionaryItemResponse(
        id=item.id,
        type=item.type,
        name=item.name,
        code=item.code,
        is_active=bool(item.is_active),
        sort_order=int(item.sort_order or 0),
    )


def _validate_type(dict_type: str) -> str:
    if dict_type not in DICTIONARY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Неизвестный тип справочника: {dict_type}',
        )
    return dict_type


@router.get('/{dict_type}', response_model=list[DictionaryItemResponse])
async def list_dictionary(
    request: Request,
    dict_type: str,
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[DictionaryItemResponse]:
    dict_type = _validate_type(dict_type)
    org_id = get_org_id(request)
    await ensure_default_dictionaries(db, org_id)
    query = (
        select(OrgDictionary)
        .where(OrgDictionary.org_id == org_id, OrgDictionary.type == dict_type)
        .order_by(OrgDictionary.sort_order, OrgDictionary.name)
    )
    if is_active is not None:
        query = query.where(OrgDictionary.is_active == is_active)
    result = await db.execute(query)
    return [_to_response(row) for row in result.scalars().all()]


@router.post(
    '/{dict_type}',
    response_model=DictionaryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dictionary_item(
    request: Request,
    dict_type: str,
    payload: DictionaryItemCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> DictionaryItemResponse:
    dict_type = _validate_type(dict_type)
    org_id = get_org_id(request)
    await ensure_default_dictionaries(db, org_id)
    name = normalize_name(payload.name)
    code = normalize_name(payload.code) if payload.code else slugify_code(name)
    code = slugify_code(code)
    item = OrgDictionary(
        org_id=org_id,
        type=dict_type,
        name=name,
        code=code,
        is_active=True,
        sort_order=payload.sort_order if payload.sort_order is not None else 100,
    )
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Запись с таким названием или кодом уже есть',
        ) from None
    await db.refresh(item)
    return _to_response(item)


@router.patch('/{dict_type}/{item_id}', response_model=DictionaryItemResponse)
async def update_dictionary_item(
    request: Request,
    dict_type: str,
    item_id: UUID,
    payload: DictionaryItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> DictionaryItemResponse:
    dict_type = _validate_type(dict_type)
    org_id = get_org_id(request)
    result = await db.execute(
        select(OrgDictionary).where(
            OrgDictionary.id == item_id,
            OrgDictionary.org_id == org_id,
            OrgDictionary.type == dict_type,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')

    updates = payload.model_dump(exclude_unset=True)
    if updates.get('is_active') is False and item.is_active:
        await _assert_can_deactivate(db, org_id=org_id, item=item)
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
            status_code=status.HTTP_409_CONFLICT,
            detail='Запись с таким названием уже есть',
        ) from None
    await db.refresh(item)
    return _to_response(item)


@router.delete('/{dict_type}/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def deactivate_dictionary_item(
    request: Request,
    dict_type: str,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> Response:
    dict_type = _validate_type(dict_type)
    org_id = get_org_id(request)
    result = await db.execute(
        select(OrgDictionary).where(
            OrgDictionary.id == item_id,
            OrgDictionary.org_id == org_id,
            OrgDictionary.type == dict_type,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')
    await _assert_can_deactivate(db, org_id=org_id, item=item)
    item.is_active = False
    db.add(item)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
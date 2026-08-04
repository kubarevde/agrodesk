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
from app.services.audit import log_change, model_snapshot
from app.services.dictionary_usage import (
    crop_usage_breakdown,
    dictionary_usage_count,
    format_crop_usage_detail,
)
from app.services.implement_category_styles import (
    load_org_style_overrides,
    resolve_style,
    upsert_category_style,
)

router = APIRouter()


async def _assert_can_deactivate(
    db: AsyncSession,
    *,
    org_id: UUID,
    item: OrgDictionary,
) -> None:
    if item.type == 'crop':
        breakdown = await crop_usage_breakdown(db, org_id=org_id, item=item)
        used = sum(breakdown.values())
        if used > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=format_crop_usage_detail(item.name, breakdown),
            )
        return

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
    icon: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, max_length=40)


class DictionaryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    sort_order: int | None = None
    icon: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, max_length=40)


class DictionaryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    name: str
    code: str
    is_active: bool
    sort_order: int
    # Computed: Organization.settings overrides → code defaults → null.
    icon: str | None = None
    color: str | None = None


def _to_response(
    item: OrgDictionary,
    overrides: dict[str, dict[str, str]] | None = None,
) -> DictionaryItemResponse:
    icon: str | None = None
    color: str | None = None
    if item.type == 'implement_category':
        icon, color = resolve_style(item.code, overrides)
    return DictionaryItemResponse(
        id=item.id,
        type=item.type,
        name=item.name,
        code=item.code,
        is_active=bool(item.is_active),
        sort_order=int(item.sort_order or 0),
        icon=icon,
        color=color,
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
    overrides = (
        await load_org_style_overrides(db, org_id) if dict_type == 'implement_category' else None
    )
    return [_to_response(row, overrides) for row in result.scalars().all()]


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
    current: Employee = Depends(require_manager),
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
    overrides: dict[str, dict[str, str]] | None = None
    try:
        await db.flush()
        if dict_type == 'implement_category' and (payload.icon is not None or payload.color is not None):
            try:
                overrides = await upsert_category_style(
                    db,
                    org_id,
                    code,
                    icon=payload.icon,
                    color=payload.color,
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                ) from exc
        await log_change(db, org_id=org_id, entity_type='dictionary_item', entity_id=item.id,
                         action='create', changed_by=current.id, after=model_snapshot(item))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Запись с таким названием или кодом уже есть',
        ) from None
    await db.refresh(item)
    if overrides is None and dict_type == 'implement_category':
        overrides = await load_org_style_overrides(db, org_id)
    return _to_response(item, overrides)


@router.patch('/{dict_type}/{item_id}', response_model=DictionaryItemResponse)
async def update_dictionary_item(
    request: Request,
    dict_type: str,
    item_id: UUID,
    payload: DictionaryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
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
    before = model_snapshot(item)

    updates = payload.model_dump(exclude_unset=True)
    style_icon = updates.pop('icon', None) if 'icon' in updates else ...
    style_color = updates.pop('color', None) if 'color' in updates else ...

    if updates.get('is_active') is False and item.is_active:
        await _assert_can_deactivate(db, org_id=org_id, item=item)
    if 'name' in updates and updates['name'] is not None:
        updates['name'] = normalize_name(updates['name'])
    for key, value in updates.items():
        setattr(item, key, value)
    db.add(item)

    overrides = None
    try:
        if dict_type == 'implement_category' and (style_icon is not ... or style_color is not ...):
            try:
                overrides = await upsert_category_style(
                    db,
                    org_id,
                    item.code,
                    icon=None if style_icon is ... else style_icon,
                    color=None if style_color is ... else style_color,
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                ) from exc
        await log_change(db, org_id=org_id, entity_type='dictionary_item', entity_id=item.id,
                         action='update', changed_by=current.id, before=before, after=model_snapshot(item))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Запись с таким названием уже есть',
        ) from None
    await db.refresh(item)
    if overrides is None and dict_type == 'implement_category':
        overrides = await load_org_style_overrides(db, org_id)
    return _to_response(item, overrides)


@router.delete('/{dict_type}/{item_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def deactivate_dictionary_item(
    request: Request,
    dict_type: str,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
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
    before = model_snapshot(item)
    item.is_active = False
    db.add(item)
    await log_change(db, org_id=org_id, entity_type='dictionary_item', entity_id=item.id,
                     action='delete', changed_by=current.id, before=before, after=model_snapshot(item))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

"""CRUD for org crop varieties (sorts under crop dictionary codes)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_manager
from app.middleware.org_context import get_org_id
from app.models.crop_variety import CropVariety
from app.models.dictionary import OrgDictionary, normalize_name
from app.models.employee import Employee
from app.services.audit import log_change, model_snapshot
from app.services.crop_variety_usage import (
    crop_variety_usage_breakdown,
    format_crop_variety_usage_detail,
)

router = APIRouter()


class CropVarietyCreate(BaseModel):
    crop_code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    sort_order: int | None = None


class CropVarietyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    sort_order: int | None = None


class CropVarietyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    crop_code: str
    name: str
    is_active: bool
    sort_order: int


class CropVarietyUsageResponse(BaseModel):
    fields: int = 0
    inventory: int = 0
    shipments: int = 0
    shipment_requests: int = 0
    total: int = 0


def _to_response(row: CropVariety) -> CropVarietyResponse:
    return CropVarietyResponse(
        id=row.id,
        crop_code=row.crop_code,
        name=row.name,
        is_active=bool(row.is_active),
        sort_order=int(row.sort_order or 0),
    )


async def _get_crop_or_404(db: AsyncSession, org_id: UUID, crop_code: str) -> OrgDictionary:
    result = await db.execute(
        select(OrgDictionary).where(
            OrgDictionary.org_id == org_id,
            OrgDictionary.type == 'crop',
            OrgDictionary.code == crop_code,
        )
    )
    crop = result.scalar_one_or_none()
    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Культура не найдена в справочнике организации',
        )
    return crop


async def _get_variety_or_404(db: AsyncSession, org_id: UUID, variety_id: UUID) -> CropVariety:
    result = await db.execute(
        select(CropVariety).where(CropVariety.id == variety_id, CropVariety.org_id == org_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Сорт не найден')
    return row


@router.get('', response_model=list[CropVarietyResponse])
async def list_crop_varieties(
    request: Request,
    crop_code: str | None = Query(None, min_length=1, max_length=80),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> list[CropVarietyResponse]:
    org_id = get_org_id(request)
    query = select(CropVariety).where(CropVariety.org_id == org_id)
    if crop_code is not None:
        await _get_crop_or_404(db, org_id, crop_code)
        query = query.where(CropVariety.crop_code == crop_code)
    if is_active is not None:
        query = query.where(CropVariety.is_active.is_(is_active))
    query = query.order_by(
        CropVariety.crop_code.asc(),
        CropVariety.sort_order.asc(),
        CropVariety.name.asc(),
    )
    rows = (await db.execute(query)).scalars().all()
    return [_to_response(row) for row in rows]


@router.post('', response_model=CropVarietyResponse, status_code=status.HTTP_201_CREATED)
async def create_crop_variety(
    request: Request,
    payload: CropVarietyCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> CropVarietyResponse:
    org_id = get_org_id(request)
    crop_code = payload.crop_code.strip()
    await _get_crop_or_404(db, org_id, crop_code)
    name = normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Укажите название сорта')

    max_order = await db.scalar(
        select(func.coalesce(func.max(CropVariety.sort_order), -1)).where(
            CropVariety.org_id == org_id,
            CropVariety.crop_code == crop_code,
        )
    )
    sort_order = payload.sort_order if payload.sort_order is not None else int(max_order or -1) + 1

    row = CropVariety(
        org_id=org_id,
        crop_code=crop_code,
        name=name,
        is_active=True,
        sort_order=sort_order,
    )
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Сорт «{name}» уже есть у этой культуры',
        ) from None

    await log_change(
        db,
        org_id=org_id,
        entity_type='crop_variety',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
        summary=f'Добавлен сорт «{name}» ({crop_code})',
    )
    await db.commit()
    await db.refresh(row)
    return _to_response(row)


@router.patch('/{variety_id}', response_model=CropVarietyResponse)
async def update_crop_variety(
    request: Request,
    variety_id: UUID,
    payload: CropVarietyUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> CropVarietyResponse:
    org_id = get_org_id(request)
    row = await _get_variety_or_404(db, org_id, variety_id)
    before = model_snapshot(row)
    data = payload.model_dump(exclude_unset=True)

    if 'name' in data and data['name'] is not None:
        data['name'] = normalize_name(data['name'])
        if not data['name']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите название сорта',
            )

    if data.get('is_active') is False and row.is_active:
        breakdown = await crop_variety_usage_breakdown(db, org_id=org_id, variety=row)
        if sum(breakdown.values()) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=format_crop_variety_usage_detail(row.name, breakdown),
            )

    for key, value in data.items():
        setattr(row, key, value)

    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Сорт «{row.name}» уже есть у этой культуры',
        ) from None

    await log_change(
        db,
        org_id=org_id,
        entity_type='crop_variety',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary=f'Обновлён сорт «{row.name}»',
    )
    await db.commit()
    await db.refresh(row)
    return _to_response(row)


@router.get('/{variety_id}/usage', response_model=CropVarietyUsageResponse)
async def get_crop_variety_usage(
    request: Request,
    variety_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> CropVarietyUsageResponse:
    org_id = get_org_id(request)
    row = await _get_variety_or_404(db, org_id, variety_id)
    breakdown = await crop_variety_usage_breakdown(db, org_id=org_id, variety=row)
    total = sum(breakdown.values())
    return CropVarietyUsageResponse(
        fields=breakdown.get('fields', 0),
        inventory=breakdown.get('inventory', 0),
        shipments=breakdown.get('shipments', 0),
        shipment_requests=breakdown.get('shipment_requests', 0),
        total=total,
    )

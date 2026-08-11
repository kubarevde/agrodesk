"""CRUD for field crop-rotation plans (plan ≠ factual plantings)."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

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
from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting
from app.models.field_rotation_plan import ROTATION_PLAN_STATUSES, FieldRotationPlan
from app.routers.fields import get_field_or_404
from app.services.audit import log_change, model_snapshot
from app.services.field_rotation_service import (
    assert_plan_area_fits,
    consecutive_crop_warning,
    find_matching_planting,
    fulfillment_status,
    validate_plan_crop_variety,
)

router = APIRouter()


class RotationPlanCreate(BaseModel):
    crop_code: str = Field(min_length=1, max_length=80)
    variety_id: UUID | None = None
    area_ha: Decimal = Field(gt=0)
    season_year: int = Field(ge=2000, le=2100)
    planned_plant_at: date | None = None
    planned_harvest_at: date | None = None
    comment: str | None = Field(default=None, max_length=2000)


class RotationPlanUpdate(BaseModel):
    crop_code: str | None = Field(default=None, min_length=1, max_length=80)
    variety_id: UUID | None = None
    clear_variety: bool = False
    area_ha: Decimal | None = Field(default=None, gt=0)
    season_year: int | None = Field(default=None, ge=2000, le=2100)
    planned_plant_at: date | None = None
    planned_harvest_at: date | None = None
    comment: str | None = Field(default=None, max_length=2000)
    status: str | None = None


class RotationPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_id: UUID
    crop_code: str
    crop_name: str | None = None
    variety_id: UUID | None
    variety_name: str | None = None
    area_ha: Decimal
    season_year: int
    planned_plant_at: date | None
    planned_harvest_at: date | None
    comment: str | None
    status: str
    linked_planting_id: UUID | None
    fulfillment: str = 'pending'
    fact_area_ha: Decimal | None = None
    warning: str | None = None


class RotationMatrixCell(BaseModel):
    kind: str  # plan | fact
    id: UUID
    crop_code: str
    crop_name: str | None = None
    variety_id: UUID | None = None
    variety_name: str | None = None
    area_ha: Decimal
    status: str
    fulfillment: str | None = None
    linked_planting_id: UUID | None = None
    planted_at: date | None = None
    harvested_at: date | None = None
    comment: str | None = None


class RotationMatrixYear(BaseModel):
    year: int
    cells: list[RotationMatrixCell]


class RotationMatrixResponse(BaseModel):
    field_id: UUID
    field_area_ha: Decimal | None
    years: list[RotationMatrixYear]


async def _crop_names(db: AsyncSession, org_id: UUID) -> dict[str, str]:
    rows = (
        await db.execute(
            select(OrgDictionary.code, OrgDictionary.name).where(
                OrgDictionary.org_id == org_id,
                OrgDictionary.type == 'crop',
            )
        )
    ).all()
    return {str(c): str(n) for c, n in rows}


async def _variety_names(db: AsyncSession, org_id: UUID) -> dict[UUID, str]:
    rows = (
        await db.execute(select(CropVariety.id, CropVariety.name).where(CropVariety.org_id == org_id))
    ).all()
    return {i: str(n) for i, n in rows}


def _to_plan_response(
    row: FieldRotationPlan,
    *,
    crop_names: dict[str, str],
    variety_names: dict[UUID, str],
    fact_area: Decimal | None = None,
    warning: str | None = None,
) -> RotationPlanResponse:
    fulfillment = fulfillment_status(plan_area=Decimal(str(row.area_ha)), fact_area=fact_area)
    return RotationPlanResponse(
        id=row.id,
        field_id=row.field_id,
        crop_code=row.crop_code,
        crop_name=crop_names.get(row.crop_code),
        variety_id=row.variety_id,
        variety_name=variety_names.get(row.variety_id) if row.variety_id else None,
        area_ha=Decimal(str(row.area_ha)),
        season_year=int(row.season_year),
        planned_plant_at=row.planned_plant_at,
        planned_harvest_at=row.planned_harvest_at,
        comment=row.comment,
        status=row.status,
        linked_planting_id=row.linked_planting_id,
        fulfillment=fulfillment,
        fact_area_ha=fact_area,
        warning=warning,
    )


@router.get('/{field_id}/rotation', response_model=RotationMatrixResponse)
async def get_rotation_matrix(
    request: Request,
    field_id: UUID,
    from_year: int | None = Query(None, ge=2000, le=2100),
    to_year: int | None = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> RotationMatrixResponse:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    today_y = date.today().year
    y0 = from_year or (today_y - 2)
    y1 = to_year or (today_y + 3)
    if y1 < y0:
        y0, y1 = y1, y0

    plans = (
        await db.execute(
            select(FieldRotationPlan).where(
                FieldRotationPlan.org_id == org_id,
                FieldRotationPlan.field_id == field.id,
                FieldRotationPlan.season_year >= y0,
                FieldRotationPlan.season_year <= y1,
                FieldRotationPlan.status == 'active',
            )
        )
    ).scalars().all()
    facts = (
        await db.execute(
            select(FieldPlanting).where(
                FieldPlanting.org_id == org_id,
                FieldPlanting.field_id == field.id,
                FieldPlanting.season_year >= y0,
                FieldPlanting.season_year <= y1,
                FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
            )
        )
    ).scalars().all()

    crop_names = await _crop_names(db, org_id)
    variety_names = await _variety_names(db, org_id)
    planting_by_id = {p.id: p for p in facts}

    by_year: dict[int, list[RotationMatrixCell]] = {y: [] for y in range(y0, y1 + 1)}

    for plan in plans:
        fact = planting_by_id.get(plan.linked_planting_id) if plan.linked_planting_id else None
        if fact is None:
            fact = await find_matching_planting(
                db,
                field_id=field.id,
                crop_code=plan.crop_code,
                variety_id=plan.variety_id,
                season_year=int(plan.season_year),
            )
        fact_area = Decimal(str(fact.area_ha)) if fact is not None else None
        by_year.setdefault(int(plan.season_year), []).append(
            RotationMatrixCell(
                kind='plan',
                id=plan.id,
                crop_code=plan.crop_code,
                crop_name=crop_names.get(plan.crop_code),
                variety_id=plan.variety_id,
                variety_name=variety_names.get(plan.variety_id) if plan.variety_id else None,
                area_ha=Decimal(str(plan.area_ha)),
                status=plan.status,
                fulfillment=fulfillment_status(
                    plan_area=Decimal(str(plan.area_ha)), fact_area=fact_area
                ),
                linked_planting_id=fact.id if fact else plan.linked_planting_id,
                comment=plan.comment,
            )
        )

    for planting in facts:
        by_year.setdefault(int(planting.season_year), []).append(
            RotationMatrixCell(
                kind='fact',
                id=planting.id,
                crop_code=planting.crop_code,
                crop_name=crop_names.get(planting.crop_code),
                variety_id=planting.variety_id,
                variety_name=(
                    variety_names.get(planting.variety_id) if planting.variety_id else None
                ),
                area_ha=Decimal(str(planting.area_ha)),
                status=planting.status,
                planted_at=planting.planted_at,
                harvested_at=planting.harvested_at,
                comment=planting.comment,
            )
        )

    years = [
        RotationMatrixYear(year=y, cells=by_year.get(y, []))
        for y in range(y0, y1 + 1)
    ]
    field_ha = Decimal(str(field.area_ha)) if field.area_ha is not None else None
    return RotationMatrixResponse(field_id=field.id, field_area_ha=field_ha, years=years)


@router.get('/{field_id}/rotation-plans', response_model=list[RotationPlanResponse])
async def list_rotation_plans(
    request: Request,
    field_id: UUID,
    season_year: int | None = Query(None, ge=2000, le=2100),
    include_cancelled: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _current: Employee = Depends(get_current_employee),
) -> list[RotationPlanResponse]:
    org_id = get_org_id(request)
    await get_field_or_404(db, field_id, org_id)
    query = select(FieldRotationPlan).where(
        FieldRotationPlan.org_id == org_id,
        FieldRotationPlan.field_id == field_id,
    )
    if season_year is not None:
        query = query.where(FieldRotationPlan.season_year == season_year)
    if not include_cancelled:
        query = query.where(FieldRotationPlan.status == 'active')
    rows = (await db.execute(query.order_by(FieldRotationPlan.season_year.desc()))).scalars().all()
    crop_names = await _crop_names(db, org_id)
    variety_names = await _variety_names(db, org_id)
    out: list[RotationPlanResponse] = []
    for row in rows:
        fact = None
        if row.linked_planting_id:
            fact = (
                await db.execute(
                    select(FieldPlanting).where(FieldPlanting.id == row.linked_planting_id)
                )
            ).scalar_one_or_none()
        if fact is None:
            fact = await find_matching_planting(
                db,
                field_id=field_id,
                crop_code=row.crop_code,
                variety_id=row.variety_id,
                season_year=int(row.season_year),
            )
        fact_area = Decimal(str(fact.area_ha)) if fact else None
        out.append(
            _to_plan_response(
                row,
                crop_names=crop_names,
                variety_names=variety_names,
                fact_area=fact_area,
            )
        )
    return out


@router.post(
    '/{field_id}/rotation-plans',
    response_model=RotationPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_rotation_plan(
    request: Request,
    field_id: UUID,
    payload: RotationPlanCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> RotationPlanResponse:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    crop_code = payload.crop_code.strip()
    await validate_plan_crop_variety(
        db, org_id=org_id, crop_code=crop_code, variety_id=payload.variety_id
    )
    await assert_plan_area_fits(
        db, field=field, season_year=payload.season_year, new_area=Decimal(str(payload.area_ha))
    )

    crop_names = await _crop_names(db, org_id)
    variety_names = await _variety_names(db, org_id)
    warning = await consecutive_crop_warning(
        db,
        field_id=field.id,
        crop_code=crop_code,
        season_year=payload.season_year,
        crop_name=crop_names.get(crop_code),
        variety_name=(
            variety_names.get(payload.variety_id) if payload.variety_id else None
        ),
    )

    match = await find_matching_planting(
        db,
        field_id=field.id,
        crop_code=crop_code,
        variety_id=payload.variety_id,
        season_year=payload.season_year,
    )
    row = FieldRotationPlan(
        org_id=org_id,
        field_id=field.id,
        crop_code=crop_code,
        variety_id=payload.variety_id,
        area_ha=payload.area_ha,
        season_year=payload.season_year,
        planned_plant_at=payload.planned_plant_at,
        planned_harvest_at=payload.planned_harvest_at,
        comment=(payload.comment or '').strip() or None,
        status='active',
        linked_planting_id=match.id if match else None,
    )
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='field_rotation_plan',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
        summary=(
            f'Добавлен план севооборота: {crop_names.get(crop_code, crop_code)} '
            f'на {payload.season_year} ({payload.area_ha} га)'
        ),
    )
    await db.commit()
    await db.refresh(row)
    return _to_plan_response(
        row,
        crop_names=crop_names,
        variety_names=variety_names,
        fact_area=Decimal(str(match.area_ha)) if match else None,
        warning=warning,
    )


@router.patch(
    '/{field_id}/rotation-plans/{plan_id}',
    response_model=RotationPlanResponse,
)
async def update_rotation_plan(
    request: Request,
    field_id: UUID,
    plan_id: UUID,
    payload: RotationPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> RotationPlanResponse:
    org_id = get_org_id(request)
    field = await get_field_or_404(db, field_id, org_id)
    row = (
        await db.execute(
            select(FieldRotationPlan).where(
                FieldRotationPlan.id == plan_id,
                FieldRotationPlan.field_id == field.id,
                FieldRotationPlan.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='План севооборота не найден')

    before = model_snapshot(row)
    data = payload.model_dump(exclude_unset=True)
    clear_variety = bool(data.pop('clear_variety', False))

    if 'status' in data and data['status'] is not None:
        if data['status'] not in ROTATION_PLAN_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Статус: {", ".join(ROTATION_PLAN_STATUSES)}',
            )

    next_crop = row.crop_code
    if 'crop_code' in data and data['crop_code'] is not None:
        next_crop = str(data['crop_code']).strip()
        data['crop_code'] = next_crop

    if clear_variety:
        data['variety_id'] = None
    next_variety = row.variety_id
    if 'variety_id' in data or clear_variety:
        next_variety = data.get('variety_id')

    await validate_plan_crop_variety(
        db, org_id=org_id, crop_code=str(next_crop), variety_id=next_variety
    )

    next_year = int(data.get('season_year', row.season_year))
    next_area = Decimal(str(data['area_ha'])) if 'area_ha' in data else Decimal(str(row.area_ha))
    next_status = data.get('status', row.status)

    if next_status == 'active':
        await assert_plan_area_fits(
            db,
            field=field,
            season_year=next_year,
            new_area=next_area,
            exclude_plan_id=row.id,
        )

    crop_names = await _crop_names(db, org_id)
    variety_names = await _variety_names(db, org_id)
    warning = await consecutive_crop_warning(
        db,
        field_id=field.id,
        crop_code=str(next_crop),
        season_year=next_year,
        crop_name=crop_names.get(str(next_crop)),
        variety_name=variety_names.get(next_variety) if next_variety else None,
    )

    if 'comment' in data and data['comment'] is not None:
        data['comment'] = str(data['comment']).strip() or None

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='field_rotation_plan',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
        summary=f'Изменён план севооборота на {next_year}',
    )
    await db.commit()
    await db.refresh(row)

    fact = None
    if row.linked_planting_id:
        fact = (
            await db.execute(select(FieldPlanting).where(FieldPlanting.id == row.linked_planting_id))
        ).scalar_one_or_none()
    fact_area = Decimal(str(fact.area_ha)) if fact else None
    return _to_plan_response(
        row,
        crop_names=crop_names,
        variety_names=variety_names,
        fact_area=fact_area,
        warning=warning,
    )


# Re-export for planting create soft-link
__all__ = ['router', 'link_plan_to_planting_if_match', 'planned_area_ha']

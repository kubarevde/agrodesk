"""Crop rotation plans: area caps, consecutive-crop warnings, plan↔fact matching."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting
from app.models.field_rotation_plan import FieldRotationPlan
from app.models.reference import Location
from app.services.field_planting_service import assert_crop_exists, assert_variety_for_crop


def _dec(value: object) -> Decimal:
    return Decimal(str(value))


async def planned_area_ha(
    db: AsyncSession,
    *,
    field_id: UUID,
    season_year: int,
    exclude_plan_id: UUID | None = None,
) -> Decimal:
    query = select(func.coalesce(func.sum(FieldRotationPlan.area_ha), 0)).where(
        FieldRotationPlan.field_id == field_id,
        FieldRotationPlan.season_year == season_year,
        FieldRotationPlan.status == 'active',
    )
    if exclude_plan_id is not None:
        query = query.where(FieldRotationPlan.id != exclude_plan_id)
    total = await db.scalar(query)
    return _dec(total or 0)


async def assert_plan_area_fits(
    db: AsyncSession,
    *,
    field: Location,
    season_year: int,
    new_area: Decimal,
    exclude_plan_id: UUID | None = None,
) -> None:
    if new_area <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Плановая площадь должна быть больше нуля',
        )
    if field.area_ha is None:
        return
    field_ha = _dec(field.area_ha)
    if field_ha <= 0:
        return
    allocated = await planned_area_ha(
        db,
        field_id=field.id,
        season_year=season_year,
        exclude_plan_id=exclude_plan_id,
    )
    remaining = field_ha - allocated
    if new_area > remaining + Decimal('0.0001'):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f'Нельзя запланировать {new_area} га: площадь поля {field_ha} га, '
                f'уже в плане {allocated} га, доступный остаток {remaining} га.'
            ),
        )


async def consecutive_crop_warning(
    db: AsyncSession,
    *,
    field_id: UUID,
    crop_code: str,
    season_year: int,
    crop_name: str | None = None,
    variety_name: str | None = None,
) -> str | None:
    """Warn if same crop (any variety) was fact or plan on previous year. Non-blocking."""
    prev = int(season_year) - 1
    label = (crop_name or crop_code).strip() or crop_code

    fact = (
        await db.execute(
            select(FieldPlanting).where(
                FieldPlanting.field_id == field_id,
                FieldPlanting.crop_code == crop_code,
                FieldPlanting.season_year == prev,
                FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
            ).limit(1)
        )
    ).scalar_one_or_none()

    plan = None
    if fact is None:
        plan = (
            await db.execute(
                select(FieldRotationPlan).where(
                    FieldRotationPlan.field_id == field_id,
                    FieldRotationPlan.crop_code == crop_code,
                    FieldRotationPlan.season_year == prev,
                    FieldRotationPlan.status == 'active',
                ).limit(1)
            )
        ).scalar_one_or_none()

    if fact is None and plan is None:
        return None

    extra = f' (сорт «{variety_name}»)' if variety_name else ''
    return (
        f'На этом поле культура «{label}»{extra} уже была указана в {prev}. '
        f'Проверьте план севооборота.'
    )


def fulfillment_status(
    *,
    plan_area: Decimal,
    fact_area: Decimal | None,
) -> str:
    """Visual status only — never auto-marks «не выполнен» by calendar."""
    if fact_area is None:
        return 'pending'
    plan_a = _dec(plan_area)
    fact_a = _dec(fact_area)
    if abs(plan_a - fact_a) <= Decimal('0.0001'):
        return 'fulfilled'
    return 'partial'


async def find_matching_planting(
    db: AsyncSession,
    *,
    field_id: UUID,
    crop_code: str,
    variety_id: UUID | None,
    season_year: int,
) -> FieldPlanting | None:
    query = select(FieldPlanting).where(
        FieldPlanting.field_id == field_id,
        FieldPlanting.crop_code == crop_code,
        FieldPlanting.season_year == season_year,
        FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
    )
    if variety_id is None:
        query = query.where(FieldPlanting.variety_id.is_(None))
    else:
        query = query.where(FieldPlanting.variety_id == variety_id)
    return (await db.execute(query.order_by(FieldPlanting.created_at.asc()))).scalars().first()


async def link_plan_to_planting_if_match(
    db: AsyncSession,
    *,
    planting: FieldPlanting,
) -> FieldRotationPlan | None:
    """Soft-link an unmatched active plan when crop+variety+year match. Never overwrites."""
    query = select(FieldRotationPlan).where(
        FieldRotationPlan.field_id == planting.field_id,
        FieldRotationPlan.crop_code == planting.crop_code,
        FieldRotationPlan.season_year == int(planting.season_year),
        FieldRotationPlan.status == 'active',
        FieldRotationPlan.linked_planting_id.is_(None),
    )
    if planting.variety_id is None:
        query = query.where(FieldRotationPlan.variety_id.is_(None))
    else:
        query = query.where(FieldRotationPlan.variety_id == planting.variety_id)
    plan = (await db.execute(query.order_by(FieldRotationPlan.created_at.asc()))).scalars().first()
    if plan is None:
        return None
    plan.linked_planting_id = planting.id
    db.add(plan)
    return plan


async def validate_plan_crop_variety(
    db: AsyncSession,
    *,
    org_id: UUID,
    crop_code: str,
    variety_id: UUID | None,
) -> None:
    await assert_crop_exists(db, org_id, crop_code)
    await assert_variety_for_crop(db, org_id=org_id, crop_code=crop_code, variety_id=variety_id)

"""Field harvest → warehouse income (inventory_operations only).

Does NOT create ``shipments`` rows — crop KPI stays on the harvest shipments module.
Each collect call posts one income with purpose=harvest_income and field_id.
When field plantings exist, ``field_planting_id`` is required for multi-crop fields.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting
from app.models.inventory import InventoryItem, InventoryOperation, InventoryOperationType
from app.models.reference import Location
from app.services.crop_dictionary import resolve_crop_pair_for_org
from app.services.field_planting_service import harvest_qty_by_planting
from app.services.harvest_inventory import is_harvest_inventory_category
from app.services.inventory import PURPOSE_HARVEST_INCOME, create_inventory_operation


async def ensure_field_crop_code(
    db: AsyncSession,
    field: Location,
    *,
    org_id: UUID,
) -> str | None:
    """Return stable crop_code for the field, soft-filling from crop_type when needed."""
    code = (field.crop_code or '').strip() or None
    if code:
        return code

    crop_type = (field.crop_type or '').strip() or None
    if not crop_type:
        return None

    name, resolved = await resolve_crop_pair_for_org(
        db,
        org_id,
        crop_type=crop_type,
        crop_code=None,
    )
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'Невозможно однозначно определить код культуры для поля, '
                'проверьте справочник культур'
            ),
        )

    field.crop_code = resolved
    if name:
        field.crop_type = name
    db.add(field)
    await db.flush()
    return resolved


async def active_plantings_for_field(
    db: AsyncSession,
    *,
    field_id: UUID,
    org_id: UUID,
    season_year: int | None = None,
) -> list[FieldPlanting]:
    year = season_year or date.today().year
    result = await db.execute(
        select(FieldPlanting).where(
            FieldPlanting.field_id == field_id,
            FieldPlanting.org_id == org_id,
            FieldPlanting.season_year == year,
            FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
        ).order_by(FieldPlanting.created_at.asc())
    )
    return list(result.scalars().all())


async def create_field_harvest(
    db: AsyncSession,
    *,
    field: Location,
    item_id: UUID,
    quantity: Decimal,
    op_date: date | None,
    user_id: UUID,
    org_id: UUID,
    field_planting_id: UUID | None = None,
    harvest_status: str | None = None,
) -> InventoryOperation:
    """Post harvest income for a field onto a harvest inventory SKU."""
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.org_id == org_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Позиция ТМЦ не найдена',
        )
    if not item.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Позиция ТМЦ неактивна',
        )
    if not is_harvest_inventory_category(str(item.category)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сбор урожая возможен только на позицию категории «Урожай (на складе)»',
        )

    item_code = (item.crop_code or '').strip() or None
    if not item_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='У позиции склада не задана культура',
        )

    plantings = await active_plantings_for_field(db, field_id=field.id, org_id=org_id)
    planting: FieldPlanting | None = None

    if plantings:
        if field_planting_id is None:
            if len(plantings) == 1:
                planting = plantings[0]
                field_planting_id = planting.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        'На поле несколько культур. Выберите конкретную запись культуры '
                        'для сбора урожая.'
                    ),
                )
        else:
            planting = next((p for p in plantings if p.id == field_planting_id), None)
            if planting is None:
                # Allow harvest against planting from another season if id matches field
                planting = (
                    await db.execute(
                        select(FieldPlanting).where(
                            FieldPlanting.id == field_planting_id,
                            FieldPlanting.field_id == field.id,
                            FieldPlanting.org_id == org_id,
                            FieldPlanting.status != 'cancelled',
                        )
                    )
                ).scalar_one_or_none()
            if planting is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Запись культуры на поле не найдена',
                )

        if planting.crop_code != item_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    'Культура выбранной записи на поле не совпадает с позицией ТМЦ '
                    f'({planting.crop_code} ≠ {item_code})'
                ),
            )
        crop_code = planting.crop_code
    else:
        # Legacy path: field.crop_code must match SKU when no plantings.
        field_code = await ensure_field_crop_code(db, field, org_id=org_id)
        if not field_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    'У поля не задана культура и нет записей посева. '
                    'Добавьте культуру на поле или укажите культуру поля.'
                ),
            )
        if field_code != item_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    'Культура поля не совпадает с культурой позиции ТМЦ '
                    f'({field_code} ≠ {item_code})'
                ),
            )
        crop_code = field_code
        if field_planting_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Указана запись посева, которой нет на этом поле',
            )

    field_name = (field.name or 'поле').strip() or 'поле'
    variety_bit = ''
    if planting is not None and planting.variety_id is not None:
        variety_bit = ' (сорт)'
    reason = f'Сбор с поля {field_name}: {crop_code}{variety_bit}'

    operation = await create_inventory_operation(
        db,
        item=item,
        op_type=InventoryOperationType.income,
        quantity=quantity,
        op_date=op_date,
        created_by=user_id,
        reason=reason,
        purpose=PURPOSE_HARVEST_INCOME,
        field_id=field.id,
        field_planting_id=field_planting_id,
    )

    if planting is not None:
        op_day = operation.date
        if planting.harvested_at is None or op_day > planting.harvested_at:
            planting.harvested_at = op_day
        if harvest_status in ('partially_harvested', 'harvested'):
            planting.status = harvest_status
        elif planting.status in ('planned', 'planted'):
            planting.status = 'partially_harvested'
        # Soft-touch updated_at via flush
        db.add(planting)
        await db.flush()
        # Ensure yield attribution path has this op counted
        _ = await harvest_qty_by_planting(db, planting_ids=[planting.id])

    return operation

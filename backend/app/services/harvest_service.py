"""Field harvest → warehouse income (inventory_operations only).

Does NOT create ``shipments`` rows — crop KPI stays on the harvest shipments module.
Each collect call posts one income with purpose=harvest_income and field_id.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, InventoryOperation, InventoryOperationType
from app.models.reference import Location
from app.services.crop_dictionary import resolve_crop_pair_for_org
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


async def create_field_harvest(
    db: AsyncSession,
    *,
    field: Location,
    item_id: UUID,
    quantity: Decimal,
    op_date: date | None,
    user_id: UUID,
    org_id: UUID,
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

    field_code = await ensure_field_crop_code(db, field, org_id=org_id)
    item_code = (item.crop_code or '').strip() or None

    if not field_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'У поля не задана культура (код). '
                'Укажите культуру поля перед сбором.'
            ),
        )

    if not item_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='У позиции склада не задана культура',
        )

    if field_code != item_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'Культура поля не совпадает с культурой позиции ТМЦ '
                f'({field_code} ≠ {item_code})'
            ),
        )

    field_name = (field.name or 'поле').strip() or 'поле'
    reason = f'Сбор с поля {field_name}'

    return await create_inventory_operation(
        db,
        item=item,
        op_type=InventoryOperationType.income,
        quantity=quantity,
        op_date=op_date,
        created_by=user_id,
        reason=reason,
        purpose=PURPOSE_HARVEST_INCOME,
        field_id=field.id,
    )

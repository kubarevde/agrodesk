"""Manual incomes API — table `incomes` only.

Harvest/TMC revenue stays on shipment tables; FE aggregates those read-only.
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate
from app.services.audit import log_change, model_snapshot
from app.services.dashboard import clear_dashboard_cache
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('expenses'))])


def income_to_response(row: Income, *, variety_name: str | None = None) -> IncomeResponse:
    return IncomeResponse(
        id=row.id,
        org_id=row.org_id,
        date=row.date,
        category=row.category,
        amount=row.amount,
        description=row.description,
        counterparty=row.counterparty,
        payment_method=row.payment_method,
        crop_code=getattr(row, 'crop_code', None),
        variety_id=getattr(row, 'variety_id', None),
        variety_name=variety_name,
    )


async def get_income_or_404(db: AsyncSession, income_id: UUID, org_id: UUID) -> Income:
    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.org_id == org_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Доход не найден')
    return row


@router.get('', response_model=list[IncomeResponse])
async def list_incomes(
    request: Request,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[IncomeResponse]:
    org_id = get_org_id(request)
    query = select(Income).where(Income.org_id == org_id)
    if from_date is not None:
        query = query.where(Income.date >= from_date)
    if to_date is not None:
        query = query.where(Income.date <= to_date)
    if category is not None:
        query = query.where(Income.category == category)
    query = query.order_by(Income.date.desc(), Income.created_at.desc())
    result = await db.execute(query)
    return [income_to_response(row) for row in result.scalars().all()]


@router.post('', response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    request: Request,
    payload: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> IncomeResponse:
    org_id = get_org_id(request)
    row = Income(
        org_id=org_id,
        date=payload.date,
        category=payload.category.strip(),
        amount=payload.amount,
        description=payload.description,
        counterparty=payload.counterparty,
        payment_method=payload.payment_method.value if payload.payment_method else None,
        crop_code=(payload.crop_code or '').strip() or None,
        variety_id=payload.variety_id,
        created_by=current.id,
    )
    if row.variety_id is not None:
        from app.services.field_planting_service import assert_variety_for_crop

        if not row.crop_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сорт можно указать только вместе с культурой',
            )
        await assert_variety_for_crop(
            db, org_id=org_id, crop_code=row.crop_code, variety_id=row.variety_id
        )
    db.add(row)
    await db.flush()
    await log_change(
        db,
        org_id=org_id,
        entity_type='income',
        entity_id=row.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(row),
    )
    await db.commit()
    await db.refresh(row)
    clear_dashboard_cache()
    return income_to_response(row)


@router.patch('/{income_id}', response_model=IncomeResponse)
async def update_income(
    request: Request,
    income_id: UUID,
    payload: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> IncomeResponse:
    org_id = get_org_id(request)
    row = await get_income_or_404(db, income_id, org_id)
    before = model_snapshot(row)
    data = payload.model_dump(exclude_unset=True)
    clear_variety = bool(data.pop('clear_variety', False))
    if 'category' in data and data['category'] is not None:
        data['category'] = str(data['category']).strip()
    if 'payment_method' in data and data['payment_method'] is not None:
        data['payment_method'] = data['payment_method'].value
    if 'crop_code' in data and data['crop_code'] is not None:
        data['crop_code'] = str(data['crop_code']).strip() or None
    if clear_variety:
        data['variety_id'] = None
    next_crop = data.get('crop_code', row.crop_code)
    next_variety = data['variety_id'] if 'variety_id' in data or clear_variety else row.variety_id
    if next_variety is not None:
        from app.services.field_planting_service import assert_variety_for_crop

        if not next_crop:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Сорт можно указать только вместе с культурой',
            )
        await assert_variety_for_crop(
            db, org_id=org_id, crop_code=str(next_crop), variety_id=next_variety
        )
    for field, value in data.items():
        setattr(row, field, value)
    db.add(row)
    await log_change(
        db,
        org_id=org_id,
        entity_type='income',
        entity_id=row.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(row),
    )
    await db.commit()
    await db.refresh(row)
    clear_dashboard_cache()
    return income_to_response(row)


@router.delete('/{income_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    request: Request,
    income_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> Response:
    row = await get_income_or_404(db, income_id, get_org_id(request))
    before = model_snapshot(row)
    await log_change(
        db,
        org_id=row.org_id,
        entity_type='income',
        entity_id=row.id,
        action='delete',
        changed_by=current.id,
        before=before,
    )
    await db.delete(row)
    await db.commit()
    clear_dashboard_cache()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

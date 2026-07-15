from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.expense import Expense
from app.models.implement import Implement, ImplementMaintenance
from app.models.reference import Equipment
from app.schemas.implement import (
    ImplementAttach,
    ImplementCreate,
    ImplementMaintenanceCreate,
    ImplementMaintenanceResponse,
    ImplementResponse,
    ImplementUpdate,
)
from app.services.dashboard import clear_dashboard_cache
from app.services.maintenance import (
    build_maintenance_summary,
    calculate_next_service_hours,
    next_after_completed_service,
)

router = APIRouter()


def implement_to_response(item: Implement) -> ImplementResponse:
    current = float(item.current_usage_hours or 0)
    interval = (
        float(item.service_interval_hours) if item.service_interval_hours is not None else None
    )
    summary = build_maintenance_summary(
        current_hours=current,
        interval_hours=interval,
        next_service_hours=(
            float(item.next_service_hours) if item.next_service_hours is not None else None
        ),
    )
    return ImplementResponse(
        id=item.id,
        org_id=item.org_id,
        name=item.name,
        category=item.category,
        serial_number=item.serial_number,
        year_of_manufacture=item.year_of_manufacture,
        condition=item.condition,
        description=item.description,
        image_url=item.image_url,
        current_equipment_id=item.current_equipment_id,
        current_equipment_name=item.current_equipment.name if item.current_equipment else None,
        sharing_status=None,
        is_active=bool(item.is_active),
        current_usage_hours=current,
        service_interval_hours=interval,
        next_service_hours=(
            float(summary['next_service_hours'])
            if summary['next_service_hours'] is not None
            else None
        ),
        last_service_date=item.last_service_date,
        maintenance={
            'current_hours': summary['current_hours'],
            'service_interval_hours': summary['service_interval_hours'],
            'next_service_hours': summary['next_service_hours'],
            'hours_to_next_service': summary['hours_to_next_service'],
            'progress_percent': summary['progress_percent'],
            'status': summary['status'],
        },
    )


def load_options():
    return (selectinload(Implement.current_equipment),)


async def get_implement_or_404(db: AsyncSession, implement_id: UUID, org_id: UUID) -> Implement:
    result = await db.execute(
        select(Implement)
        .options(*load_options())
        .where(Implement.id == implement_id, Implement.org_id == org_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Приспособление не найдено')
    return item


async def get_org_equipment_or_400(
    db: AsyncSession, equipment_id: UUID, org_id: UUID
) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None or not equipment.is_active or equipment.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Техника не найдена')
    return equipment


@router.get('', response_model=list[ImplementResponse])
async def list_implements(
    request: Request,
    category: str | None = Query(None),
    equipment_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ImplementResponse]:
    org_id = get_org_id(request)
    query = (
        select(Implement)
        .options(*load_options())
        .where(Implement.org_id == org_id, Implement.is_active.is_(True))
    )
    if category:
        query = query.where(Implement.category == category)
    if equipment_id is not None:
        query = query.where(Implement.current_equipment_id == equipment_id)
    query = query.order_by(Implement.name)
    result = await db.execute(query)
    return [implement_to_response(row) for row in result.scalars().all()]


@router.get('/{implement_id}', response_model=ImplementResponse)
async def get_implement(
    request: Request,
    implement_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> ImplementResponse:
    return implement_to_response(await get_implement_or_404(db, implement_id, get_org_id(request)))


@router.post('', response_model=ImplementResponse, status_code=status.HTTP_201_CREATED)
async def create_implement(
    request: Request,
    payload: ImplementCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ImplementResponse:
    org_id = get_org_id(request)
    if payload.current_equipment_id is not None:
        await get_org_equipment_or_400(db, payload.current_equipment_id, org_id)

    data = payload.model_dump()
    data['condition'] = data.get('condition') or 'good'
    nxt = calculate_next_service_hours(data.get('current_usage_hours'), data.get('service_interval_hours'))
    data['next_service_hours'] = nxt
    item = Implement(**data, org_id=org_id)
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Приспособление с таким названием уже существует',
        ) from None
    return implement_to_response(await get_implement_or_404(db, item.id, org_id))


@router.patch('/{implement_id}', response_model=ImplementResponse)
async def update_implement(
    request: Request,
    implement_id: UUID,
    payload: ImplementUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ImplementResponse:
    org_id = get_org_id(request)
    item = await get_implement_or_404(db, implement_id, org_id)
    updates = payload.model_dump(exclude_unset=True)
    if 'current_equipment_id' in updates and updates['current_equipment_id'] is not None:
        await get_org_equipment_or_400(db, updates['current_equipment_id'], org_id)

    for field, value in updates.items():
        setattr(item, field, value)

    if 'current_usage_hours' in updates or 'service_interval_hours' in updates:
        nxt = calculate_next_service_hours(item.current_usage_hours, item.service_interval_hours)
        item.next_service_hours = nxt

    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Приспособление с таким названием уже существует',
        ) from None
    return implement_to_response(await get_implement_or_404(db, implement_id, org_id))


@router.delete('/{implement_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_implement(
    request: Request,
    implement_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    item = await get_implement_or_404(db, implement_id, get_org_id(request))
    item.is_active = False
    item.current_equipment_id = None
    db.add(item)
    await db.commit()


@router.patch('/{implement_id}/attach', response_model=ImplementResponse)
async def attach_implement(
    request: Request,
    implement_id: UUID,
    payload: ImplementAttach,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ImplementResponse:
    org_id = get_org_id(request)
    item = await get_implement_or_404(db, implement_id, org_id)
    equipment = await get_org_equipment_or_400(db, payload.equipment_id, org_id)
    item.current_equipment_id = equipment.id
    db.add(item)
    await db.commit()
    return implement_to_response(await get_implement_or_404(db, implement_id, org_id))


@router.patch('/{implement_id}/detach', response_model=ImplementResponse)
async def detach_implement(
    request: Request,
    implement_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ImplementResponse:
    org_id = get_org_id(request)
    item = await get_implement_or_404(db, implement_id, org_id)
    item.current_equipment_id = None
    db.add(item)
    await db.commit()
    return implement_to_response(await get_implement_or_404(db, implement_id, org_id))


@router.get('/{implement_id}/maintenance', response_model=list[ImplementMaintenanceResponse])
async def list_implement_maintenance(
    request: Request,
    implement_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ImplementMaintenanceResponse]:
    await get_implement_or_404(db, implement_id, get_org_id(request))
    result = await db.execute(
        select(ImplementMaintenance)
        .where(ImplementMaintenance.implement_id == implement_id)
        .order_by(ImplementMaintenance.date.desc(), ImplementMaintenance.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        ImplementMaintenanceResponse(
            id=row.id,
            implement_id=row.implement_id,
            date=row.date,
            type=row.type,
            cost=float(row.cost) if row.cost is not None else None,
            description=row.description,
            expense_id=row.expense_id,
        )
        for row in rows
    ]


@router.post(
    '/{implement_id}/maintenance',
    response_model=ImplementMaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_implement_maintenance(
    request: Request,
    implement_id: UUID,
    payload: ImplementMaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ImplementMaintenanceResponse:
    org_id = get_org_id(request)
    item = await get_implement_or_404(db, implement_id, org_id)

    expense_id: UUID | None = None
    if payload.cost is not None and payload.cost > 0:
        expense = Expense(
            org_id=org_id,
            date=payload.date,
            category='parts',
            amount=Decimal(str(payload.cost)),
            description=f'ТО приспособления ({payload.type}): {item.name}',
            created_by=current.id,
        )
        db.add(expense)
        await db.flush()
        expense_id = expense.id

    record = ImplementMaintenance(
        implement_id=item.id,
        date=payload.date,
        type=payload.type,
        cost=Decimal(str(payload.cost)) if payload.cost is not None else None,
        description=payload.description,
        expense_id=expense_id,
        created_by=current.id,
    )
    db.add(record)

    interval = payload.next_service_interval
    if interval is None and item.service_interval_hours is not None:
        interval = float(item.service_interval_hours)
    if interval is not None and interval > 0:
        item.service_interval_hours = Decimal(str(interval))
        computed = next_after_completed_service(float(item.current_usage_hours or 0), interval)
        item.next_service_hours = Decimal(str(computed)) if computed is not None else None
        item.last_service_date = payload.date
        db.add(item)

    await db.commit()
    clear_dashboard_cache()
    await db.refresh(record)

    return ImplementMaintenanceResponse(
        id=record.id,
        implement_id=record.implement_id,
        date=record.date,
        type=record.type,
        cost=float(record.cost) if record.cost is not None else None,
        description=record.description,
        expense_id=record.expense_id,
    )

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.models.employee import Employee
from app.models.shipment import Shipment
from app.schemas.shipment import ShipmentCreate, ShipmentResponse, ShipmentUpdate
from app.services.dashboard import clear_dashboard_cache

router = APIRouter()


def calc_total_sum(quantity_kg: Decimal, price_per_kg: Decimal | None) -> Decimal | None:
    if price_per_kg is None:
        return None
    return quantity_kg * price_per_kg


def shipment_to_response(shipment: Shipment) -> ShipmentResponse:
    return ShipmentResponse(
        id=shipment.id,
        date=shipment.date,
        crop_type=shipment.crop_type,
        quantity_kg=shipment.quantity_kg,
        destination=shipment.destination,
        price_per_kg=shipment.price_per_kg,
        notes=shipment.notes,
        total_sum=calc_total_sum(shipment.quantity_kg, shipment.price_per_kg),
    )


async def get_shipment_or_404(db: AsyncSession, shipment_id: UUID) -> Shipment:
    shipment = await db.get(Shipment, shipment_id)
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Отгрузка не найдена')
    return shipment


@router.get('', response_model=list[ShipmentResponse])
async def list_shipments(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    crop_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[ShipmentResponse]:
    query = select(Shipment)

    if from_date is not None:
        query = query.where(Shipment.date >= from_date)
    if to_date is not None:
        query = query.where(Shipment.date <= to_date)
    if crop_type is not None:
        query = query.where(Shipment.crop_type == crop_type)

    query = query.order_by(Shipment.date.desc(), Shipment.created_at.desc())
    result = await db.execute(query)
    return [shipment_to_response(shipment) for shipment in result.scalars().all()]


@router.get('/{shipment_id}', response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> ShipmentResponse:
    shipment = await get_shipment_or_404(db, shipment_id)
    return shipment_to_response(shipment)


@router.post('', response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> ShipmentResponse:
    shipment = Shipment(
        date=payload.date,
        crop_type=payload.crop_type,
        quantity_kg=payload.quantity_kg,
        destination=payload.destination,
        price_per_kg=payload.price_per_kg,
        notes=payload.notes,
        created_by=current.id,
    )
    db.add(shipment)
    await db.commit()
    await db.refresh(shipment)
    clear_dashboard_cache()
    return shipment_to_response(shipment)


@router.patch('/{shipment_id}', response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: UUID,
    payload: ShipmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> ShipmentResponse:
    shipment = await get_shipment_or_404(db, shipment_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shipment, field, value)

    db.add(shipment)
    await db.commit()
    await db.refresh(shipment)
    clear_dashboard_cache()
    return shipment_to_response(shipment)


@router.delete('/{shipment_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    shipment = await get_shipment_or_404(db, shipment_id)
    await db.delete(shipment)
    await db.commit()
    clear_dashboard_cache()

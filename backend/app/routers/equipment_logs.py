from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin, require_manager
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.equipment_log import EquipmentMeterLog
from app.models.reference import Equipment
from app.schemas.equipment_log import MeterLogCreate, MeterLogResponse
from app.services.equipment_meters import (
    add_equipment_meter_log,
    meter_log_load_options,
    meter_log_to_response,
    recalculate_equipment_meter,
)

router = APIRouter()


async def _get_equipment_or_404(
    db: AsyncSession, equipment_id: UUID, org_id: UUID
) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None or equipment.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Техника не найдена')
    return equipment


@router.get('/{id}/meter-logs', response_model=list[MeterLogResponse])
async def list_meter_logs(
    request: Request,
    id: UUID,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> list[MeterLogResponse]:
    await _get_equipment_or_404(db, id, get_org_id(request))

    query = (
        select(EquipmentMeterLog)
        .options(*meter_log_load_options())
        .where(EquipmentMeterLog.equipment_id == id)
    )
    if from_date is not None:
        query = query.where(EquipmentMeterLog.date >= from_date)
    if to_date is not None:
        query = query.where(EquipmentMeterLog.date <= to_date)

    query = query.order_by(
        EquipmentMeterLog.date.desc(),
        EquipmentMeterLog.created_at.desc(),
    ).limit(limit)

    result = await db.execute(query)
    return [MeterLogResponse(**meter_log_to_response(log)) for log in result.scalars().all()]


@router.post(
    '/{id}/meter-logs',
    response_model=MeterLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_meter_log(
    request: Request,
    id: UUID,
    payload: MeterLogCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_manager),
) -> MeterLogResponse:
    await _get_equipment_or_404(db, id, get_org_id(request))

    try:
        log = await add_equipment_meter_log(
            db,
            equipment_id=id,
            value_added=payload.value_added,
            log_date=payload.date,
            note=payload.note,
            created_by=current.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await db.commit()

    result = await db.execute(
        select(EquipmentMeterLog)
        .options(*meter_log_load_options())
        .where(EquipmentMeterLog.id == log.id)
    )
    return MeterLogResponse(**meter_log_to_response(result.scalar_one()))


@router.delete('/{id}/meter-logs/{log_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_meter_log(
    request: Request,
    id: UUID,
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> None:
    await _get_equipment_or_404(db, id, get_org_id(request))

    result = await db.execute(
        select(EquipmentMeterLog).where(
            EquipmentMeterLog.id == log_id,
            EquipmentMeterLog.equipment_id == id,
        )
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Запись не найдена')

    await db.delete(log)
    await db.flush()
    await recalculate_equipment_meter(db, id)
    await db.commit()

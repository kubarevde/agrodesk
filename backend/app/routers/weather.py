from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.weather import FieldWeatherDayResponse, FieldWeatherMonthResponse
from app.services.weather import get_field_day_weather, get_field_month_weather

router = APIRouter()


@router.get('/month', response_model=FieldWeatherMonthResponse)
async def weather_for_month(
    request: Request,
    field_id: UUID | None = Query(None, alias='fieldId'),
    month: str | None = Query(
        None,
        description='YYYY-MM; defaults to current month',
        pattern=r'^\d{4}-\d{2}$',
    ),
    force_refresh: bool = Query(False, alias='forceRefresh'),
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
) -> FieldWeatherMonthResponse:
    """Daily weather for a field's stored coordinates (not browser geolocation)."""
    if month:
        year_s, month_s = month.split('-')
        year, month_i = int(year_s), int(month_s)
    else:
        today = date.today()
        year, month_i = today.year, today.month

    payload = await get_field_month_weather(
        db,
        get_org_id(request),
        field_id=field_id,
        year=year,
        month=month_i,
        force_refresh=force_refresh,
    )
    return FieldWeatherMonthResponse.model_validate(payload)


@router.get('/day', response_model=FieldWeatherDayResponse)
async def weather_for_day(
    request: Request,
    day: str = Query(..., description='YYYY-MM-DD', pattern=r'^\d{4}-\d{2}-\d{2}$'),
    field_id: UUID | None = Query(None, alias='fieldId'),
    force_refresh: bool = Query(False, alias='forceRefresh'),
    _: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
) -> FieldWeatherDayResponse:
    """Per-source morning / midday / evening forecast for one day (not averaged)."""
    try:
        target = date.fromisoformat(day)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Invalid date',
        ) from exc

    payload = await get_field_day_weather(
        db,
        get_org_id(request),
        field_id=field_id,
        day=target,
        force_refresh=force_refresh,
    )
    return FieldWeatherDayResponse.model_validate(payload)

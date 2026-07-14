from datetime import date as date_type, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.shift import ShiftStatus


class ShiftCreate(BaseModel):
    employee_id: UUID | None = None
    location_id: UUID
    work_type_id: UUID
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ShiftClose(BaseModel):
    description: str = Field(min_length=5)
    comment: str | None = None


class ShiftManualAdd(BaseModel):
    employee_id: UUID
    date: date_type
    start_time: time
    end_time: time
    location_id: UUID
    work_type_id: UUID
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    description: str | None = None
    comment: str | None = None


class ShiftUpdate(BaseModel):
    employee_id: UUID | None = None
    date: date_type | None = None
    start_time: time | None = None
    end_time: time | None = None
    location_id: UUID | None = None
    work_type_id: UUID | None = None
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    description: str | None = None
    comment: str | None = None
    status: ShiftStatus | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: date_type
    employee_id: UUID
    employee_name: str
    employee_code: str
    start_time: time
    end_time: time | None = None
    work_type: str
    location: str
    equipment: str | None = None
    equipment_id: UUID | None = None
    equipment_meter_type: str | None = None
    equipment_meter_label: str | None = None
    field_id: UUID | None = None
    field_name: str | None = None
    implement_id: UUID | None = None
    implement_name: str | None = None
    description: str | None = None
    comment: str | None = None
    status: str
    duration_raw: int | None = None
    duration_rounded: Decimal | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None

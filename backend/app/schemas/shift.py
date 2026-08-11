from datetime import date as date_type, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.shift import ShiftStatus
from app.services.salary import PIECEWORK_UNITS


class ShiftCreate(BaseModel):
    employee_id: UUID | None = None
    location_id: UUID
    work_type_id: UUID
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    agro_plan_id: UUID | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ShiftClose(BaseModel):
    description: str = Field(min_length=5)
    comment: str | None = None
    # Required only when the employee is on piecework for this shift's work type.
    quantity: Decimal | None = Field(default=None, gt=0)
    unit: str | None = None

    @model_validator(mode='after')
    def piecework_fields_pair(self) -> ShiftClose:
        has_qty = self.quantity is not None
        has_unit = bool(self.unit)
        if has_qty != has_unit:
            raise ValueError('Для сдельной выработки укажите и объём, и единицу измерения')
        if self.unit is not None and self.unit not in PIECEWORK_UNITS:
            allowed = ', '.join(sorted(PIECEWORK_UNITS))
            raise ValueError(f'Недопустимая единица «{self.unit}». Допустимо: {allowed}')
        return self


class ShiftManualAdd(BaseModel):
    employee_id: UUID
    date: date_type
    start_time: time
    end_time: time
    end_date: date_type | None = None
    location_id: UUID
    work_type_id: UUID
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    agro_plan_id: UUID | None = None
    description: str | None = None
    comment: str | None = None


class ShiftUpdate(BaseModel):
    employee_id: UUID | None = None
    date: date_type | None = None
    start_time: time | None = None
    end_time: time | None = None
    end_date: date_type | None = None
    location_id: UUID | None = None
    work_type_id: UUID | None = None
    equipment_id: UUID | None = None
    field_id: UUID | None = None
    implement_id: UUID | None = None
    agro_plan_id: UUID | None = None
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
    end_date: date_type | None = None
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
    agro_plan_id: UUID | None = None
    description: str | None = None
    comment: str | None = None
    status: str
    duration_raw: int | None = None
    duration_rounded: Decimal | None = None
    calculated_amount: Decimal | None = None
    rate_snapshot: dict | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    time_adjusted: bool = False

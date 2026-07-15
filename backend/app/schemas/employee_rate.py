from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EmployeeRateCreate(BaseModel):
    employee_id: UUID
    work_type_id: UUID | None = None
    rate: Decimal = Field(ge=0)
    overtime_multiplier: Decimal = Field(default=Decimal('1.0'), ge=0)
    overtime_threshold_hours: Decimal = Field(default=Decimal('8.0'), ge=0)
    valid_from: date_type
    valid_to: date_type | None = None
    notes: str | None = None


class EmployeeRateUpdate(BaseModel):
    work_type_id: UUID | None = None
    rate: Decimal | None = Field(default=None, ge=0)
    overtime_multiplier: Decimal | None = Field(default=None, ge=0)
    overtime_threshold_hours: Decimal | None = Field(default=None, ge=0)
    valid_from: date_type | None = None
    valid_to: date_type | None = None
    notes: str | None = None


class EmployeeRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    employee_name: str
    work_type_id: UUID | None
    work_type_name: str | None
    rate: Decimal
    overtime_multiplier: Decimal
    overtime_threshold_hours: Decimal
    valid_from: date_type
    valid_to: date_type | None
    notes: str | None = None


class RatePreviewResponse(BaseModel):
    total: float
    source: str
    breakdown: dict

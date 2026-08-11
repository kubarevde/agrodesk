from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.salary import PIECEWORK_UNITS


class PieceworkRecordCreate(BaseModel):
    employee_id: UUID
    work_type_id: UUID
    quantity: Decimal = Field(gt=0)
    unit: str
    date: date_type
    shift_id: UUID | None = None

    @field_validator('unit')
    @classmethod
    def unit_must_be_allowed(cls, value: str) -> str:
        if value not in PIECEWORK_UNITS:
            allowed = ', '.join(sorted(PIECEWORK_UNITS))
            raise ValueError(f'Недопустимая единица «{value}». Допустимо: {allowed}')
        return value


class PieceworkRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    shift_id: UUID | None = None
    work_type_id: UUID
    quantity: Decimal
    unit: str
    date: date_type
    rate_applied: Decimal
    calculated_amount: Decimal


class ShiftPaySchemeResponse(BaseModel):
    """Lightweight scheme lookup for CloseShiftModal (Prompt #2)."""

    payment_scheme: str
    piecework_unit: str | None = None
    rate: Decimal | None = None
    source: str
    units: list[str] = Field(default_factory=lambda: sorted(PIECEWORK_UNITS))

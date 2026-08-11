from __future__ import annotations

from datetime import date as date_type
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.salary import PIECEWORK_UNITS

PaymentSchemeLiteral = Literal['hourly', 'per_shift', 'monthly', 'piecework']


def validate_rate_scheme_fields(
    *,
    payment_scheme: str,
    work_type_id: UUID | None,
    piecework_unit: str | None,
) -> None:
    """Shared rules for create/update of employee rates (Prompt #1)."""
    if payment_scheme not in ('hourly', 'per_shift', 'monthly', 'piecework'):
        raise ValueError(
            f'Неизвестная схема оплаты «{payment_scheme}». '
            'Допустимо: hourly, per_shift, monthly, piecework'
        )
    if payment_scheme in ('per_shift', 'monthly') and work_type_id is not None:
        raise ValueError(
            'Для схем «за смену» и «оклад» вид работы не указывается '
            '(work_type_id должен быть пустым)'
        )
    if payment_scheme == 'piecework':
        if not piecework_unit:
            raise ValueError('Для сдельной схемы укажите единицу измерения (piecework_unit)')
        if piecework_unit not in PIECEWORK_UNITS:
            allowed = ', '.join(sorted(PIECEWORK_UNITS))
            raise ValueError(
                f'Недопустимая единица «{piecework_unit}». Допустимо: {allowed}'
            )
    elif piecework_unit is not None:
        raise ValueError(
            'Единица измерения задаётся только для сдельной схемы (piecework)'
        )


class EmployeeRateCreate(BaseModel):
    employee_id: UUID
    work_type_id: UUID | None = None
    payment_scheme: PaymentSchemeLiteral = 'hourly'
    piecework_unit: str | None = None
    rate: Decimal = Field(ge=0)
    overtime_multiplier: Decimal = Field(default=Decimal('1.0'), ge=0)
    overtime_threshold_hours: Decimal = Field(default=Decimal('8.0'), ge=0)
    valid_from: date_type
    valid_to: date_type | None = None
    notes: str | None = None

    @model_validator(mode='after')
    def check_scheme_fields(self) -> EmployeeRateCreate:
        validate_rate_scheme_fields(
            payment_scheme=self.payment_scheme,
            work_type_id=self.work_type_id,
            piecework_unit=self.piecework_unit,
        )
        return self


class EmployeeRateUpdate(BaseModel):
    work_type_id: UUID | None = None
    payment_scheme: PaymentSchemeLiteral | None = None
    piecework_unit: str | None = None
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
    payment_scheme: PaymentSchemeLiteral
    piecework_unit: str | None = None
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

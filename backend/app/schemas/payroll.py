from __future__ import annotations

from datetime import date as date_type, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

AdjustmentType = Literal['bonus', 'penalty', 'deduction', 'other']
PayrollStatus = Literal['draft', 'confirmed', 'paid']
PaymentScheme = Literal['hourly', 'per_shift', 'monthly', 'piecework']
PayoutStatus = Literal['unpaid', 'partially_paid', 'paid']
PayoutMethod = Literal['cash', 'bank_transfer', 'card', 'other']
PayoutKind = Literal['advance', 'salary_payment']


class PayrollRunCreate(BaseModel):
    period_start: date_type
    period_end: date_type

    @model_validator(mode='after')
    def check_period(self) -> PayrollRunCreate:
        if self.period_end < self.period_start:
            raise ValueError('period_end не может быть раньше period_start')
        return self


class PayrollAdjustmentCreate(BaseModel):
    type: AdjustmentType
    amount: Decimal = Field(ge=0)
    # Required for type=other; ignored (overridden) for bonus/penalty/deduction.
    sign: Literal[-1, 1] | None = None
    comment: str | None = None

    @model_validator(mode='after')
    def check_fields(self) -> PayrollAdjustmentCreate:
        if self.type == 'other':
            if self.sign not in (-1, 1):
                raise ValueError('Для типа other укажите sign: 1 или -1')
            if not (self.comment and self.comment.strip()):
                raise ValueError('Для типа other комментарий обязателен')
        return self


class PayrollAdjustmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payroll_run_line_id: UUID
    type: AdjustmentType
    amount: Decimal
    sign: int
    comment: str | None = None
    created_by: UUID | None = None
    created_at: datetime


class PayrollRunLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payroll_run_id: UUID
    employee_id: UUID
    employee_name: str = ''
    employee_code: str = ''
    payment_scheme: PaymentScheme
    base_calculated_amount: Decimal
    adjustments_total: Decimal
    total_amount: Decimal
    source_breakdown: dict
    payout_status: PayoutStatus
    amount_paid: Decimal = Decimal('0')
    amount_advance: Decimal = Decimal('0')
    amount_salary_paid: Decimal = Decimal('0')
    remainder_amount: Decimal = Decimal('0')
    remainder_closed: bool = False
    remainder_close_comment: str | None = None
    paid_exceeds_accrued: bool = False
    adjustments: list[PayrollAdjustmentResponse] = Field(default_factory=list)


class PayrollPayoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    payroll_run_line_id: UUID | None = None
    employee_id: UUID
    employee_name: str = ''
    employee_code: str = ''
    amount_paid: Decimal
    payout_method: PayoutMethod
    payout_kind: PayoutKind = 'salary_payment'
    payout_date: date_type
    confirmed_by: UUID | None = None
    comment: str | None = None
    advance_period_hint: str | None = None
    created_at: datetime


class PayrollPayoutCreate(BaseModel):
    amount_paid: Decimal = Field(gt=0)
    payout_method: PayoutMethod
    payout_date: date_type
    comment: str | None = None

    @model_validator(mode='after')
    def check_comment(self) -> PayrollPayoutCreate:
        if self.payout_method == 'other' and not (self.comment and self.comment.strip()):
            raise ValueError('Для способа оплаты «другое» комментарий обязателен')
        return self


class PayrollAdvanceCreate(BaseModel):
    employee_id: UUID
    amount_paid: Decimal = Field(gt=0)
    payout_method: PayoutMethod
    payout_date: date_type
    comment: str
    advance_period_hint: str | None = None

    @model_validator(mode='after')
    def check_comment(self) -> PayrollAdvanceCreate:
        if not (self.comment and self.comment.strip()):
            raise ValueError('Для аванса без привязки комментарий обязателен')
        if self.payout_method == 'other' and not self.comment.strip():
            raise ValueError('Для способа оплаты «другое» комментарий обязателен')
        return self


class PayrollAdvanceOnRunCreate(BaseModel):
    """Advance issued from a payroll run card (draft/confirmed)."""

    employee_id: UUID
    amount_paid: Decimal = Field(gt=0)
    payout_method: PayoutMethod
    payout_date: date_type
    comment: str | None = None

    @model_validator(mode='after')
    def check_comment(self) -> PayrollAdvanceOnRunCreate:
        if self.payout_method == 'other' and not (self.comment and self.comment.strip()):
            raise ValueError('Для способа оплаты «другое» комментарий обязателен')
        return self


class PayrollPayoutLinkRequest(BaseModel):
    payroll_run_line_id: UUID


class CloseRemainderRequest(BaseModel):
    comment: str = Field(min_length=1)

    @model_validator(mode='after')
    def check_comment(self) -> CloseRemainderRequest:
        if not self.comment.strip():
            raise ValueError('Комментарий обязателен')
        return self


class PayrollRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    period_start: date_type
    period_end: date_type
    status: PayrollStatus
    created_by: UUID | None = None
    created_at: datetime
    confirmed_by: UUID | None = None
    confirmed_at: datetime | None = None
    lines: list[PayrollRunLineResponse] = Field(default_factory=list)
    lines_count: int = 0
    total_amount: Decimal = Decimal('0')
    total_paid: Decimal = Decimal('0')
    remainder_amount: Decimal = Decimal('0')
    paid_exceeds_accrued: bool = False
    # Suggested unlinked advances after draft create / on demand.
    unlinked_advances: list[PayrollPayoutResponse] = Field(default_factory=list)


class PayoutSheetLineResponse(BaseModel):
    line_id: UUID
    employee_id: UUID
    employee_name: str
    employee_code: str
    payment_scheme: PaymentScheme
    total_amount: Decimal
    amount_paid: Decimal
    remainder_amount: Decimal
    payout_status: PayoutStatus
    remainder_closed: bool = False
    remainder_close_comment: str | None = None
    payouts: list[PayrollPayoutResponse] = Field(default_factory=list)


class PayoutSheetResponse(BaseModel):
    run_id: UUID
    period_start: date_type
    period_end: date_type
    status: PayrollStatus
    lines: list[PayoutSheetLineResponse] = Field(default_factory=list)

import enum
from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentMethod(str, enum.Enum):
    cash = 'cash'
    transfer = 'transfer'
    invoice = 'invoice'


class IncomeCreate(BaseModel):
    date: date_type
    category: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=2)
    counterparty: str | None = Field(default=None, max_length=200)
    payment_method: PaymentMethod | None = None
    crop_code: str | None = Field(default=None, max_length=80)
    variety_id: UUID | None = None


class IncomeUpdate(BaseModel):
    date: date_type | None = None
    category: str | None = Field(default=None, min_length=1, max_length=80)
    amount: Decimal | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=2)
    counterparty: str | None = Field(default=None, max_length=200)
    payment_method: PaymentMethod | None = None
    crop_code: str | None = Field(default=None, max_length=80)
    variety_id: UUID | None = None
    clear_variety: bool = False


class IncomeResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    date: date_type
    category: str
    amount: Decimal
    description: str
    counterparty: str | None = None
    payment_method: str | None = None
    crop_code: str | None = None
    variety_id: UUID | None = None
    variety_name: str | None = None

import enum
from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentMethod(str, enum.Enum):
    cash = 'cash'
    transfer = 'transfer'
    invoice = 'invoice'


class ExpenseCreate(BaseModel):
    date: date_type
    # Dictionary code from org_dictionaries (type=expense_category), e.g. fuel
    category: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=2)
    supplier: str | None = Field(default=None, max_length=200)
    payment_method: PaymentMethod | None = None
    equipment_id: UUID | None = None


class ExpenseUpdate(BaseModel):
    date: date_type | None = None
    category: str | None = Field(default=None, min_length=1, max_length=80)
    amount: Decimal | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=2)
    supplier: str | None = Field(default=None, max_length=200)
    payment_method: PaymentMethod | None = None
    equipment_id: UUID | None = None


class ExpenseResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    date: date_type
    category: str
    amount: Decimal
    description: str
    supplier: str | None = None
    payment_method: str | None = None
    equipment_id: UUID | None = None
    equipment_name: str | None = None

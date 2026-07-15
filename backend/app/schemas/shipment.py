from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ShipmentCreate(BaseModel):
    date: date_type
    crop_type: str = Field(min_length=1, max_length=100)
    quantity_kg: Decimal = Field(gt=0)
    destination: str | None = Field(default=None, max_length=200)
    price_per_kg: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None


class ShipmentUpdate(BaseModel):
    date: date_type | None = None
    crop_type: str | None = Field(default=None, min_length=1, max_length=100)
    quantity_kg: Decimal | None = Field(default=None, gt=0)
    destination: str | None = Field(default=None, max_length=200)
    price_per_kg: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None


class ShipmentResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    date: date_type
    crop_type: str
    quantity_kg: Decimal
    destination: str | None = None
    price_per_kg: Decimal | None = None
    notes: str | None = None
    total_sum: Decimal | None = None

from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TmcShipmentCreate(BaseModel):
    date: date_type
    inventory_item_id: UUID
    quantity: Decimal = Field(gt=0)
    destination: str | None = Field(default=None, max_length=200)
    price_per_unit: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None
    shipment_request_id: UUID | None = None


class TmcShipmentUpdate(BaseModel):
    date: date_type | None = None
    inventory_item_id: UUID | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    destination: str | None = Field(default=None, max_length=200)
    price_per_unit: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None
    shipment_request_id: UUID | None = None


class TmcShipmentResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    date: date_type
    inventory_item_id: UUID
    item_name: str
    category: str
    unit: str
    quantity: Decimal
    destination: str | None = None
    price_per_unit: Decimal | None = None
    notes: str | None = None
    total_sum: Decimal | None = None
    shipment_request_id: UUID | None = None

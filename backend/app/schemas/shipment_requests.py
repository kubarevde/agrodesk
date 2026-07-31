"""Pydantic schemas for shipment requests (ТМЦ outbound intents)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ShipmentRequestCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    inventory_item_id: UUID
    quantity: Decimal = Field(gt=0)
    price: Decimal = Field(ge=0)
    planned_at: datetime
    priority: str = Field(default='normal', pattern='^(normal|urgent)$')
    assigned_to: UUID | None = None


class ShipmentRequestUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=200)
    quantity: Decimal | None = Field(default=None, gt=0)
    price: Decimal | None = Field(default=None, ge=0)
    planned_at: datetime | None = None
    priority: str | None = Field(default=None, pattern='^(normal|urgent)$')


class ShipmentRequestAssign(BaseModel):
    assigned_to: UUID


class ShipmentRequestComplete(BaseModel):
    """Optional photo URLs (from /api/uploads/image) attached on complete."""

    image_urls: list[str] = Field(default_factory=list, max_length=5)


class ShipmentRequestCancel(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


class ShipmentRequestAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    image_url: str
    filename: str
    uploaded_by: UUID
    created_at: datetime


class ShipmentRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    inventory_item_id: UUID
    inventory_item_name: str | None = None
    inventory_item_unit: str | None = None
    inventory_item_category: str | None = None
    crop_code: str | None = None
    is_harvest: bool = False
    kind: str = 'inventory'
    customer_name: str
    quantity: Decimal
    price: Decimal
    planned_at: datetime
    priority: str
    status: str
    created_by: UUID
    created_by_name: str | None = None
    assigned_to: UUID | None = None
    assigned_to_name: str | None = None
    completed_at: datetime | None = None
    shift_id: UUID | None = None
    inventory_operation_id: UUID | None = None
    cancel_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    attachments: list[ShipmentRequestAttachmentOut] = Field(default_factory=list)

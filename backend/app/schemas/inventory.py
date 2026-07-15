from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.inventory import InventoryCategory, InventoryOperationType


class InventoryItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: InventoryCategory
    unit: str = Field(min_length=1, max_length=50)
    current_stock: Decimal = Field(default=Decimal('0'), ge=0)
    min_stock: Decimal = Field(default=Decimal('0'), ge=0)
    total_capacity: Decimal | None = Field(default=None, ge=0)


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: InventoryCategory | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    min_stock: Decimal | None = Field(default=None, ge=0)
    total_capacity: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None


class InventoryItemResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    name: str
    category: str
    unit: str
    current_stock: Decimal
    min_stock: Decimal
    total_capacity: Decimal
    is_active: bool
    is_critical: bool


class InventoryOperationCreate(BaseModel):
    item_id: UUID
    type: InventoryOperationType
    quantity: Decimal = Field(gt=0)
    reason: str | None = None
    supplier: str | None = Field(default=None, max_length=200)
    cost: Decimal | None = Field(default=None, ge=0)
    date: date_type | None = None
    equipment_id: UUID | None = None
    purpose: str = Field(default='general', max_length=30)


class EquipmentStockAction(BaseModel):
    """Refuel or install material from stock onto equipment."""

    item_id: UUID
    quantity: Decimal = Field(gt=0)
    date: date_type | None = None
    comment: str | None = Field(default=None, max_length=500)
    purpose: str = Field(description='refuel | install')


class InventoryOperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: date_type
    item_id: UUID
    item_name: str
    type: str
    quantity: Decimal
    stock_after: Decimal
    reason: str | None = None
    supplier: str | None = None
    cost: Decimal | None = None
    created_by: UUID | None = None
    equipment_id: UUID | None = None
    purpose: str = 'general'
    equipment_name: str | None = None

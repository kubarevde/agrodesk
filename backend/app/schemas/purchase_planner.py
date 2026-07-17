"""Purchase planner schemas with category ↔ FK validation."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

PurchaseCategory = Literal['equipment', 'implement', 'inventory_item', 'general']
PurchaseUrgency = Literal['urgent', 'normal', 'low']
PurchaseStatus = Literal['planned', 'purchased', 'cancelled']


class PurchasePlannerCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    category: PurchaseCategory = 'general'
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    inventory_item_id: UUID | None = None
    urgency: PurchaseUrgency = 'normal'
    status: PurchaseStatus = 'planned'
    purchase_place: str | None = Field(default=None, max_length=200)
    responsible_id: UUID | None = None
    estimated_cost: float | None = Field(default=None, ge=0)
    notes: str | None = None
    maintenance_id: UUID | None = None
    maintenance_checklist_item_id: UUID | None = None

    @model_validator(mode='after')
    def validate_category_refs(self) -> 'PurchasePlannerCreate':
        return _validate_category_refs(self)


class PurchasePlannerUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    category: PurchaseCategory | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    inventory_item_id: UUID | None = None
    urgency: PurchaseUrgency | None = None
    status: PurchaseStatus | None = None
    purchase_place: str | None = Field(default=None, max_length=200)
    responsible_id: UUID | None = None
    estimated_cost: float | None = Field(default=None, ge=0)
    actual_cost: float | None = Field(default=None, ge=0)
    notes: str | None = None
    create_expense: bool = False
    expense_category: str | None = Field(default=None, max_length=80)

    @model_validator(mode='after')
    def validate_category_refs_if_set(self) -> 'PurchasePlannerUpdate':
        # Only validate when category or any ref is being changed together
        if self.category is None and all(
            getattr(self, f) is None
            for f in ('equipment_id', 'implement_id', 'inventory_item_id')
        ):
            return self
        # Partial updates that only touch status/cost skip full category check
        if self.category is None:
            return self
        return _validate_category_refs(self)


class PurchasePlannerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    title: str
    category: str
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    inventory_item_id: UUID | None = None
    equipment_name: str | None = None
    implement_name: str | None = None
    inventory_item_name: str | None = None
    linked_label: str | None = None
    urgency: str
    status: str
    purchase_place: str | None = None
    responsible_id: UUID | None = None
    responsible_name: str | None = None
    estimated_cost: float | None = None
    actual_cost: float | None = None
    expense_id: UUID | None = None
    maintenance_id: UUID | None = None
    maintenance_checklist_item_id: UUID | None = None
    maintenance_asset_label: str | None = None
    notes: str | None = None
    created_by: UUID | None = None
    created_at: datetime | None = None
    purchased_at: datetime | None = None


def _validate_category_refs(obj: PurchasePlannerCreate | PurchasePlannerUpdate):
    category = obj.category
    eq = obj.equipment_id
    impl = obj.implement_id
    inv = obj.inventory_item_id
    if category == 'equipment':
        if eq is None:
            raise ValueError('Для категории «Техника» укажите equipment_id')
        if impl is not None or inv is not None:
            raise ValueError('Для категории «Техника» нельзя указывать другие привязки')
    elif category == 'implement':
        if impl is None:
            raise ValueError('Для категории «Приспособление» укажите implement_id')
        if eq is not None or inv is not None:
            raise ValueError('Для категории «Приспособление» нельзя указывать другие привязки')
    elif category == 'inventory_item':
        if inv is None:
            raise ValueError('Для категории «ТМЦ» укажите inventory_item_id')
        if eq is not None or impl is not None:
            raise ValueError('Для категории «ТМЦ» нельзя указывать другие привязки')
    elif category == 'general':
        if eq is not None or impl is not None or inv is not None:
            raise ValueError('Для категории «Общее» привязки должны быть пустыми')
    return obj

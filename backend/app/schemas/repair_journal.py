"""Schemas for repair journal (extended equipment_maintenance)."""

from datetime import date as date_type
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


MaintenanceStatus = Literal['in_progress', 'waiting_parts', 'done']
MaintenancePriority = Literal['urgent', 'normal', 'low']
ChecklistItemType = Literal['buy', 'repair']


class ChecklistItemCreate(BaseModel):
    item_type: ChecklistItemType
    description: str = Field(min_length=1, max_length=300)
    cost: float | None = Field(default=None, ge=0)
    is_done: bool = False


class ChecklistItemUpdate(BaseModel):
    item_type: ChecklistItemType | None = None
    description: str | None = Field(default=None, min_length=1, max_length=300)
    cost: float | None = Field(default=None, ge=0)
    is_done: bool | None = None


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    maintenance_id: UUID
    item_type: str
    description: str
    is_done: bool
    cost: float | None = None
    done_at: datetime | None = None
    created_at: datetime | None = None


class RepairJournalCreate(BaseModel):
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    date: date_type
    type: str = Field(default='Ремонт', min_length=1, max_length=100)
    description: str | None = None
    priority: MaintenancePriority = 'normal'
    meter_at: float | None = None
    cost: float | None = Field(default=None, ge=0)
    status: MaintenanceStatus = 'in_progress'
    checklist_items: list[ChecklistItemCreate] = Field(default_factory=list)

    @model_validator(mode='after')
    def require_asset(self) -> 'RepairJournalCreate':
        if self.equipment_id is None and self.implement_id is None:
            raise ValueError('Укажите технику или приспособление')
        return self


class RepairJournalUpdate(BaseModel):
    date: date_type | None = None
    type: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    priority: MaintenancePriority | None = None
    meter_at: float | None = None
    cost: float | None = Field(default=None, ge=0)
    status: MaintenanceStatus | None = None
    date_returned: date_type | None = None
    expense_id: UUID | None = None
    create_expense: bool = False


class RepairJournalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    equipment_name: str | None = None
    implement_name: str | None = None
    asset_label: str
    date: date_type
    type: str
    description: str | None = None
    status: str
    priority: str
    date_returned: date_type | None = None
    meter_at: float | None = None
    cost: float | None = None
    expense_id: UUID | None = None
    checklist_items: list[ChecklistItemResponse] = Field(default_factory=list)
    checklist_done: int = 0
    checklist_total: int = 0
    created_at: datetime | None = None


class ActiveRepairsCountResponse(BaseModel):
    count: int
    items: list[RepairJournalResponse] = Field(default_factory=list)

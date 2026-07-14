from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MaintenanceCreate(BaseModel):
    date: date_type
    type: str = Field(min_length=1, max_length=100)
    meter_at: float | None = None
    cost: float | None = Field(default=None, ge=0)
    description: str | None = None
    next_to_interval: float | None = Field(default=None, gt=0)


class MaintenanceUpdate(BaseModel):
    date: date_type | None = None
    type: str | None = Field(default=None, min_length=1, max_length=100)
    meter_at: float | None = None
    cost: float | None = Field(default=None, ge=0)
    description: str | None = None
    next_to_interval: float | None = Field(default=None, gt=0)


class MaintenanceResponse(MaintenanceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    equipment_id: UUID
    equipment_name: str
    meter_label: str
    expense_id: UUID | None = None

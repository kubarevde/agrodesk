from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.reference import MaintenanceSummary


class ImplementCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    serial_number: str | None = Field(default=None, max_length=100)
    year_of_manufacture: int | None = None
    # Legacy DB column — not required in UI; default kept for compatibility
    condition: str = 'good'
    description: str | None = None
    image_url: str | None = None
    current_equipment_id: UUID | None = None
    current_usage_hours: float = 0
    service_interval_hours: float | None = None


class ImplementUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=50)
    serial_number: str | None = Field(default=None, max_length=100)
    year_of_manufacture: int | None = None
    condition: str | None = None
    description: str | None = None
    image_url: str | None = None
    current_equipment_id: UUID | None = None
    is_active: bool | None = None
    current_usage_hours: float | None = None
    service_interval_hours: float | None = None


class ImplementAttach(BaseModel):
    equipment_id: UUID


class ImplementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID | None = None
    name: str
    category: str
    serial_number: str | None = None
    year_of_manufacture: int | None = None
    condition: str | None = None  # legacy; prefer maintenance
    description: str | None = None
    image_url: str | None = None
    current_equipment_id: UUID | None = None
    current_equipment_name: str | None = None
    sharing_status: str | None = None
    is_active: bool = True
    current_usage_hours: float = 0
    service_interval_hours: float | None = None
    next_service_hours: float | None = None
    last_service_date: date_type | None = None
    maintenance: MaintenanceSummary | None = None


class ImplementMaintenanceCreate(BaseModel):
    date: date_type
    type: str = Field(min_length=1, max_length=100)
    cost: float | None = Field(default=None, ge=0)
    description: str | None = None
    next_service_interval: float | None = Field(default=None, gt=0)


class ImplementMaintenanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    implement_id: UUID
    date: date_type
    type: str
    cost: float | None = None
    description: str | None = None
    expense_id: UUID | None = None

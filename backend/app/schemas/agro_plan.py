from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AgroPlanCreate(BaseModel):
    field_id: UUID
    work_type_id: UUID
    planned_date: date_type
    planned_end_date: date_type | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    employee_id: UUID | None = None
    notes: str | None = None


class AgroPlanUpdate(BaseModel):
    field_id: UUID | None = None
    work_type_id: UUID | None = None
    planned_date: date_type | None = None
    planned_end_date: date_type | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    employee_id: UUID | None = None
    notes: str | None = None
    status: str | None = Field(default=None, pattern='^(planned|in_progress|done|cancelled)$')


class AgroPlanResponse(AgroPlanCreate):
    id: UUID
    status: str
    field_name: str
    work_type_name: str
    equipment_name: str | None
    implement_name: str | None
    employee_name: str | None
    actual_shift_id: UUID | None

    model_config = ConfigDict(from_attributes=True)

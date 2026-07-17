from datetime import date as date_type
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _coerce_legacy_field_id(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    field_ids = data.get('field_ids')
    field_id = data.get('field_id')
    if (not field_ids) and field_id is not None:
        return {**data, 'field_ids': [field_id]}
    return data


class AgroPlanCreate(BaseModel):
    field_ids: list[UUID] = Field(min_length=1)
    work_type_id: UUID
    planned_date: date_type
    planned_end_date: date_type | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    employee_id: UUID | None = None
    notes: str | None = None

    @model_validator(mode='before')
    @classmethod
    def accept_legacy_field_id(cls, data: Any) -> Any:
        return _coerce_legacy_field_id(data)


class AgroPlanUpdate(BaseModel):
    field_ids: list[UUID] | None = Field(default=None, min_length=1)
    work_type_id: UUID | None = None
    planned_date: date_type | None = None
    planned_end_date: date_type | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    employee_id: UUID | None = None
    notes: str | None = None
    status: str | None = Field(default=None, pattern='^(planned|in_progress|done|cancelled)$')

    @model_validator(mode='before')
    @classmethod
    def accept_legacy_field_id(cls, data: Any) -> Any:
        return _coerce_legacy_field_id(data)


class AgroPlanResponse(BaseModel):
    id: UUID
    field_id: UUID
    field_name: str
    field_ids: list[UUID]
    field_names: list[str]
    work_type_id: UUID
    planned_date: date_type
    planned_end_date: date_type | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    employee_id: UUID | None = None
    notes: str | None = None
    status: str
    work_type_name: str
    equipment_name: str | None
    implement_name: str | None
    employee_name: str | None
    actual_shift_id: UUID | None

    model_config = ConfigDict(from_attributes=True)

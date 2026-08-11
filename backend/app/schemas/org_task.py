"""Pydantic schemas for organizational tasks (org_tasks)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

TaskStatus = Literal['active', 'completed', 'cancelled']
VisibilityType = Literal['all_employees', 'specific_employee']


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = Field(None, max_length=2000)
    visibility_type: VisibilityType = 'all_employees'
    assignee_id: UUID | None = None

    @field_validator('title')
    @classmethod
    def title_strip(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError('Название задачи должно быть не короче 3 символов')
        return cleaned

    @field_validator('description')
    @classmethod
    def description_strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode='after')
    def visibility_assignee(self) -> TaskCreate:
        if self.visibility_type == 'all_employees':
            self.assignee_id = None
        elif self.assignee_id is None:
            raise ValueError('Укажите сотрудника для персональной задачи')
        return self


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = Field(None, max_length=2000)
    visibility_type: VisibilityType | None = None
    assignee_id: UUID | None = None

    @field_validator('title')
    @classmethod
    def title_strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError('Название задачи должно быть не короче 3 символов')
        return cleaned

    @field_validator('description')
    @classmethod
    def description_strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class TaskCancelBody(BaseModel):
    cancellation_reason: str = Field(..., min_length=5, max_length=2000)

    @field_validator('cancellation_reason')
    @classmethod
    def reason_strip(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 5:
            raise ValueError('Укажите причину отмены (не менее 5 символов)')
        return cleaned


class TaskResponse(BaseModel):
    id: UUID
    org_id: UUID
    title: str
    description: str | None = None
    visibility_type: VisibilityType
    assignee_id: UUID | None = None
    assignee_name: str | None = None
    status: TaskStatus
    created_by: UUID | None = None
    created_by_name: str | None = None
    created_at: datetime
    completed_by: UUID | None = None
    completed_by_name: str | None = None
    completed_at: datetime | None = None
    cancelled_by: UUID | None = None
    cancelled_by_name: str | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None

    model_config = {'from_attributes': True}

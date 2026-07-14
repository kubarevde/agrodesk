from datetime import date as date_type
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MeterLogCreate(BaseModel):
    value_added: float = Field(gt=0, description='Прибавить к счётчику')
    date: date_type | None = None
    note: str | None = None


class MeterLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    equipment_id: UUID
    equipment_name: str
    shift_id: UUID | None
    shift_label: str | None
    date: date_type
    value_added: float
    meter_after: float
    meter_label: str
    source: Literal['manual', 'shift']
    note: str | None
    created_by_name: str | None = None

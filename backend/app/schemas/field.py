from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    crop_type: str | None = Field(default=None, max_length=100)
    crop_code: str | None = Field(default=None, max_length=80)
    area_ha: float | None = Field(default=None, ge=0)
    soil_type: str | None = Field(default=None, max_length=100)
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[list[float]] | None = None


class FieldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    crop_type: str | None = Field(default=None, max_length=100)
    crop_code: str | None = Field(default=None, max_length=80)
    area_ha: float | None = Field(default=None, ge=0)
    soil_type: str | None = Field(default=None, max_length=100)
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[list[float]] | None = None
    is_active: bool | None = None


class FieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    crop_type: str | None = None
    crop_code: str | None = None
    area_ha: float | None = None
    soil_type: str | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[list[float]] | None = None
    sharing_status: str | None = None
    is_active: bool = True


class FieldHarvestCreate(BaseModel):
    inventory_item_id: UUID
    quantity: float = Field(gt=0)
    date: date_type | None = None

    @field_validator('date')
    @classmethod
    def validate_date_not_future(cls, value: date_type | None) -> date_type | None:
        if value is not None and value > date_type.today():
            raise ValueError('Дата не может быть в будущем')
        return value

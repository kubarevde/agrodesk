from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    crop_type: str | None = Field(default=None, max_length=100)
    area_ha: float | None = Field(default=None, ge=0)
    soil_type: str | None = Field(default=None, max_length=100)
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[list[float]] | None = None


class FieldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    crop_type: str | None = Field(default=None, max_length=100)
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
    area_ha: float | None = None
    soil_type: str | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    polygon: list[list[float]] | None = None
    sharing_status: str | None = None
    is_active: bool = True

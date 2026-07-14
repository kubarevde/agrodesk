from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    is_active: bool


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    is_active: bool | None = None


class WorkTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: str | None = None
    is_active: bool


class WorkTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)


class WorkTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: str | None = None
    is_active: bool


class EquipmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str | None = Field(default=None, max_length=100)


class EquipmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None

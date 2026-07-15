from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class EquipmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str | None = Field(default=None, max_length=100)
    year_of_manufacture: int | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    meter_type: str = 'motohours'
    current_meter: float = 0
    to_interval: float | None = None
    next_to_at: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True

    @field_validator('meter_type')
    @classmethod
    def validate_meter_type(cls, value: str) -> str:
        allowed = {'motohours', 'km', 'shift_hours'}
        if value not in allowed:
            raise ValueError(f'meter_type must be one of: {", ".join(sorted(allowed))}')
        return value


class EquipmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = Field(default=None, max_length=100)
    year_of_manufacture: int | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    meter_type: str | None = None
    current_meter: float | None = None
    to_interval: float | None = None
    next_to_at: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    owner_id: UUID | None = None

    @field_validator('meter_type')
    @classmethod
    def validate_meter_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        allowed = {'motohours', 'km', 'shift_hours'}
        if value not in allowed:
            raise ValueError(f'meter_type must be one of: {", ".join(sorted(allowed))}')
        return value


class MaintenanceSummary(BaseModel):
    current_hours: float
    service_interval_hours: float | None = None
    next_service_hours: float | None = None
    hours_to_next_service: float | None = None
    progress_percent: float | None = None
    status: str


class EquipmentResponse(EquipmentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    image_url: str | None = None
    to_status: str
    meter_label: str
    maintenance: MaintenanceSummary | None = None

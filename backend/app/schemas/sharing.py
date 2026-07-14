from datetime import date as date_type
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SharingListingCreate(BaseModel):
    type: Literal['field', 'equipment', 'implement', 'parts']
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    price_per_unit: float | None = None
    price_unit: str | None = None
    field_id: UUID | None = None
    equipment_id: UUID | None = None
    implement_id: UUID | None = None
    region: str | None = None
    contact_info: str | None = None
    lat: float | None = None
    lng: float | None = None
    images: list[str] | None = None

    @model_validator(mode='after')
    def check_resource(self) -> 'SharingListingCreate':
        filled = sum([bool(self.field_id), bool(self.equipment_id), bool(self.implement_id)])
        if self.type != 'parts' and filled != 1:
            raise ValueError('Укажите ровно один ресурс: поле, технику или приспособление')
        return self


class SharingListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    price_per_unit: float | None = None
    price_unit: str | None = None
    region: str | None = None
    contact_info: str | None = None
    lat: float | None = None
    lng: float | None = None
    images: list[str] | None = None


class SharingListingStatusUpdate(BaseModel):
    status: Literal['active', 'paused', 'done']


class SharingListingResponse(SharingListingCreate):
    id: UUID
    status: str
    owner_id: UUID
    owner_name: str
    field_name: str | None
    equipment_name: str | None
    implement_name: str | None
    implement_category_label: str | None
    images: list[str]
    requests_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SharingRequestCreate(BaseModel):
    listing_id: UUID
    message: str | None = None
    desired_from: date_type | None = None
    desired_to: date_type | None = None


class SharingRequestStatusUpdate(BaseModel):
    status: Literal['accepted', 'rejected', 'done']
    owner_response: str | None = None


class SharingRequestResponse(SharingRequestCreate):
    id: UUID
    status: str
    requester_id: UUID
    requester_name: str
    owner_response: str | None
    listing_title: str
    listing_type: str
    listing_owner_name: str | None = None
    listing_contact_info: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

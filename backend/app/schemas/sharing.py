from datetime import date as date_type
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


SharingScope = Literal['full_field', 'partial_field']


class SharingListingCreate(BaseModel):
    type: Literal['field', 'equipment', 'implement']
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
    sharing_scope: SharingScope = 'full_field'
    shared_polygon: list[list[float]] | None = None

    @model_validator(mode='after')
    def check_resource(self) -> 'SharingListingCreate':
        filled = sum([bool(self.field_id), bool(self.equipment_id), bool(self.implement_id)])
        if filled != 1:
            raise ValueError('Укажите ровно один ресурс: поле, технику или приспособление')
        if self.type != 'field' and self.sharing_scope == 'partial_field':
            raise ValueError('Часть поля доступна только для объявлений типа «Поле»')
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
    sharing_scope: SharingScope | None = None
    shared_polygon: list[list[float]] | None = None


class SharingListingStatusUpdate(BaseModel):
    status: Literal['active', 'paused', 'done', 'archived']


class SharingListingResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    type: Literal['field', 'equipment', 'implement']
    title: str
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
    images: list[str]
    status: str
    owner_id: UUID
    owner_name: str
    field_name: str | None
    equipment_name: str | None
    implement_name: str | None
    implement_category_label: str | None
    requests_count: int
    created_at: datetime
    sharing_scope: SharingScope = 'full_field'
    shared_area_ha: float | None = None
    # Never expose source field polygon for partial listings — use these.
    effective_polygon: list[list[float]] | None = None
    effective_area_ha: float | None = None

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

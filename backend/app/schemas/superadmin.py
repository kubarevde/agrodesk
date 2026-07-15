from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SuperAdminLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str


class SuperAdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class SuperAdminSeedRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=4)


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=100, pattern=r'^[a-z0-9\-]+$')
    owner_email: str = Field(min_length=3, max_length=255)
    plan: str = 'trial'
    max_employees: int = Field(default=10, ge=1)
    trial_ends_at: date | None = None


class OrganizationUpdate(BaseModel):
    is_active: bool | None = None
    plan: str | None = None
    max_employees: int | None = Field(default=None, ge=1)
    trial_ends_at: date | None = None


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    plan: str
    is_active: bool
    owner_email: str | None = None
    created_at: datetime
    trial_ends_at: date | None = None
    max_employees: int
    employees_count: int = 0
    active_shifts_count: int = 0


class OrganizationCreateResponse(BaseModel):
    organization: OrganizationResponse
    admin_email: str
    temp_password: str


class SuperAdminStatsResponse(BaseModel):
    total_orgs: int
    active_orgs: int
    trial_orgs: int
    total_employees: int
    total_shifts_today: int

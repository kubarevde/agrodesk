from datetime import date, datetime
from typing import Literal
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
    # Platform toggle for seller cabinet / public vitrine (JSONB settings key).
    marketplace_enabled: bool | None = None


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
    marketplace_enabled: bool = False


class OrganizationCreateResponse(BaseModel):
    organization: OrganizationResponse
    admin_email: str
    temp_password: str


class SuperAdminAttentionItem(BaseModel):
    code: str
    severity: Literal['info', 'warning']
    count: int
    message: str


class SuperAdminStatsResponse(BaseModel):
    """Platform overview. Holding tenant metrics are NOT included here."""

    # Backward-compatible top cards
    total_orgs: int
    active_orgs: int
    trial_orgs: int
    total_employees: int
    total_shifts_today: int

    # Orgs / plans
    inactive_orgs: int = 0
    basic_orgs: int = 0
    pro_orgs: int = 0
    trials_expiring_soon: int = 0
    trials_expired_active: int = 0

    # Users / activity
    active_employees: int = 0
    open_shifts: int = 0
    open_shifts_today: int = 0

    # Support
    support_total: int = 0
    support_unread: int = 0
    support_new: int = 0
    support_in_progress: int = 0

    # Feature / hierarchy adoption (platform links — not holding KPI overlay)
    marketplace_orgs: int = 0
    hierarchy_links: int = 0
    hierarchy_heads: int = 0

    # Marketplace (isolated from core usage)
    listings_pending_review: int = 0
    listings_published: int = 0
    orders_new: int = 0

    attention: list[SuperAdminAttentionItem] = Field(default_factory=list)


class OrgHierarchyAttachRequest(BaseModel):
    child_org_id: UUID


class OrgHierarchyChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    head_org_id: UUID
    child_org_id: UUID
    child_name: str
    child_slug: str
    child_is_active: bool


class OrgHierarchyCandidateResponse(BaseModel):
    id: UUID
    name: str
    slug: str


class OrgHierarchyParentResponse(BaseModel):
    link_id: UUID
    head_org_id: UUID
    head_name: str
    head_slug: str
    head_is_active: bool

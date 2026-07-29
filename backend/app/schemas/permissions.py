from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.services.action_permissions import ACTION_KEYS, ACTION_LABELS
from app.services.permissions import SECTION_KEYS, SECTION_LABELS, default_role_permissions


class SectionInfo(BaseModel):
    key: str
    label: str


class ActionInfo(BaseModel):
    key: str
    label: str


class RolePermissionsResponse(BaseModel):
    sections: list[SectionInfo] = Field(
        default_factory=lambda: [
            SectionInfo(key=key, label=SECTION_LABELS[key]) for key in SECTION_KEYS
        ]
    )
    actions: list[ActionInfo] = Field(
        default_factory=lambda: [
            ActionInfo(key=key, label=ACTION_LABELS[key]) for key in ACTION_KEYS
        ]
    )
    permissions: dict[str, list[str]] = Field(default_factory=default_role_permissions)


class RolePermissionsUpdate(BaseModel):
    permissions: dict[str, list[str]]


class UserPermissionsResponse(BaseModel):
    role: str
    allowed_sections: list[str]
    actions: list[str] = Field(default_factory=list)
    access_group_id: str | None = None
    access_group_name: str | None = None


class AccessGroupMember(BaseModel):
    id: UUID
    full_name: str
    employee_code: str
    role: str


class AccessGroupResponse(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    is_system: bool = False
    sections: list[str]
    actions: list[str]
    member_count: int = 0
    members: list[AccessGroupMember] = Field(default_factory=list)


class AccessGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    sections: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    member_ids: list[UUID] = Field(default_factory=list)


class AccessGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    sections: list[str] | None = None
    actions: list[str] | None = None
    member_ids: list[UUID] | None = None


class AccessGroupCatalogResponse(BaseModel):
    sections: list[SectionInfo]
    actions: list[ActionInfo]
    groups: list[AccessGroupResponse]

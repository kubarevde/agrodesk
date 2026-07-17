from pydantic import BaseModel, Field

from app.services.permissions import SECTION_KEYS, SECTION_LABELS, default_role_permissions


class SectionInfo(BaseModel):
    key: str
    label: str


class RolePermissionsResponse(BaseModel):
    sections: list[SectionInfo] = Field(
        default_factory=lambda: [
            SectionInfo(key=key, label=SECTION_LABELS[key]) for key in SECTION_KEYS
        ]
    )
    permissions: dict[str, list[str]] = Field(default_factory=default_role_permissions)


class RolePermissionsUpdate(BaseModel):
    permissions: dict[str, list[str]]


class UserPermissionsResponse(BaseModel):
    role: str
    allowed_sections: list[str]

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_type_label: str
    entity_id: UUID
    action: str
    changed_by: UUID | None = None
    changed_by_name: str | None = None
    changed_at: datetime
    before_data: dict[str, Any] | None = None
    after_data: dict[str, Any] | None = None
    summary: str | None = None


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int = Field(ge=1, le=100)

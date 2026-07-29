from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SupportAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    file_url: str
    filename: str
    created_at: datetime


class SupportTicketMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_type: str
    author_name: str
    body: str
    created_at: datetime
    attachments: list[SupportAttachmentOut] = Field(default_factory=list)


class SupportTicketListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    org_name: str
    author_id: UUID
    author_role: str
    author_name: str
    category: str
    subject: str
    status: str
    priority: str
    assignee_superadmin_id: UUID | None = None
    assignee_email: str | None = None
    unread_for_user: bool
    unread_for_staff: bool
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    last_message_at: datetime | None = None
    last_message_preview: str | None = None


class SupportTicketDetail(SupportTicketListItem):
    messages: list[SupportTicketMessageOut] = Field(default_factory=list)


class SupportAttachmentIn(BaseModel):
    file_url: str = Field(min_length=1, max_length=500)
    filename: str = Field(min_length=1, max_length=255)


class SupportTicketCreate(BaseModel):
    category: str
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10, max_length=5000)
    priority: str = 'normal'
    attachments: list[SupportAttachmentIn] = Field(default_factory=list)


class SupportTicketMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    attachments: list[SupportAttachmentIn] = Field(default_factory=list)


class SupportTicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    assignee_superadmin_id: UUID | None = None
    assign_to_me: bool = False
    clear_assignee: bool = False


class SupportTicketStatusUpdate(SupportTicketUpdate):
    """Backward-compatible alias for PATCH payload."""


class SupportUnreadCount(BaseModel):
    count: int


class SupportReplyTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: str
    title: str
    body: str
    created_at: datetime
    updated_at: datetime


class SupportReplyTemplateCreate(BaseModel):
    category: str
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


class SupportReplyTemplateUpdate(BaseModel):
    category: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1, max_length=5000)

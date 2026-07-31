"""Pydantic schemas for internal org messenger."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: UUID
    full_name: str
    role: str
    joined_at: datetime


class ChatMessagePreview(BaseModel):
    id: UUID
    body: str
    sender_id: UUID
    sender_name: str
    created_at: datetime
    attachment_url: str | None = None


class ChatListItem(BaseModel):
    id: UUID
    type: str
    name: str | None = None
    title: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    members: list[ChatMemberOut] = Field(default_factory=list)
    last_message: ChatMessagePreview | None = None
    unread_count: int = 0


class ChatDetail(ChatListItem):
    pass


class DirectChatCreate(BaseModel):
    peer_employee_id: UUID


class MessengerPeerOut(BaseModel):
    """Lightweight org colleague for starting a direct chat (any authenticated employee)."""

    id: UUID
    full_name: str
    employee_code: str


class GroupChatCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    member_ids: list[UUID] = Field(default_factory=list)


class GroupChatUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    add_member_ids: list[UUID] = Field(default_factory=list)
    remove_member_ids: list[UUID] = Field(default_factory=list)


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    attachment_url: str | None = Field(default=None, max_length=500)


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    chat_id: UUID
    sender_id: UUID
    sender_name: str
    body: str
    attachment_url: str | None = None
    created_at: datetime
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    # Server-persisted = delivered; peer ChatMessageRead watermark covers msg = read.
    # Client may show local "pending" before the POST succeeds (not returned by API).
    delivery_status: str = 'delivered'


class ChatMessagesPage(BaseModel):
    items: list[ChatMessageOut]
    next_before: datetime | None = None
    next_before_id: UUID | None = None


class ChatReadUpdate(BaseModel):
    last_read_message_id: UUID | None = None


class ChatReadState(BaseModel):
    chat_id: UUID
    employee_id: UUID
    last_read_message_id: UUID | None = None
    updated_at: datetime

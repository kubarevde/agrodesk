"""Internal org messenger: direct and group chats."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ChatType(str, enum.Enum):
    direct = 'direct'
    group = 'group'


class ChatMemberRole(str, enum.Enum):
    owner = 'owner'
    member = 'member'


class Chat(Base):
    __tablename__ = 'chats'
    __table_args__ = (
        CheckConstraint("type IN ('direct', 'group')", name='chats_type_chk'),
        Index('ix_chats_org_id', 'org_id'),
        Index('ix_chats_org_updated', 'org_id', 'updated_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    type = Column(String(20), nullable=False)
    name = Column(String(200), nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='RESTRICT'),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    archived_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship('Organization')
    creator = relationship('Employee', foreign_keys=[created_by])
    members = relationship(
        'ChatMember',
        back_populates='chat',
        cascade='all, delete-orphan',
    )
    messages = relationship(
        'ChatMessage',
        back_populates='chat',
        cascade='all, delete-orphan',
        order_by='ChatMessage.created_at',
    )
    reads = relationship(
        'ChatMessageRead',
        back_populates='chat',
        cascade='all, delete-orphan',
    )


class ChatMember(Base):
    __tablename__ = 'chat_members'
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'member')", name='chat_members_role_chk'),
        Index('ix_chat_members_org_chat', 'org_id', 'chat_id'),
        Index('ix_chat_members_employee', 'employee_id'),
        # Active membership uniqueness is enforced in migration via partial unique index
        # (chat_id, employee_id) WHERE left_at IS NULL.
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    chat_id = Column(
        UUID(as_uuid=True),
        ForeignKey('chats.id', ondelete='CASCADE'),
        nullable=False,
    )
    employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='CASCADE'),
        nullable=False,
    )
    role = Column(String(20), nullable=False, default='member', server_default='member')
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    left_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship('Organization')
    chat = relationship('Chat', back_populates='members')
    employee = relationship('Employee', foreign_keys=[employee_id])


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    __table_args__ = (
        Index('ix_chat_messages_org_chat', 'org_id', 'chat_id'),
        Index('ix_chat_messages_chat_created', 'chat_id', 'created_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    chat_id = Column(
        UUID(as_uuid=True),
        ForeignKey('chats.id', ondelete='CASCADE'),
        nullable=False,
    )
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='RESTRICT'),
        nullable=False,
    )
    body = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship('Organization')
    chat = relationship('Chat', back_populates='messages')
    sender = relationship('Employee', foreign_keys=[sender_id])


class ChatMessageRead(Base):
    __tablename__ = 'chat_message_reads'
    __table_args__ = (
        Index('ix_chat_message_reads_org_chat', 'org_id', 'chat_id'),
    )

    chat_id = Column(
        UUID(as_uuid=True),
        ForeignKey('chats.id', ondelete='CASCADE'),
        primary_key=True,
        nullable=False,
    )
    employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='CASCADE'),
        primary_key=True,
        nullable=False,
    )
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    last_read_message_id = Column(
        UUID(as_uuid=True),
        ForeignKey('chat_messages.id', ondelete='SET NULL'),
        nullable=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organization = relationship('Organization')
    chat = relationship('Chat', back_populates='reads')
    employee = relationship('Employee', foreign_keys=[employee_id])
    last_read_message = relationship('ChatMessage', foreign_keys=[last_read_message_id])

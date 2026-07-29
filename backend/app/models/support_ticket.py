"""Platform support tickets (org users ↔ superadmin)."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SupportTicket(Base):
    __tablename__ = 'support_tickets'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    author_role = Column(String(20), nullable=False)
    author_name = Column(String(200), nullable=False)
    category = Column(String(40), nullable=False)
    subject = Column(String(200), nullable=False)
    status = Column(String(30), nullable=False, default='new')
    priority = Column(String(20), nullable=False, default='normal')
    assignee_superadmin_id = Column(
        UUID(as_uuid=True),
        ForeignKey('superadmin_users.id', ondelete='SET NULL'),
        nullable=True,
    )
    unread_for_user = Column(Boolean, nullable=False, default=False)
    unread_for_staff = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    closed_at = Column(DateTime(timezone=True), nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship('Organization')
    author = relationship('Employee')
    assignee = relationship('SuperAdminUser', foreign_keys=[assignee_superadmin_id])
    messages = relationship(
        'SupportTicketMessage',
        back_populates='ticket',
        cascade='all, delete-orphan',
        order_by='SupportTicketMessage.created_at',
    )
    attachments = relationship(
        'SupportTicketAttachment',
        back_populates='ticket',
        cascade='all, delete-orphan',
    )


class SupportTicketMessage(Base):
    __tablename__ = 'support_ticket_messages'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey('support_tickets.id', ondelete='CASCADE'),
        nullable=False,
    )
    author_type = Column(String(20), nullable=False)  # employee | superadmin
    author_employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    author_superadmin_id = Column(
        UUID(as_uuid=True),
        ForeignKey('superadmin_users.id', ondelete='SET NULL'),
        nullable=True,
    )
    author_name = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship('SupportTicket', back_populates='messages')
    attachments = relationship(
        'SupportTicketAttachment',
        back_populates='message',
        cascade='all, delete-orphan',
        order_by='SupportTicketAttachment.created_at',
    )


class SupportTicketAttachment(Base):
    __tablename__ = 'support_ticket_attachments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey('support_tickets.id', ondelete='CASCADE'),
        nullable=False,
    )
    message_id = Column(
        UUID(as_uuid=True),
        ForeignKey('support_ticket_messages.id', ondelete='CASCADE'),
        nullable=False,
    )
    file_url = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    uploaded_by_employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    uploaded_by_superadmin_id = Column(
        UUID(as_uuid=True),
        ForeignKey('superadmin_users.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship('SupportTicket', back_populates='attachments')
    message = relationship('SupportTicketMessage', back_populates='attachments')


class SupportReplyTemplate(Base):
    __tablename__ = 'support_reply_templates'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(40), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

"""Shipment requests — intent to ship ТМЦ (fulfilled later via inventory expense)."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ShipmentRequestPriority(str, enum.Enum):
    normal = 'normal'
    urgent = 'urgent'


class ShipmentRequestStatus(str, enum.Enum):
    new = 'new'
    in_progress = 'in_progress'
    done = 'done'
    cancelled = 'cancelled'


class ShipmentRequest(Base):
    __tablename__ = 'shipment_requests'
    __table_args__ = (
        CheckConstraint(
            "priority IN ('normal', 'urgent')",
            name='shipment_requests_priority_chk',
        ),
        CheckConstraint(
            "status IN ('new', 'in_progress', 'done', 'cancelled')",
            name='shipment_requests_status_chk',
        ),
        CheckConstraint(
            "kind IN ('inventory', 'harvest')",
            name='shipment_requests_kind_chk',
        ),
        CheckConstraint('quantity > 0', name='shipment_requests_quantity_chk'),
        CheckConstraint('price >= 0', name='shipment_requests_price_chk'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    inventory_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey('inventory_items.id', ondelete='RESTRICT'),
        nullable=False,
    )
    # inventory = materials/fuel/etc.; harvest = crop product held as warehouse SKU.
    kind = Column(String(20), nullable=False, default='inventory', server_default='inventory')
    customer_name = Column(String(200), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    planned_at = Column(DateTime(timezone=True), nullable=False)
    priority = Column(String(20), nullable=False, default='normal', server_default='normal')
    status = Column(String(20), nullable=False, default='new', server_default='new')
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='RESTRICT'),
        nullable=False,
    )
    assigned_to = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # Optional: open shift of the executor at complete time (null if none).
    shift_id = Column(
        UUID(as_uuid=True),
        ForeignKey('shifts.id', ondelete='SET NULL'),
        nullable=True,
    )
    # Set on complete — points at the single expense row in inventory_operations.
    inventory_operation_id = Column(
        UUID(as_uuid=True),
        ForeignKey('inventory_operations.id', ondelete='SET NULL'),
        nullable=True,
    )
    cancel_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organization = relationship('Organization')
    inventory_item = relationship('InventoryItem')
    creator = relationship('Employee', foreign_keys=[created_by])
    assignee = relationship('Employee', foreign_keys=[assigned_to])
    shift = relationship('Shift')
    inventory_operation = relationship('InventoryOperation', foreign_keys=[inventory_operation_id])
    attachments = relationship(
        'ShipmentRequestAttachment',
        back_populates='request',
        cascade='all, delete-orphan',
        order_by='ShipmentRequestAttachment.created_at',
    )


class ShipmentRequestAttachment(Base):
    __tablename__ = 'shipment_request_attachments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    request_id = Column(
        UUID(as_uuid=True),
        ForeignKey('shipment_requests.id', ondelete='CASCADE'),
        nullable=False,
    )
    image_url = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='RESTRICT'),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship('Organization')
    request = relationship('ShipmentRequest', back_populates='attachments')
    uploader = relationship('Employee', foreign_keys=[uploaded_by])

"""Managerial TMC (non-harvest) outbound records — parallel to crop `shipments`.

No inventory_operations side effects. Optional link to a done inventory request.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TmcShipment(Base):
    __tablename__ = 'tmc_shipments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    date = Column(Date, nullable=False)
    inventory_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey('inventory_items.id', ondelete='RESTRICT'),
        nullable=False,
        index=True,
    )
    # Denormalized for history if item is renamed/removed later.
    item_name = Column(String(200), nullable=False)
    category = Column(String(80), nullable=False)
    unit = Column(String(40), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    price_per_unit = Column(Numeric(12, 2), nullable=True)
    destination = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    shipment_request_id = Column(
        UUID(as_uuid=True),
        ForeignKey('shipment_requests.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    inventory_item = relationship('InventoryItem')
    created_by_user = relationship('Employee')

"""Manual income records (services, sharing, etc.).

Harvest/TMC shipment revenue is NOT stored here — it is aggregated from
`shipments` / `tmc_shipments` to avoid duplication.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Income(Base):
    __tablename__ = 'incomes'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    date = Column(Date, nullable=False)
    # Dictionary code from org_dictionaries (type=income_category)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=False)
    counterparty = Column(String(200), nullable=True)
    payment_method = Column(String(100), nullable=True)
    # Optional harvest origin (nullable for non-crop incomes).
    crop_code = Column(String(80), nullable=True, index=True)
    variety_id = Column(
        UUID(as_uuid=True),
        ForeignKey('crop_varieties.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_by_user = relationship('Employee')

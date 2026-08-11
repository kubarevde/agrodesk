"""Crop varieties (sorts) — child of org crop dictionary by crop_code."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class CropVariety(Base):
    """Org-scoped variety belonging to an existing crop dictionary code.

    Linked by (org_id, crop_code) to OrgDictionary type='crop'.code — not a parallel crop list.
    """

    __tablename__ = 'crop_varieties'
    __table_args__ = (
        UniqueConstraint(
            'org_id',
            'crop_code',
            'name',
            name='uq_crop_varieties_org_crop_name',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False, index=True)
    crop_code = Column(String(80), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

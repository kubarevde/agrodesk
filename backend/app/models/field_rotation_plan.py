"""Planned crop rotation for a field (multi-year). Distinct from factual field_plantings."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

ROTATION_PLAN_STATUSES = ('active', 'cancelled')


class FieldRotationPlan(Base):
    """Planned culture on a field for a season. Never auto-becomes a planting."""

    __tablename__ = 'field_rotation_plans'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False, index=True)
    field_id = Column(
        UUID(as_uuid=True),
        ForeignKey('locations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    crop_code = Column(String(80), nullable=False, index=True)
    variety_id = Column(
        UUID(as_uuid=True),
        ForeignKey('crop_varieties.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    area_ha = Column(Numeric(10, 4), nullable=False)
    season_year = Column(Integer, nullable=False, index=True)
    planned_plant_at = Column(Date, nullable=True)
    planned_harvest_at = Column(Date, nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default='active', server_default='active')
    linked_planting_id = Column(
        UUID(as_uuid=True),
        ForeignKey('field_plantings.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

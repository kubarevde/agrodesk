"""Field plantings — crop+variety assignments on a field for a season."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base

PLANTING_STATUSES = (
    'planned',
    'planted',
    'partially_harvested',
    'harvested',
    'cancelled',
)

# Statuses that count toward allocated field area for a season.
ACTIVE_AREA_STATUSES = (
    'planned',
    'planted',
    'partially_harvested',
    'harvested',
)


class FieldPlanting(Base):
    """One crop(+optional variety) placement on a field for a season.

    Source of truth for culture and variety on a field. Location.crop_* is legacy
    read-only for diagnostics and must not be written by new field APIs.
    """

    __tablename__ = 'field_plantings'

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
    planted_at = Column(Date, nullable=True)
    harvested_at = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default='planted')
    season_year = Column(Integer, nullable=False, index=True)
    comment = Column(Text, nullable=True)
    # Optional sub-polygon on the field map [[lat, lon], ...]
    polygon = Column(JSONB, nullable=True)
    # Hex color for map highlight, e.g. #01696F
    map_color = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

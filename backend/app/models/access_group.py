"""Access groups: named bundles of sections + actions assigned to employees."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AccessGroup(Base):
    __tablename__ = 'access_groups'
    __table_args__ = (
        UniqueConstraint('org_id', 'code', name='uq_access_groups_org_code'),
        UniqueConstraint('org_id', 'name', name='uq_access_groups_org_name'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    # Stable key for presets (e.g. 'supplier'); null for custom groups.
    code = Column(String(64), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False, server_default='false')
    sections = Column(JSONB, nullable=False, default=list, server_default='[]')
    actions = Column(JSONB, nullable=False, default=list, server_default='[]')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    members = relationship('Employee', back_populates='access_group')

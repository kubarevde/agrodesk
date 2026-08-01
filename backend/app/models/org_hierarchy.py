"""Head org → child org links (holding overlay; not a second tenant model)."""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class OrgHierarchyLink(Base):
    __tablename__ = 'org_hierarchy_links'
    __table_args__ = (
        UniqueConstraint('child_org_id', name='uq_org_hierarchy_links_child'),
        CheckConstraint(
            'head_org_id <> child_org_id',
            name='ck_org_hierarchy_links_no_self',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    head_org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    child_org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(20), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    before_data = Column(JSONB, nullable=True)
    after_data = Column(JSONB, nullable=True)
    summary = Column(Text, nullable=True)

    actor = relationship('Employee', foreign_keys=[changed_by])

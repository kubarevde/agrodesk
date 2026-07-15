import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class Organization(Base):
    __tablename__ = 'organizations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    plan = Column(String(50), nullable=False, default='trial', server_default='trial')
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')
    owner_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    trial_ends_at = Column(Date, nullable=True)
    max_employees = Column(Integer, nullable=False, default=10, server_default='10')
    settings = Column(JSONB, nullable=False, default=dict, server_default='{}')


class SuperAdminUser(Base):
    __tablename__ = 'superadmin_users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

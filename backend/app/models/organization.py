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
    trial_ends_at = Column(Date, nullable=True)  # subscription end (any plan); does not auto-block
    max_employees = Column(Integer, nullable=False, default=10, server_default='10')
    # Optional RF region catalog code (see app.data.regions_ru). Null = not set.
    region = Column(String(16), nullable=True)
    # JSONB bag. Known optional keys (additive, no schema migration):
    # - marketplace_enabled: bool — when true, org may use seller cabinet / publish listings.
    # - payroll_visible_to_employees: bool — when false, employees do not see money amounts
    #   in me/earnings (default true when key absent). Writable via org Settings PATCH.
    #   Default/absent = false. Managed later via settings API + marketplace.manage action.
    settings = Column(JSONB, nullable=False, default=dict, server_default='{}')


class SuperAdminUser(Base):
    __tablename__ = 'superadmin_users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

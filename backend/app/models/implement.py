import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Implement(Base):
    __tablename__ = 'implements'
    __table_args__ = (UniqueConstraint('org_id', 'name', name='uq_implements_org_name'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    serial_number = Column(String(100), nullable=True)
    year_of_manufacture = Column(Integer, nullable=True)
    condition = Column(String(30), nullable=False, default='good', server_default='good')
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    current_equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    current_equipment = relationship('Equipment', back_populates='implements')
    maintenance_records = relationship('ImplementMaintenance', back_populates='implement')
    shifts = relationship('Shift', back_populates='implement')
    sharing_listings = relationship('SharingListing', back_populates='implement')
    agro_plans = relationship('AgroPlan', back_populates='implement')


class ImplementMaintenance(Base):
    __tablename__ = 'implement_maintenance'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    cost = Column(Numeric(12, 2), nullable=True)
    description = Column(Text, nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id'), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    implement = relationship('Implement', back_populates='maintenance_records')
    expense = relationship('Expense')
    created_by_user = relationship('Employee')

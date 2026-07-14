import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EquipmentMeterLog(Base):
    __tablename__ = 'equipment_meter_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey('shifts.id'), nullable=True)
    date = Column(Date, nullable=False)
    value_added = Column(Numeric(10, 2), nullable=False)
    meter_after = Column(Numeric(10, 2), nullable=False)
    note = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipment = relationship('Equipment', back_populates='meter_logs')
    shift = relationship('Shift', back_populates='meter_logs')
    created_by_user = relationship('Employee', back_populates='equipment_meter_logs')


class EquipmentMaintenance(Base):
    __tablename__ = 'equipment_maintenance'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    meter_at = Column(Numeric(10, 2), nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    description = Column(Text, nullable=True)
    next_to_at = Column(Numeric(10, 2), nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id'), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipment = relationship('Equipment', back_populates='maintenance_records')
    expense = relationship('Expense', back_populates='maintenance_records')
    created_by_user = relationship('Employee', back_populates='equipment_maintenance')

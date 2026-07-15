import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, Text, Time, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ShiftStatus(str, enum.Enum):
    open = 'open'
    closed = 'closed'


class Shift(Base):
    __tablename__ = 'shifts'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    date = Column(Date, nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    work_type_id = Column(UUID(as_uuid=True), ForeignKey('work_types.id'), nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    field_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=True)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=True)
    description = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(
        Enum(ShiftStatus, name='shift_status'),
        default=ShiftStatus.open,
        nullable=False,
    )
    duration_raw = Column(Integer, nullable=True)
    duration_rounded = Column(Numeric(4, 1), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    calculated_amount = Column(Numeric(10, 2), nullable=True)
    rate_snapshot = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    employee = relationship('Employee', back_populates='shifts')
    work_type = relationship('WorkType', back_populates='shifts')
    location = relationship(
        'Location',
        back_populates='shifts',
        foreign_keys=[location_id],
    )
    field = relationship(
        'Location',
        back_populates='field_shifts',
        foreign_keys=[field_id],
    )
    equipment = relationship('Equipment', back_populates='shifts')
    implement = relationship('Implement', back_populates='shifts')
    meter_logs = relationship('EquipmentMeterLog', back_populates='shift')
    agro_plans = relationship('AgroPlan', back_populates='actual_shift')

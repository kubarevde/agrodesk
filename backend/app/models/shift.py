import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ShiftStatus(str, enum.Enum):
    open = 'open'
    closed = 'closed'


class Shift(Base):
    __tablename__ = 'shifts'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    work_type_id = Column(UUID(as_uuid=True), ForeignKey('work_types.id'), nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    employee = relationship('Employee', back_populates='shifts')
    work_type = relationship('WorkType', back_populates='shifts')
    location = relationship('Location', back_populates='shifts')
    equipment = relationship('Equipment', back_populates='shifts')

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Location(Base):
    __tablename__ = 'locations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    area_ha = Column(Numeric(8, 2), nullable=True)
    polygon = Column(JSONB, nullable=True)
    crop_type = Column(String(100), nullable=True)
    soil_type = Column(String(100), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)

    shifts = relationship(
        'Shift',
        back_populates='location',
        foreign_keys='Shift.location_id',
    )
    field_shifts = relationship(
        'Shift',
        back_populates='field',
        foreign_keys='Shift.field_id',
    )
    sharing_listings = relationship('SharingListing', back_populates='location')
    agro_plans = relationship('AgroPlan', back_populates='location')


class WorkType(Base):
    __tablename__ = 'work_types'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    shifts = relationship('Shift', back_populates='work_type')
    agro_plans = relationship('AgroPlan', back_populates='work_type')


class Equipment(Base):
    __tablename__ = 'equipment'
    __table_args__ = (
        CheckConstraint(
            "meter_type IS NULL OR meter_type IN ('motohours', 'km', 'shift_hours')",
            name='equipment_meter_type_check',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    type = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    year_of_manufacture = Column(Integer, nullable=True)
    serial_number = Column(String(100), nullable=True)
    meter_type = Column(String(20), default='motohours', server_default='motohours')
    current_meter = Column(Numeric(10, 2), default=0, server_default='0')
    to_interval = Column(Numeric(10, 2), nullable=True)
    next_to_at = Column(Numeric(10, 2), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    image_url = Column(String(500), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)

    shifts = relationship('Shift', back_populates='equipment')
    owner = relationship('Employee', back_populates='owned_equipment', foreign_keys=[owner_id])
    meter_logs = relationship('EquipmentMeterLog', back_populates='equipment')
    maintenance_records = relationship('EquipmentMaintenance', back_populates='equipment')
    expenses = relationship('Expense', back_populates='equipment')
    implements = relationship('Implement', back_populates='current_equipment')
    sharing_listings = relationship('SharingListing', back_populates='equipment')
    agro_plans = relationship('AgroPlan', back_populates='equipment')

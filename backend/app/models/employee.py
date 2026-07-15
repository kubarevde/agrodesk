import enum
import uuid

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EmployeeRole(str, enum.Enum):
    admin = 'admin'
    manager = 'manager'
    employee = 'employee'


class Employee(Base):
    __tablename__ = 'employees'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    employee_code = Column(String(20), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    position = Column(String(100), nullable=True)
    hourly_rate = Column(Numeric(10, 2), default=0)
    role = Column(
        Enum(EmployeeRole, name='employee_role'),
        default=EmployeeRole.employee,
        nullable=False,
    )
    password_hash = Column(String(200), nullable=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    shifts = relationship('Shift', back_populates='employee')
    inventory_operations = relationship('InventoryOperation', back_populates='created_by_user')
    shipments = relationship('Shipment', back_populates='created_by_user')
    expenses = relationship('Expense', back_populates='created_by_user')
    owned_equipment = relationship(
        'Equipment',
        back_populates='owner',
        foreign_keys='Equipment.owner_id',
    )
    equipment_meter_logs = relationship('EquipmentMeterLog', back_populates='created_by_user')
    equipment_maintenance = relationship('EquipmentMaintenance', back_populates='created_by_user')
    sharing_listings = relationship(
        'SharingListing',
        back_populates='owner',
        foreign_keys='SharingListing.owner_id',
    )
    sharing_requests = relationship(
        'SharingRequest',
        back_populates='requester',
        foreign_keys='SharingRequest.requester_id',
    )
    notifications = relationship('Notification', back_populates='employee')
    agro_plan_assignments = relationship(
        'AgroPlan',
        back_populates='employee',
        foreign_keys='AgroPlan.employee_id',
    )
    created_agro_plans = relationship(
        'AgroPlan',
        back_populates='created_by_user',
        foreign_keys='AgroPlan.created_by',
    )
    rates = relationship(
        'EmployeeRate',
        back_populates='employee',
        foreign_keys='EmployeeRate.employee_id',
    )
    created_rates = relationship(
        'EmployeeRate',
        back_populates='created_by_user',
        foreign_keys='EmployeeRate.created_by',
    )

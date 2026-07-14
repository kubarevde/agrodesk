import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, Numeric, String, func
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
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    shifts = relationship('Shift', back_populates='employee')
    inventory_operations = relationship('InventoryOperation', back_populates='created_by_user')
    shipments = relationship('Shipment', back_populates='created_by_user')
    expenses = relationship('Expense', back_populates='created_by_user')

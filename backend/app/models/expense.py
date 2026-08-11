import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Expense(Base):
    __tablename__ = 'expenses'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    supplier = Column(String(200), nullable=True)
    payment_method = Column(String(100), nullable=True)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    # Set by payroll confirm flow (Prompt #4); not writable via ExpenseCreate API.
    employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    payroll_run_line_id = Column(
        UUID(as_uuid=True),
        ForeignKey('payroll_run_lines.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_by_user = relationship(
        'Employee',
        back_populates='expenses',
        foreign_keys=[created_by],
    )
    employee = relationship('Employee', foreign_keys=[employee_id])
    equipment = relationship('Equipment', back_populates='expenses')
    maintenance_records = relationship('EquipmentMaintenance', back_populates='expense')

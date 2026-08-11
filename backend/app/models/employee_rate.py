import uuid

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EmployeeRate(Base):
    __tablename__ = 'employee_rates'
    __table_args__ = (
        CheckConstraint(
            "payment_scheme IN ('hourly', 'per_shift', 'monthly', 'piecework')",
            name='ck_employee_rates_payment_scheme',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    work_type_id = Column(UUID(as_uuid=True), ForeignKey('work_types.id'), nullable=True)
    # hourly | per_shift | monthly | piecework — existing rows migrate to hourly.
    payment_scheme = Column(String(20), nullable=False, default='hourly', server_default='hourly')
    # Required only for piecework; values from PIECEWORK_UNITS (app-level), not DB enum.
    piecework_unit = Column(String(20), nullable=True)
    rate = Column(Numeric(10, 2), nullable=False)
    overtime_multiplier = Column(Numeric(4, 2), nullable=False, default=1.0)
    overtime_threshold_hours = Column(Numeric(4, 1), nullable=False, default=8.0)
    valid_from = Column(Date, nullable=False, server_default=func.current_date())
    valid_to = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship(
        'Employee',
        back_populates='rates',
        foreign_keys=[employee_id],
    )
    work_type = relationship('WorkType', back_populates='employee_rates')
    created_by_user = relationship(
        'Employee',
        back_populates='created_rates',
        foreign_keys=[created_by],
    )

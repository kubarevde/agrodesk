import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PayrollRun(Base):
    __tablename__ = 'payroll_runs'
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'confirmed', 'paid')",
            name='ck_payroll_runs_status',
        ),
        CheckConstraint('period_end >= period_start', name='ck_payroll_runs_period'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default='draft', server_default='draft')
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    confirmed_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    lines = relationship(
        'PayrollRunLine',
        back_populates='payroll_run',
        cascade='all, delete-orphan',
    )


class PayrollRunLine(Base):
    __tablename__ = 'payroll_run_lines'
    __table_args__ = (
        CheckConstraint(
            "payment_scheme IN ('hourly', 'per_shift', 'monthly', 'piecework')",
            name='ck_payroll_run_lines_scheme',
        ),
        CheckConstraint(
            "payout_status IN ('unpaid', 'partially_paid', 'paid')",
            name='ck_payroll_run_lines_payout_status',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payroll_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey('payroll_runs.id', ondelete='CASCADE'),
        nullable=False,
    )
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    payment_scheme = Column(String(20), nullable=False)
    base_calculated_amount = Column(Numeric(12, 2), nullable=False, default=0)
    adjustments_total = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    source_breakdown = Column(JSONB, nullable=False, default=dict)
    payout_status = Column(
        String(20),
        nullable=False,
        default='unpaid',
        server_default='unpaid',
    )
    # Closed with unpaid remainder → payout_status stays/becomes 'paid'.
    remainder_closed_at = Column(DateTime(timezone=True), nullable=True)
    remainder_closed_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    remainder_close_comment = Column(Text, nullable=True)

    payroll_run = relationship('PayrollRun', back_populates='lines')
    employee = relationship('Employee', foreign_keys=[employee_id])
    adjustments = relationship(
        'PayrollAdjustment',
        back_populates='payroll_run_line',
        cascade='all, delete-orphan',
    )
    payouts = relationship(
        'PayrollPayout',
        back_populates='payroll_run_line',
        foreign_keys='PayrollPayout.payroll_run_line_id',
    )


class PayrollAdjustment(Base):
    __tablename__ = 'payroll_adjustments'
    __table_args__ = (
        CheckConstraint(
            "type IN ('bonus', 'penalty', 'deduction', 'other')",
            name='ck_payroll_adjustments_type',
        ),
        CheckConstraint('sign IN (-1, 1)', name='ck_payroll_adjustments_sign'),
        CheckConstraint('amount >= 0', name='ck_payroll_adjustments_amount'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payroll_run_line_id = Column(
        UUID(as_uuid=True),
        ForeignKey('payroll_run_lines.id', ondelete='CASCADE'),
        nullable=False,
    )
    type = Column(String(20), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    # +1 / -1 — for bonus/penalty/deduction set by type; for other chosen explicitly.
    sign = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    payroll_run_line = relationship('PayrollRunLine', back_populates='adjustments')
    created_by_user = relationship('Employee', foreign_keys=[created_by])


class PayrollPayout(Base):
    """Payout / advance storage (API in Prompt #6; table needed for unconfirm guard)."""

    __tablename__ = 'payroll_payouts'
    __table_args__ = (
        CheckConstraint(
            "payout_method IN ('cash', 'bank_transfer', 'card', 'other')",
            name='ck_payroll_payouts_method',
        ),
        CheckConstraint(
            "payout_kind IN ('advance', 'salary_payment')",
            name='ck_payroll_payouts_kind',
        ),
        CheckConstraint('amount_paid > 0', name='ck_payroll_payouts_amount'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    payroll_run_line_id = Column(
        UUID(as_uuid=True),
        ForeignKey('payroll_run_lines.id', ondelete='SET NULL'),
        nullable=True,
    )
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    payout_method = Column(String(30), nullable=False)
    # advance = early payment; salary_payment = final/partial salary payout.
    payout_kind = Column(String(20), nullable=False, server_default='salary_payment')
    payout_date = Column(Date, nullable=False)
    confirmed_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    comment = Column(Text, nullable=True)
    advance_period_hint = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    payroll_run_line = relationship(
        'PayrollRunLine',
        back_populates='payouts',
        foreign_keys=[payroll_run_line_id],
    )
    employee = relationship('Employee', foreign_keys=[employee_id])
    # Creating payouts via API requires action payroll.pay (Prompt #6).

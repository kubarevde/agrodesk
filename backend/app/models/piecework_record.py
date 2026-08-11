import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PieceworkRecord(Base):
    __tablename__ = 'piecework_records'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    shift_id = Column(
        UUID(as_uuid=True),
        ForeignKey('shifts.id', ondelete='SET NULL'),
        nullable=True,
    )
    work_type_id = Column(UUID(as_uuid=True), ForeignKey('work_types.id'), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    rate_applied = Column(Numeric(10, 2), nullable=False)
    calculated_amount = Column(Numeric(12, 2), nullable=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship('Employee', foreign_keys=[employee_id])
    shift = relationship('Shift', foreign_keys=[shift_id])
    work_type = relationship('WorkType', foreign_keys=[work_type_id])
    created_by_user = relationship('Employee', foreign_keys=[created_by])

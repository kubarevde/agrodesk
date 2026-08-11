"""Organizational non-production tasks (not agro plans / shifts).

Domain boundary:
- «Задачи» = хозяйственные и административные поручения.
- «Агрокалендарь» = полевые работы, культуры, агропланы, смены.
Tasks never create shifts, agro plans, payroll, expenses, or inventory ops.
"""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class OrgTask(Base):
    """Simple org notepad task — separate from AgroPlan / Shift."""

    __tablename__ = 'org_tasks'
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'completed', 'cancelled')",
            name='ck_org_tasks_status',
        ),
        CheckConstraint(
            "visibility_type IN ('all_employees', 'specific_employee')",
            name='ck_org_tasks_visibility',
        ),
        CheckConstraint(
            "(visibility_type = 'all_employees' AND assignee_id IS NULL) OR "
            "(visibility_type = 'specific_employee' AND assignee_id IS NOT NULL)",
            name='ck_org_tasks_assignee_visibility',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    visibility_type = Column(String(32), nullable=False, default='all_employees')
    assignee_id = Column(
        UUID(as_uuid=True),
        ForeignKey('employees.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    status = Column(String(20), nullable=False, default='active', index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    assignee = relationship('Employee', foreign_keys=[assignee_id])
    creator = relationship('Employee', foreign_keys=[created_by])
    completer = relationship('Employee', foreign_keys=[completed_by])
    canceller = relationship('Employee', foreign_keys=[cancelled_by])

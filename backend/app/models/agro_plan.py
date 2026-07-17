import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AgroPlan(Base):
    __tablename__ = 'agro_plan'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=False)
    work_type_id = Column(UUID(as_uuid=True), ForeignKey('work_types.id'), nullable=False)
    planned_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=True)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default='planned')  # planned / in_progress / done / cancelled
    actual_shift_id = Column(UUID(as_uuid=True), ForeignKey('shifts.id'), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship('Location', back_populates='agro_plans')
    work_type = relationship('WorkType', back_populates='agro_plans')
    equipment = relationship('Equipment', back_populates='agro_plans')
    implement = relationship('Implement', back_populates='agro_plans')
    employee = relationship(
        'Employee',
        back_populates='agro_plan_assignments',
        foreign_keys=[employee_id],
    )
    actual_shift = relationship('Shift', back_populates='agro_plans')
    created_by_user = relationship(
        'Employee',
        back_populates='created_agro_plans',
        foreign_keys=[created_by],
    )
    fields = relationship(
        'AgroPlanField',
        back_populates='plan',
        cascade='all, delete-orphan',
    )


class AgroPlanField(Base):
    __tablename__ = 'agro_plan_fields'

    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey('agro_plan.id', ondelete='CASCADE'),
        primary_key=True,
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey('locations.id'),
        primary_key=True,
    )

    plan = relationship('AgroPlan', back_populates='fields')
    location = relationship('Location')

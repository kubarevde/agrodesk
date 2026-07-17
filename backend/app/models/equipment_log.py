import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EquipmentMeterLog(Base):
    __tablename__ = 'equipment_meter_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey('shifts.id'), nullable=True)
    date = Column(Date, nullable=False)
    value_added = Column(Numeric(10, 2), nullable=False)
    meter_after = Column(Numeric(10, 2), nullable=False)
    note = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipment = relationship('Equipment', back_populates='meter_logs')
    shift = relationship('Shift', back_populates='meter_logs')
    created_by_user = relationship('Employee', back_populates='equipment_meter_logs')


class EquipmentMaintenance(Base):
    """TO history + repair journal (same table).

    Legacy TO records: status='done', equipment_id set.
    Repair journal: status in (in_progress, waiting_parts, done), optional implement_id.
    """

    __tablename__ = 'equipment_maintenance'
    __table_args__ = (
        CheckConstraint(
            'equipment_id IS NOT NULL OR implement_id IS NOT NULL',
            name='equipment_maintenance_asset_chk',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=True)
    date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    meter_at = Column(Numeric(10, 2), nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    description = Column(Text, nullable=True)
    next_to_at = Column(Numeric(10, 2), nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id'), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), nullable=False, default='in_progress', server_default='in_progress')
    date_returned = Column(Date, nullable=True)
    priority = Column(String(20), nullable=False, default='normal', server_default='normal')

    equipment = relationship('Equipment', back_populates='maintenance_records')
    implement = relationship('Implement', back_populates='equipment_maintenance_records')
    expense = relationship('Expense', back_populates='maintenance_records')
    created_by_user = relationship('Employee', back_populates='equipment_maintenance')
    checklist_items = relationship(
        'MaintenanceChecklistItem',
        back_populates='maintenance',
        cascade='all, delete-orphan',
        order_by='MaintenanceChecklistItem.created_at',
    )


class MaintenanceChecklistItem(Base):
    __tablename__ = 'maintenance_checklist_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maintenance_id = Column(
        UUID(as_uuid=True),
        ForeignKey('equipment_maintenance.id', ondelete='CASCADE'),
        nullable=False,
    )
    item_type = Column(String(20), nullable=False)  # buy | repair
    description = Column(String(300), nullable=False)
    is_done = Column(Boolean, nullable=False, default=False, server_default='false')
    cost = Column(Numeric(12, 2), nullable=True)
    done_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    maintenance = relationship('EquipmentMaintenance', back_populates='checklist_items')

import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PurchasePlannerItem(Base):
    __tablename__ = 'purchase_planner_items'
    __table_args__ = (
        CheckConstraint(
            """
            (category = 'equipment' AND equipment_id IS NOT NULL
              AND implement_id IS NULL AND inventory_item_id IS NULL)
            OR (category = 'implement' AND implement_id IS NOT NULL
              AND equipment_id IS NULL AND inventory_item_id IS NULL)
            OR (category = 'inventory_item' AND inventory_item_id IS NOT NULL
              AND equipment_id IS NULL AND implement_id IS NULL)
            OR (category = 'general'
              AND equipment_id IS NULL AND implement_id IS NULL AND inventory_item_id IS NULL)
            """,
            name='purchase_planner_category_chk',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    title = Column(String(300), nullable=False)
    category = Column(String(20), nullable=False, default='general', server_default='general')
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=True)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey('inventory_items.id'), nullable=True)
    urgency = Column(String(20), nullable=False, default='normal', server_default='normal')
    status = Column(String(20), nullable=False, default='planned', server_default='planned')
    purchase_place = Column(String(200), nullable=True)
    responsible_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    estimated_cost = Column(Numeric(12, 2), nullable=True)
    actual_cost = Column(Numeric(12, 2), nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id'), nullable=True)
    maintenance_id = Column(
        UUID(as_uuid=True),
        ForeignKey('equipment_maintenance.id'),
        nullable=True,
    )
    maintenance_checklist_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey('maintenance_checklist_items.id'),
        nullable=True,
    )
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    purchased_at = Column(DateTime(timezone=True), nullable=True)

    equipment = relationship('Equipment')
    implement = relationship('Implement')
    inventory_item = relationship('InventoryItem')
    responsible = relationship('Employee', foreign_keys=[responsible_id])
    created_by_user = relationship('Employee', foreign_keys=[created_by])
    expense = relationship('Expense')
    maintenance = relationship('EquipmentMaintenance')
    maintenance_checklist_item = relationship('MaintenanceChecklistItem')

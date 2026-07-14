import enum
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class InventoryCategory(str, enum.Enum):
    fuel = 'fuel'
    fertilizer = 'fertilizer'
    parts = 'parts'
    seeds = 'seeds'
    chemicals = 'chemicals'
    other = 'other'


class InventoryOperationType(str, enum.Enum):
    income = 'income'
    expense = 'expense'


class InventoryItem(Base):
    __tablename__ = 'inventory_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    category = Column(
        Enum(InventoryCategory, name='inventory_category'),
        nullable=False,
    )
    unit = Column(String(50), nullable=False)
    current_stock = Column(Numeric(12, 2), default=0, nullable=False)
    min_stock = Column(Numeric(12, 2), default=0, nullable=False)
    total_capacity = Column(Numeric(12, 2), default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    operations = relationship('InventoryOperation', back_populates='item')


class InventoryOperation(Base):
    __tablename__ = 'inventory_operations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey('inventory_items.id'), nullable=False)
    type = Column(
        Enum(InventoryOperationType, name='inventory_operation_type'),
        nullable=False,
    )
    quantity = Column(Numeric(12, 2), nullable=False)
    stock_after = Column(Numeric(12, 2), nullable=False)
    reason = Column(Text, nullable=True)
    supplier = Column(String(200), nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    item = relationship('InventoryItem', back_populates='operations')
    created_by_user = relationship('Employee', back_populates='inventory_operations')

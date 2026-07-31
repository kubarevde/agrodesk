import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Shipment(Base):
    __tablename__ = 'shipments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    date = Column(Date, nullable=False)
    crop_type = Column(String(100), nullable=False)
    # Preferred stable key from org_dictionaries(type='crop').code; crop_type is legacy display name.
    crop_code = Column(String(80), nullable=True)
    quantity_kg = Column(Numeric(12, 2), nullable=False)
    destination = Column(String(200), nullable=True)
    price_per_kg = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    # Optional managerial link to a ТМЦ/harvest request (does NOT post inventory).
    shipment_request_id = Column(
        UUID(as_uuid=True),
        ForeignKey('shipment_requests.id', ondelete='SET NULL'),
        nullable=True,
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_by_user = relationship('Employee', back_populates='shipments')

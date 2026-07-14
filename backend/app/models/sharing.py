import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SharingListing(Base):
    __tablename__ = 'sharing_listings'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(20), nullable=False)  # field / equipment / parts
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price_per_unit = Column(Numeric(12, 2), nullable=True)
    price_unit = Column(String(50), nullable=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=True)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey('equipment.id'), nullable=True)
    implement_id = Column(UUID(as_uuid=True), ForeignKey('implements.id'), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    status = Column(String(20), default='active')  # active / paused / done
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    region = Column(String(100), nullable=True)
    contact_info = Column(Text, nullable=True)
    images = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    location = relationship('Location', back_populates='sharing_listings')
    equipment = relationship('Equipment', back_populates='sharing_listings')
    implement = relationship('Implement', back_populates='sharing_listings')
    owner = relationship('Employee', back_populates='sharing_listings', foreign_keys=[owner_id])
    requests = relationship('SharingRequest', back_populates='listing')


class SharingRequest(Base):
    __tablename__ = 'sharing_requests'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey('sharing_listings.id'), nullable=False)
    requester_id = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    message = Column(Text, nullable=True)
    desired_from = Column(Date, nullable=True)
    desired_to = Column(Date, nullable=True)
    status = Column(String(20), default='pending')  # pending / accepted / rejected / done
    owner_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    listing = relationship('SharingListing', back_populates='requests')
    requester = relationship('Employee', back_populates='sharing_requests', foreign_keys=[requester_id])

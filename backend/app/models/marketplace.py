"""Marketplace (eco-product vitrine) — isolated from warehouse/shipments tables.

Listings may soft-link to inventory_items or shipments via (source_type, source_id)
without FK into those tables. Seller flag lives in organizations.settings JSONB:
  settings.marketplace_enabled: bool (default false) — see Organization.settings.
"""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, relationship

from app.database import Base


class MarketCategory(Base):
    """Global marketplace taxonomy (superadmin-managed)."""

    __tablename__ = 'market_categories'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    slug = Column(String(120), nullable=False, unique=True)
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_categories.id', ondelete='SET NULL'),
        nullable=True,
    )
    icon = Column(String(80), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')
    sort_order = Column(Integer, nullable=False, default=0, server_default='0')

    parent: Mapped[MarketCategory | None] = relationship(
        'MarketCategory',
        remote_side=[id],
        back_populates='children',
    )
    children: Mapped[list[MarketCategory]] = relationship(
        'MarketCategory',
        back_populates='parent',
    )
    listings: Mapped[list[MarketListing]] = relationship(
        'MarketListing',
        back_populates='category',
    )


class MarketSellerProfile(Base):
    """One public «shop» profile per organization."""

    __tablename__ = 'market_seller_profiles'
    __table_args__ = (UniqueConstraint('org_id', name='uq_market_seller_profiles_org_id'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    phone = Column(String(40), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False, server_default='false')
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    listings: Mapped[list[MarketListing]] = relationship(
        'MarketListing',
        back_populates='seller_profile',
    )


class MarketListing(Base):
    """Public/catalog listing. Snapshot at publish time; soft source link only."""

    __tablename__ = 'market_listings'
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')",
            name='market_listings_status_chk',
        ),
        CheckConstraint(
            "source_type IS NULL OR source_type IN ('manual', 'inventory', 'shipment')",
            name='market_listings_source_type_chk',
        ),
        CheckConstraint('price >= 0', name='market_listings_price_chk'),
        CheckConstraint('quantity_available >= 0', name='market_listings_qty_chk'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
    )
    seller_profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_seller_profiles.id', ondelete='RESTRICT'),
        nullable=False,
    )
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_categories.id', ondelete='RESTRICT'),
        nullable=True,
        comment='Null while draft — set before publish',
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(40), nullable=False)
    # Snapshot at import/publish — NOT live inventory_items.current_stock (MVP).
    quantity_available = Column(Numeric(12, 2), nullable=False, default=0, server_default='0')
    photos = Column(JSONB, nullable=False, default=list, server_default='[]')
    status = Column(String(30), nullable=False, default='draft', server_default='draft')
    # Soft polymorphic link — NOT FK into inventory_items / shipments.
    source_type = Column(String(20), nullable=True)
    source_id = Column(UUID(as_uuid=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    published_at = Column(DateTime(timezone=True), nullable=True)

    category: Mapped[MarketCategory | None] = relationship('MarketCategory', back_populates='listings')
    seller_profile: Mapped[MarketSellerProfile] = relationship(
        'MarketSellerProfile',
        back_populates='listings',
    )
    orders: Mapped[list[MarketOrder]] = relationship('MarketOrder', back_populates='listing')


class MarketOrder(Base):
    """MVP purchase request (no payment) — contact via phone."""

    __tablename__ = 'market_orders'
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled')",
            name='market_orders_status_chk',
        ),
        CheckConstraint('quantity > 0', name='market_orders_quantity_chk'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_listings.id', ondelete='RESTRICT'),
        nullable=False,
    )
    buyer_name = Column(String(200), nullable=False)
    buyer_phone = Column(String(40), nullable=False)
    buyer_comment = Column(Text, nullable=True)
    quantity = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default='new', server_default='new')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    listing: Mapped[MarketListing] = relationship('MarketListing', back_populates='orders')
    reviews: Mapped[list[MarketReview]] = relationship('MarketReview', back_populates='order')


class MarketReview(Base):
    """Moderated review of a seller (org)."""

    __tablename__ = 'market_reviews'
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='market_reviews_rating_chk'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
        comment='Seller organization being reviewed',
    )
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_orders.id', ondelete='SET NULL'),
        nullable=True,
    )
    author_name = Column(String(200), nullable=False)
    rating = Column(SmallInteger, nullable=False)
    comment = Column(Text, nullable=True)
    is_visible = Column(Boolean, nullable=False, default=False, server_default='false')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order: Mapped[MarketOrder | None] = relationship('MarketOrder', back_populates='reviews')


class MarketCategoryMapping(Base):
    """Maps org inventory dictionary codes → global market_categories.

    Does not alter inventory_items; import only reads InventoryItem.category.
    Superadmin-managed; keyed by canonical dictionary code (e.g. fuel, harvest).
    """

    __tablename__ = 'market_category_mapping'
    __table_args__ = (
        UniqueConstraint(
            'inventory_category_value',
            name='uq_market_category_mapping_inv_value',
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_category_value = Column(String(50), nullable=False)
    market_category_id = Column(
        UUID(as_uuid=True),
        ForeignKey('market_categories.id', ondelete='CASCADE'),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    market_category: Mapped[MarketCategory] = relationship('MarketCategory')

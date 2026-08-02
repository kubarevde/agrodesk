"""Marketplace API schemas (import + listings drafts)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MarketImportInventorySource(BaseModel):
    source_type: Literal['inventory'] = 'inventory'
    source_id: UUID
    name: str
    quantity: Decimal
    unit: str
    category: str | None = None
    already_imported: bool = False


class MarketImportShipmentSource(BaseModel):
    source_type: Literal['shipment'] = 'shipment'
    source_id: UUID
    name: str
    quantity: Decimal
    unit: str = 'кг'
    date: str | None = None
    destination: str | None = None
    already_imported: bool = False


class MarketImportSourcesResponse(BaseModel):
    inventory: list[MarketImportInventorySource]
    shipments: list[MarketImportShipmentSource]


class MarketListingFromSource(BaseModel):
    source_type: Literal['inventory', 'shipment']
    source_id: UUID


class MarketListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    seller_profile_id: UUID
    category_id: UUID | None
    title: str
    description: str | None
    price: Decimal
    unit: str
    quantity_available: Decimal
    """Effective qty: live from source when quantity_mode='source', else stored."""
    quantity_mode: Literal['manual', 'source'] = 'manual'
    source_missing: bool = False
    photos: list = Field(default_factory=list)
    status: str
    source_type: str | None
    source_id: UUID | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


# --- Seller cabinet (JWT + marketplace.manage) ---

ListingStatus = Literal['draft', 'pending_review', 'published', 'rejected', 'archived']
OrderStatus = Literal['new', 'contacted', 'confirmed', 'completed', 'cancelled']


class SellerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    display_name: str
    description: str | None
    logo_url: str | None
    phone: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime


class SellerProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    logo_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=40)


class MarketListingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    price: Decimal = Field(default=Decimal('0'), ge=0)
    unit: str = Field(min_length=1, max_length=40)
    quantity_available: Decimal = Field(default=Decimal('0'), ge=0)
    category_id: UUID | None = None
    # Cap matches FE maxFiles=8 and marketplace_media.LISTING_PHOTOS_MAX
    photos: list[str] = Field(default_factory=list, max_length=8)


class MarketListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    price: Decimal | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, min_length=1, max_length=40)
    quantity_available: Decimal | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    photos: list[str] | None = Field(default=None, max_length=8)


class MarketListingListResponse(BaseModel):
    items: list[MarketListingResponse]
    total: int


class SellerOrderResponse(BaseModel):
    id: UUID
    listing_id: UUID
    listing_title: str
    buyer_name: str
    buyer_phone: str
    buyer_comment: str | None
    quantity: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class SellerOrderUpdate(BaseModel):
    status: OrderStatus


class MarketOrdersReportRequest(BaseModel):
    """Period filter for showcase orders report (not farm Excel reports)."""

    from_date: date
    to_date: date
    status: OrderStatus | None = None

    @model_validator(mode='after')
    def validate_range(self) -> MarketOrdersReportRequest:
        if self.to_date < self.from_date:
            raise ValueError('to_date must be >= from_date')
        return self


class MarketOrdersStatusBucket(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    label: str
    orders_count: int
    quantity_sum: Decimal
    estimated_amount_sum: Decimal


class MarketOrdersReportRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: UUID
    created_at: datetime
    updated_at: datetime
    status: str
    listing_id: UUID
    listing_title: str
    listing_unit: str
    listing_price: Decimal
    quantity: Decimal
    estimated_amount: Decimal
    buyer_name: str
    buyer_phone: str
    buyer_comment: str | None
    seller_display_name: str


class MarketOrdersReportResponse(BaseModel):
    """Showcase orders report — estimated amounts are not farm revenue."""

    model_config = ConfigDict(from_attributes=True)

    from_date: date
    to_date: date
    org_id: UUID
    seller_display_name: str
    orders_count: int
    quantity_sum: Decimal
    estimated_amount_sum: Decimal
    status_breakdown: list[MarketOrdersStatusBucket]
    rows: list[MarketOrdersReportRow]
    amount_disclaimer: str


# --- Public vitrine (no JWT; no internal org / warehouse fields) ---


class PublicSellerBrief(BaseModel):
    id: UUID
    display_name: str
    is_verified: bool


class PublicListingCard(BaseModel):
    id: UUID
    title: str
    description: str | None
    price: Decimal
    unit: str
    """Effective available qty from backend (live for source-linked listings)."""
    quantity_available: Decimal
    photos: list = Field(default_factory=list)
    category_id: UUID | None
    published_at: datetime | None
    seller: PublicSellerBrief


class PublicListingListResponse(BaseModel):
    items: list[PublicListingCard]
    total: int
    page: int
    page_size: int


class PublicCategoryNode(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: str | None
    sort_order: int
    children: list['PublicCategoryNode'] = Field(default_factory=list)


class PublicReviewCard(BaseModel):
    id: UUID
    author_name: str
    rating: int
    comment: str | None
    created_at: datetime


class PublicSellerProfileResponse(BaseModel):
    id: UUID
    display_name: str
    description: str | None
    logo_url: str | None
    phone: str | None
    is_verified: bool
    listings: list[PublicListingCard]
    reviews: list[PublicReviewCard]


class PublicOrderCreate(BaseModel):
    listing_id: UUID
    buyer_name: str = Field(min_length=1, max_length=200)
    buyer_phone: str = Field(min_length=5, max_length=40)
    buyer_comment: str | None = Field(default=None, max_length=2000)
    quantity: Decimal = Field(gt=0)


class PublicOrderResponse(BaseModel):
    id: UUID
    listing_id: UUID
    buyer_name: str
    quantity: Decimal
    status: str
    created_at: datetime


# --- Superadmin moderation ---


class ModerationListingItem(BaseModel):
    id: UUID
    org_id: UUID
    org_name: str
    seller_profile_id: UUID
    seller_display_name: str
    category_id: UUID | None
    title: str
    description: str | None
    price: Decimal
    unit: str
    quantity_available: Decimal
    quantity_mode: Literal['manual', 'source'] = 'manual'
    source_missing: bool = False
    photos: list = Field(default_factory=list)
    status: str
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class ListingRejectRequest(BaseModel):
    rejection_reason: str = Field(min_length=3, max_length=2000)


class AdminCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120)
    parent_id: UUID | None = None
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int = 0
    is_active: bool = True


class AdminCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    parent_id: UUID | None = None
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int | None = None
    is_active: bool | None = None


class AdminCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    parent_id: UUID | None
    icon: str | None
    is_active: bool
    sort_order: int


class AdminSellerItem(BaseModel):
    id: UUID
    org_id: UUID
    org_name: str
    display_name: str
    description: str | None
    logo_url: str | None
    phone: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime
    published_listings: int = 0


class AdminSellerUpdate(BaseModel):
    is_verified: bool | None = None
    is_active: bool | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=200)


class AdminOrderItem(BaseModel):
    id: UUID
    listing_id: UUID
    listing_title: str
    org_id: UUID
    org_name: str
    seller_display_name: str
    buyer_name: str
    buyer_phone: str
    buyer_comment: str | None
    quantity: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class AdminCategoryMappingItem(BaseModel):
    id: UUID
    inventory_category_value: str
    market_category_id: UUID
    market_category_name: str | None = None


class AdminCategoryMappingUpsert(BaseModel):
    inventory_category_value: str = Field(min_length=1, max_length=50)
    market_category_id: UUID

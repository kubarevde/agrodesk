"""Marketplace domain tables (eco-product vitrine).

Revision ID: 039_marketplace_domain
Revises: 038_shipment_cancel_reason

Additive only — does NOT alter inventory_items, shipments, organizations columns.
Seller enablement uses organizations.settings.marketplace_enabled (JSONB key).
source_id on market_listings is a soft polymorphic link (no FK into warehouse tables).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '039_marketplace_domain'
down_revision: Union[str, None] = '038_shipment_cancel_reason'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'market_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('slug', sa.String(length=120), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('icon', sa.String(length=80), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(
            ['parent_id'],
            ['market_categories.id'],
            ondelete='SET NULL',
        ),
        sa.UniqueConstraint('slug', name='uq_market_categories_slug'),
    )
    op.create_index('ix_market_categories_parent_id', 'market_categories', ['parent_id'])
    op.create_index(
        'ix_market_categories_active_sort',
        'market_categories',
        ['is_active', 'sort_order'],
    )

    op.create_table(
        'market_seller_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('phone', sa.String(length=40), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('org_id', name='uq_market_seller_profiles_org_id'),
    )
    op.create_index('ix_market_seller_profiles_org_id', 'market_seller_profiles', ['org_id'])

    op.create_table(
        'market_listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seller_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('unit', sa.String(length=40), nullable=False),
        sa.Column(
            'quantity_available',
            sa.Numeric(12, 2),
            nullable=False,
            server_default='0',
        ),
        sa.Column(
            'photos',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='draft'),
        sa.Column('source_type', sa.String(length=20), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')",
            name='market_listings_status_chk',
        ),
        sa.CheckConstraint(
            "source_type IS NULL OR source_type IN ('manual', 'inventory', 'shipment')",
            name='market_listings_source_type_chk',
        ),
        sa.CheckConstraint('price >= 0', name='market_listings_price_chk'),
        sa.CheckConstraint('quantity_available >= 0', name='market_listings_qty_chk'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['seller_profile_id'],
            ['market_seller_profiles.id'],
            ondelete='RESTRICT',
        ),
        sa.ForeignKeyConstraint(
            ['category_id'],
            ['market_categories.id'],
            ondelete='RESTRICT',
        ),
    )
    op.create_index(
        'ix_market_listings_status_category',
        'market_listings',
        ['status', 'category_id'],
    )
    op.create_index(
        'ix_market_listings_org_status',
        'market_listings',
        ['org_id', 'status'],
    )
    op.create_index(
        'ix_market_listings_seller_profile_id',
        'market_listings',
        ['seller_profile_id'],
    )
    op.create_index(
        'ix_market_listings_source',
        'market_listings',
        ['source_type', 'source_id'],
    )
    # Full-text prep for public search (portable 'simple' config).
    op.execute(
        sa.text(
            """
            CREATE INDEX ix_market_listings_title_description_fts
            ON market_listings
            USING gin (
              to_tsvector(
                'simple',
                coalesce(title, '') || ' ' || coalesce(description, '')
              )
            )
            """
        )
    )

    op.create_table(
        'market_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('listing_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('buyer_name', sa.String(length=200), nullable=False),
        sa.Column('buyer_phone', sa.String(length=40), nullable=False),
        sa.Column('buyer_comment', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='new'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled')",
            name='market_orders_status_chk',
        ),
        sa.CheckConstraint('quantity > 0', name='market_orders_quantity_chk'),
        sa.ForeignKeyConstraint(
            ['listing_id'],
            ['market_listings.id'],
            ondelete='RESTRICT',
        ),
    )
    op.create_index('ix_market_orders_listing_id', 'market_orders', ['listing_id'])
    op.create_index('ix_market_orders_status_created', 'market_orders', ['status', 'created_at'])

    op.create_table(
        'market_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            'org_id',
            postgresql.UUID(as_uuid=True),
            nullable=False,
            comment='Seller organization being reviewed',
        ),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('author_name', sa.String(length=200), nullable=False),
        sa.Column('rating', sa.SmallInteger(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            'rating >= 1 AND rating <= 5',
            name='market_reviews_rating_chk',
        ),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['order_id'],
            ['market_orders.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_market_reviews_org_id', 'market_reviews', ['org_id'])
    op.create_index(
        'ix_market_reviews_org_visible',
        'market_reviews',
        ['org_id', 'is_visible'],
    )


def downgrade() -> None:
    op.drop_index('ix_market_reviews_org_visible', table_name='market_reviews')
    op.drop_index('ix_market_reviews_org_id', table_name='market_reviews')
    op.drop_table('market_reviews')

    op.drop_index('ix_market_orders_status_created', table_name='market_orders')
    op.drop_index('ix_market_orders_listing_id', table_name='market_orders')
    op.drop_table('market_orders')

    op.execute(sa.text('DROP INDEX IF EXISTS ix_market_listings_title_description_fts'))
    op.drop_index('ix_market_listings_source', table_name='market_listings')
    op.drop_index('ix_market_listings_seller_profile_id', table_name='market_listings')
    op.drop_index('ix_market_listings_org_status', table_name='market_listings')
    op.drop_index('ix_market_listings_status_category', table_name='market_listings')
    op.drop_table('market_listings')

    op.drop_index('ix_market_seller_profiles_org_id', table_name='market_seller_profiles')
    op.drop_table('market_seller_profiles')

    op.drop_index('ix_market_categories_active_sort', table_name='market_categories')
    op.drop_index('ix_market_categories_parent_id', table_name='market_categories')
    op.drop_table('market_categories')

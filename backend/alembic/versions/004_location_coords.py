"""Add latitude/longitude to locations for field markers."""

from alembic import op
import sqlalchemy as sa


revision = '004_location_coords'
down_revision = '003_expense_equipment'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('locations', sa.Column('latitude', sa.Numeric(9, 6), nullable=True))
    op.add_column('locations', sa.Column('longitude', sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column('locations', 'longitude')
    op.drop_column('locations', 'latitude')

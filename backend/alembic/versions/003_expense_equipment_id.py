"""Add expenses.equipment_id for linking costs to equipment."""

from alembic import op
import sqlalchemy as sa


revision = '003_expense_equipment'
down_revision = '002_stage3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'expenses',
        sa.Column('equipment_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_expenses_equipment_id',
        'expenses',
        'equipment',
        ['equipment_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_expenses_equipment_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'equipment_id')

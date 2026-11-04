"""add_officer_location_history

Revision ID: f0259b2c132c
Revises: bc12bacdce22
Create Date: 2026-05-09 15:13:11.724629

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0259b2c132c'
down_revision: Union[str, Sequence[str], None] = 'bc12bacdce22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'officer_location_history',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('heading', sa.Float(), nullable=True),
        sa.Column('speed', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_officer_location_history_id'), 'officer_location_history', ['id'], unique=False)
    op.create_index(op.f('ix_officer_location_history_user_id'), 'officer_location_history', ['user_id'], unique=False)
    op.create_index(op.f('ix_officer_location_history_recorded_at'), 'officer_location_history', ['recorded_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_officer_location_history_recorded_at'), table_name='officer_location_history')
    op.drop_index(op.f('ix_officer_location_history_user_id'), table_name='officer_location_history')
    op.drop_index(op.f('ix_officer_location_history_id'), table_name='officer_location_history')
    op.drop_table('officer_location_history')

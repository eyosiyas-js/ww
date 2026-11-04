"""add dispatch_message column to detection

Revision ID: add_dispatch_message
Revises: 
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_dispatch_message'
down_revision = '246234d6dca0'  # Merge heads migration
branch_labels = None
depends_on = None


def upgrade():
    # Add dispatch_message column to detection table
    op.add_column('detection', sa.Column('dispatch_message', sa.String(), nullable=True))


def downgrade():
    # Remove dispatch_message column from detection table
    op.drop_column('detection', 'dispatch_message')

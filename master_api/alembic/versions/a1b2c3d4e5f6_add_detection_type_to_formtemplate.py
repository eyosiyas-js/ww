"""add detection_type to formtemplate

Revision ID: a1b2c3d4e5f6
Revises: c183c86306ef
Create Date: 2026-04-19 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'c183c86306ef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('formtemplate', sa.Column('detection_type', sa.String(), server_default='person', nullable=True))


def downgrade() -> None:
    op.drop_column('formtemplate', 'detection_type')

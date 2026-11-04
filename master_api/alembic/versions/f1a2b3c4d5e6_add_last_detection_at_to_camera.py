"""add last_detection_at to camera

Revision ID: f1a2b3c4d5e6
Revises: eda79288ed2b
Create Date: 2026-04-23 12:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('camera',
        sa.Column('last_detection_at', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('camera', 'last_detection_at')

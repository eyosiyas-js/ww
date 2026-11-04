"""merge_heads

Revision ID: 246234d6dca0
Revises: add_dispatch_message, cc7c50153a8d
Create Date: 2026-05-13 16:59:41.535552

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '246234d6dca0'
down_revision: Union[str, Sequence[str], None] = ('add_dispatch_message', 'cc7c50153a8d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

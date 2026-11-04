"""merge_audit_log_and_national_id

Revision ID: cf090d0409d9
Revises: 7a2419deec6b, a60d6af077cc
Create Date: 2026-05-11 20:43:56.916382

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf090d0409d9'
down_revision: Union[str, Sequence[str], None] = ('7a2419deec6b', 'a60d6af077cc')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

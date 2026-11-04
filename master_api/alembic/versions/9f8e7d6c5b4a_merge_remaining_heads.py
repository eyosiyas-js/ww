"""merge_remaining_heads

Revision ID: 9f8e7d6c5b4a
Revises: cf090d0409d9, f1a2b3c4d5e6
Create Date: 2026-05-13 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f8e7d6c5b4a'
down_revision: Union[str, Sequence[str], None] = ('cf090d0409d9', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

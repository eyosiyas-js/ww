"""add_audit_log_table

Revision ID: 7a2419deec6b
Revises: f0259b2c132c
Create Date: 2026-05-10 15:52:11.859022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a2419deec6b'
down_revision: Union[str, Sequence[str], None] = 'f0259b2c132c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'audit_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('user_name', sa.String(), nullable=True),
        sa.Column('user_email', sa.String(), nullable=True),
        sa.Column('organization_id', sa.String(), nullable=True),
        sa.Column('organization_name', sa.String(), nullable=True),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('module', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=True),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('entity_name', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_action_type'), 'audit_log', ['action_type'], unique=False)
    op.create_index(op.f('ix_audit_log_entity_id'), 'audit_log', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_log_id'), 'audit_log', ['id'], unique=False)
    op.create_index(op.f('ix_audit_log_module'), 'audit_log', ['module'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_audit_log_module'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_id'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_entity_id'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_action_type'), table_name='audit_log')
    op.drop_table('audit_log')

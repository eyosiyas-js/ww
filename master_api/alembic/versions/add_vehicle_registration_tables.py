"""add vehicle registration tables

Revision ID: vehicle_reg_001
Revises: 
Create Date: 2026-05-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'vehicle_reg_001'
down_revision = None  # Update this to the latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Create vehicle_registration table
    op.create_table(
        'vehicle_registration',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('plate_number', sa.String(), nullable=False),
        sa.Column('vehicle_make', sa.String(), nullable=False),
        sa.Column('vehicle_model', sa.String(), nullable=False),
        sa.Column('vehicle_year', sa.Integer(), nullable=False),
        sa.Column('vehicle_color', sa.String(), nullable=False),
        sa.Column('vehicle_type', sa.String(), nullable=False),
        sa.Column('vin_number', sa.String(), nullable=True),
        sa.Column('engine_number', sa.String(), nullable=True),
        sa.Column('chassis_number', sa.String(), nullable=True),
        sa.Column('registration_date', sa.Date(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('registration_status', sa.String(), nullable=True),
        sa.Column('region_code', sa.String(), nullable=True),
        sa.Column('issuing_authority', sa.String(), nullable=True),
        sa.Column('owner_name', sa.String(), nullable=False),
        sa.Column('owner_national_id', sa.String(), nullable=True),
        sa.Column('owner_address', sa.Text(), nullable=True),
        sa.Column('owner_phone', sa.String(), nullable=True),
        sa.Column('owner_email', sa.String(), nullable=True),
        sa.Column('insurance_company', sa.String(), nullable=True),
        sa.Column('insurance_policy_number', sa.String(), nullable=True),
        sa.Column('insurance_expiry_date', sa.Date(), nullable=True),
        sa.Column('insurance_status', sa.String(), nullable=True),
        sa.Column('engine_capacity', sa.String(), nullable=True),
        sa.Column('fuel_type', sa.String(), nullable=True),
        sa.Column('transmission_type', sa.String(), nullable=True),
        sa.Column('seating_capacity', sa.Integer(), nullable=True),
        sa.Column('is_stolen', sa.Boolean(), nullable=True),
        sa.Column('is_wanted', sa.Boolean(), nullable=True),
        sa.Column('has_violations', sa.Boolean(), nullable=True),
        sa.Column('violation_count', sa.Integer(), nullable=True),
        sa.Column('outstanding_fines', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('additional_info', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('last_inspection_date', sa.Date(), nullable=True),
        sa.Column('next_inspection_date', sa.Date(), nullable=True),
        sa.Column('vehicle_photo_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_registration_id'), 'vehicle_registration', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_registration_plate_number'), 'vehicle_registration', ['plate_number'], unique=True)
    op.create_index(op.f('ix_vehicle_registration_vin_number'), 'vehicle_registration', ['vin_number'], unique=True)

    # Create detection_vehicle_match table
    op.create_table(
        'detection_vehicle_match',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('detection_id', sa.String(), nullable=False),
        sa.Column('vehicle_registration_id', sa.String(), nullable=False),
        sa.Column('confidence_score', sa.String(), nullable=False),
        sa.Column('match_type', sa.String(), nullable=False),
        sa.Column('match_source', sa.String(), nullable=False),
        sa.Column('match_details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('verified_by_user_id', sa.String(), nullable=True),
        sa.Column('verification_notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['detection_id'], ['detection.id'], ),
        sa.ForeignKeyConstraint(['vehicle_registration_id'], ['vehicle_registration.id'], ),
        sa.ForeignKeyConstraint(['verified_by_user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_detection_vehicle_match_id'), 'detection_vehicle_match', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_detection_vehicle_match_id'), table_name='detection_vehicle_match')
    op.drop_table('detection_vehicle_match')
    op.drop_index(op.f('ix_vehicle_registration_vin_number'), table_name='vehicle_registration')
    op.drop_index(op.f('ix_vehicle_registration_plate_number'), table_name='vehicle_registration')
    op.drop_index(op.f('ix_vehicle_registration_id'), table_name='vehicle_registration')
    op.drop_table('vehicle_registration')

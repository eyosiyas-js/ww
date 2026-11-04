"""
Migration script to add national_id_number column to detection table
and create national_id_profile and detection_national_id_match tables.
"""
import sys
sys.path.insert(0, '/home/ubuntu/cims/master_api')

from app.core.config import settings
from sqlalchemy import create_engine, text

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

migrations = [
    # Add national_id_number to detection table
    """
    ALTER TABLE detection 
    ADD COLUMN IF NOT EXISTS national_id_number VARCHAR;
    """,
    
    # Create national_id_profile table if not exists
    """
    CREATE TABLE IF NOT EXISTS national_id_profile (
        id VARCHAR PRIMARY KEY,
        national_id_number VARCHAR UNIQUE NOT NULL,
        full_name VARCHAR NOT NULL,
        first_name VARCHAR NOT NULL,
        middle_name VARCHAR,
        last_name VARCHAR NOT NULL,
        gender VARCHAR NOT NULL,
        date_of_birth DATE NOT NULL,
        nationality VARCHAR NOT NULL,
        address TEXT,
        region VARCHAR,
        city VARCHAR,
        phone_number VARCHAR,
        email VARCHAR,
        occupation VARCHAR,
        status VARCHAR DEFAULT 'active',
        registration_date DATE,
        expiry_date DATE,
        issuing_authority VARCHAR,
        emergency_contact_name VARCHAR,
        emergency_contact_phone VARCHAR,
        emergency_contact_relationship VARCHAR,
        profile_photo_url VARCHAR,
        additional_info JSONB,
        is_verified BOOLEAN DEFAULT TRUE,
        verification_date TIMESTAMP,
        face_embedding BYTEA,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """,
    
    # Create detection_national_id_match table if not exists
    """
    CREATE TABLE IF NOT EXISTS detection_national_id_match (
        id VARCHAR PRIMARY KEY,
        detection_id VARCHAR REFERENCES detection(id),
        national_id_profile_id VARCHAR REFERENCES national_id_profile(id),
        confidence_score VARCHAR NOT NULL,
        match_type VARCHAR NOT NULL,
        match_source VARCHAR NOT NULL,
        match_details JSONB,
        verified_by_user_id VARCHAR REFERENCES "user"(id),
        verification_notes TEXT,
        status VARCHAR DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """,

    # Create index
    """
    CREATE INDEX IF NOT EXISTS ix_national_id_profile_national_id_number
    ON national_id_profile(national_id_number);
    """,
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"SUCCESS: {sql.strip()[:60]}...")
        except Exception as e:
            conn.rollback()
            print(f"ERROR: {str(e)[:200]}")

print("\nMigration complete!")

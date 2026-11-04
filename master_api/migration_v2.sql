-- Aligns database with models

-- Ensure SystemSetting table exists
CREATE TABLE IF NOT EXISTS systemsetting (
    key VARCHAR PRIMARY KEY,
    value JSON,
    description VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure Detection columns are present
ALTER TABLE detection ADD COLUMN IF NOT EXISTS assignment_type VARCHAR DEFAULT 'company';

-- Create DetectionAssignment table
CREATE TABLE IF NOT EXISTS detectionassignment (
    id VARCHAR PRIMARY KEY,
    detection_id VARCHAR REFERENCES detection(id),
    user_id VARCHAR REFERENCES "user"(id),
    distance_at_assignment DOUBLE PRECISION,
    status VARCHAR DEFAULT 'assigned',
    notes VARCHAR,
    proof_urls JSON,
    assigned_at TIMESTAMP WITHOUT TIME ZONE,
    closed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

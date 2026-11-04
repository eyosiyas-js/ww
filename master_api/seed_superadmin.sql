-- =============================================================================
-- CIMS Database Initializer - Superadmin & Organization SQL Seeder
-- =============================================================================
-- Execute this script directly in psql, pgAdmin, or any PostgreSQL client:
--   psql -U postgres -d backend -f seed_superadmin.sql
-- =============================================================================

BEGIN;

-- 1. Ensure core tables exist
CREATE TABLE IF NOT EXISTS "organization" (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    admin_email VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'active',
    company_type VARCHAR DEFAULT 'general',
    features JSON DEFAULT '{}'::json,
    parent_id VARCHAR REFERENCES "organization"(id),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "role" (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    permissions JSON,
    organization_id VARCHAR REFERENCES "organization"(id),
    users_count INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user" (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    organization_id VARCHAR REFERENCES "organization"(id),
    role_id VARCHAR REFERENCES "role"(id),
    status VARCHAR DEFAULT 'active',
    expo_push_token VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed System Roles
INSERT INTO "role" (id, name, description, permissions, organization_id, users_count, is_system, created_at, updated_at)
VALUES 
    ('role-super-admin', 'Super Admin', 'Global system administrator', '["*"]'::json, NULL, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role-admin', 'Admin', 'Organization administrator', '["users.manage", "cameras.manage", "reports.view"]'::json, NULL, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role-operator', 'Operator', 'Surveillance operator', '["cameras.view", "detections.view", "cases.view", "cases.manage"]'::json, NULL, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Seed Base Organization ("Main Administration")
INSERT INTO "organization" (id, name, admin_email, status, company_type, features, parent_id, lat, lng, created_at, updated_at)
VALUES 
    ('org-admin-main', 'Main Administration', 'admin@cims.com', 'active', 'general', '{}'::json, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    admin_email = EXCLUDED.admin_email,
    status = EXCLUDED.status,
    company_type = EXCLUDED.company_type,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Seed Superadmin User (password: admin123)
INSERT INTO "user" (id, email, hashed_password, full_name, organization_id, role_id, status, expo_push_token, created_at, updated_at)
VALUES 
    ('usr-super-admin', 'admin@cims.com', '$pbkdf2-sha256$29000$0BpjDKH0/t.bszYmZGztXQ$FiPGPPH4E5YGiEoBcZ0lDhY/p47M8cmF.IoNlI/hBaA', 'Global Administrator', 'org-admin-main', 'role-super-admin', 'active', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    hashed_password = EXCLUDED.hashed_password,
    full_name = EXCLUDED.full_name,
    organization_id = EXCLUDED.organization_id,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;

-- Output confirmation
SELECT 'CIMS Superadmin (admin@cims.com / admin123) and Main Administration successfully seeded.' AS status;

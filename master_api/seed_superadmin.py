#!/usr/bin/env python3
"""
=============================================================================
CIMS Database Initializer - Superadmin & Organization Seeder
=============================================================================
This script safely initializes a target PostgreSQL database for CIMS by seeding:
  1. Base Organization: "Main Administration" (org-admin-main)
  2. Core System Roles: "Super Admin", "Admin", "Operator"
  3. Superadmin Account: "admin@cims.com" (usr-super-admin)

Design Principles:
  - Idempotent: Safe to run repeatedly; existing records are updated or preserved.
  - Non-destructive: Does not overwrite or delete existing customer data.
  - Secure: Database credentials can be read from environment variables, .env,
            command-line arguments, or interactive input.
=============================================================================
"""

import os
import sys
import argparse
import json
import getpass
from datetime import datetime, timezone

# ── Source-of-Truth Seed Data (extracted from master CIMS system) ────────────

ORG_SEED = {
    "id": "org-admin-main",
    "name": "Main Administration",
    "admin_email": "admin@cims.com",
    "status": "active",
    "company_type": "general",
    "features": {},
    "parent_id": None,
    "lat": None,
    "lng": None,
}

ROLES_SEED = [
    {
        "id": "role-super-admin",
        "name": "Super Admin",
        "description": "Global system administrator",
        "permissions": ["*"],
        "organization_id": None,
        "is_system": True,
        "users_count": 1,
    },
    {
        "id": "role-admin",
        "name": "Admin",
        "description": "Organization administrator",
        "permissions": ["users.manage", "cameras.manage", "reports.view"],
        "organization_id": None,
        "is_system": True,
        "users_count": 0,
    },
    {
        "id": "role-operator",
        "name": "Operator",
        "description": "Surveillance operator",
        "permissions": ["cameras.view", "detections.view", "cases.view", "cases.manage"],
        "organization_id": None,
        "is_system": True,
        "users_count": 0,
    },
]

# Default password is 'admin123' hashed with pbkdf2_sha256
DEFAULT_PASSWORD_HASH = "$pbkdf2-sha256$29000$0BpjDKH0/t.bszYmZGztXQ$FiPGPPH4E5YGiEoBcZ0lDhY/p47M8cmF.IoNlI/hBaA"

USER_SEED = {
    "id": "usr-super-admin",
    "email": "admin@cims.com",
    "full_name": "Global Administrator",
    "organization_id": "org-admin-main",
    "role_id": "role-super-admin",
    "status": "active",
    "expo_push_token": None,
    "hashed_password": DEFAULT_PASSWORD_HASH,
}


def load_env_file(filepath: str):
    """Load key-value pairs from a file into os.environ if not already set."""
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass


def resolve_connection_config(args):
    """Resolve database configuration from CLI args, env vars, or .env files."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(script_dir, ".env"),
        os.path.join(script_dir, "..", ".env"),
        os.path.join(script_dir, "config", "cims.env"),
        os.path.join(script_dir, "packaging", "config", "cims.env"),
    ]
    for c in candidates:
        load_env_file(c)

    # Check fallback settings from app if installed
    default_server = "localhost"
    default_user = "postgres"
    default_db = "backend"
    default_password = ""

    try:
        from app.core.config import settings
        default_server = getattr(settings, "POSTGRES_SERVER", default_server)
        default_user = getattr(settings, "POSTGRES_USER", default_user)
        default_db = getattr(settings, "POSTGRES_DB", default_db)
        default_password = getattr(settings, "POSTGRES_PASSWORD", default_password)
    except Exception:
        pass

    host = args.host or os.environ.get("POSTGRES_SERVER", default_server)
    port = args.port or int(os.environ.get("POSTGRES_PORT", 5432))
    user = args.user or os.environ.get("POSTGRES_USER", default_user)
    password = args.password or os.environ.get("POSTGRES_PASSWORD", default_password)
    dbname = args.dbname or os.environ.get("POSTGRES_DB", default_db)

    # Prompt interactively for password if completely missing and stdin is terminal
    if not password and sys.stdin.isatty():
        try:
            password = getpass.getpass(f"Enter PostgreSQL password for user '{user}': ")
        except Exception:
            pass

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "dbname": dbname,
    }


def hash_plain_password(plain_password: str) -> str:
    """Hash a password using passlib pbkdf2_sha256 if installed, else fallback."""
    try:
        from passlib.hash import pbkdf2_sha256
        return pbkdf2_sha256.hash(plain_password)
    except ImportError:
        import hashlib, base64, secrets
        salt = secrets.token_bytes(16)
        salt_b64 = base64.b64encode(salt).decode("ascii").rstrip("=")
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 29000)
        key_b64 = base64.b64encode(key).decode("ascii").rstrip("=")
        return f"$pbkdf2-sha256$29000${salt_b64}${key_b64}"


def run_seeder():
    parser = argparse.ArgumentParser(
        description="Initialize CIMS PostgreSQL Database with Superadmin & Main Administration Organization."
    )
    parser.add_argument("--host", help="PostgreSQL server host (default: from .env or localhost)")
    parser.add_argument("--port", type=int, help="PostgreSQL server port (default: from .env or 5432)")
    parser.add_argument("--user", help="PostgreSQL database user (default: from .env or postgres)")
    parser.add_argument("--password", help="PostgreSQL database password (default: from .env)")
    parser.add_argument("--dbname", help="PostgreSQL database name (default: from .env or backend)")
    parser.add_argument("--admin-password", help="Custom password for superadmin (default: admin123)")

    args = parser.parse_args()
    config = resolve_connection_config(args)

    print("=" * 65)
    print("  CIMS Database Initializer - Superadmin & Organization Seeder")
    print("=" * 65)
    print(f"  Target Host:     {config['host']}:{config['port']}")
    print(f"  Database Name:   {config['dbname']}")
    print(f"  User:            {config['user']}")
    print("=" * 65)

    # 1. Connect to PostgreSQL
    try:
        import psycopg2
        from psycopg2.extras import Json
    except ImportError:
        print("\n[ERROR] Missing required library: 'psycopg2'.")
        print("Please install it with: pip install psycopg2-binary\n")
        sys.exit(1)

    print("\n[1/4] Connecting to target PostgreSQL database...")
    try:
        conn = psycopg2.connect(
            host=config["host"],
            port=config["port"],
            user=config["user"],
            password=config["password"],
            dbname=config["dbname"],
        )
        conn.autocommit = False
        cur = conn.cursor()
        print("      [OK] Database connection established successfully.")
    except Exception as e:
        print(f"      [ERROR] Connection failed: {e}")
        print("\nPlease check your credentials in .env or pass flags: --host, --user, --password, --dbname.")
        sys.exit(1)

    try:
        # 2. Verify or create tables
        print("\n[2/4] Verifying database schema...")
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('organization', 'role', 'user');
        """)
        existing_tables = {row[0] for row in cur.fetchall()}

        if not {'organization', 'role', 'user'}.issubset(existing_tables):
            print("      [INFO] Required tables not yet present. Creating base schema...")
            cur.execute("""
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
            """)

            cur.execute("""
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
            """)

            cur.execute("""
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
            """)
            print("      [OK] Base schema created successfully.")
        else:
            print("      [OK] Tables 'organization', 'role', and 'user' exist.")

        # 3. Seed Roles & Organization
        print("\n[3/4] Seeding core roles and organization...")

        # A. Seed System Roles
        for role_data in ROLES_SEED:
            cur.execute("""
                INSERT INTO "role" (id, name, description, permissions, organization_id, users_count, is_system, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    permissions = EXCLUDED.permissions,
                    is_system = EXCLUDED.is_system,
                    updated_at = CURRENT_TIMESTAMP;
            """, (
                role_data["id"],
                role_data["name"],
                role_data["description"],
                Json(role_data["permissions"]),
                role_data["organization_id"],
                role_data["users_count"],
                role_data["is_system"],
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ))
            print(f"      - Role: {role_data['name']} ({role_data['id']}) [OK]")

        # B. Seed Main Administration Organization
        cur.execute("""
            INSERT INTO "organization" (id, name, admin_email, status, company_type, features, parent_id, lat, lng, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                admin_email = EXCLUDED.admin_email,
                status = EXCLUDED.status,
                company_type = EXCLUDED.company_type,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            ORG_SEED["id"],
            ORG_SEED["name"],
            ORG_SEED["admin_email"],
            ORG_SEED["status"],
            ORG_SEED["company_type"],
            Json(ORG_SEED["features"]),
            ORG_SEED["parent_id"],
            ORG_SEED["lat"],
            ORG_SEED["lng"],
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        ))
        print(f"      - Organization: {ORG_SEED['name']} ({ORG_SEED['id']}) [OK]")

        # 4. Seed Superadmin User
        print("\n[4/4] Seeding Superadmin User...")
        
        if args.admin_password:
            password_hash = hash_plain_password(args.admin_password)
            password_display = args.admin_password
        else:
            password_hash = USER_SEED["hashed_password"]
            password_display = "admin123 (default)"

        cur.execute("""
            INSERT INTO "user" (id, email, hashed_password, full_name, organization_id, role_id, status, expo_push_token, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                hashed_password = EXCLUDED.hashed_password,
                full_name = EXCLUDED.full_name,
                organization_id = EXCLUDED.organization_id,
                role_id = EXCLUDED.role_id,
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            USER_SEED["id"],
            USER_SEED["email"],
            password_hash,
            USER_SEED["full_name"],
            USER_SEED["organization_id"],
            USER_SEED["role_id"],
            USER_SEED["status"],
            USER_SEED["expo_push_token"],
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        ))
        print(f"      - User: {USER_SEED['full_name']} <{USER_SEED['email']}> [OK]")

        conn.commit()
        print("\n" + "=" * 65)
        print("  DATABASE INITIALIZATION COMPLETE")
        print("=" * 65)
        print("  Superadmin credentials are ready to use:")
        print(f"    - Email:        {USER_SEED['email']}")
        print(f"    - Password:     {password_display}")
        print(f"    - Organization: {ORG_SEED['name']}")
        print(f"    - Role:         Super Admin")
        print("=" * 65)
        print("  You can now start CIMS and log in immediately.\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_seeder()

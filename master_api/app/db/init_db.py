import os
import sys
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("cims.init_db")

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import (
    Organization,
    Role,
    User,
    SystemSetting,
    FormTemplate,
)


def ensure_database_exists():
    """
    Ensure the target PostgreSQL database exists.
    If it doesn't, connect to the default 'postgres' database and create it.
    """
    db_uri = settings.SQLALCHEMY_DATABASE_URI or ""
    if "postgresql" not in db_uri and "postgres" not in db_uri:
        # SQLite or other DB
        return

    server = settings.POSTGRES_SERVER
    port = int(os.environ.get("POSTGRES_PORT", 5432))
    user = settings.POSTGRES_USER
    password = settings.POSTGRES_PASSWORD
    target_db = settings.POSTGRES_DB

    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        logger.warning("psycopg2 is not available; skipping pre-emptive database existence check.")
        return

    # Check if target database already exists
    try:
        conn = psycopg2.connect(
            host=server,
            port=port,
            user=user,
            password=password,
            dbname=target_db,
            connect_timeout=3,
        )
        conn.close()
        logger.info(f"Target database '{target_db}' is accessible.")
        return
    except psycopg2.OperationalError as e:
        err_msg = str(e).lower()
        if "does not exist" not in err_msg and "3d000" not in err_msg:
            logger.warning(f"Connection check to '{target_db}' yielded: {e}")
            return

    # Database does not exist; connect to maintenance database 'postgres' to create it
    logger.info(f"Database '{target_db}' does not exist. Creating it automatically...")
    try:
        mconn = psycopg2.connect(
            host=server,
            port=port,
            user=user,
            password=password,
            dbname="postgres",
            connect_timeout=5,
        )
        mconn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with mconn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
            if not cur.fetchone():
                cur.execute(f'CREATE DATABASE "{target_db}"')
                logger.info(f"✅ Database '{target_db}' created successfully.")
        mconn.close()
    except Exception as e:
        logger.error(f"Failed to create database '{target_db}': {e}")


def create_all_tables():
    """Create all registered database tables if they do not already exist."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All core database tables verified/created via SQLAlchemy.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def apply_schema_upgrades():
    """
    Apply safe, non-destructive schema upgrades for any columns added in recent versions.
    Using 'ADD COLUMN IF NOT EXISTS' ensures safety and idempotency on PostgreSQL.
    """
    db_uri = settings.SQLALCHEMY_DATABASE_URI or ""
    if "postgresql" not in db_uri and "postgres" not in db_uri:
        return

    upgrade_columns = [
        # organization
        ("organization", "company_type", "VARCHAR DEFAULT 'general'"),
        ("organization", "features", "JSON DEFAULT '{}'::json"),
        ("organization", "parent_id", "VARCHAR REFERENCES \"organization\"(id)"),
        ("organization", "lat", "DOUBLE PRECISION"),
        ("organization", "lng", "DOUBLE PRECISION"),
        # role
        ("role", "is_system", "BOOLEAN DEFAULT FALSE"),
        ("role", "users_count", "INTEGER DEFAULT 0"),
        # user
        ("user", "expo_push_token", "VARCHAR"),
        ("user", "status", "VARCHAR DEFAULT 'active'"),
        # camera
        ("camera", "camera_stream_id", "VARCHAR"),
        ("camera", "linked_traffic_company_id", "VARCHAR REFERENCES \"organization\"(id)"),
        ("camera", "last_detection_at", "TIMESTAMP"),
        ("camera", "is_flagged", "BOOLEAN DEFAULT FALSE"),
        # detection
        ("detection", "assignment_type", "VARCHAR DEFAULT 'company'"),
        ("detection", "allow_external_assignment", "BOOLEAN DEFAULT FALSE"),
        ("detection", "plate_number", "VARCHAR"),
        ("detection", "code", "VARCHAR"),
        ("detection", "region", "VARCHAR"),
        ("detection", "national_id_number", "VARCHAR"),
        ("detection", "dispatch_message", "VARCHAR"),
        ("detection", "detection_events", "JSON"),
        ("detection", "face_embedding", "BYTEA"),
        ("detection", "dynamic_data", "JSON"),
        # formtemplate
        ("formtemplate", "detection_type", "VARCHAR DEFAULT 'person'"),
    ]

    try:
        with engine.connect() as conn:
            for table, col_name, col_type in upgrade_columns:
                try:
                    conn.execute(
                        text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS {col_name} {col_type};')
                    )
                except Exception:
                    pass
            conn.commit()
    except Exception as e:
        logger.warning(f"Schema upgrade check encountered non-fatal error: {e}")


def seed_core_data():
    """
    Seed core initial records idempotently:
      1. Default Organization: "Main Administration"
      2. System Roles: "Super Admin", "Admin", "Operator"
      3. Superadmin User: "admin@cims.com" / "admin123"
      4. Default System Settings
      5. Default Form Template
    """
    db: Session = SessionLocal()
    try:
        # ── 1. Organization ──────────────────────────────────────────────
        org = db.query(Organization).filter(Organization.id == "org-admin-main").first()
        if not org:
            org = db.query(Organization).first()
            if not org:
                org = Organization(
                    id="org-admin-main",
                    name="Main Administration",
                    admin_email="admin@cims.com",
                    status="active",
                    company_type="general",
                    features={},
                )
                db.add(org)
                db.commit()
                db.refresh(org)
                logger.info("✅ Seeded organization: 'Main Administration' (org-admin-main)")

        org_id = org.id

        # ── 2. Roles ─────────────────────────────────────────────────────
        roles_seed = [
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

        super_role_id = "role-super-admin"
        for r_data in roles_seed:
            existing_role = db.query(Role).filter(
                (Role.id == r_data["id"]) | (Role.name == r_data["name"])
            ).first()

            if not existing_role:
                new_role = Role(**r_data)
                db.add(new_role)
                db.commit()
                logger.info(f"✅ Seeded role: '{r_data['name']}' ({r_data['id']})")
                if r_data["id"] == "role-super-admin":
                    super_role_id = new_role.id
            else:
                if r_data["id"] == "role-super-admin":
                    super_role_id = existing_role.id
                    if existing_role.permissions != ["*"] or not existing_role.is_system:
                        existing_role.permissions = ["*"]
                        existing_role.is_system = True
                        db.commit()

        # ── 3. Superadmin User ───────────────────────────────────────────
        admin_user = db.query(User).filter(
            (User.id == "usr-super-admin") | (User.email == "admin@cims.com")
        ).first()

        if not admin_user:
            hashed_pwd = get_password_hash("admin123")
            admin_user = User(
                id="usr-super-admin",
                email="admin@cims.com",
                full_name="Global Administrator",
                hashed_password=hashed_pwd,
                organization_id=org_id,
                role_id=super_role_id,
                status="active",
            )
            db.add(admin_user)
            db.commit()
            logger.info("✅ Seeded default Super Admin user: admin@cims.com (password: admin123)")
        else:
            changed = False
            if not admin_user.role_id:
                admin_user.role_id = super_role_id
                changed = True
            if not admin_user.organization_id:
                admin_user.organization_id = org_id
                changed = True
            if changed:
                db.commit()

        # ── 4. System Settings ───────────────────────────────────────────
        default_settings = [
            ("camera_alert_timeout_minutes", 5, "Timeout in minutes before camera alert status is reset"),
            ("assignment_radius_traffic", 10.0, "Dispatch radius for traffic companies in kilometers"),
            ("assignment_radius_standard", 5.0, "Dispatch radius for standard assignments in kilometers"),
            ("officer_staleness_minutes", 15.0, "Minutes before an officer location is considered stale"),
        ]

        for key, val, desc in default_settings:
            setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not setting:
                setting = SystemSetting(key=key, value=val, description=desc)
                db.add(setting)
                db.commit()
                logger.info(f"✅ Seeded system setting: {key} = {val}")

        # ── 5. Default Form Template ─────────────────────────────────────
        person_tpl = db.query(FormTemplate).filter(
            FormTemplate.organization_id == org_id,
            FormTemplate.detection_type == "person",
            FormTemplate.is_active == True,
        ).first()

        if not person_tpl:
            person_tpl = FormTemplate(
                id=f"form-{uuid.uuid4()}",
                name="Standard Person Report",
                description="Default form template for person detection and missing reports",
                fields=[
                    {"id": "clothing", "label": "Clothing Details", "type": "text", "required": False},
                    {"id": "last_seen_details", "label": "Last Seen Details", "type": "textarea", "required": False},
                    {"id": "contact_phone", "label": "Reporting Contact Phone", "type": "text", "required": False},
                ],
                is_active=True,
                detection_type="person",
                organization_id=org_id,
            )
            db.add(person_tpl)
            db.commit()
            logger.info("✅ Seeded default Person FormTemplate.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during core data seeding: {e}")
        raise
    finally:
        db.close()


def auto_init_database():
    """
    Complete automatic database initialization entrypoint:
      1. Ensure target database exists in PostgreSQL
      2. Create all 20 required tables
      3. Apply safe column upgrades
      4. Seed core Organization, Roles, Superadmin user, Settings, and FormTemplate
    """
    logger.info("=== Starting Automatic Database Initialization ===")
    ensure_database_exists()
    create_all_tables()
    apply_schema_upgrades()
    seed_core_data()
    logger.info("=== Database Initialization Finished Successfully ===")

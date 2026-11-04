import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.db.base import Base
# Ensure all models are imported so Base.metadata knows about them
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.models.operational import Camera, Detection, CameraAccess, WeaponDetection
from app.models.utility import Notification, FormTemplate
from app.core.security import get_password_hash
from datetime import datetime

def reset_to_clean():
    print("WARNING: This will delete ALL data on the platform!")
    # In a real interactive script we'd ask for confirmation here
    
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables from scratch...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed System Roles
        print("Seeding System Roles...")
        roles = {
            "super_admin": Role(
                id="role-super-admin",
                name="Super Admin",
                description="Global system administrator",
                permissions=["*"],
                is_system=True
            ),
            "company_admin": Role(
                id="role-company-admin",
                name="Company Admin",
                description="System company administrator",
                permissions=["*"],
                is_system=True
            ),
            "admin": Role(
                id="role-admin",
                name="Admin",
                description="Organization administrator",
                permissions=["users.manage", "cameras.manage", "reports.view"],
                is_system=True
            ),
            "operator": Role(
                id="role-operator",
                name="Operator",
                description="Surveillance operator",
                permissions=["cameras.view", "detections.view", "cases.view", "cases.manage"],
                is_system=True
            )
        }
        for r in roles.values():
            db.add(r)
        db.commit()

        # 2. Seed Main Administration Organization
        print("Seeding Main Administration Organization...")
        org = Organization(
            id="org-admin-main",
            name="Main Administration",
            admin_email="admin@cims.com",
            status="active"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # 3. Seed Super Admin User
        print("Seeding Super Admin User...")
        user = User(
            id="usr-super-admin",
            email="admin@cims.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Global Administrator",
            organization_id=org.id,
            role_id=roles["super_admin"].id,
            status="active"
        )
        db.add(user)
        db.commit()

        print("\nReset complete! Platform is now in a clean state.")
        print(f"Login: admin@cims.com")
        print(f"Password: admin123")
        print(f"Organization: {org.name}")
        
    except Exception as e:
        print(f"Error during reset: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_to_clean()

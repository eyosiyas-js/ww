import sys
import os
import uuid
from sqlalchemy.orm import Session
from datetime import datetime

# Ensure we can import from the app module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine
from app.db.base_class import Base
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.models.operational import Camera, Detection, Case
from app.models.utility import Notification, FormTemplate
from app.core.security import get_password_hash

from app.db.init_db import auto_init_database

def init_db():
    print("🔄 Initializing Database...")
    auto_init_database()
    print("\n🎉 Database initialization complete!")
    print("   You can now start the backend with: uvicorn app.main:app --reload")

if __name__ == "__main__":
    init_db()


def generate_id():
    return str(uuid.uuid4())

def seed_organization_and_role(db: Session):
    existing_org = db.query(Organization).first()
    if existing_org:
        print("   ℹ️  Organization already exists. Skipping.")
        org_id = existing_org.id
    else:
        print("   🏢 Seeding Default Organization...")
        org_id = generate_id()
        org = Organization(
            id=org_id,
            name="Default Organization",
            admin_email="admin@example.com",
            plan="enterprise",
            status="active"
        )
        db.add(org)
        print("   ✅ Organization added.")
        db.commit()

    existing_role = db.query(Role).filter(Role.name == "System Admin").first()
    if existing_role:
        print("   ℹ️  System Admin role already exists. Skipping.")
        role_id = existing_role.id
    else:
        print("   🔐 Seeding System Admin Role...")
        role_id = generate_id()
        role = Role(
            id=role_id,
            name="System Admin",
            description="Superuser role with all permissions",
            permissions=["all"],
            organization_id=org_id,
            is_system=True
        )
        db.add(role)
        print("   ✅ Role added.")
        db.commit()

    return org_id, role_id

def seed_admin_user(db: Session, org_id: str, role_id: str):
    email = "admin@example.com"
    password = "adminpassword"
    
    existing_user = db.query(User).filter(User.email == email).first()
    
    if existing_user:
        print(f"   ℹ️  Admin user '{email}' already exists.")
    else:
        print(f"   👤 Creating default Admin user: {email}")
        hashed_password = get_password_hash(password)
        new_user = User(
            id=generate_id(),
            email=email,
            full_name="System Admin",
            hashed_password=hashed_password,
            organization_id=org_id,
            role_id=role_id,
            status="active"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print("   ✅ Admin user created.")

def seed_cameras(db: Session, org_id: str):
    if db.query(Camera).count() > 0:
        print("   ℹ️  Cameras already exist. Skipping seed.")
        return

    print("   📷 Seeding sample camera...")
    cam = Camera(
        id=generate_id(),
        name="Front Entrance",
        location="Main Building - Floor 1",
        lat=40.7128,
        lng=-74.006,
        status="online",
        is_flagged=False,
        stream_url="rtsp://admin:admin@192.168.1.101/stream",
        organization_id=org_id
    )
    db.add(cam)
    db.commit()
    print("   ✅ Sample camera added.")

def seed_notifications(db: Session):
    if db.query(Notification).count() > 0:
        print("   ℹ️  Notifications already exist. Skipping seed.")
        return

    print("   🔔 Seeding sample notification...")
    user = db.query(User).first()
    if user:
        note = Notification(
            id=generate_id(),
            type="warning",
            title="Alert on Front Entrance",
            message="Person detected: John Doe",
            read=False,
            user_id=user.id
        )
        db.add(note)
        db.commit()
        print("   ✅ Sample notification added.")
    else:
        print("   ⚠️ Cannot seed notification, no user found.")

if __name__ == "__main__":
    init_db()

import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.models.operational import Camera, Detection, Case
from app.core.security import get_password_hash
from datetime import datetime

def seed_data():
    print("Dropping tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Sample Organization
        org = db.query(Organization).filter(Organization.name == "Metro Police Dept").first()
        if not org:
            print("Seeding Organization...")
            org = Organization(
                id="org-metro-001",
                name="Metro Police Dept",
                admin_email="admin@metro.police",
                status="active"
            )
            db.add(org)
            db.commit()
            db.refresh(org)
        
        # 2. Create Sample Roles
        admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if not admin_role:
            print("Seeding Roles...")
            admin_role = Role(
                id="role-admin-001",
                name="Super Admin",
                description="Global system administrator",
                permissions=["*"],
                is_system=True
            )
            operator_role = Role(
                id="role-operator-001",
                name="Operator",
                description="General surveillance operator",
                permissions=["cameras.view", "detections.view", "cases.manage"],
                is_system=True
            )
            db.add(admin_role)
            db.add(operator_role)
            db.commit()
            db.refresh(admin_role)
            
        # 3. Create Sample User
        user = db.query(User).filter(User.email == "admin@cims.com").first()
        if not user:
            print("Seeding User...")
            user = User(
                id="usr-admin-001",
                email="admin@cims.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                organization_id=org.id,
                role_id=admin_role.id,
                status="active"
            )
            db.add(user)
            db.commit()

        # 4. Create Sample Cameras
        print("Seeding Cameras...")
        cameras = [
            Camera(
                id="cam-001",
                name="Front Entrance",
                location="Main Gate",
                lat=40.7128,
                lng=-74.0060,
                status="online",
                is_flagged=False,
                stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                organization_id=org.id
            ),
            Camera(
                id="cam-002",
                name="Parking Lot A",
                location="Parking North",
                lat=40.7138,
                lng=-74.0070,
                status="online",
                is_flagged=True,
                stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                organization_id=org.id
            ),
            Camera(
                id="cam-003",
                name="Back Alley",
                location="Service Entrance",
                lat=40.7118,
                lng=-74.0050,
                status="offline",
                is_flagged=False,
                stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                organization_id=org.id
            ),
            Camera(
                id="cam-004",
                name="Lobby North",
                location="Reception",
                lat=40.7148,
                lng=-74.0080,
                status="maintenance",
                is_flagged=False,
                stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                organization_id=org.id
            ),
            Camera(
                id="cam-005",
                name="Server Room",
                location="Data Center",
                lat=40.7158,
                lng=-74.0090,
                status="online",
                is_flagged=False,
                stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                organization_id=org.id
            )
        ]
        db.add_all(cameras)
        db.commit()
            
        # 5. Create Sample Notifications
        from app.models.utility import Notification
        from datetime import timedelta
        
        print(f"Seeding Notifications for user: {user.email} (ID: {user.id})...")
        notifications = [
            Notification(
                id="notif-001",
                type="alert",
                title="Critical Match Found",
                message="Camera 2 (Central Park North) detected a high-priority target from Detection #det-001",
                read=False,
                action_url="/cameras?highlight=cam-002",
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(minutes=2)
            ),
            Notification(
                id="notif-002",
                type="alert",
                title="Secondary Match Confirmed",
                message="Camera 4 (Brooklyn Bridge Entry) also confirmed target from Detection #det-001",
                read=False,
                action_url="/cameras?highlight=cam-004",
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(minutes=5)
            ),
            Notification(
                id="notif-003",
                type="info",
                title="New Case Assigned",
                message="Case #case-001 (Wanted Person Investigation) has been assigned to your unit",
                read=True,
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(hours=2)
            ),
            Notification(
                id="notif-004",
                type="warning",
                title="Connectivity Alert",
                message="Camera 5 (Wall Street) has lost connection to the primary server",
                read=True,
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(hours=4)
            ),
            Notification(
                id="notif-005",
                type="success",
                title="Case Resolution",
                message="Case #case-003 (Package Investigation) has been successfully closed",
                read=True,
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=1)
            )
        ]
        
        print(f"Adding {len(notifications)} notifications...")
        db.add_all(notifications)
        db.commit()
            
        print("Seeding complete!")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

import sys
import os
import random
from datetime import datetime, timedelta

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.models.operational import Camera, Detection, Case
from app.models.utility import Notification
from app.core.security import get_password_hash

def seed_demo():
    print("Re-initializing database for demo...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. System Roles
        print("Seeding System Roles...")
        roles = {
            "super_admin": Role(
                id="role-super-admin",
                name="Super Admin",
                description="Global system administrator",
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
            db.merge(r)
        # db.add_all(roles.values())
        db.commit()

        # 2. Organizations
        print("Seeding Organizations...")
        orgs = [
            Organization(id="org-metro-police", name="Metro Police Dept", admin_email="admin@metro.police", status="active"),
            Organization(id="org-city-watch", name="City Watch Corp", admin_email="admin@citywatch.com", status="active"),
            Organization(id="org-campus-sec", name="Campus Security", admin_email="admin@campus.edu", status="active")
        ]
        for o in orgs:
            db.merge(o)
        db.commit()

        # 3. Users
        print("Seeding Users...")
        all_users = [
            # Global Super Admin
            User(
                id="usr-super-admin",
                email="admin@cims.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Global Administrator",
                organization_id=orgs[0].id,
                role_id=roles["super_admin"].id,
                status="active"
            )
        ]
        # Org-specific admins and operators (Officers)
        officer_names = [
            ("John McClane", "Detective"), ("Sarah Connor", "Sergeant"), 
            ("James Bond", "Agent"), ("Ellen Ripley", "Lieutenant"),
            ("Rick Deckard", "Inspector"), ("Clarice Starling", "Agent"),
            ("Martin Riggs", "Officer"), ("Alex Murphy", "Patrol")
        ]

        for i, org in enumerate(orgs):
            # Admin for each org
            all_users.append(User(
                id=f"usr-{org.id}-admin",
                email=f"admin@{org.id.replace('org-', '')}.com",
                hashed_password=get_password_hash("password123"),
                full_name=f"{org.name} Admin",
                organization_id=org.id,
                role_id=roles["admin"].id,
                status="active"
            ))
            
            # Additional Officers for each org
            for j, (name, rank) in enumerate(officer_names):
                username = name.lower().replace(" ", ".")
                email_domain = org.id.replace('org-', '')
                all_users.append(User(
                    id=f"usr-{org.id}-off-{j}",
                    email=f"{username}@{email_domain}.com",
                    hashed_password=get_password_hash("password123"),
                    full_name=f"{rank} {name}",
                    organization_id=org.id,
                    role_id=roles["operator"].id,
                    status="active"
                ))

        for u in all_users:
            db.merge(u)
        db.commit()

        # 4. Cameras
        print("Seeding Cameras...")
        all_cameras = []
        camera_locs = ["North Gate", "Main Lobby", "Parking A", "South Corridor", "Elevator Bank"]
        for org in orgs:
            for i, loc in enumerate(camera_locs):
                all_cameras.append(Camera(
                    id=f"cam-{org.id}-{i}",
                    name=f"{loc} Cam",
                    location=loc,
                    lat=40.7128 + random.uniform(-0.1, 0.1),
                    lng=-74.0060 + random.uniform(-0.1, 0.1),
                    status=random.choice(["online", "online", "online", "offline", "maintenance"]),
                    stream_url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                    organization_id=org.id
                ))
        for c in all_cameras:
            db.merge(c)
        db.commit()

        # 5. Detections & Cases (The Data)
        print("Seeding Detection/Case History (Last 12 Months)...")
        categories = ["person", "vehicle", "object"]
        subcategories = {
            "person": ["missing_person", "unauthorized_entry", "known_offender"],
            "vehicle": ["speeding", "unauthorized_parking", "stolen_vehicle"],
            "object": ["abandoned_bag", "weapon", "fire_hazard"]
        }
        
        # Use full year for more visibility in trends
        now = datetime.utcnow()
        for org in orgs:
            # Create ~40 detections per org spread over current year
            for d_idx in range(40):
                # Random time in last 280 days
                days_ago = random.randint(0, 280)
                hours_ago = random.randint(0, 23)
                timestamp = now - timedelta(days=days_ago, hours=hours_ago)
                
                cat = random.choice(categories)
                subcat = random.choice(subcategories[cat])
                
                det = Detection(
                    id=f"det-{org.id}-{d_idx}",
                    category=cat,
                    subcategory=subcat,
                    name=f"{subcat.replace('_', ' ').title()} Alert",
                    description=f"Automatic detection of {subcat} near {random.choice(camera_locs)}",
                    location=random.choice(camera_locs),
                    status=random.choice(["detected", "monitoring", "pending"]),
                    organization_id=org.id,
                    user_id=random.choice([u.id for u in all_users if u.organization_id == org.id]),
                    created_at=timestamp,
                    updated_at=timestamp
                )
                db.add(det)
                
                # ~40% chance of creating a case for this detection
                if random.random() < 0.4:
                    case_status = random.choice(["closed", "in_progress", "open", "closed"])
                    case_priority = random.choice(["low", "medium", "high", "critical"])
                    
                    case = Case(
                        id=f"case-{det.id}",
                        title=f"Incident: {det.name}",
                        description=det.description,
                        detection_id=det.id,
                        status=case_status,
                        priority=case_priority,
                        organization_id=org.id,
                        assigned_to=random.choice([u.id for u in all_users if u.organization_id == org.id]),
                        created_at=timestamp + timedelta(minutes=random.randint(5, 60)),
                        updated_at=timestamp + timedelta(hours=random.randint(2, 48)) if case_status == "closed" else timestamp
                    )
                    db.add(case)
                
                # Notifications for recent events
                if days_ago < 30:
                    notif = Notification(
                        id=f"notif-{det.id}-{random.randint(0, 1000)}",
                        type="alert" if det.category == "person" else "warning",
                        title=f"New {det.category} alert",
                        message=f"Activity detected at {det.location}",
                        read=random.choice([True, False, False]),
                        user_id=random.choice([u.id for u in all_users if u.organization_id == org.id]),
                        created_at=timestamp
                    )
                    db.add(notif)

        db.commit()
        print("Demo data seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding demo data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()

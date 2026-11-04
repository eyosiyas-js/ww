import sys
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.operational import Detection, Camera
from app.models.organization_role import Organization
from app.models.user import User

def clear_existing_detections(db):
    print("Clearing existing detections...")
    num_deleted = db.query(Detection).delete()
    db.commit()
    print(f"Deleted {num_deleted} existing detections.")

def seed_detections(db):
    # Fetch requisite data
    orgs = db.query(Organization).all()
    if not orgs:
        print("No organizations found! Cannot seed detections.")
        return
        
    users = db.query(User).all()
    if not users:
        print("No users found! Cannot seed detections.")
        return
        
    cameras = db.query(Camera).all()
    if not cameras:
        print("No cameras found! Cannot seed detections.")
        return

    print("Generating mock detection data...")

    categories = ["person", "vehicle", "object"]
    crime_types = [
        "theft", "vandalism", "trespassing", "assault", 
        "burglary", "arson", "loitering", "unauthorized_parking"
    ]
    locations = [
        "Main Entrance", "Parking Lot A", "Loading Dock", 
        "Lobby Area", "Server Room", "Perimeter Fence North",
        "Cafeteria", "Elevator Bank B"
    ]
    statuses = ["pending", "monitoring", "detected"]
    handling_statuses = ["unassigned", "pending", "in_progress", "resolved", "failed"]

    # We want a mix of resolved/failed (mostly resolved), some in progress, some unassigned
    handling_status_weights = [10, 15, 20, 45, 10] # Weights corresponding to the list above

    now = datetime.now(timezone.utc)
    
    detections_to_create = []

    for i in range(150): # Generate 150 detections
        org = random.choice(orgs)
        org_users = [u for u in users if u.organization_id == org.id]
        user = random.choice(org_users) if org_users else random.choice(users)
        
        # Decide if it's assigned to a child company or handled by creator
        child_orgs = [o for o in orgs if o.parent_id == org.id]
        assigned_org = random.choice(child_orgs) if child_orgs and random.random() > 0.5 else org
        
        category = random.choices(categories, weights=[60, 30, 10])[0]
        
        is_criminal = category == "person" and random.random() > 0.2
        subcategory = "criminal" if is_criminal else ("missing_person" if category == "person" else None)
        crime_type = random.choice(crime_types) if is_criminal else None
        
        status = random.choices(statuses, weights=[10, 20, 70])[0]
        handling_status = random.choices(handling_statuses, weights=handling_status_weights)[0]
        
        # If it hasn't been detected yet, it can't be resolved or failed.
        if status != "detected":
            handling_status = random.choice(["unassigned", "pending"])
            
        if handling_status == "unassigned":
            assigned_org = None
            
        location = random.choice(locations)
        
        # Create timestamps spread over the last 6 months
        created_days_ago = random.randint(0, 180)
        created_at = now - timedelta(days=created_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
        
        updated_at = created_at
        
        # Determine resolving time for resolved/failed cases
        if handling_status in ["resolved", "failed"]:
            resolve_hours_later = random.randint(1, 72)
            updated_at = created_at + timedelta(hours=resolve_hours_later)
            if updated_at > now:
                updated_at = now
                
        elif handling_status == "in_progress":
            updated_at = created_at + timedelta(hours=random.randint(1, 10))
            if updated_at > now:
                updated_at = now

        # Generate mock events if detected
        detection_events = []
        detected_camera_ids = []
        if status == "detected":
            num_events = random.randint(1, 5)
            selected_cameras = random.sample(cameras, min(num_events, len(cameras)))
            for j, cam in enumerate(selected_cameras):
                event_time = created_at + timedelta(minutes=random.randint(1, 60))
                # Ensure events are ordered
                if j > 0:
                    last_time = datetime.fromisoformat(detection_events[-1]["timestamp"])
                    if event_time < last_time:
                        event_time = last_time + timedelta(minutes=1)
                    
                detection_events.append({
                    "id": str(uuid.uuid4()),
                    "camera_id": cam.id,
                    "camera_name": cam.name,
                    "timestamp": event_time.isoformat(),
                    "snapshot_url": "https://placekitten.com/g/640/480" # Mock image
                })
                detected_camera_ids.append(cam.id)

        detection = Detection(
            id=str(uuid.uuid4()),
            category=category,
            subcategory=subcategory,
            crime_type=crime_type,
            name=f"Mock Detection {i+1}",
            description=f"Auto-generated mock detection {i+1} for analytics testing.",
            age=str(random.randint(20, 60)) if category == "person" else None,
            location=location,
            status=status,
            handling_status=handling_status,
            assigned_company_id=assigned_org.id if assigned_org else None,
            organization_id=org.id,
            user_id=user.id,
            detection_events=detection_events if detection_events else None,
            detected_camera_ids=detected_camera_ids if detected_camera_ids else None,
            created_at=created_at,
            updated_at=updated_at
        )
        detections_to_create.append(detection)

    db.bulk_save_objects(detections_to_create)
    db.commit()
    print(f"Successfully seeded {len(detections_to_create)} mock detections.")

def main():
    db = SessionLocal()
    try:
        clear_existing_detections(db)
        seed_detections(db)
    finally:
        db.close()

if __name__ == "__main__":
    main()

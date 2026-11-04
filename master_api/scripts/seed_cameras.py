import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.operational import Camera
import uuid

def seed_cameras():
    db = SessionLocal()
    try:
        # Create two test cameras for the main organization
        cam1 = Camera(
            id=f"cam-{uuid.uuid4().hex[:8]}",
            name="Main Entrance Camera",
            location="Main Lobby",
            lat=9.0192,
            lng=38.7468,
            status="online",
            stream_url="rtsp://admin:admin123@192.168.1.100:554/live",
            organization_id="org-admin-main"
        )
        
        cam2 = Camera(
            id=f"cam-{uuid.uuid4().hex[:8]}",
            name="Parking Lot Exit",
            location="North Gate",
            lat=9.0200,
            lng=38.7480,
            status="online",
            stream_url="rtsp://admin:admin123@192.168.1.101:554/live",
            organization_id="org-admin-main"
        )
        
        db.add(cam1)
        db.add(cam2)
        db.commit()
        print(f"Successfully seeded two cameras: {cam1.name} and {cam2.name}")
        
    except Exception as e:
        print(f"Error seeding cameras: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_cameras()

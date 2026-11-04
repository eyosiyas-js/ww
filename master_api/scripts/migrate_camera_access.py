import sys
import os
import uuid

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.operational import Camera, CameraAccess

def migrate():
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        cameras = db.query(Camera).all()
        count = 0
        for camera in cameras:
            if camera.organization_id:
                # Check if access already exists
                existing = db.query(CameraAccess).filter(
                    CameraAccess.camera_id == camera.id,
                    CameraAccess.organization_id == camera.organization_id
                ).first()
                
                if not existing:
                    access = CameraAccess(
                        id=f"acc-{uuid.uuid4()}",
                        camera_id=camera.id,
                        organization_id=camera.organization_id
                    )
                    db.add(access)
                    count += 1
        
        db.commit()
        print(f"Successfully migrated {count} camera access records.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

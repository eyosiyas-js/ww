from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models.operational import Camera, CameraAccess
from app.core.config import settings
import sys
import uuid
import traceback

# Setup logging to file
log_file = open("dedupe_log.txt", "w", encoding="utf-8")

def log(msg):
    print(msg)
    log_file.write(msg + "\n")

db_uri = settings.SQLALCHEMY_DATABASE_URI
engine = create_engine(db_uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def deduplicate():
    try:
        # Find duplicate names
        duplicates = db.query(Camera.name).group_by(Camera.name).having(func.count(Camera.id) > 1).all()
        
        if not duplicates:
            log("No duplicate camera names found.")
            return

        log(f"Starting de-duplication for {len(duplicates)} names...")

        for (name,) in duplicates:
            # Get all cameras with this name
            cameras = db.query(Camera).filter(Camera.name == name).order_by(Camera.id).all()
            
            primary = cameras[0]
            redundant = cameras[1:]
            
            log(f"\nProcessing '{name}':")
            log(f"  Keeping Primary: {primary.id} (Current Org: {primary.organization_id})")
            
            # Use a set to track which orgs have access to this primary camera
            processed_orgs = set()
            
            # 1. Check existing access for primary
            existing_accesses = db.query(CameraAccess).filter_by(camera_id=primary.id).all()
            for acc in existing_accesses:
                processed_orgs.add(acc.organization_id)

            # 2. Add access for primary's own org if missing
            if primary.organization_id and primary.organization_id not in processed_orgs:
                try:
                    db.add(CameraAccess(
                        id=f"acc-{uuid.uuid4()}",
                        camera_id=primary.id, 
                        organization_id=primary.organization_id
                    ))
                    db.flush()
                    processed_orgs.add(primary.organization_id)
                    log(f"  Added access for Primary Org: {primary.organization_id}")
                except Exception as e:
                    db.rollback()
                    log(f"  FAILED to add primary org access {primary.organization_id}: {e}")
                    # Re-sync session and set
                    db.begin()
                    existing_accesses = db.query(CameraAccess).filter_by(camera_id=primary.id).all()
                    processed_orgs = {acc.organization_id for acc in existing_accesses}

            # 3. Migrate access from redundant cameras
            for c in redundant:
                log(f"  Scanning redundant: {c.id} (Org: {c.organization_id})")
                
                # Check if this camera's org should have access to primary
                if c.organization_id and c.organization_id not in processed_orgs:
                    try:
                        db.add(CameraAccess(
                            id=f"acc-{uuid.uuid4()}",
                            camera_id=primary.id, 
                            organization_id=c.organization_id
                        ))
                        db.flush()
                        processed_orgs.add(c.organization_id)
                        log(f"    Migrated access for Org: {c.organization_id} -> Primary")
                    except Exception as e:
                        db.rollback()
                        db.begin()
                        log(f"    FAILED to migrate org access {c.organization_id}: {e}")

                # Also migrate existing grants for this redundant camera
                other_grants = db.query(CameraAccess).filter_by(camera_id=c.id).all()
                for grant in other_grants:
                    if grant.organization_id not in processed_orgs:
                        try:
                            # Use a new ID for the migrated grant
                            db.add(CameraAccess(
                                id=f"acc-{uuid.uuid4()}",
                                camera_id=primary.id, 
                                organization_id=grant.organization_id
                            ))
                            db.flush()
                            processed_orgs.add(grant.organization_id)
                            log(f"    Migrated sub-grant for Org: {grant.organization_id} -> Primary")
                        except Exception as e:
                            db.rollback()
                            db.begin()
                            log(f"    FAILED to migrate sub-grant {grant.organization_id}: {e}")
                    
                    db.delete(grant)
                    log(f"    Deleted old grant for {c.id}")

                # Delete redundant camera
                db.delete(c)
                log(f"  Deleted redundant camera: {c.id}")

        db.commit()
        log("\nDe-duplication complete.")

    except Exception as e:
        db.rollback()
        log(f"Fatal error during de-duplication: {e}")
        log(traceback.format_exc())
    finally:
        db.close()
        log_file.close()

if __name__ == "__main__":
    deduplicate()

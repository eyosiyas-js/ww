"""
Script to populate audit logs with sample data for testing the activity feed.
"""
from app.db.session import SessionLocal
from app.models.user import User
from app.models.operational import Detection
from app.core.audit import (
    log_detection_created,
    log_detection_updated,
    log_detection_status_change,
    log_login,
    log_user_created,
    log_camera_created,
    log_company_created,
)
from datetime import datetime, timedelta
import random

def populate_audit_logs():
    db = SessionLocal()
    
    try:
        # Get some users and detections
        users = db.query(User).limit(5).all()
        detections = db.query(Detection).limit(6).all()
        
        if not users:
            print("No users found in database. Please create users first.")
            return
        
        print(f"Found {len(users)} users and {len(detections)} detections")
        
        # Generate login logs for the past few days
        for i, user in enumerate(users):
            days_ago = random.randint(0, 3)
            log_time = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            log_entry = log_login(db, user, ip_address=f"192.168.1.{100+i}")
            # Manually update created_at to spread logs over time
            log_entry.created_at = log_time
            db.add(log_entry)
        
        # Generate detection-related logs
        for detection in detections:
            if detection.user:
                # Log detection creation
                log_time = detection.created_at - timedelta(minutes=1)
                log_entry = log_detection_created(
                    db, 
                    detection.user, 
                    detection.id, 
                    detection.name, 
                    detection.category
                )
                log_entry.created_at = log_time
                db.add(log_entry)
                
                # Randomly add status change logs
                if random.random() > 0.5:
                    log_time = detection.created_at + timedelta(hours=random.randint(1, 24))
                    log_entry = log_detection_status_change(
                        db,
                        detection.user,
                        detection.id,
                        detection.name,
                        "pending",
                        detection.status
                    )
                    log_entry.created_at = log_time
                    db.add(log_entry)
        
        # Generate some system activity logs
        if users:
            admin_user = users[0]
            
            # Log some user management activities
            log_time = datetime.utcnow() - timedelta(days=1, hours=5)
            log_entry = log_user_created(
                db,
                admin_user,
                "user-sample-123",
                "Sample User",
                "sample@example.com"
            )
            log_entry.created_at = log_time
            db.add(log_entry)
            
            # Log camera creation
            log_time = datetime.utcnow() - timedelta(days=2, hours=3)
            log_entry = log_camera_created(
                db,
                admin_user,
                "cam-sample-456",
                "Sample Camera"
            )
            log_entry.created_at = log_time
            db.add(log_entry)
            
            # Log company creation
            log_time = datetime.utcnow() - timedelta(days=3, hours=8)
            log_entry = log_company_created(
                db,
                admin_user,
                "org-sample-789",
                "Sample Company"
            )
            log_entry.created_at = log_time
            db.add(log_entry)
        
        db.commit()
        print("✓ Successfully populated audit logs!")
        print("Check the dashboard Recent Activity section to see the logs.")
        
    except Exception as e:
        print(f"Error populating audit logs: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_audit_logs()

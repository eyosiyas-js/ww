import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.operational import Camera

def verify_cameras():
    db = SessionLocal()
    try:
        cameras = db.query(Camera).all()
        print(f"Total cameras in DB: {len(cameras)}")
        for cam in cameras:
            print(f"- ID: {cam.id}, Name: {cam.name}, Status: {cam.status}, Flagged: {cam.is_flagged}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_cameras()

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models.operational import Camera
from app.core.config import settings
import sys

# Set output to utf-8
sys.stdout.reconfigure(encoding='utf-8')

db_uri = settings.SQLALCHEMY_DATABASE_URI
engine = create_engine(db_uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    duplicates = db.query(Camera.name, func.count(Camera.id)).group_by(Camera.name).having(func.count(Camera.id) > 1).all()
    
    if not duplicates:
        print("No duplicate camera names found.")
    else:
        print(f"Found {len(duplicates)} duplicate camera names:")
        for name, count in duplicates:
            print(f"- '{name}': {count} instances")
            cameras = db.query(Camera).filter(Camera.name == name).all()
            for c in cameras:
                print(f"  ID: {c.id}, Location: {c.location}, Org ID: {c.organization_id}")

finally:
    db.close()

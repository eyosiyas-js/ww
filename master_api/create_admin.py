from app.db.session import SessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
import sys

try:
    db = SessionLocal()
    # Check if user already exists
    existing_user = user.get_by_email(db, email="admin@cims.com")
    if not existing_user:
        user.create(db, obj_in=UserCreate(
            email="admin@cims.com", 
            password="admin123", 
            full_name="Super Admin", 
            is_active=True
        ))
        print("SUCCESS: Admin account created!")
    else:
        print("INFO: Admin already exists.")
except Exception as e:
    print(f"ERROR: {e}")

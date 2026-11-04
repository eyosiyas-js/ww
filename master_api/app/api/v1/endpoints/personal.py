from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.security import verify_password
from app.schemas.user import UserUpdate

# ── Profile Router ──────────────────────────────
profile_router = APIRouter()

@profile_router.get("/", response_model=dict) # UserProfile is complex, returning dict for simplicity
def get_profile(
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return {
        "name": current_user.full_name,
        "email": current_user.email,
        "phone": "+1 (555) 000-0000", # Placeholder
        "badge": "B-0000", # Placeholder
        "unit": "Surveillance Unit", # Placeholder
        "role": current_user.role.name if current_user.role else "Operator",
        "joinDate": current_user.created_at.isoformat(),
        "avatar": ""
    }

@profile_router.patch("/", response_model=dict)
def update_profile(
    obj_in: schemas.UserProfileUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if obj_in.name:
        current_user.full_name = obj_in.name
    # Update other fields...
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"msg": "Profile updated"}

from pydantic import BaseModel
class PushTokenUpdate(BaseModel):
    token: str

@profile_router.post("/push-token", response_model=dict)
def update_push_token(
    obj_in: PushTokenUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    current_user.expo_push_token = obj_in.token
    db.commit()
    return {"msg": "Push token updated successfully"}

@profile_router.patch("/username", response_model=dict)
def update_username(
    obj_in: schemas.UsernameUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # Check if email is already taken
    user = crud.user.get_by_email(db, email=obj_in.new_username)
    if user and user.id != current_user.id:
        raise HTTPException(status_code=400, detail="Username (email) already exists")
    
    current_user = crud.user.update(
        db, db_obj=current_user, obj_in=UserUpdate(email=obj_in.new_username)
    )
    return {"msg": "Username updated successfully"}

@profile_router.patch("/password", response_model=dict)
def update_password(
    obj_in: schemas.PasswordUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if not verify_password(obj_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user = crud.user.update(
        db, db_obj=current_user, obj_in=UserUpdate(password=obj_in.new_password)
    )
    return {"msg": "Password updated successfully"}

# ── History Router ──────────────────────────────
history_router = APIRouter()

@history_router.get("/", response_model=List[schemas.HistoryItem])
def get_history(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    detections = db.query(models.Detection).filter(models.Detection.organization_id == current_user.organization_id).all()
    
    items = []
    for d in detections:
        items.append({
            "id": d.id,
            "type": "detection",
            "title": d.name,
            "category": d.category,
            "status": d.status,
            "timestamp": d.created_at.isoformat(),
            "description": d.description or ""
        })
    
    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items

# ── Officer Router ──────────────────────────────
officer_router = APIRouter()

@officer_router.get("/", response_model=List[schemas.OfficerSchema])
def get_officers(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # Fetch all users in the same organization
    users = db.query(models.User).filter(models.User.organization_id == current_user.organization_id).all()
    
    return [
        {
            "id": u.id,
            "name": u.full_name,
            "badge": f"B-{u.id[-4:]}", # Mocking badge from user ID
            "unit": "Patrol Unit" if "Patrol" in u.full_name else "Detective Unit" if "Detective" in u.full_name else "Surveillance Unit",
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={u.id}",
            "status": "available"
        }
        for u in users
    ]

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
import os
import uuid
import shutil
from sqlalchemy.orm import Session
from datetime import datetime
import json
import asyncio
from app import crud, models, schemas
from app.api import deps
from app.core.websockets import manager

router = APIRouter()

@router.get("/", response_model=List[schemas.WeaponDetection])
def get_weapon_detections(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Retrieve weapon detections.
    """
    if current_user.role.name in ["Super Admin", "SuperAdmin"]:
        detections = db.query(models.WeaponDetection).order_by(models.WeaponDetection.created_at.desc()).all()
    else:
        detections = db.query(models.WeaponDetection).filter(
            models.WeaponDetection.organization_id == current_user.organization_id
        ).order_by(models.WeaponDetection.created_at.desc()).all()
    return detections

@router.post("/simulate", response_model=schemas.WeaponDetection)
async def simulate_weapon_detection(
    *,
    db: Session = Depends(deps.get_db),
    weapon_type: str = Form(...),
    confidence: float = Form(...),
    camera_id: str = Form(...),
    image: UploadFile = File(...),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Simulate a weapon detection from the mock detection engine.
    This creates the record and broadcasts a websocket alert.
    """
    try:
        camera = crud.camera.get(db, id=camera_id)
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found")

        # Save uploaded image locally
        os.makedirs("uploads", exist_ok=True)
        file_extension = os.path.splitext(image.filename)[1] if image.filename else ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        image_url = f"/uploads/{unique_filename}"
        
        mapped_type = weapon_type.title()

        obj_in = schemas.WeaponDetectionCreate(
            weaponType=weapon_type,
            confidence=confidence,
            imageUrl=image_url,
            cameraId=camera.id,
            cameraName=camera.name,
            description=f"Automated detection by Simulation Engine",
        )
        
        target_org_id = camera.organization_id
        if not target_org_id:
            target_org_id = current_user.organization_id

        detection = crud.weapon_detection.create(
            db, 
            obj_in=obj_in, 
            organization_id=target_org_id
        )

        # Broadcast websocket alert to the specific organization
        if target_org_id:
            alert_payload = {
                "type": "weapon_alert",
                "title": f"⚠️ Weapon Detected: {mapped_type}",
                "message": f"A {mapped_type} was detected at {camera.name} with {round(confidence*100)}% confidence.",
                "cameraId": camera.id,
                "detectionId": detection.id,
                "imageUrl": image_url,
                "timestamp": detection.created_at.isoformat() if detection.created_at else datetime.utcnow().isoformat()
            }
            asyncio.create_task(manager.broadcast_to_org(
                str(target_org_id),
                alert_payload
            ))

        return detection
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    return detection

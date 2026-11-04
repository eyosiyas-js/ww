import shutil
import uuid
import os
import asyncio
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.websockets import manager

router = APIRouter()

@router.post("/location")
async def update_location(
    lat: float = Form(...),
    lng: float = Form(...),
    heading: Optional[float] = Form(None),
    speed: Optional[float] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update officer's live GPS location.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
        
    try:
        location = crud.officer_location.upsert_location(
            db, 
            user_id=current_user.id, 
            org_id=current_user.organization_id,
            lat=lat, 
            lng=lng, 
            heading=heading, 
            speed=speed
        )
        
        # Save to history for path tracking (every update)
        crud.officer_location.save_location_history(
            db, 
            user_id=current_user.id,
            org_id=current_user.organization_id,
            lat=lat,
            lng=lng,
            heading=heading,
            speed=speed
        )
        
        # Determine status for real-time broadcast
        if speed and speed > 0.5:
            status = "active"
        else:
            status = "idle"
        
        # Broadcast location update to organization via WebSocket
        await manager.broadcast_to_org(current_user.organization_id, {
            "type": "officer_location_updated",
            "userId": current_user.id,
            "fullName": current_user.full_name,
            "email": current_user.email,
            "lat": lat,
            "lng": lng,
            "heading": heading,
            "speed": speed,
            "status": status,
            "lastSeen": location.last_seen.isoformat() + "Z" if location.last_seen else None,
            "isOnline": True
        })
        
        return {"msg": "Location updated successfully"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

@router.post("/offline")
async def go_offline(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Mark officer as offline.
    """
    location = crud.officer_location.set_offline(db, user_id=current_user.id)

    # Broadcast offline status to organization
    if current_user.organization_id:
        await manager.broadcast_to_org(current_user.organization_id, {
            "type": "officer_status_changed",
            "userId": current_user.id,
            "fullName": current_user.full_name,
            "email": current_user.email,
            "status": "offline",
            "isOnline": False,
            "lastSeen": location.last_seen.isoformat() + "Z" if location and location.last_seen else None,
            "lat": location.lat if location else None,
            "lng": location.lng if location else None,
        })

    return {"msg": "Marked offline successfully"}

@router.get("/location/status")
def get_location_status(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get officer's current location status.
    """
    loc = db.query(models.OfficerLocation).filter(models.OfficerLocation.user_id == current_user.id).first()
    if not loc:
        return {"is_online": False}
    return {
        "is_online": loc.is_online,
        "last_seen": loc.last_seen.isoformat() + "Z" if loc.last_seen else None,
        "lat": loc.lat,
        "lng": loc.lng
    }

@router.get("/assignments")
def get_assignments(
    status: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get active assignments for the current officer.
    """
    from app.crud.crud_traffic import haversine_km
    
    assignments = crud.traffic_alert.get_user_assignments(db, user_id=current_user.id, status=status)
    result = []
    
    # Get officer's current location for real-time distance calculation
    officer_location = db.query(models.OfficerLocation).filter(
        models.OfficerLocation.user_id == current_user.id
    ).first()
    
    for a in assignments:
        det = a.detection
        cam = None
        current_distance = a.distance_at_assignment  # fallback to original distance
        
        if det and det.detected_camera_ids:
            cam = db.query(models.Camera).filter(models.Camera.id == det.detected_camera_ids[-1]).first()
            
            # Calculate real-time distance if we have both officer and camera coordinates
            if officer_location and cam and cam.lat and cam.lng and officer_location.lat and officer_location.lng:
                current_distance = haversine_km(
                    officer_location.lat, officer_location.lng,
                    cam.lat, cam.lng
                )
            
        result.append({
            "id": a.id,
            "detectionId": a.detection_id,
            "cameraId": cam.id if cam else "Unknown",
            "cameraName": cam.name if cam else "Unknown",
            "distanceKm": round(current_distance, 2),  # Use real-time distance
            "status": a.status,
            "notes": a.notes,
            "proofUrls": a.proof_urls,
            "createdAt": a.assigned_at.isoformat() + "Z" if a.assigned_at else None,
            "detectionInfo": {
                "category": det.category,
                "name": det.name,
                "plateNumber": det.plate_number,
                "description": det.description,
                "imageUrls": det.image_urls
            } if det else None,
            "cameraInfo": {
                "lat": cam.lat,
                "lng": cam.lng
            } if cam else None
        })
    return result

@router.get("/assignments/{id}")
def get_assignment_detail(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get specific assignment details.
    """
    from app.crud.crud_traffic import haversine_km
    
    assignment = crud.traffic_alert.get_assignment(db, assignment_id=id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    det = assignment.detection
    cam = None
    current_distance = assignment.distance_at_assignment  # fallback to original distance
    
    # Get officer's current location for real-time distance calculation
    officer_location = db.query(models.OfficerLocation).filter(
        models.OfficerLocation.user_id == current_user.id
    ).first()
    
    if det and det.detected_camera_ids:
        cam = db.query(models.Camera).filter(models.Camera.id == det.detected_camera_ids[-1]).first()
        
        # Calculate real-time distance if we have both officer and camera coordinates
        if officer_location and cam and cam.lat and cam.lng and officer_location.lat and officer_location.lng:
            current_distance = haversine_km(
                officer_location.lat, officer_location.lng,
                cam.lat, cam.lng
            )
        
    return {
        "id": assignment.id,
        "detectionId": assignment.detection_id,
        "cameraId": cam.id if cam else "Unknown",
        "cameraName": cam.name if cam else "Unknown",
        "distanceKm": round(current_distance, 2),  # Use real-time distance
        "status": assignment.status,
        "notes": assignment.notes,
        "proofUrls": assignment.proof_urls,
        "createdAt": assignment.assigned_at.isoformat() + "Z" if assignment.assigned_at else None,
        "closedAt": assignment.closed_at.isoformat() + "Z" if assignment.closed_at else None,
        "detectionInfo": {
            "category": det.category,
            "name": det.name,
            "plateNumber": det.plate_number,
            "code": det.code,
            "region": det.region,
            "description": det.description,
            "imageUrls": det.image_urls
        } if det else None,
        "cameraInfo": {
            "lat": cam.lat,
            "lng": cam.lng
        } if cam else None
    }

@router.post("/assignments/{id}/close")
def close_assignment(
    id: str,
    status: str = Form(...),
    notes: Optional[str] = Form(None),
    proofFiles: List[UploadFile] = File(None),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Close an assignment (resolve or fail) with optional proof.
    """
    assignment = crud.traffic_alert.get_assignment(db, assignment_id=id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    valid_statuses = ["closed_resolved", "closed_failed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status transition. Must be closed_resolved or closed_failed")

    # If the detection is already handled, you can still close it locally, but parent isn't overwritten.
    proof_urls = []
    if proofFiles:
        for imageFile in proofFiles:
            file_extension = os.path.splitext(imageFile.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join("uploads", unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imageFile.file, buffer)
            proof_urls.append(f"/uploads/{unique_filename}")

    updated_assignment = crud.traffic_alert.update_assignment_status(
        db, assignment_id=id, status=status, notes=notes, proof_urls=proof_urls if proof_urls else None
    )

    # First-to-close behavior syncs parent detection globally
    det = assignment.detection
    if det and det.handling_status not in ["resolved", "failed"]:
        internal_status = "resolved" if status == "closed_resolved" else "failed"
        det.handling_status = internal_status
        det.status = internal_status
        if notes:
            det.handling_notes = notes
        if updated_assignment.proof_urls:
            det.handling_proof_urls = updated_assignment.proof_urls
        db.commit()
        
        # Broadcast assignment closed event to dashboard
        event_payload = {
            "type": "assignment_updated",
            "detectionId": det.id,
            "status": internal_status
        }
        asyncio.create_task(manager.broadcast_to_org(str(det.organization_id), event_payload))
        asyncio.create_task(manager.broadcast_to_org("None", event_payload))

    return {"msg": "Assignment closed", "status": updated_assignment.status}

@router.get("/nearby")
def get_nearby_officers(
    lat: float,
    lng: float,
    radius: float = 2.0,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    View online officers near a location.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
        
    nearby_tuples = crud.officer_location.find_nearby_officers(
        db, org_id=current_user.organization_id, lat=lat, lng=lng, radius_km=radius
    )
    
    return [
        {
            "userId": off.user_id,
            "fullName": off.user.full_name if off.user else "Unknown",
            "lat": off.lat,
            "lng": off.lng,
            "distanceKm": dist,
            "lastSeen": off.last_seen.isoformat() + "Z" if off.last_seen else None
        }
        for (off, dist) in nearby_tuples
    ]


@router.get("/live")
def get_live_officers(
    stale_minutes: int = 5,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Get all officers in the organization with their live status.
    For Company Admins to monitor their field officers in real-time.
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[OFFICER_TRACKING] Current user: {current_user.id} ({current_user.full_name})")
    logger.info(f"[OFFICER_TRACKING] User org_id: {current_user.organization_id}")
    logger.info(f"[OFFICER_TRACKING] User role: {current_user.role.name if current_user.role else 'None'}")

    if not current_user.organization_id:
        logger.warning(f"[OFFICER_TRACKING] User has no organization_id (likely Super Admin)")
        return {
            "officers": [],
            "summary": {"total": 0, "online": 0, "offline": 0, "stale": 0},
            "message": "Super Admin users must select a specific organization to view officers"
        }

    logger.info(f"[OFFICER_TRACKING] Fetching officers for org_id={current_user.organization_id}")

    total_users = db.query(models.User).filter(
        models.User.organization_id == current_user.organization_id
    ).count()
    logger.info(f"[OFFICER_TRACKING] Total users in org: {total_users}")

    officers = crud.officer_location.get_all_officers_with_status(
        db, org_id=current_user.organization_id, stale_minutes=stale_minutes
    )

    logger.info(f"[OFFICER_TRACKING] Officers returned: {len(officers)}")

    online_count = sum(1 for o in officers if o["status"] in ["active", "idle"])
    offline_count = sum(1 for o in officers if o["status"] == "offline")
    stale_count = sum(1 for o in officers if o["status"] == "stale")

    return {
        "officers": officers,
        "summary": {
            "total": len(officers),
            "online": online_count,
            "offline": offline_count,
            "stale": stale_count
        }
    }


@router.get("/history/{user_id}")
def get_officer_location_history(
    user_id: str,
    hours: int = 24,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Get location history for a specific officer (for path tracking).
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")

    # Verify the officer belongs to the same organization
    officer = db.query(models.User).filter(models.User.id == user_id).first()
    if not officer or officer.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Officer not found or not in your organization")

    history = crud.officer_location.get_location_history(db, user_id=user_id, hours=hours)

    return {
        "userId": user_id,
        "fullName": officer.full_name,
        "email": officer.email,
        "path": [
            {
                "lat": h.lat,
                "lng": h.lng,
                "heading": h.heading,
                "speed": h.speed,
                "timestamp": h.recorded_at.isoformat() + "Z"
            }
            for h in history
        ]
    }

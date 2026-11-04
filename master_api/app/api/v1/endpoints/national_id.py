from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app import crud, models, schemas
from app.api import deps
from app.schemas.national_id import (
    NationalIdProfile,
    NationalIdProfileCreate,
    NationalIdProfileUpdate,
    DetectionNationalIdMatch,
    DetectionNationalIdMatchCreate,
    DetectionNationalIdMatchUpdate,
    NationalIdSearchRequest,
    NationalIdSearchResponse,
    DetectionWithNationalId
)
from app.crud.crud_national_id import national_id_profile, detection_national_id_match
from app.services.national_id_service import national_id_service
import struct
import json
import time

router = APIRouter()


@router.get("/profiles", response_model=List[NationalIdProfile])
def get_national_id_profiles(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
) -> Any:
    """
    Retrieve National ID profiles.
    """
    try:
        profiles = national_id_profile.get_multi(db, skip=skip, limit=limit, status=status)
        results = []
        for p in profiles:
            # Use Pydantic v2 methods
            p_dict = NationalIdProfile.model_validate(p).model_dump()
            p_dict["has_biometric"] = p.face_embedding is not None
            results.append(p_dict)
        return results
    except Exception as e:
        import logging
        logging.error(f"Error in get_national_id_profiles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profiles", response_model=NationalIdProfile)
async def create_national_id_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: NationalIdProfileCreate,
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Create a new National ID profile with optional biometric data.
    """
    # Check if ID already exists
    existing = national_id_profile.get_by_national_id_number(db, profile_in.national_id_number)
    if existing:
        raise HTTPException(status_code=400, detail="National ID number already exists")
    
    # Handle biometric extraction if photo is provided
    face_embedding = None
    if profile_in.profile_photo_b64:
        from app.services.face_service import get_embedding_from_b64
        face_embedding = get_embedding_from_b64(profile_in.profile_photo_b64)
    
    # Create profile
    profile = national_id_profile.create(db, obj_in=profile_in)
    
    # Save embedding if extracted
    if face_embedding:
        profile.face_embedding = face_embedding
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Prepare response
    resp = NationalIdProfile.from_orm(profile).dict()
    resp["has_biometric"] = profile.face_embedding is not None
    return resp


@router.get("/profiles/{profile_id}", response_model=NationalIdProfile)
def get_national_id_profile(
    profile_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get a specific National ID profile by ID.
    """
    profile = national_id_profile.get(db, id=profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="National ID profile not found")
    return profile


@router.put("/profiles/{profile_id}", response_model=NationalIdProfile)
def update_national_id_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_id: str,
    profile_in: NationalIdProfileUpdate,
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Update a National ID profile.
    """
    try:
        profile = national_id_profile.get(db, id=profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="National ID profile not found")
        profile = national_id_profile.update(db, db_obj=profile, obj_in=profile_in)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Error updating profile {profile_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.delete("/profiles/{profile_id}", response_model=NationalIdProfile)
def delete_national_id_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_id: str,
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Delete a National ID profile.
    """
    try:
        profile = national_id_profile.get(db, id=profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="National ID profile not found")
        profile = national_id_profile.remove(db, id=profile_id)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Error deleting profile {profile_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/profiles/by-id-number/{national_id_number}", response_model=NationalIdProfile)
def get_profile_by_id_number(
    national_id_number: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get National ID profile by national ID number.
    """
    profile = national_id_profile.get_by_national_id_number(db, national_id_number=national_id_number)
    if not profile:
        raise HTTPException(status_code=404, detail="National ID profile not found")
    return profile


@router.post("/search", response_model=NationalIdSearchResponse)
async def search_national_id(
    search_request: NationalIdSearchRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Search National ID database using various query types.
    """
    try:
        result = await national_id_service.search_national_id(search_request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/detections/{detection_id}/match", response_model=DetectionNationalIdMatch)
async def create_detection_national_id_match(
    detection_id: str,
    match_data: DetectionNationalIdMatchCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.edit")),
) -> Any:
    """
    Create a new National ID match for a detection.
    """
    # Verify detection exists
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Verify National ID profile exists
    profile = national_id_profile.get(db, id=match_data.national_id_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="National ID profile not found")
    
    # Create the match
    match = detection_national_id_match.create(
        db, 
        obj_in=match_data, 
        verified_by_user_id=current_user.id
    )
    return match


@router.get("/detections/{detection_id}/matches", response_model=List[DetectionNationalIdMatch])
def get_detection_national_id_matches(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get all National ID matches for a detection.
    """
    matches = detection_national_id_match.get_by_detection_id(db, detection_id=detection_id)
    return matches


@router.get("/detections/{detection_id}/primary-match", response_model=Optional[DetectionNationalIdMatch])
def get_detection_primary_national_id_match(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get the primary/best National ID match for a detection.
    """
    match = detection_national_id_match.get_primary_match(db, detection_id=detection_id)
    return match


@router.put("/matches/{match_id}", response_model=DetectionNationalIdMatch)
def update_detection_national_id_match(
    match_id: str,
    match_update: DetectionNationalIdMatchUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.edit")),
) -> Any:
    """
    Update a National ID match (e.g., confirm, reject, add notes).
    """
    match = detection_national_id_match.get(db, id=match_id)
    if not match:
        raise HTTPException(status_code=404, detail="National ID match not found")
    
    updated_match = detection_national_id_match.update(
        db, 
        db_obj=match, 
        obj_in=match_update,
        verified_by_user_id=current_user.id
    )
    return updated_match


@router.post("/detections/{detection_id}/auto-match")
async def auto_match_detection_to_national_id(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.edit")),
) -> Any:
    """
    Automatically search for National ID matches for a detection.
    Matches only by National ID Number if found in detection.
    Stops generating mock data for unmatched detections.
    """
    # Get detection
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    matches_created = 0
    search_time_ms = 0
    
    # CASE 1: Match by National ID Number (Primary reliable method)
    if detection.national_id_number:
        start_time = time.time()
        # Search our database for this ID number
        profile = national_id_profile.get_by_national_id_number(db, national_id_number=detection.national_id_number)
        search_time_ms = int((time.time() - start_time) * 1000)
        
        if profile:
            # Check if match already exists
            existing_match = db.query(models.DetectionNationalIdMatch).filter(
                models.DetectionNationalIdMatch.detection_id == detection_id,
                models.DetectionNationalIdMatch.national_id_profile_id == profile.id
            ).first()
            
            if not existing_match:
                # Create detection match
                match_create = DetectionNationalIdMatchCreate(
                    detection_id=detection_id,
                    national_id_profile_id=profile.id,
                    confidence_score="High",
                    match_type="id_number",
                    match_source="national_database",
                    match_details={"note": "Matched by registration ID number"},
                    status="pending"
                )
                
                detection_national_id_match.create(
                    db, 
                    obj_in=match_create,
                    verified_by_user_id=current_user.id
                )
                matches_created += 1
    
    # CASE 2: Match by Name (Fallback method)
    elif detection.name:
        start_time = time.time()
        # Search our database for this name
        potential_profiles = national_id_profile.search_by_name(db, name_query=detection.name)
        search_time_ms = int((time.time() - start_time) * 1000)
        
        for profile in potential_profiles:
            # Check if match already exists
            existing_match = db.query(models.DetectionNationalIdMatch).filter(
                models.DetectionNationalIdMatch.detection_id == detection_id,
                models.DetectionNationalIdMatch.national_id_profile_id == profile.id
            ).first()
            
            if not existing_match:
                # Calculate confidence based on name match
                confidence = "Medium"
                if profile.full_name.lower() == detection.name.lower():
                    confidence = "High"
                
                # Create detection match
                match_create = DetectionNationalIdMatchCreate(
                    detection_id=detection_id,
                    national_id_profile_id=profile.id,
                    confidence_score=confidence,
                    match_type="name",
                    match_source="national_database",
                    match_details={"note": f"Matched by name: {detection.name}"},
                    status="pending"
                )
                
                detection_national_id_match.create(
                    db, 
                    obj_in=match_create,
                    verified_by_user_id=current_user.id
                )
                matches_created += 1

    if matches_created == 0:
        return {
            "success": True,
            "message": "No matching National ID profile found in system.",
            "matches_created": 0,
            "search_time_ms": search_time_ms
        }
        
    return {
        "success": True,
        "message": f"Successfully matched detection to {matches_created} National ID profile(s)",
        "matches_created": matches_created,
        "search_time_ms": search_time_ms
    }


@router.get("/detections/{detection_id}/with-national-id", response_model=DetectionWithNationalId)
def get_detection_with_national_id(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get detection with all National ID match information.
    """
    # Get detection
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Get all National ID matches
    matches = detection_national_id_match.get_by_detection_id(db, detection_id=detection_id)
    
    # Get primary match
    primary_match = detection_national_id_match.get_primary_match(db, detection_id=detection_id)
    primary_national_id = None
    if primary_match:
        primary_national_id = national_id_profile.get(db, id=primary_match.national_id_profile_id)
    
    # Build response
    response_data = {
        "id": detection.id,
        "category": detection.category,
        "name": detection.name,
        "description": detection.description,
        "age": detection.age,
        "location": detection.location,
        "subcategory": detection.subcategory,
        "crime_type": detection.crime_type,
        "image_urls": detection.image_urls or [],
        "status": detection.status,
        "created_at": detection.created_at,
        "updated_at": detection.updated_at,
        "national_id_matches": matches,
        "primary_national_id": primary_national_id,
        "has_national_id_match": len(matches) > 0
    }
    
    return response_data


@router.post("/populate-mock-data")
async def populate_mock_national_id_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Populate database with mock National ID data for development/testing.
    """
    try:
        await national_id_service.populate_mock_data_to_db(db)
        return {
            "success": True,
            "message": "Mock National ID data populated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate mock data: {str(e)}")


@router.post("/configure-real-api")
def configure_real_national_id_api(
    api_url: str,
    api_key: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Configure real government National ID API credentials.
    """
    try:
        national_id_service.configure_real_api(api_url, api_key)
        return {
            "success": True,
            "message": "Real National ID API configured successfully",
            "api_url": api_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure API: {str(e)}")


@router.post("/switch-to-mock")
def switch_to_mock_api(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Switch back to mock National ID API for testing.
    """
    national_id_service.switch_to_mock()
    return {
        "success": True,
        "message": "Switched to mock National ID API"
    }


# ── Face Search ────────────────────────────────────────────────────────────────

from pydantic import BaseModel

class FaceSearchRequest(BaseModel):
    image_b64: str          # Base64-encoded image (no data-URI prefix)


@router.post("/face-search")
async def face_search_national_id(
    request: FaceSearchRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Search the National ID biometric database using a face image.
    Accepts a base64-encoded image, extracts its face embedding via InsightFace,
    and returns the closest matching citizen profile (if any).
    """
    import base64
    import numpy as np
    import struct

    # 1. Decode image
    try:
        img_bytes = base64.b64decode(request.image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        import cv2
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    # 2. Extract face embedding using InsightFace (reuse existing service)
    try:
        from app.services.face_service import get_embedding_from_b64
        # We pass the original b64 string. The service handles the decoding and extraction.
        raw_embedding = get_embedding_from_b64(request.image_b64)
        
        if raw_embedding is None:
            return {"matched": False, "confidence": 0.0, "error": "No face detected in image"}
            
        # Convert bytes back to numpy array (512 float32 values)
        query_embedding = np.frombuffer(raw_embedding, dtype=np.float32)
    except Exception as e:
        return {"matched": False, "confidence": 0.0, "error": f"Face extraction failed: {str(e)}"}

    # 3. Fetch all profiles that have face embeddings
    profiles = db.query(models.NationalIdProfile).filter(
        models.NationalIdProfile.face_embedding.isnot(None)
    ).all()

    if not profiles:
        return {"matched": False, "confidence": 0.0, "error": "No biometric records in database"}

    # 4. Compare embeddings (cosine similarity)
    best_score = -1.0
    best_profile = None

    for profile in profiles:
        try:
            raw = profile.face_embedding
            n = len(raw) // 4
            db_embedding = np.array(struct.unpack(f"{n}f", raw), dtype=np.float32)
            q = np.array(query_embedding, dtype=np.float32)

            # Normalize and compute cosine similarity
            q_norm = q / (np.linalg.norm(q) + 1e-8)
            db_norm = db_embedding / (np.linalg.norm(db_embedding) + 1e-8)
            score = float(np.dot(q_norm, db_norm))

            if score > best_score:
                best_score = score
                best_profile = profile
        except Exception:
            continue

    # 5. Apply threshold — treat ≥ 0.45 as a match (InsightFace ArcFace cosine)
    MATCH_THRESHOLD = 0.45

    if best_profile and best_score >= MATCH_THRESHOLD:
        p = best_profile
        return {
            "matched": True,
            "confidence": round(best_score, 4),
            "profile": {
                "id": p.id,
                "national_id_number": p.national_id_number,
                "full_name": p.full_name,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "gender": p.gender,
                "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
                "nationality": p.nationality,
                "region": p.region,
                "city": p.city,
                "address": p.address,
                "phone_number": p.phone_number,
                "email": p.email,
                "occupation": p.occupation,
                "profile_photo_url": p.profile_photo_url,
                "status": p.status,
                "is_verified": p.is_verified,
            }
        }
    else:
        return {"matched": False, "confidence": round(best_score, 4) if best_score >= 0 else 0.0}
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import struct
from app import models, schemas
from app.api import deps
from app.crud.crud_national_id import national_id_profile, detection_national_id_match
from app.services.national_id_service import national_id_service
from app.schemas.national_id import NationalIdSearchRequest, NationalIdSearchResponse

router = APIRouter()

@router.get("/detections", response_model=List[schemas.DetectionPublic])
def get_public_detections(
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Publicly accessible endpoint to retrieve all detections including facial embeddings.
    No authentication required.
    """
    detections = db.query(models.Detection).all()
    results = []
    
    for d in detections:
        # Convert model to dict compatible with Detection schema aliases
        # We manually build the response to ensure embeddings are decoded
        det_data = {
            "id": d.id,
            "category": d.category,
            "name": d.name,
            "description": d.description,
            "age": d.age,
            "location": d.location,
            "subcategory": d.subcategory,
            "crimeType": d.crime_type,
            "imageUrls": d.image_urls or [],
            "status": d.status,
            "createdAt": d.created_at.isoformat() if d.created_at else None,
            "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
            "detectedCameraIds": d.detected_camera_ids or [],
            "detectionEvents": d.detection_events or [],
            "formTemplateId": d.form_template_id,
            "dynamicData": d.dynamic_data or {},
            "assignedCompanyId": d.assigned_company_id,
            "handlingStatus": d.handling_status,
            "handlingNotes": d.handling_notes,
            "handlingProofUrls": d.handling_proof_urls or [],
            "eligibleForAssignment": d.eligible_for_assignment,
            "plateNumber": d.plate_number,
            "code": d.code,
            "region": d.region,
            "faceEmbedding": None
        }
        
        if d.face_embedding:
            try:
                # Convert bytes back to list of floats
                # Detection stored floats (float32)
                num_floats = len(d.face_embedding) // 4
                vector = list(struct.unpack(f"{num_floats}f", d.face_embedding))
                det_data["faceEmbedding"] = vector
            except Exception:
                det_data["faceEmbedding"] = None
                
        results.append(det_data)
        
    return results


# Temporary public National ID endpoints for testing

@router.get("/national-id/profiles")
def get_public_national_id_profiles(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Public endpoint for National ID profiles (for testing).
    """
    try:
        profiles = national_id_profile.get_multi(db, skip=skip, limit=limit)
        # Manually serialize to avoid Pydantic serialization errors
        results = []
        for p in profiles:
            profile_data = {
                "id": p.id,
                "national_id_number": p.national_id_number,
                "full_name": p.full_name,
                "first_name": p.first_name,
                "middle_name": p.middle_name,
                "last_name": p.last_name,
                "gender": p.gender,
                "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
                "nationality": p.nationality,
                "address": p.address,
                "region": p.region,
                "city": p.city,
                "phone_number": p.phone_number,
                "email": p.email,
                "occupation": p.occupation,
                "status": p.status,
                "registration_date": p.registration_date.isoformat() if p.registration_date else None,
                "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
                "issuing_authority": p.issuing_authority,
                "emergency_contact_name": p.emergency_contact_name,
                "emergency_contact_phone": p.emergency_contact_phone,
                "emergency_contact_relationship": p.emergency_contact_relationship,
                "profile_photo_url": p.profile_photo_url,
                "additional_info": p.additional_info,
                "is_verified": p.is_verified,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "verification_date": p.verification_date.isoformat() if p.verification_date else None,
            }
            results.append(profile_data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profiles: {str(e)}")

@router.get("/national-id/detections/{detection_id}/matches")
def get_public_detection_national_id_matches(
    detection_id: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Public endpoint for detection National ID matches (for testing).
    """
    try:
        matches = detection_national_id_match.get_by_detection_id(db, detection_id=detection_id)
        # Manually serialize to avoid Pydantic serialization errors
        results = []
        for m in matches:
            # Get the related National ID profile
            profile = None
            if m.national_id_profile_id:
                profile_obj = national_id_profile.get(db, id=m.national_id_profile_id)
                if profile_obj:
                    profile = {
                        "id": profile_obj.id,
                        "national_id_number": profile_obj.national_id_number,
                        "full_name": profile_obj.full_name,
                        "first_name": profile_obj.first_name,
                        "middle_name": profile_obj.middle_name,
                        "last_name": profile_obj.last_name,
                        "gender": profile_obj.gender,
                        "date_of_birth": profile_obj.date_of_birth.isoformat() if profile_obj.date_of_birth else None,
                        "nationality": profile_obj.nationality,
                        "address": profile_obj.address,
                        "region": profile_obj.region,
                        "city": profile_obj.city,
                        "phone_number": profile_obj.phone_number,
                        "email": profile_obj.email,
                        "occupation": profile_obj.occupation,
                        "status": profile_obj.status,
                        "registration_date": profile_obj.registration_date.isoformat() if profile_obj.registration_date else None,
                        "expiry_date": profile_obj.expiry_date.isoformat() if profile_obj.expiry_date else None,
                        "issuing_authority": profile_obj.issuing_authority,
                        "emergency_contact_name": profile_obj.emergency_contact_name,
                        "emergency_contact_phone": profile_obj.emergency_contact_phone,
                        "emergency_contact_relationship": profile_obj.emergency_contact_relationship,
                        "profile_photo_url": profile_obj.profile_photo_url,
                        "additional_info": profile_obj.additional_info,
                        "is_verified": profile_obj.is_verified,
                        "created_at": profile_obj.created_at.isoformat() if profile_obj.created_at else None,
                        "updated_at": profile_obj.updated_at.isoformat() if profile_obj.updated_at else None,
                        "verification_date": profile_obj.verification_date.isoformat() if profile_obj.verification_date else None,
                    }
            
            match_data = {
                "id": m.id,
                "detection_id": m.detection_id,
                "national_id_profile_id": m.national_id_profile_id,
                "confidence_score": m.confidence_score,
                "match_type": m.match_type,
                "match_source": m.match_source,
                "match_details": m.match_details,
                "verification_notes": m.verification_notes,
                "status": m.status,
                "verified_by_user_id": m.verified_by_user_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
                "national_id_profile": profile,
            }
            results.append(match_data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get matches: {str(e)}")

@router.post("/national-id/populate-mock-data")
async def populate_public_mock_national_id_data(
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Public endpoint to populate mock National ID data (for testing).
    """
    try:
        await national_id_service.populate_mock_data_to_db(db)
        return {
            "success": True,
            "message": "Mock National ID data populated successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to populate mock data: {str(e)}"
        }

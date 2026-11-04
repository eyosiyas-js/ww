from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.schemas.vehicle_registration import (
    VehicleRegistration,
    VehicleRegistrationCreate,
    VehicleRegistrationUpdate,
    DetectionVehicleMatch,
    DetectionVehicleMatchCreate,
    DetectionVehicleMatchUpdate,
    VehicleSearchRequest,
    VehicleSearchResponse,
    DetectionWithVehicle
)
from app.crud.crud_vehicle_registration import vehicle_registration, detection_vehicle_match
from app.services.vehicle_registration_service import vehicle_registration_service

router = APIRouter()


@router.get("/registrations", response_model=List[VehicleRegistration])
def get_vehicle_registrations(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
) -> Any:
    """
    Retrieve vehicle registrations.
    """
    registrations = vehicle_registration.get_multi(db, skip=skip, limit=limit, status=status)
    return registrations


@router.post("/registrations", response_model=VehicleRegistration)
def create_vehicle_registration(
    *,
    db: Session = Depends(deps.get_db),
    registration_in: VehicleRegistrationCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new vehicle registration.
    """
    registration = vehicle_registration.get_by_plate_number(db, plate_number=registration_in.plate_number)
    if registration:
        raise HTTPException(
            status_code=400,
            detail="A vehicle with this plate number already exists in the system.",
        )
    if registration_in.vin_number:
        registration_by_vin = vehicle_registration.get_by_vin(db, vin_number=registration_in.vin_number)
        if registration_by_vin:
            raise HTTPException(
                status_code=400,
                detail="A vehicle with this VIN number already exists in the system.",
            )
    registration = vehicle_registration.create(db, obj_in=registration_in)
    return registration


@router.get("/registrations/{registration_id}", response_model=VehicleRegistration)
def get_vehicle_registration(
    registration_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific vehicle registration by ID.
    """
    registration = vehicle_registration.get(db, id=registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Vehicle registration not found")
    return registration


@router.get("/registrations/by-plate/{plate_number}", response_model=VehicleRegistration)
def get_registration_by_plate(
    plate_number: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get vehicle registration by plate number.
    """
    registration = vehicle_registration.get_by_plate_number(db, plate_number=plate_number)
    if not registration:
        raise HTTPException(status_code=404, detail="Vehicle registration not found")
    return registration


@router.post("/search", response_model=VehicleSearchResponse)
async def search_vehicles(
    search_request: VehicleSearchRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Search Transport Bureau database using various query types.
    """
    try:
        result = await vehicle_registration_service.search_vehicle(search_request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/detections/{detection_id}/match", response_model=DetectionVehicleMatch)
async def create_detection_vehicle_match(
    detection_id: str,
    match_data: DetectionVehicleMatchCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new vehicle registration match for a detection.
    """
    # Verify detection exists
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Verify vehicle registration exists
    registration = vehicle_registration.get(db, id=match_data.vehicle_registration_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Vehicle registration not found")
    
    # Create the match
    match = detection_vehicle_match.create(
        db, 
        obj_in=match_data, 
        verified_by_user_id=current_user.id
    )
    return match


@router.get("/detections/{detection_id}/matches", response_model=List[DetectionVehicleMatch])
def get_detection_vehicle_matches(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all vehicle registration matches for a detection.
    """
    matches = detection_vehicle_match.get_by_detection_id(db, detection_id=detection_id)
    return matches


@router.get("/detections/{detection_id}/primary-match", response_model=Optional[DetectionVehicleMatch])
def get_detection_primary_vehicle_match(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get the primary/best vehicle registration match for a detection.
    """
    match = detection_vehicle_match.get_primary_match(db, detection_id=detection_id)
    return match


@router.put("/matches/{match_id}", response_model=DetectionVehicleMatch)
def update_detection_vehicle_match(
    match_id: str,
    match_update: DetectionVehicleMatchUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a vehicle registration match (e.g., confirm, reject, add notes).
    """
    match = detection_vehicle_match.get(db, id=match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Vehicle match not found")
    
    updated_match = detection_vehicle_match.update(
        db, 
        db_obj=match, 
        obj_in=match_update,
        verified_by_user_id=current_user.id
    )
    return updated_match


@router.post("/detections/{detection_id}/auto-match")
async def auto_match_detection_to_vehicle(
    detection_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Automatically search for vehicle registration matches for a detection using plate recognition.
    """
    # Get detection
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Check if detection has plate number
    if not detection.plate_number:
        raise HTTPException(
            status_code=400, 
            detail="Detection has no plate number for matching"
        )
    
    try:
        # Search Transport Bureau database
        search_request = VehicleSearchRequest(
            query_type="plate_number",
            query_value=detection.plate_number,
            confidence_threshold=0.7
        )
        
        search_result = await vehicle_registration_service.search_vehicle(search_request)
        
        if not search_result.success:
            raise HTTPException(status_code=500, detail=search_result.message)
        
        # Create matches for results above threshold
        created_matches = []
        for match_data in search_result.matches:
            vehicle_data = match_data["vehicle"]
            
            # Find or create vehicle registration in our database
            existing_registration = vehicle_registration.get_by_plate_number(
                db, vehicle_data["plate_number"]
            )
            
            if not existing_registration:
                # Create new registration from search result
                from datetime import date
                vehicle_data["registration_date"] = date.fromisoformat(vehicle_data["registration_date"])
                vehicle_data["expiry_date"] = date.fromisoformat(vehicle_data["expiry_date"])
                vehicle_data["insurance_expiry_date"] = date.fromisoformat(vehicle_data["insurance_expiry_date"])
                vehicle_data["last_inspection_date"] = date.fromisoformat(vehicle_data["last_inspection_date"])
                vehicle_data["next_inspection_date"] = date.fromisoformat(vehicle_data["next_inspection_date"])
                
                registration_create = VehicleRegistrationCreate(**vehicle_data)
                existing_registration = vehicle_registration.create(db, obj_in=registration_create)
            
            # Create detection match
            match_create = DetectionVehicleMatchCreate(
                detection_id=detection_id,
                vehicle_registration_id=existing_registration.id,
                confidence_score=match_data["confidence_score"],
                match_type=match_data["match_type"],
                match_source="mock_api",  # or "transport_bureau_api" when real API is used
                match_details=match_data["match_details"],
                status="pending"
            )
            
            match = detection_vehicle_match.create(
                db, 
                obj_in=match_create,
                verified_by_user_id=current_user.id
            )
            created_matches.append(match)
        
        return {
            "success": True,
            "message": f"Created {len(created_matches)} vehicle registration matches",
            "matches_created": len(created_matches),
            "search_time_ms": search_result.search_time_ms
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-match failed: {str(e)}")


@router.get("/detections/{detection_id}/with-vehicle", response_model=DetectionWithVehicle)
def get_detection_with_vehicle(
    detection_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get detection with all vehicle registration match information.
    """
    # Get detection
    detection = crud.detection.get(db, id=detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Get all vehicle matches
    matches = detection_vehicle_match.get_by_detection_id(db, detection_id=detection_id)
    
    # Get primary match
    primary_match = detection_vehicle_match.get_primary_match(db, detection_id=detection_id)
    primary_vehicle = None
    if primary_match:
        primary_vehicle = vehicle_registration.get(db, id=primary_match.vehicle_registration_id)
    
    # Build response
    response_data = {
        "id": detection.id,
        "category": detection.category,
        "name": detection.name,
        "description": detection.description,
        "location": detection.location,
        "plate_number": detection.plate_number,
        "vehicle_make": detection.vehicle_make,
        "vehicle_model": detection.vehicle_model,
        "vehicle_color": detection.vehicle_color,
        "image_urls": detection.image_urls or [],
        "status": detection.status,
        "created_at": detection.created_at,
        "updated_at": detection.updated_at,
        "vehicle_matches": matches,
        "primary_vehicle": primary_vehicle,
        "has_vehicle_match": len(matches) > 0
    }
    
    return response_data


@router.post("/populate-mock-data")
async def populate_mock_vehicle_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Populate database with mock vehicle registration data for development/testing.
    """
    try:
        await vehicle_registration_service.populate_mock_data_to_db(db)
        return {
            "success": True,
            "message": "Mock vehicle registration data populated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate mock data: {str(e)}")


@router.post("/configure-real-api")
def configure_real_transport_bureau_api(
    api_url: str,
    api_key: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Configure real Transport Bureau API credentials.
    """
    try:
        vehicle_registration_service.configure_real_api(api_url, api_key)
        return {
            "success": True,
            "message": "Real Transport Bureau API configured successfully",
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
    Switch back to mock Transport Bureau API for testing.
    """
    vehicle_registration_service.switch_to_mock()
    return {
        "success": True,
        "message": "Switched to mock Transport Bureau API"
    }

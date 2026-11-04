from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from app import crud, models, schemas
from app.api import deps
from app.core.push import send_push_notification
from app.core.audit import log_detection_created, log_detection_updated, log_detection_deleted, log_detection_assigned, log_detection_status_change
import shutil
import os
import uuid
import json
import asyncio
import math
from app.core.websockets import manager

router = APIRouter()

# Strict allowed values
_VALID_CATEGORIES = {"person", "vehicle"}
_VALID_SUBCATEGORIES = {"missing", "criminal"}

# In-memory throttle cache: "detection_id::camera_id" -> datetime of last trigger
_detection_throttle_cache: dict = {}


def _enrich_detection(db: Session, detection: models.Detection) -> dict:
    """Build a rich response dict for a detection, resolving dynamic data labels."""
    data = {
        "id": detection.id,
        "category": detection.category,
        "name": detection.name,
        "description": detection.description,
        "age": detection.age,
        "location": detection.location,
        "subcategory": detection.subcategory,
        "crimeType": detection.crime_type,
        "imageUrls": detection.image_urls or [],
        "status": detection.status,
        "createdAt": detection.created_at.isoformat() if detection.created_at else "",
        "updatedAt": detection.updated_at.isoformat() if detection.updated_at else "",
        "detectedCameraIds": detection.detected_camera_ids or [],
        "detectionEvents": [],
        "formTemplateId": detection.form_template_id,
        "dynamicData": detection.dynamic_data,
        "resolvedDynamicData": [],
        "assignedCompanyId": detection.assigned_company_id,
        "assignedCompanyName": None,
        "handlingStatus": detection.handling_status,
        "handlingNotes": detection.handling_notes,
        "handlingProofUrls": detection.handling_proof_urls or [],
        "eligibleForAssignment": detection.eligible_for_assignment,
        "dispatchMessage": getattr(detection, "dispatch_message", None)
    }
    
    data["assignmentType"] = getattr(detection, "assignment_type", "company")
    
    if data["assignmentType"] == "user":
        data["assignedCompanyName"] = None
        assignments = db.query(models.DetectionAssignment).filter(
            models.DetectionAssignment.detection_id == detection.id
        ).all()
        officers_list = []
        for asg in assignments:
            officer_user = asg.user
            officers_list.append({
                "officerName": officer_user.full_name if officer_user else "Unknown",
                "officerEmail": officer_user.email if officer_user else "",
                "distanceKm": round(asg.distance_at_assignment, 2) if asg.distance_at_assignment else None,
                "status": asg.status,
                "assignmentId": asg.id,
                "assignedAt": asg.assigned_at.isoformat() if asg.assigned_at else None
            })
        data["assignedOfficers"] = officers_list
    elif detection.assigned_company_id:
        assigned_org = db.query(models.Organization).filter(models.Organization.id == detection.assigned_company_id).first()
        if assigned_org:
            data["assignedCompanyName"] = assigned_org.name
    # Vehicle-specific fields
    data["plateNumber"] = detection.plate_number
    data["code"] = detection.code
    data["region"] = detection.region
    
    # Enrich detection events with camera coordinates and normalize snapshotUrls
    if detection.detection_events:
        enriched_events = []
        for event in detection.detection_events:
            enriched_event = event.copy()
            camera = db.query(models.Camera).filter(models.Camera.id == event.get('cameraId')).first()
            if camera:
                enriched_event['lat'] = camera.lat
                enriched_event['lng'] = camera.lng
            # Ensure snapshotUrls array is always present
            if 'snapshotUrls' not in enriched_event or not enriched_event['snapshotUrls']:
                if enriched_event.get('snapshotUrl'):
                    enriched_event['snapshotUrls'] = [enriched_event['snapshotUrl']]
                else:
                    enriched_event['snapshotUrls'] = []
            enriched_events.append(enriched_event)
        data["detectionEvents"] = enriched_events

    # Resolve dynamic data labels from form template
    if detection.dynamic_data and detection.form_template_id:
        template = db.query(models.FormTemplate).filter(
            models.FormTemplate.id == detection.form_template_id
        ).first()
        if template and template.fields:
            field_map = {f.get('id'): f.get('label') for f in template.fields if isinstance(f, dict)}
            resolved = []
            for field_id, value in detection.dynamic_data.items():
                label = field_map.get(field_id, field_id)
                resolved.append({"label": label, "value": value})
            data["resolvedDynamicData"] = resolved
    
    return data

@router.get("/", response_model=List[schemas.Detection])
def get_detections(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Retrieve detections.
    """
    if current_user.role.name == "Super Admin":
        detections = db.query(models.Detection).all()
    else:
        from sqlalchemy import or_
        # Also include detections where the current user has been assigned (user-level traffic assignments)
        user_assigned_detection_ids = db.query(models.DetectionAssignment.detection_id).filter(
            models.DetectionAssignment.user_id == current_user.id
        ).subquery()
        detections = db.query(models.Detection).filter(
            or_(
                models.Detection.organization_id == current_user.organization_id,
                models.Detection.assigned_company_id == current_user.organization_id,
                models.Detection.id.in_(user_assigned_detection_ids)
            )
        ).all()
    return [_enrich_detection(db, d) for d in detections]

@router.post("/", response_model=schemas.Detection)
async def create_detection(
    *,
    db: Session = Depends(deps.get_db),
    category: str = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    subcategory: Optional[str] = Form(None),
    crimeType: Optional[str] = Form(None),
    cameraId: Optional[str] = Form(None),
    formTemplateId: Optional[str] = Form(None),
    dynamicData: Optional[str] = Form(None),
    eligibleForAssignment: Optional[str] = Form(None),
    allowExternalAssignment: Optional[str] = Form(None),
    plateNumber: Optional[str] = Form(None),
    code: Optional[str] = Form(None),
    region: Optional[str] = None, # Form parameter
    imageFiles: List[UploadFile] = File(None),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Create new detection (with multipart support).
    """
    # ── Traffic Police enforcement: can only submit vehicle detections ──
    user_org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()
    if user_org and user_org.company_type == "traffic_police" and category != "vehicle":
        raise HTTPException(
            status_code=403,
            detail="Traffic Police companies can only submit vehicle detections"
        )

    # ── Strict category / subcategory validation ──
    if category not in _VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category '{category}'. Allowed values: {', '.join(_VALID_CATEGORIES)}"
        )
    if subcategory is not None and subcategory not in _VALID_SUBCATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subcategory '{subcategory}'. Allowed values: {', '.join(_VALID_SUBCATEGORIES)}"
        )

    import datetime as dt

    # Debouncing / Grouping:
    # If the simulation (or engine) constantly fires detections for the same entity,
    # we should group them by forwarding to `update_detection` which handles event throttling.
    if cameraId:
        COOLDOWN_SECONDS = 300
        cutoff_time = dt.datetime.utcnow() - dt.timedelta(seconds=COOLDOWN_SECONDS)
        
        existing_detection = db.query(models.Detection).filter(
            models.Detection.organization_id == current_user.organization_id,
            models.Detection.category == category,
            models.Detection.name == name,
            models.Detection.updated_at >= cutoff_time
        ).order_by(models.Detection.updated_at.desc()).first()
        
        if existing_detection:
            # Route to update_detection to merge camera event, but DO NOT forward
            # the engine's data fields — they could overwrite the original detection.
            # Only pass cameraId (to record the new event) and imageFiles (for snapshot).
            # All other fields are None so update_detection's guards skip them.
            return await update_detection(
                db=db,
                id=existing_detection.id,
                category=None,
                name=None,
                description=None,
                age=None,
                location=None,
                subcategory=None,
                crimeType=None,
                status=None,
                cameraId=cameraId,
                formTemplateId=None,
                dynamicData=None,
                eligibleForAssignment=None,
                plateNumber=None,
                code=None,
                region=None,
                imageFiles=imageFiles,
                current_user=current_user
            )

    # Parse boolean safely
    is_eligible_for_assignment = True # Default to True if not provided
    if eligibleForAssignment is not None:
        val = str(eligibleForAssignment).lower().strip()
        is_eligible_for_assignment = val in ("true", "1", "yes", "on")
        print(f"DEBUG: create_detection received eligibleForAssignment='{eligibleForAssignment}', parsed as {is_eligible_for_assignment}")

    is_allow_external = False
    if allowExternalAssignment is not None:
        val = str(allowExternalAssignment).lower().strip()
        is_allow_external = val in ("true", "1", "yes", "on")

    # Actual file saving
    image_urls = []
    if imageFiles:
        for imageFile in imageFiles:
            file_extension = os.path.splitext(imageFile.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join("uploads", unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imageFile.file, buffer)
            image_urls.append(f"/uploads/{unique_filename}")
    
    # Parse dynamicData JSON string if provided
    parsed_dynamic_data = None
    if dynamicData:
        try:
            parsed_dynamic_data = json.loads(dynamicData)
        except (json.JSONDecodeError, TypeError):
            parsed_dynamic_data = None

    # Validate form template belongs to the organization
    if formTemplateId:
        template = db.query(models.FormTemplate).filter(
            models.FormTemplate.id == formTemplateId,
            models.FormTemplate.organization_id == current_user.organization_id
        ).first()
        if not template:
            raise HTTPException(status_code=400, detail="Invalid form template for your organization")
    
    obj_in = schemas.DetectionCreate(
        category=category,
        name=name,
        description=description,
        age=age,
        location=location,
        subcategory=subcategory,
        crimeType=crimeType if subcategory == "criminal" else None,
        imageUrls=image_urls,
        formTemplateId=formTemplateId,
        dynamicData=parsed_dynamic_data,
        eligibleForAssignment=is_eligible_for_assignment,
        allowExternalAssignment=is_allow_external,
        plateNumber=plateNumber,
        code=code,
        region=region
    )
    
    try:
        from app.services.face_service import get_largest_face_embedding
        face_embedding = None
        if image_urls:
            local_path = image_urls[0].lstrip("/")
            if os.path.exists(local_path):
                embedding = get_largest_face_embedding(local_path)
                if embedding:
                    face_embedding = embedding
    except Exception as e:
        import logging
        logging.error(f"Failed to extract face embedding: {e}")
        face_embedding = None

    detection = crud.detection.create(
        db, obj_in=obj_in, 
        organization_id=current_user.organization_id,
        user_id=current_user.id
    )
    
    # Ensure allow_external_assignment is set
    detection.allow_external_assignment = is_allow_external
    db.add(detection)
    db.commit()
    db.refresh(detection)
    
    # Log detection creation
    try:
        log_detection_created(db, current_user, detection.id, detection.name, detection.category)
    except Exception as e:
        print(f"Failed to log detection creation: {e}")
    
    if face_embedding:
        detection.face_embedding = face_embedding
        db.add(detection)
        db.commit()
        db.refresh(detection)
        
        # ═══ NATIONAL ID INTEGRATION ═══
        # Automatically trigger National ID matching for person detections with face embeddings
        if detection.category == "person":
            try:
                from app.services.national_id_service import national_id_service
                from app.schemas.national_id import NationalIdSearchRequest
                from app.crud.crud_national_id import national_id_profile, detection_national_id_match
                from app.schemas.national_id import DetectionNationalIdMatchCreate, NationalIdProfileCreate
                import struct
                import json
                
                # Convert face embedding from bytes to list for API call
                num_floats = len(face_embedding) // 4
                face_embedding_list = list(struct.unpack(f"{num_floats}f", face_embedding))
                
                # Search National ID database
                search_request = NationalIdSearchRequest(
                    query_type="face_embedding",
                    query_value=json.dumps(face_embedding_list),
                    confidence_threshold=0.7
                )
                
                # Perform async search (we'll run it in background to not block detection creation)
                async def perform_national_id_matching():
                    try:
                        search_result = await national_id_service.search_national_id(search_request)
                        
                        if search_result.success and search_result.matches:
                            # Create matches for results above threshold
                            for match_data in search_result.matches:
                                profile_data = match_data["profile"]
                                
                                # Find or create National ID profile in our database
                                existing_profile = national_id_profile.get_by_national_id_number(
                                    db, profile_data["national_id_number"]
                                )
                                
                                if not existing_profile:
                                    # Create new profile from search result
                                    profile_create = NationalIdProfileCreate(**profile_data)
                                    existing_profile = national_id_profile.create(db, obj_in=profile_create)
                                
                                # Create detection match
                                match_create = DetectionNationalIdMatchCreate(
                                    detection_id=detection.id,
                                    national_id_profile_id=existing_profile.id,
                                    confidence_score=match_data["confidence_score"],
                                    match_type=match_data["match_type"],
                                    match_source="mock_api",  # or "government_api" when real API is used
                                    match_details=match_data["match_details"],
                                    status="pending"
                                )
                                
                                detection_national_id_match.create(
                                    db, 
                                    obj_in=match_create,
                                    verified_by_user_id=current_user.id
                                )
                                
                                logging.info(f"Created National ID match for detection {detection.id} with profile {existing_profile.national_id_number}")
                    
                    except Exception as e:
                        logging.error(f"National ID matching failed for detection {detection.id}: {e}")
                
                # Schedule the matching to run in background
                asyncio.create_task(perform_national_id_matching())
                
            except Exception as e:
                logging.error(f"Failed to initiate National ID matching for detection {detection.id}: {e}")
                # Don't fail the detection creation if National ID matching fails

    if cameraId:
        camera = crud.camera.get(db, id=cameraId)
        if camera:
            # Check if organization has access to this camera
            access = db.query(models.CameraAccess).filter(
                models.CameraAccess.camera_id == cameraId,
                models.CameraAccess.organization_id == detection.organization_id
            ).first()
            
            if not access:
                raise HTTPException(status_code=400, detail="The organization does not have access to this camera")
            
            # Auto-assign logic
            if detection.handling_status == "unassigned":
                # Determine if the submitting organization is a traffic police company
                submitting_org = db.query(models.Organization).filter(
                    models.Organization.id == detection.organization_id
                ).first()
                is_traffic_org = submitting_org and submitting_org.company_type == "traffic_police"

                if is_traffic_org and detection.category == "vehicle":
                    # ═══ TRAFFIC COMPANY FLOW ═══
                    # Assign to users (traffic officers) - NOT companies
                    detection.assigned_company_id = None
                    detection.assignment_type = "user"
                    detection.handling_status = "pending"
                    
                    # Dispatch to nearby officers (geo proximity)
                    if camera.lat and camera.lng:
                        include_external = detection.allow_external_assignment
                        radius_km = crud.system_setting.get_value(db, "assignment_radius_traffic", 10.0)
                        print(f"[DISPATCH CREATE] Traffic flow: org={detection.organization_id}, camera=({camera.lat},{camera.lng}), radius={radius_km}km, external={include_external}")
                        nearby = crud.officer_location.find_nearby_officers_multi(
                            db, primary_org_id=detection.organization_id,
                            lat=camera.lat, lng=camera.lng, radius_km=radius_km,
                            include_external=include_external
                        )
                        if len(nearby) == 0:
                            staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
                            detection.dispatch_message = f"No officers found within {radius_km}km radius or officers are stale (>{staleness_minutes:.0f} min)."
                            print(f"[DISPATCH CREATE] ⚠ NO OFFICERS DISPATCHED. Reason: {detection.dispatch_message}")
                        else:
                            detection.dispatch_message = f"Dispatched to {len(nearby)} officer(s)."
                            print(f"[DISPATCH CREATE] ✓ {detection.dispatch_message}")
                        for officer, dist in nearby:
                            asg = crud.traffic_alert.create_assignment(
                                db, detection_id=detection.id, user_id=officer.user_id, distance_km=dist
                            )
                            print(f"[DISPATCH CREATE] → Assigned officer {officer.user_id} at {dist:.2f}km (assignment {asg.id})")
                            # WebSocket push
                            asyncio.create_task(manager.send_to_user(
                                str(officer.user_id),
                                {
                                    "type": "assignment_created",
                                    "assignmentId": asg.id,
                                    "detectionId": detection.id,
                                    "cameraId": camera.id,
                                    "cameraName": camera.name,
                                    "distanceKm": dist,
                                    "plateNumber": detection.plate_number,
                                    "description": detection.description,
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            ))
                            # Expo Push
                            if getattr(officer.user, 'expo_push_token', None):
                                asyncio.create_task(send_push_notification(
                                    expo_push_token=officer.user.expo_push_token,
                                    title="🚨 Traffic Alert: " + (detection.plate_number or "Unknown Vehicle"),
                                    body=f"Flagged vehicle detected {dist:.1f} km away at {camera.name}.",
                                    data={"route": f"/assigned/{asg.id}", "assignmentId": asg.id, "detectionId": detection.id}
                                ))
                    else:
                        detection.dispatch_message = f"Camera location missing (lat/lng not set)."
                        print(f"[DISPATCH CREATE] ⚠ {detection.dispatch_message}")
                else:
                    # ═══ NON-TRAFFIC COMPANY FLOW ═══
                    is_linked_to_traffic = False
                    if camera.linked_traffic_company_id and detection.category == "vehicle":
                        linked_org = db.query(models.Organization).filter(
                            models.Organization.id == camera.linked_traffic_company_id
                        ).first()
                        if linked_org and linked_org.company_type == "traffic_police":
                            is_linked_to_traffic = True
                            detection.assigned_company_id = None
                            detection.assignment_type = "user"
                            detection.handling_status = "pending"
                            
                            if camera.lat and camera.lng:
                                include_external = detection.allow_external_assignment
                                radius_std = crud.system_setting.get_value(db, "assignment_radius_standard", 5.0)
                                print(f"[DISPATCH CREATE] Linked-traffic flow: linked_org={linked_org.id}, camera=({camera.lat},{camera.lng}), radius={radius_std}km")
                                nearby = crud.officer_location.find_nearby_officers_multi(
                                    db, primary_org_id=linked_org.id,
                                    lat=camera.lat, lng=camera.lng, radius_km=radius_std,
                                    include_external=include_external
                                )
                                if len(nearby) == 0:
                                    staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
                                    detection.dispatch_message = f"No officers found in linked traffic company '{linked_org.name}' within {radius_std}km or officers are stale (>{staleness_minutes:.0f} min)."
                                    print(f"[DISPATCH CREATE] ⚠ NO OFFICERS DISPATCHED via linked traffic. Reason: {detection.dispatch_message}")
                                else:
                                    detection.dispatch_message = f"Dispatched to {len(nearby)} linked traffic officer(s) from '{linked_org.name}'."
                                    print(f"[DISPATCH CREATE] ✓ {detection.dispatch_message}")
                                for officer, dist in nearby:
                                    asg = crud.traffic_alert.create_assignment(
                                        db, detection_id=detection.id, user_id=officer.user_id, distance_km=dist
                                    )
                                    print(f"[DISPATCH CREATE] → Assigned officer {officer.user_id} at {dist:.2f}km (assignment {asg.id})")
                                    asyncio.create_task(manager.send_to_user(
                                        str(officer.user_id),
                                        {
                                            "type": "assignment_created",
                                            "assignmentId": asg.id,
                                            "detectionId": detection.id,
                                            "cameraId": camera.id,
                                            "cameraName": camera.name,
                                            "distanceKm": dist,
                                            "plateNumber": detection.plate_number,
                                            "description": detection.description,
                                            "timestamp": datetime.utcnow().isoformat()
                                        }
                                    ))
                                    if getattr(officer.user, 'expo_push_token', None):
                                        asyncio.create_task(send_push_notification(
                                            expo_push_token=officer.user.expo_push_token,
                                            title="🚨 Traffic Alert: " + (detection.plate_number or "Unknown Vehicle"),
                                            body=f"Flagged vehicle detected {dist:.1f} km away at {camera.name}.",
                                            data={"route": f"/assigned/{asg.id}", "assignmentId": asg.id, "detectionId": detection.id}
                                        ))
                            else:
                                detection.dispatch_message = f"Camera location missing (lat/lng not set). Cannot dispatch via linked traffic."
                                print(f"[DISPATCH CREATE] ⚠ {detection.dispatch_message}")

                    if not is_linked_to_traffic:
                        # Legacy assignment flow
                        print(f"[DISPATCH CREATE] Legacy company flow: eligible={detection.eligible_for_assignment}, camera_org={camera.organization_id}")
                        detection.assignment_type = "company"
                        detection.dispatch_message = "Assigned to company (legacy flow)."
                        if detection.eligible_for_assignment and camera.organization_id:
                            detection.assigned_company_id = camera.organization_id
                            detection.handling_status = "pending"
                        else:
                            detection.assigned_company_id = detection.organization_id
                            detection.handling_status = "pending"

            camera.is_flagged = True
            camera.last_detection_at = datetime.utcnow()
            
            # Update detected cameras
            detection.detected_camera_ids = [cameraId]
            
            # Record detection event
            new_event = {
                "id": str(uuid.uuid4()),
                "cameraId": camera.id,
                "cameraName": camera.name,
                "timestamp": datetime.utcnow().isoformat(),
                "snapshotUrl": detection.image_urls[0] if detection.image_urls else None,
                "snapshotUrls": [detection.image_urls[0]] if detection.image_urls else [],
            }
            detection.detection_events = [new_event]
            flag_modified(detection, 'detection_events')
            flag_modified(detection, 'detected_camera_ids')
            
            # Create DB notifications
            notif_org_id = detection.organization_id
            org_users = db.query(models.User).filter(models.User.organization_id == notif_org_id).all()
            for u in org_users:
                perms = u.role.permissions if u.role and u.role.permissions else []
                if "*" in perms or "notifications.view" in perms:
                    notif = models.Notification(
                        id=str(uuid.uuid4()),
                        user_id=u.id,
                        type="alert",
                        title=f"Detection Alert: {camera.name}",
                        message=f"{detection.category} detected at {camera.name}",
                        action_url=f"/cameras?id={camera.id}"
                    )
                    db.add(notif)
            
            db.commit()
            db.refresh(detection)
            
            # Notify via websocket
            asyncio.create_task(manager.broadcast_to_org(
                str(notif_org_id),
                {
                    "type": "new_detection",
                    "title": f"Detection Alert: {camera.name}",
                    "message": f"{detection.category} detected at {camera.name}",
                    "cameraId": camera.id,
                    "detectionId": detection.id,
                    "timestamp": detection.updated_at.isoformat() if detection.updated_at else datetime.utcnow().isoformat(),
                    "cameraCount": 1,
                    "events": [new_event]
                }
            ))

    return _enrich_detection(db, detection)

@router.get("/{id}", response_model=schemas.Detection)
def get_detection(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.PermissionChecker("detections.view")),
) -> Any:
    """
    Get detection by ID.
    """
    detection = crud.detection.get(db, id=id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    if current_user.role.name != "Super Admin":
        if detection.organization_id != current_user.organization_id:
            # Allow if user belongs to the assigned company (company-level assignment)
            is_assigned_company = (
                detection.assigned_company_id
                and detection.assigned_company_id == current_user.organization_id
            )
            # Also allow if user has an individual assignment for this detection (traffic flow)
            has_assignment = db.query(models.DetectionAssignment).filter(
                models.DetectionAssignment.detection_id == detection.id,
                models.DetectionAssignment.user_id == current_user.id
            ).first()
            if not is_assigned_company and not has_assignment:
                raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return _enrich_detection(db, detection)

@router.put("/{id}", response_model=schemas.Detection)
async def update_detection(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    category: str = Form(None),
    name: str = Form(None),
    description: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    subcategory: Optional[str] = Form(None),
    crimeType: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    cameraId: Optional[str] = Form(None),
    formTemplateId: Optional[str] = Form(None),
    dynamicData: Optional[str] = Form(None),
    eligibleForAssignment: Optional[str] = Form(None),
    plateNumber: Optional[str] = Form(None),
    code: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    imageFiles: List[UploadFile] = File(None),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Update detection.
    """
    detection = crud.detection.get(db, id=id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    if current_user.role.name != "Super Admin":
        if detection.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    from typing import Dict, Any
    update_data: Dict[str, Any] = {}

    # ── Snapshot old values BEFORE any mutation ──
    old_snapshot = {
        "name": detection.name,
        "description": detection.description,
        "age": detection.age,
        "location": detection.location,
        "category": detection.category,
        "subcategory": detection.subcategory,
        "crimeType": detection.crime_type,
        "status": detection.status,
        "plateNumber": detection.plate_number,
        "code": detection.code,
        "region": detection.region,
        "eligibleForAssignment": detection.eligible_for_assignment,
    }
    if category is not None: update_data["category"] = category
    if name is not None: update_data["name"] = name
    if description is not None: update_data["description"] = description
    if age is not None: update_data["age"] = age
    if location is not None: update_data["location"] = location
    if subcategory is not None: update_data["subcategory"] = subcategory
    if crimeType is not None: update_data["crimeType"] = crimeType
    if status is not None: update_data["status"] = status

    # ── Strict category / subcategory validation ──
    if category is not None and category not in _VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category '{category}'. Allowed values: {', '.join(_VALID_CATEGORIES)}"
        )
    if subcategory is not None and subcategory not in _VALID_SUBCATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subcategory '{subcategory}'. Allowed values: {', '.join(_VALID_SUBCATEGORIES)}"
        )
    if formTemplateId is not None: update_data["formTemplateId"] = formTemplateId
    
    if plateNumber is not None: update_data["plateNumber"] = plateNumber
    if code is not None: update_data["code"] = code
    if region is not None: update_data["region"] = region
    
    if eligibleForAssignment is not None:
        val = str(eligibleForAssignment).lower().strip()
        update_data["eligibleForAssignment"] = val in ("true", "1", "yes", "on")
        print(f"DEBUG: update_detection received eligibleForAssignment='{eligibleForAssignment}', parsed as {update_data['eligibleForAssignment']}")
    uploaded_proof_urls = []
    if imageFiles:
        for imageFile in imageFiles:
            file_extension = os.path.splitext(imageFile.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join("uploads", unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imageFile.file, buffer)
            uploaded_proof_urls.append(f"/uploads/{unique_filename}")
        
        # If cameraId is NOT present, this is a manual update (Edit Request)
        # In this case, we SHOULD update the reference images and face embedding.
        if not cameraId:
            update_data["imageUrls"] = uploaded_proof_urls
            try:
                from app.services.face_service import get_largest_face_embedding
                local_path = uploaded_proof_urls[0].lstrip("/")
                if os.path.exists(local_path):
                    embedding = get_largest_face_embedding(local_path)
                    if embedding:
                        detection.face_embedding = embedding
                        db.add(detection)
                        db.commit()
            except Exception as e:
                import logging
                logging.error(f"Failed to extract face embedding on manual update: {e}")

    obj_in = schemas.DetectionUpdate(**update_data)
    detection = crud.detection.update(db, db_obj=detection, obj_in=obj_in)

    # ── Audit: log the manual edit (only when it's a real user edit, not a camera event) ──
    if not cameraId:
        try:
            log_detection_updated(db, current_user, detection.id, detection.name, update_data, old_snapshot)
        except Exception as _audit_err:
            import logging
            logging.error(f"Failed to log detection update: {_audit_err}")
    
    # ══════════════════════════════════════════════════════════════════════
    # CAMERA EVENT PROCESSING (Detection Triggered)
    # ══════════════════════════════════════════════════════════════════════
    if cameraId:
        print(f"[UPDATE_DETECTION] ═══ CAMERA EVENT TRIGGERED ═══")
        print(f"[UPDATE_DETECTION] Detection ID: {detection.id}, Camera ID: {cameraId}")
        print(f"[UPDATE_DETECTION] Current status: {detection.status}, handling_status: {detection.handling_status}")
        
        camera = crud.camera.get(db, id=cameraId)
        if not camera:
            print(f"[UPDATE_DETECTION] ✗ ERROR: Camera {cameraId} not found")
            raise HTTPException(status_code=404, detail=f"Camera {cameraId} not found")
        
        print(f"[UPDATE_DETECTION] Camera found: {camera.name}, lat={camera.lat}, lng={camera.lng}")
        
        if camera:
            # Check if organization has access to this camera
            access = db.query(models.CameraAccess).filter(
                models.CameraAccess.camera_id == cameraId,
                models.CameraAccess.organization_id == detection.organization_id
            ).first()
            
            if not access:
                raise HTTPException(status_code=400, detail="The organization does not have access to this camera")
            
            # ═══════════════════════════════════════════════════════
            # THROTTLE CHECK — uses in-memory cache, not DB state
            # ═══════════════════════════════════════════════════════
            throttle_key = f"{detection.id}::{cameraId}"
            now = datetime.utcnow()
            is_throttled = False

            if throttle_key in _detection_throttle_cache:
                last_trigger = _detection_throttle_cache[throttle_key]
                elapsed = (now - last_trigger).total_seconds()
                print(f"[THROTTLE] key={throttle_key}, elapsed={elapsed:.1f}s (Anti-spam DISABLED for testing)")
                # if elapsed < 300:  # 5 minutes
                #     is_throttled = True

            new_snapshot = uploaded_proof_urls[0] if uploaded_proof_urls else f"https://picsum.photos/seed/{camera.id}_{int(now.timestamp())}/800/450"

            if is_throttled:
                # ── THROTTLED: just append image to latest event, no notification ──
                print(f"[THROTTLE] SUPPRESSED — aggregating image only")
                detection.dispatch_message = f"Throttled: This vehicle was recently detected here. Wait {300 - elapsed:.0f}s before simulating another dispatch to avoid spam."
                curr_events = list(detection.detection_events or [])

                # Find the most recent event from this camera and append image
                for i in range(len(curr_events) - 1, -1, -1):
                    if str(curr_events[i].get("cameraId", "")) == str(cameraId):
                        evt = dict(curr_events[i])
                        urls = list(evt.get("snapshotUrls", []))
                        if not urls and evt.get("snapshotUrl"):
                            urls.append(evt["snapshotUrl"])
                        urls.append(new_snapshot)
                        evt["snapshotUrls"] = urls
                        curr_events[i] = evt
                        break

                detection.detection_events = curr_events
                flag_modified(detection, 'detection_events')

                if detection.status not in ["resolved", "failed"]:
                    detection.status = "detected"

                db.add(detection)
                db.commit()
                db.refresh(detection)
            else:
                # ── NOT THROTTLED: full new event + notification ──
                _detection_throttle_cache[throttle_key] = now
                # Clean stale cache entries
                stale = [k for k, v in _detection_throttle_cache.items() if (now - v).total_seconds() > 600]
                for k in stale:
                    del _detection_throttle_cache[k]

                print(f"[THROTTLE] NEW EVENT — setting cache for {throttle_key}")

                # Check if we should attempt assignment
                # Allow assignment if: unassigned OR (pending but no officers assigned yet)
                existing_assignments_count = db.query(models.DetectionAssignment).filter(
                    models.DetectionAssignment.detection_id == detection.id
                ).count()
                
                should_attempt_assignment = (
                    detection.handling_status == "unassigned" or 
                    (detection.handling_status == "pending" and existing_assignments_count == 0)
                )
                
                print(f"[ASSIGNMENT] Detection {detection.id}: handling_status={detection.handling_status}, existing_assignments={existing_assignments_count}, should_attempt={should_attempt_assignment}")
                
                if should_attempt_assignment:
                    submitting_org = db.query(models.Organization).filter(
                        models.Organization.id == detection.organization_id
                    ).first()
                    is_traffic_org = submitting_org and submitting_org.company_type == "traffic_police"
                    
                    print(f"[ASSIGNMENT] Submitting org: {submitting_org.name if submitting_org else 'None'}, is_traffic_org={is_traffic_org}, category={detection.category}")

                    if is_traffic_org and detection.category == "vehicle":
                        # ═══ TRAFFIC COMPANY FLOW ═══
                        print(f"[ASSIGNMENT] ✓ TRAFFIC COMPANY FLOW activated for detection {detection.id}")
                        detection.assigned_company_id = None
                        detection.assignment_type = "user"
                        detection.handling_status = "pending"
                        
                        if camera.lat and camera.lng:
                            include_external = detection.allow_external_assignment
                            radius_km = crud.system_setting.get_value(db, "assignment_radius_traffic", 10.0)
                            print(f"[ASSIGNMENT] Searching for officers: camera_lat={camera.lat}, camera_lng={camera.lng}, radius={radius_km}km, include_external={include_external}")
                            
                            nearby = crud.officer_location.find_nearby_officers_multi(
                                db, primary_org_id=detection.organization_id,
                                lat=camera.lat, lng=camera.lng, radius_km=radius_km,
                                include_external=include_external
                            )
                            
                            if len(nearby) == 0:
                                staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
                                detection.dispatch_message = f"No officers found within {radius_km}km radius or officers are stale (>{staleness_minutes:.0f} min)."
                                print(f"[ASSIGNMENT] ✗ NO OFFICERS ASSIGNED - Reason: {detection.dispatch_message}")
                            else:
                                detection.dispatch_message = f"Dispatched to {len(nearby)} officer(s)."
                                print(f"[ASSIGNMENT] ✓ OFFICERS ASSIGNED: {len(nearby)} officer(s)")
                                
                            for officer, dist in nearby:
                                asg = crud.traffic_alert.create_assignment(
                                    db, detection_id=detection.id, user_id=officer.user_id, distance_km=dist
                                )
                                print(f"[ASSIGNMENT]   → Officer {officer.user_id} assigned (distance: {dist:.2f}km, assignment_id: {asg.id})")
                                
                                # Get officer details for logging
                                officer_user = db.query(models.User).filter(models.User.id == officer.user_id).first()
                                officer_name = officer_user.full_name if officer_user else "Unknown"
                                officer_email = officer_user.email if officer_user else "Unknown"
                                print(f"[ASSIGNMENT]     Officer details: name={officer_name}, email={officer_email}, lat={officer.lat}, lng={officer.lng}")
                                
                                payload_data = {
                                    "type": "assignment_created",
                                    "assignmentId": asg.id,
                                    "detectionId": detection.id,
                                    "cameraId": camera.id,
                                    "cameraName": camera.name,
                                    "distanceKm": dist,
                                    "plateNumber": detection.plate_number,
                                    "description": detection.description,
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                                asyncio.create_task(manager.send_to_user(str(officer.user_id), payload_data))
                                asyncio.create_task(manager.broadcast_to_org(str(detection.organization_id), payload_data))
                                asyncio.create_task(manager.broadcast_to_org("None", payload_data))
                                if getattr(officer.user, 'expo_push_token', None):
                                    asyncio.create_task(send_push_notification(
                                        expo_push_token=officer.user.expo_push_token,
                                        title="🚨 Traffic Assignment: " + (detection.plate_number or "Unknown Vehicle"),
                                        body=f"Flagged vehicle detected {dist:.1f} km away at {camera.name}.",
                                        data={"route": f"/assigned/{asg.id}", "assignmentId": asg.id, "detectionId": detection.id}
                                    ))
                        else:
                            detection.dispatch_message = f"Camera location missing (lat/lng not set)."
                            print(f"[ASSIGNMENT] ✗ NO OFFICERS ASSIGNED - Reason: Camera {camera.id} has no coordinates (lat={camera.lat}, lng={camera.lng})")
                    else:
                        # ═══ NON-TRAFFIC COMPANY FLOW ═══
                        print(f"[ASSIGNMENT] Non-traffic company flow for detection {detection.id}")
                        is_linked_to_traffic = False
                        if camera.linked_traffic_company_id and detection.category == "vehicle":
                            linked_org = db.query(models.Organization).filter(
                                models.Organization.id == camera.linked_traffic_company_id
                            ).first()
                            
                            print(f"[ASSIGNMENT] Camera {camera.id} has linked_traffic_company_id={camera.linked_traffic_company_id}")
                            print(f"[ASSIGNMENT] Linked org found: {linked_org.name if linked_org else 'None'}, type: {linked_org.company_type if linked_org else 'N/A'}")
                            
                            if linked_org and linked_org.company_type == "traffic_police" and camera.lat and camera.lng:
                                is_linked_to_traffic = True
                                detection.assigned_company_id = None
                                detection.assignment_type = "user"
                                detection.handling_status = "pending"
                                
                                print(f"[ASSIGNMENT] ✓ LINKED TRAFFIC FLOW activated: Camera '{camera.name}' linked to traffic company '{linked_org.name}'")
                                include_external = detection.allow_external_assignment
                                radius_std = crud.system_setting.get_value(db, "assignment_radius_standard", 5.0)
                                print(f"[ASSIGNMENT] Searching for officers: camera_lat={camera.lat}, camera_lng={camera.lng}, radius={radius_std}km, include_external={include_external}")
                                
                                nearby = crud.officer_location.find_nearby_officers_multi(
                                    db, primary_org_id=linked_org.id,
                                    lat=camera.lat, lng=camera.lng, radius_km=radius_std,
                                    include_external=include_external
                                )
                                
                                if len(nearby) == 0:
                                    staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
                                    detection.dispatch_message = f"No officers found in linked traffic company within {radius_std}km or officers are stale (>{staleness_minutes:.0f} min)."
                                    print(f"[ASSIGNMENT] ✗ NO OFFICERS ASSIGNED - Reason: {detection.dispatch_message}")
                                else:
                                    detection.dispatch_message = f"Dispatched to {len(nearby)} linked traffic officer(s)."
                                    print(f"[ASSIGNMENT] ✓ OFFICERS ASSIGNED: {len(nearby)} linked traffic officer(s)")
                                    
                                for officer, dist in nearby:
                                    asg = crud.traffic_alert.create_assignment(
                                        db, detection_id=detection.id, user_id=officer.user_id, distance_km=dist
                                    )
                                    print(f"[ASSIGNMENT]   → Officer {officer.user_id} assigned (distance: {dist:.2f}km, assignment_id: {asg.id})")
                                    
                                    # Get officer details for logging
                                    officer_user = db.query(models.User).filter(models.User.id == officer.user_id).first()
                                    officer_name = officer_user.full_name if officer_user else "Unknown"
                                    officer_email = officer_user.email if officer_user else "Unknown"
                                    print(f"[ASSIGNMENT]     Officer details: name={officer_name}, email={officer_email}, lat={officer.lat}, lng={officer.lng}")
                                    
                                    payload_data = {
                                        "type": "assignment_created",
                                        "assignmentId": asg.id,
                                        "detectionId": detection.id,
                                        "cameraId": camera.id,
                                        "cameraName": camera.name,
                                        "distanceKm": dist,
                                        "plateNumber": detection.plate_number,
                                        "description": detection.description,
                                        "timestamp": datetime.utcnow().isoformat()
                                    }
                                    asyncio.create_task(manager.send_to_user(str(officer.user_id), payload_data))
                                    asyncio.create_task(manager.broadcast_to_org(str(linked_org.id), payload_data))
                                    asyncio.create_task(manager.broadcast_to_org(str(detection.organization_id), payload_data))
                                    asyncio.create_task(manager.broadcast_to_org("None", payload_data))
                                    if getattr(officer.user, 'expo_push_token', None):
                                        asyncio.create_task(send_push_notification(
                                            expo_push_token=officer.user.expo_push_token,
                                            title="🚨 Traffic Assignment: " + (detection.plate_number or "Unknown Vehicle"),
                                            body=f"Flagged vehicle detected {dist:.1f} km away at {camera.name}.",
                                            data={"route": f"/assigned/{asg.id}", "assignmentId": asg.id, "detectionId": detection.id}
                                        ))
                            else:
                                if camera.linked_traffic_company_id and not (camera.lat and camera.lng):
                                    detection.dispatch_message = f"Camera location missing (lat/lng not set)."
                                    print(f"[ASSIGNMENT] ✗ NO OFFICERS ASSIGNED - Reason: Camera {camera.id} has no coordinates")
                                elif camera.linked_traffic_company_id and (not linked_org or linked_org.company_type != "traffic_police"):
                                    detection.dispatch_message = f"Linked company is not a valid traffic police organization."
                                    print(f"[ASSIGNMENT] ✗ NO OFFICERS ASSIGNED - Reason: Invalid linked traffic company")
                                else:
                                    print(f"[ASSIGNMENT] Linked traffic conditions not met")
                        
                        if not is_linked_to_traffic:
                            # Legacy assignment flow
                            print(f"[ASSIGNMENT] Legacy company flow: eligible={detection.eligible_for_assignment}, camera_org={camera.organization_id}")
                            detection.assignment_type = "company"
                            if detection.eligible_for_assignment and camera.organization_id:
                                detection.assigned_company_id = camera.organization_id
                                detection.handling_status = "pending"
                                print(f"[ASSIGNMENT] ✓ Assigned to camera's organization: {camera.organization_id}")
                            else:
                                detection.assigned_company_id = detection.organization_id
                                detection.handling_status = "pending"
                                print(f"[ASSIGNMENT] ✓ Assigned to detection's organization: {detection.organization_id}")
                else:
                    # Target is ALREADY Dispatched or has assignments
                    detection.dispatch_message = f"Skipped dispatch: Detection already has assignments or handling status is '{detection.handling_status}' (not unassigned/pending-without-officers)."
                    print(f"[ASSIGNMENT] ✗ SKIPPED - Reason: {detection.dispatch_message}")

                # ═══ RETROACTIVE REPAIR (For Detections without Officers) ═══
                if detection.assignment_type == "user" and detection.handling_status != "unassigned":
                    existing_assignments = db.query(models.DetectionAssignment).filter(
                        models.DetectionAssignment.detection_id == detection.id
                    ).count()
                    if existing_assignments == 0 and camera.lat and camera.lng:
                        print(f"[TRAFFIC RETRO-DISPATCH] Repairing dispatch for detection {detection.id}")
                        include_external = detection.allow_external_assignment
                        
                        # Find the first traffic sub-org linked (we guess via detection.organization_id)
                        # Actually we can just do broad external assignment if we know it should be 'user'
                        # But wait, we need primary_org_id. Just use the detection's organization_id.
                        primary_org_id = detection.organization_id
                        if camera.linked_traffic_company_id:
                            primary_org_id = camera.linked_traffic_company_id

                        radius_val = crud.system_setting.get_value(db, "assignment_radius_traffic", 10.0)
                        nearby = crud.officer_location.find_nearby_officers_multi(
                            db, primary_org_id=primary_org_id,
                            lat=camera.lat, lng=camera.lng, radius_km=radius_val,
                            include_external=include_external
                        )
                        for officer, dist in nearby:
                            print(f"[TRAFFIC RETRO-DISPATCH] → Officer {officer.user_id} at {dist:.2f}km")
                            asg = crud.traffic_alert.create_assignment(
                                db, detection_id=detection.id, user_id=officer.user_id, distance_km=dist
                            )
                            payload_data = {
                                "type": "assignment_created",
                                "assignmentId": asg.id,
                                "detectionId": detection.id,
                                "cameraId": camera.id,
                                "cameraName": camera.name,
                                "distanceKm": dist,
                                "plateNumber": detection.plate_number,
                                "description": detection.description,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            asyncio.create_task(manager.send_to_user(str(officer.user_id), payload_data))
                            asyncio.create_task(manager.broadcast_to_org(str(primary_org_id), payload_data))
                            asyncio.create_task(manager.broadcast_to_org(str(detection.organization_id), payload_data))
                            asyncio.create_task(manager.broadcast_to_org("None", payload_data))
                        if existing_assignments == 0:
                            if len(nearby) == 0:
                                staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
                                detection.dispatch_message = f"Retro-dispatch attempted but no officers found within {radius_val}km or officers are stale (>{staleness_minutes:.0f} min)."
                            else:
                                detection.dispatch_message = f"Retro-dispatched to {len(nearby)} officer(s) because no previous assignments existed."

                camera.is_flagged = True
                camera.last_detection_at = now
                
                curr_cameras = detection.detected_camera_ids or []
                if cameraId not in curr_cameras:
                    new_cameras = list(curr_cameras)
                    new_cameras.append(cameraId)
                    detection.detected_camera_ids = new_cameras
                    flag_modified(detection, 'detected_camera_ids')

                new_event = {
                    "id": str(uuid.uuid4()),
                    "cameraId": camera.id,
                    "cameraName": camera.name,
                    "timestamp": now.isoformat(),
                    "snapshotUrl": new_snapshot,
                    "snapshotUrls": [new_snapshot],
                }
                curr_events = list(detection.detection_events or [])
                curr_events.append(new_event)
                detection.detection_events = curr_events
                flag_modified(detection, 'detection_events')

                if detection.status not in ["resolved", "failed"]:
                    detection.status = "detected"
                
                notif_org_id = detection.organization_id
                org_users = db.query(models.User).filter(models.User.organization_id == notif_org_id).all()
                for u in org_users:
                    perms = u.role.permissions if u.role and u.role.permissions else []
                    if "*" in perms or "notifications.view" in perms:
                        notif = models.Notification(
                            id=str(uuid.uuid4()),
                            user_id=u.id,
                            type="alert",
                            title=f"Detection Alert: {camera.name}",
                            message=f"{detection.category} detected at {camera.name}",
                            action_url=f"/cameras?id={camera.id}"
                        )
                        db.add(notif)
                
                db.add(detection)
                db.commit()
                db.refresh(detection)
                
                asyncio.create_task(manager.broadcast_to_org(
                    str(notif_org_id),
                    {
                        "type": "alert",
                        "title": f"Detection Alert: {camera.name}",
                        "message": f"{detection.category} detected at {camera.name}",
                        "cameraId": camera.id,
                        "detectionId": detection.id,
                        "timestamp": detection.updated_at.isoformat() if detection.updated_at else "",
                        "cameraCount": len(detection.detected_camera_ids or []),
                        "events": curr_events
                    }
                ))
        
        # Final summary log
        final_assignment_count = db.query(models.DetectionAssignment).filter(
            models.DetectionAssignment.detection_id == detection.id
        ).count()
        print(f"[UPDATE_DETECTION] ═══ PROCESSING COMPLETE ═══")
        print(f"[UPDATE_DETECTION] Detection {detection.id} final state:")
        print(f"[UPDATE_DETECTION]   - status: {detection.status}")
        print(f"[UPDATE_DETECTION]   - handling_status: {detection.handling_status}")
        print(f"[UPDATE_DETECTION]   - assignment_type: {detection.assignment_type}")
        print(f"[UPDATE_DETECTION]   - total assignments: {final_assignment_count}")
        print(f"[UPDATE_DETECTION]   - dispatch_message: {detection.dispatch_message}")
    
    return _enrich_detection(db, detection)

@router.delete("/{id}", response_model=schemas.Detection)
def delete_detection(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Delete detection.
    """
    detection = crud.detection.get(db, id=id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    if current_user.role.name != "Super Admin":
        if detection.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = _enrich_detection(db, detection)
    crud.detection.remove(db, id=id)

    # ── Audit: log deletion ──
    try:
        log_detection_deleted(db, current_user, detection.id, detection.name)
    except Exception as _audit_err:
        import logging
        logging.error(f"Failed to log detection deletion: {_audit_err}")

    return result

@router.post("/{id}/action", response_model=schemas.Detection)
async def handle_detection_action(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    status: str = Form(...),
    notes: Optional[str] = Form(None),
    proofFiles: List[UploadFile] = File(None),
    current_user: models.User = Depends(deps.PermissionChecker("detections.manage")),
) -> Any:
    """
    Handle detection assignment action, optionally accepting proof images and notes.
    """
    detection = crud.detection.get(db, id=id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
        
    if current_user.role.name != "Super Admin":
        if detection.assigned_company_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not assigned to this company")
            
    if status not in ["in_progress", "resolved", "failed"]:
        raise HTTPException(status_code=400, detail="Invalid action status")

    old_status = detection.handling_status  # capture before overwrite
    detection.handling_status = status
    # Main status should reflect handling status (e.g., "in_progress", "resolved", "failed")
    detection.status = status

    if notes:
        detection.handling_notes = notes
        
    if proofFiles:
        proof_urls = []
        for file in proofFiles:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join("uploads", unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            proof_urls.append(f"/uploads/{unique_filename}")
        detection.handling_proof_urls = list(proof_urls)
        
    db.commit()
    db.refresh(detection)

    # ── Audit: log the status/action change ──
    try:
        log_detection_status_change(db, current_user, detection.id, detection.name, old_status, status)
    except Exception as _audit_err:
        import logging
        logging.error(f"Failed to log detection action: {_audit_err}")

    return _enrich_detection(db, detection)

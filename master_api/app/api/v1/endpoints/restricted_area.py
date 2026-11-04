import os
import uuid
import base64
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.api import deps
from app import models
from app.schemas.restricted_area import (
    RestrictedAreaPerson,
    RestrictedAreaPersonCreate,
    RestrictedAreaPersonUpdate,
    RestrictedAreaFaceSearchRequest,
    FaceMatchResult,
)
from app.crud import crud_restricted_area

router = APIRouter()

PHOTO_DIR = "static/restricted_area"
os.makedirs(PHOTO_DIR, exist_ok=True)


def _extract_embedding(b64_image: str) -> Optional[bytes]:
    try:
        from app.services.face_service import get_embedding_from_b64
        return get_embedding_from_b64(b64_image)
    except Exception as e:
        import logging
        logging.warning(f"Face embedding extraction failed: {e}")
        return None


def _save_photo(b64_image: str, person_id: str) -> str:
    """Save base64 photo to disk and return relative URL."""
    try:
        # Strip data URI prefix if present
        if "," in b64_image:
            b64_image = b64_image.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_image)
        filename = f"{person_id}.jpg"
        path = os.path.join(PHOTO_DIR, filename)
        with open(path, "wb") as f:
            f.write(img_bytes)
        return f"/{PHOTO_DIR}/{filename}"
    except Exception as e:
        import logging
        logging.warning(f"Failed to save photo: {e}")
        return ""


# ─── List ──────────────────────────────────────────────────────────────────────
@router.get("/persons", response_model=List[RestrictedAreaPerson])
def list_persons(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 200,
    active_only: bool = False,
) -> Any:
    persons = crud_restricted_area.get_all(db, skip=skip, limit=limit, active_only=active_only)
    result = []
    for p in persons:
        d = RestrictedAreaPerson.model_validate(p).model_dump()
        d["has_biometric"] = p.face_embedding is not None
        result.append(d)
    return result


# ─── Get single ────────────────────────────────────────────────────────────────
@router.get("/persons/{person_id}", response_model=RestrictedAreaPerson)
def get_person(
    person_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    person = crud_restricted_area.get(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    d = RestrictedAreaPerson.model_validate(person).model_dump()
    d["has_biometric"] = person.face_embedding is not None
    return d


# ─── Create ────────────────────────────────────────────────────────────────────
@router.post("/persons", response_model=RestrictedAreaPerson)
async def create_person(
    payload: RestrictedAreaPersonCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    person_id = str(uuid.uuid4())

    # Extract face embedding from photo
    face_embedding = None
    photo_url = None
    if payload.profile_photo_b64:
        face_embedding = _extract_embedding(payload.profile_photo_b64)
        photo_url = _save_photo(payload.profile_photo_b64, person_id)

    # Override photo_url before creating
    payload_dict = payload.model_dump(exclude={"profile_photo_b64"})
    if photo_url:
        payload_dict["profile_photo_url"] = photo_url

    from app.models.restricted_area import RestrictedAreaPerson as RAModel
    db_obj = RAModel(id=person_id, **payload_dict, face_embedding=face_embedding)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    d = RestrictedAreaPerson.model_validate(db_obj).model_dump()
    d["has_biometric"] = db_obj.face_embedding is not None
    return d


# ─── Update ────────────────────────────────────────────────────────────────────
@router.put("/persons/{person_id}", response_model=RestrictedAreaPerson)
async def update_person(
    person_id: str,
    payload: RestrictedAreaPersonUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    person = crud_restricted_area.get(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    face_embedding = None
    if payload.profile_photo_b64:
        face_embedding = _extract_embedding(payload.profile_photo_b64)
        photo_url = _save_photo(payload.profile_photo_b64, person_id)
        payload.profile_photo_url = photo_url

    updated = crud_restricted_area.update(db, person, payload, face_embedding=face_embedding)
    d = RestrictedAreaPerson.model_validate(updated).model_dump()
    d["has_biometric"] = updated.face_embedding is not None
    return d


# ─── Delete ────────────────────────────────────────────────────────────────────
@router.delete("/persons/{person_id}")
def delete_person(
    person_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    person = crud_restricted_area.get(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    crud_restricted_area.delete(db, person_id)
    return {"success": True}


# ─── Face match (used by camera engine or frontend) ────────────────────────────
@router.post("/face-match", response_model=FaceMatchResult)
async def face_match(
    request: RestrictedAreaFaceSearchRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Match a detected face against all registered restricted-area persons.
    Returns match result with name, authorization status for given camera.
    """
    b64 = request.image_b64
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    from app.services.face_service import get_embedding_from_b64
    embedding_bytes = get_embedding_from_b64(b64)
    if not embedding_bytes:
        return FaceMatchResult(matched=False, message="No face detected in image")

    person, confidence, is_authorized = crud_restricted_area.match_face(
        db, request.camera_id, embedding_bytes
    )

    if person:
        return FaceMatchResult(
            matched=True,
            authorized=is_authorized,
            confidence=confidence,
            person={
                "id": person.id,
                "full_name": person.full_name,
                "role": person.role,
                "department": person.department,
                "employee_id": person.employee_id,
                "profile_photo_url": person.profile_photo_url,
                "authorized_cameras": person.authorized_cameras,
            },
            message="Authorized" if is_authorized else "Not authorized for this camera",
        )

    return FaceMatchResult(
        matched=False,
        authorized=False,
        confidence=confidence,
        message="Unknown person — not registered",
    )


# ─── Persons authorized for a specific camera ──────────────────────────────────
@router.get("/cameras/{camera_id}/persons", response_model=List[RestrictedAreaPerson])
def get_persons_for_camera(
    camera_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    persons = crud_restricted_area.get_by_camera(db, camera_id)
    result = []
    for p in persons:
        d = RestrictedAreaPerson.model_validate(p).model_dump()
        d["has_biometric"] = p.face_embedding is not None
        result.append(d)
    return result

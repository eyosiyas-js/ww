from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from app import models
from app.api import deps

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class FingerprintMatchCreate(BaseModel):
    matched_name: str
    matched_dob: Optional[str] = None
    matched_gender: Optional[str] = None
    matched_nationality: Optional[str] = None
    match_score: float
    remark: Optional[str] = None
    fingerprint_image_b64: Optional[str] = None
    face_photo_b64: Optional[str] = None
    raw_fingerprint_b64: Optional[str] = None


class FingerprintMatchResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    matched_name: str
    matched_dob: Optional[str]
    matched_gender: Optional[str]
    matched_nationality: Optional[str]
    match_score: float
    remark: Optional[str]
    fingerprint_image_b64: Optional[str]
    face_photo_b64: Optional[str]
    raw_fingerprint_b64: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=FingerprintMatchResponse)
def create_fingerprint_match(
    *,
    db: Session = Depends(deps.get_db),
    obj_in: FingerprintMatchCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Save a successful fingerprint match to the database.
    Called immediately after the external biometric service returns a match.
    """
    entry = models.FingerprintMatchHistory(
        id=f"fpm-{uuid.uuid4().hex[:16]}",
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        matched_name=obj_in.matched_name,
        matched_dob=obj_in.matched_dob,
        matched_gender=obj_in.matched_gender,
        matched_nationality=obj_in.matched_nationality,
        match_score=obj_in.match_score,
        remark=obj_in.remark,
        fingerprint_image_b64=obj_in.fingerprint_image_b64,
        face_photo_b64=obj_in.face_photo_b64,
        raw_fingerprint_b64=obj_in.raw_fingerprint_b64,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=List[FingerprintMatchResponse])
def get_fingerprint_history(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Return fingerprint match history.
    - Super Admin: all records across the system.
    - Company Admin: all records within their organisation hierarchy.
    - Normal user: only their own records.
    """
    role_name = current_user.role.name if current_user.role else ""
    query = db.query(models.FingerprintMatchHistory)

    if role_name == "Super Admin":
        pass  # no filter
    elif role_name in ("Company Admin", "Admin"):
        from app import crud
        desc_ids = crud.company.get_descendant_org_ids(db, current_user.organization_id)
        query = query.filter(
            models.FingerprintMatchHistory.organization_id.in_(desc_ids)
        )
    else:
        query = query.filter(
            models.FingerprintMatchHistory.user_id == current_user.id
        )

    return (
        query.order_by(models.FingerprintMatchHistory.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.delete("/{entry_id}", response_model=dict)
def delete_fingerprint_history_entry(
    entry_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """Delete a single history entry (owner or admin only)."""
    entry = db.query(models.FingerprintMatchHistory).filter(
        models.FingerprintMatchHistory.id == entry_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("Super Admin", "Company Admin", "Admin"):
        if entry.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(entry)
    db.commit()
    return {"msg": "Entry deleted"}


@router.delete("/", response_model=dict)
def clear_fingerprint_history(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Clear fingerprint match history.
    - Super Admin: clears everything.
    - Company Admin: clears their org hierarchy.
    - Normal user: clears only their own records.
    """
    role_name = current_user.role.name if current_user.role else ""
    query = db.query(models.FingerprintMatchHistory)

    if role_name == "Super Admin":
        deleted = query.delete(synchronize_session=False)
    elif role_name in ("Company Admin", "Admin"):
        from app import crud
        desc_ids = crud.company.get_descendant_org_ids(db, current_user.organization_id)
        deleted = query.filter(
            models.FingerprintMatchHistory.organization_id.in_(desc_ids)
        ).delete(synchronize_session=False)
    else:
        deleted = query.filter(
            models.FingerprintMatchHistory.user_id == current_user.id
        ).delete(synchronize_session=False)

    db.commit()
    return {"msg": f"Cleared {deleted} entries"}

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.national_id import NationalIdProfile, DetectionNationalIdMatch
from app.schemas.national_id import (
    NationalIdProfileCreate, 
    NationalIdProfileUpdate,
    DetectionNationalIdMatchCreate,
    DetectionNationalIdMatchUpdate
)
import uuid
from datetime import datetime


class CRUDNationalIdProfile:
    def get(self, db: Session, id: str) -> Optional[NationalIdProfile]:
        return db.query(NationalIdProfile).filter(NationalIdProfile.id == id).first()

    def get_by_national_id_number(self, db: Session, national_id_number: str) -> Optional[NationalIdProfile]:
        return db.query(NationalIdProfile).filter(
            NationalIdProfile.national_id_number == national_id_number
        ).first()

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[NationalIdProfile]:
        query = db.query(NationalIdProfile)
        if status:
            query = query.filter(NationalIdProfile.status == status)
        return query.offset(skip).limit(limit).all()

    def search_by_name(
        self, 
        db: Session, 
        name_query: str, 
        limit: int = 10
    ) -> List[NationalIdProfile]:
        """Search profiles by name (fuzzy matching)"""
        search_term = f"%{name_query.lower()}%"
        return db.query(NationalIdProfile).filter(
            or_(
                NationalIdProfile.full_name.ilike(search_term),
                NationalIdProfile.first_name.ilike(search_term),
                NationalIdProfile.last_name.ilike(search_term)
            )
        ).limit(limit).all()

    def create(self, db: Session, *, obj_in: NationalIdProfileCreate) -> NationalIdProfile:
        obj_in_data = obj_in.dict()
        # Remove extra fields that are not in the model
        if "profile_photo_b64" in obj_in_data:
            obj_in_data.pop("profile_photo_b64")
            
        db_obj = NationalIdProfile(
            id=str(uuid.uuid4()),
            **obj_in_data
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        *, 
        db_obj: NationalIdProfile, 
        obj_in: NationalIdProfileUpdate
    ) -> NationalIdProfile:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str) -> NationalIdProfile:
        # First, delete all associated matches to satisfy foreign key constraints
        db.query(DetectionNationalIdMatch).filter(DetectionNationalIdMatch.national_id_profile_id == id).delete()
        
        obj = db.query(NationalIdProfile).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj


class CRUDDetectionNationalIdMatch:
    def get(self, db: Session, id: str) -> Optional[DetectionNationalIdMatch]:
        return db.query(DetectionNationalIdMatch).filter(
            DetectionNationalIdMatch.id == id
        ).first()

    def get_by_detection_id(
        self, 
        db: Session, 
        detection_id: str
    ) -> List[DetectionNationalIdMatch]:
        return db.query(DetectionNationalIdMatch).filter(
            DetectionNationalIdMatch.detection_id == detection_id
        ).all()

    def get_primary_match(
        self, 
        db: Session, 
        detection_id: str
    ) -> Optional[DetectionNationalIdMatch]:
        """Get the primary/best match for a detection (confirmed or highest confidence)"""
        # First try to get confirmed match
        confirmed = db.query(DetectionNationalIdMatch).filter(
            and_(
                DetectionNationalIdMatch.detection_id == detection_id,
                DetectionNationalIdMatch.status == "confirmed"
            )
        ).first()
        
        if confirmed:
            return confirmed
        
        # Otherwise get highest confidence pending match
        return db.query(DetectionNationalIdMatch).filter(
            DetectionNationalIdMatch.detection_id == detection_id
        ).order_by(
            DetectionNationalIdMatch.confidence_score.desc(),
            DetectionNationalIdMatch.created_at.desc()
        ).first()

    def create(
        self, 
        db: Session, 
        *, 
        obj_in: DetectionNationalIdMatchCreate,
        verified_by_user_id: Optional[str] = None
    ) -> DetectionNationalIdMatch:
        db_obj = DetectionNationalIdMatch(
            id=str(uuid.uuid4()),
            verified_by_user_id=verified_by_user_id,
            **obj_in.dict()
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        *, 
        db_obj: DetectionNationalIdMatch, 
        obj_in: DetectionNationalIdMatchUpdate,
        verified_by_user_id: Optional[str] = None
    ) -> DetectionNationalIdMatch:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        
        if verified_by_user_id:
            db_obj.verified_by_user_id = verified_by_user_id
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str) -> DetectionNationalIdMatch:
        obj = db.query(DetectionNationalIdMatch).get(id)
        db.delete(obj)
        db.commit()
        return obj

    def get_matches_by_national_id(
        self, 
        db: Session, 
        national_id_profile_id: str
    ) -> List[DetectionNationalIdMatch]:
        """Get all detection matches for a specific National ID profile"""
        return db.query(DetectionNationalIdMatch).filter(
            DetectionNationalIdMatch.national_id_profile_id == national_id_profile_id
        ).all()


# Create instances
national_id_profile = CRUDNationalIdProfile()
detection_national_id_match = CRUDDetectionNationalIdMatch()
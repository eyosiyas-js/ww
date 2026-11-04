from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
import uuid

from app.models.vehicle_registration import VehicleRegistration, DetectionVehicleMatch
from app.schemas.vehicle_registration import (
    VehicleRegistrationCreate,
    VehicleRegistrationUpdate,
    DetectionVehicleMatchCreate,
    DetectionVehicleMatchUpdate
)


class CRUDVehicleRegistration:
    def get(self, db: Session, id: str) -> Optional[VehicleRegistration]:
        return db.query(VehicleRegistration).filter(VehicleRegistration.id == id).first()

    def get_by_plate_number(self, db: Session, plate_number: str) -> Optional[VehicleRegistration]:
        return db.query(VehicleRegistration).filter(
            VehicleRegistration.plate_number == plate_number
        ).first()

    def get_by_vin(self, db: Session, vin_number: str) -> Optional[VehicleRegistration]:
        return db.query(VehicleRegistration).filter(
            VehicleRegistration.vin_number == vin_number
        ).first()

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[VehicleRegistration]:
        query = db.query(VehicleRegistration)
        if status:
            query = query.filter(VehicleRegistration.registration_status == status)
        return query.offset(skip).limit(limit).all()

    def search(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[VehicleRegistration]:
        """Search vehicles by plate number, owner name, or VIN"""
        search_pattern = f"%{query}%"
        return db.query(VehicleRegistration).filter(
            or_(
                VehicleRegistration.plate_number.ilike(search_pattern),
                VehicleRegistration.owner_name.ilike(search_pattern),
                VehicleRegistration.vin_number.ilike(search_pattern),
                VehicleRegistration.vehicle_make.ilike(search_pattern),
                VehicleRegistration.vehicle_model.ilike(search_pattern)
            )
        ).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: VehicleRegistrationCreate) -> VehicleRegistration:
        db_obj = VehicleRegistration(
            id=str(uuid.uuid4()),
            **obj_in.model_dump()
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        db_obj: VehicleRegistration, 
        obj_in: VehicleRegistrationUpdate
    ) -> VehicleRegistration:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDDetectionVehicleMatch:
    def get(self, db: Session, id: str) -> Optional[DetectionVehicleMatch]:
        return db.query(DetectionVehicleMatch).filter(DetectionVehicleMatch.id == id).first()

    def get_by_detection_id(self, db: Session, detection_id: str) -> List[DetectionVehicleMatch]:
        return db.query(DetectionVehicleMatch).filter(
            DetectionVehicleMatch.detection_id == detection_id
        ).order_by(DetectionVehicleMatch.created_at.desc()).all()

    def get_primary_match(self, db: Session, detection_id: str) -> Optional[DetectionVehicleMatch]:
        """Get the confirmed match, or the highest confidence pending match"""
        # First try to get confirmed match
        confirmed = db.query(DetectionVehicleMatch).filter(
            DetectionVehicleMatch.detection_id == detection_id,
            DetectionVehicleMatch.status == "confirmed"
        ).first()
        
        if confirmed:
            return confirmed
        
        # Otherwise get highest confidence pending match
        return db.query(DetectionVehicleMatch).filter(
            DetectionVehicleMatch.detection_id == detection_id,
            DetectionVehicleMatch.status == "pending"
        ).order_by(
            DetectionVehicleMatch.confidence_score.desc()
        ).first()

    def create(
        self, 
        db: Session, 
        obj_in: DetectionVehicleMatchCreate,
        verified_by_user_id: Optional[str] = None
    ) -> DetectionVehicleMatch:
        db_obj = DetectionVehicleMatch(
            id=str(uuid.uuid4()),
            verified_by_user_id=verified_by_user_id,
            **obj_in.model_dump()
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        db_obj: DetectionVehicleMatch, 
        obj_in: DetectionVehicleMatchUpdate,
        verified_by_user_id: Optional[str] = None
    ) -> DetectionVehicleMatch:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        if verified_by_user_id:
            db_obj.verified_by_user_id = verified_by_user_id
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


vehicle_registration = CRUDVehicleRegistration()
detection_vehicle_match = CRUDDetectionVehicleMatch()

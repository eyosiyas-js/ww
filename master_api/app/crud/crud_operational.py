from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.operational import Camera, Detection, CameraAccess, WeaponDetection
from app.schemas.operational import DetectionCreate, DetectionUpdate, CameraUpdate, CameraCreate, WeaponDetectionCreate
import uuid

class CRUDCamera:
    def get_all(self, db: Session, organization_id: str = None, is_super: bool = False):
        if is_super:
            return db.query(Camera).all()
        if organization_id:
            # Join with CameraAccess to find cameras the organization has access to
            return db.query(Camera).join(CameraAccess).filter(CameraAccess.organization_id == organization_id).all()
        return []

    def create(self, db: Session, *, obj_in: CameraCreate, organization_id: Optional[str] = None):
        is_flagged = getattr(obj_in, "is_flagged", None)
        if is_flagged is None:
            is_flagged = getattr(obj_in, "isFlagged", False)

        stream_url = getattr(obj_in, "stream_url", None)
        if stream_url is None:
            stream_url = getattr(obj_in, "streamUrl", None)

        camera_stream_id = getattr(obj_in, "camera_stream_id", None)
        if camera_stream_id is None:
            camera_stream_id = getattr(obj_in, "cameraStreamId", None)

        org_id = organization_id or getattr(obj_in, "organization_id", None) or getattr(obj_in, "organizationId", None)

        linked_traffic_id = getattr(obj_in, "linked_traffic_company_id", None)
        if linked_traffic_id is None:
            linked_traffic_id = getattr(obj_in, "linkedTrafficCompanyId", None)

        db_obj = Camera(
            id=f"cam-{uuid.uuid4()}",
            name=obj_in.name,
            location=obj_in.location,
            lat=obj_in.lat,
            lng=obj_in.lng,
            status=obj_in.status or "online",
            is_flagged=bool(is_flagged),
            stream_url=stream_url,
            camera_stream_id=camera_stream_id,
            organization_id=org_id,
            linked_traffic_company_id=linked_traffic_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def toggle_access(self, db: Session, *, camera_id: str, organization_id: str, has_access: bool):
        existing = db.query(CameraAccess).filter(
            CameraAccess.camera_id == camera_id,
            CameraAccess.organization_id == organization_id
        ).first()
        
        if has_access and not existing:
            new_access = CameraAccess(
                id=f"acc-{uuid.uuid4()}",
                camera_id=camera_id,
                organization_id=organization_id
            )
            db.add(new_access)
        elif not has_access and existing:
            db.delete(existing)
            
        db.commit()
        return True

    def get(self, db: Session, id: str):
        return db.query(Camera).filter(Camera.id == id).first()

    def update(self, db: Session, *, db_obj: Camera, obj_in: CameraUpdate):
        update_data = obj_in.dict(exclude_unset=True) if hasattr(obj_in, "dict") else obj_in.model_dump(exclude_unset=True)
        field_map = {
            "isFlagged": "is_flagged",
            "streamUrl": "stream_url",
            "organizationId": "organization_id",
            "linkedTrafficCompanyId": "linked_traffic_company_id",
            "cameraStreamId": "camera_stream_id",
        }
        for camel, snake in field_map.items():
            if camel in update_data:
                val = update_data.pop(camel)
                if snake not in update_data or update_data[snake] is None:
                    update_data[snake] = val
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

class CRUDDetection:
    def get_all(self, db: Session, organization_id: str = None):
        if organization_id:
            return db.query(Detection).filter(Detection.organization_id == organization_id).all()
        return db.query(Detection).all()

    def get(self, db: Session, id: str):
        return db.query(Detection).filter(Detection.id == id).first()

    def create(self, db: Session, *, obj_in: DetectionCreate, organization_id: str, user_id: str):
        db_obj = Detection(
            id=f"det-{id(obj_in)}",
            category=obj_in.category,
            name=obj_in.name,
            description=obj_in.description,
            age=obj_in.age,
            location=obj_in.location,
            subcategory=obj_in.subcategory,
            crime_type=obj_in.crime_type,
            image_urls=obj_in.image_urls,
            status=obj_in.status,
            organization_id=organization_id,
            user_id=user_id,
            form_template_id=obj_in.form_template_id,
            dynamic_data=obj_in.dynamic_data,
            eligible_for_assignment=obj_in.eligible_for_assignment,
            # Vehicle-specific fields
            plate_number=obj_in.plate_number,
            code=obj_in.code,
            region=obj_in.region,
            national_id_number=obj_in.national_id_number,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Detection, obj_in: DetectionUpdate):
        update_data = obj_in.dict(exclude_unset=True)
        # Map camelCase schema fields to snake_case model fields
        field_map = {
            "imageUrls": "image_urls",
            "crimeType": "crime_type",
            "formTemplateId": "form_template_id",
            "dynamicData": "dynamic_data",
            "eligibleForAssignment": "eligible_for_assignment",
            "plateNumber": "plate_number",
            "code": "code",
            "region": "region",
        }
        for camel, snake in field_map.items():
            if camel in update_data:
                update_data[snake] = update_data.pop(camel)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, id: str):
        obj = db.query(Detection).get(id)
        db.delete(obj)
        db.commit()
        return obj


class CRUDWeaponDetection:
    def get_all(self, db: Session, organization_id: str = None):
        if organization_id:
            return db.query(WeaponDetection).filter(
                WeaponDetection.organization_id == organization_id
            ).order_by(WeaponDetection.created_at.desc()).all()
        return db.query(WeaponDetection).order_by(WeaponDetection.created_at.desc()).all()

    def get(self, db: Session, id: str):
        return db.query(WeaponDetection).filter(WeaponDetection.id == id).first()

    def create(self, db: Session, *, obj_in: WeaponDetectionCreate, organization_id: str = None):
        weapon_type = getattr(obj_in, "weapon_type", None) or getattr(obj_in, "weaponType", None)
        image_url = getattr(obj_in, "image_url", None) or getattr(obj_in, "imageUrl", None)
        camera_id = getattr(obj_in, "camera_id", None) or getattr(obj_in, "cameraId", None)
        camera_name = getattr(obj_in, "camera_name", None) or getattr(obj_in, "cameraName", None)

        db_obj = WeaponDetection(
            id=f"wpn-{uuid.uuid4()}",
            weapon_type=weapon_type,
            description=obj_in.description,
            confidence=obj_in.confidence,
            image_url=image_url,
            camera_id=camera_id,
            camera_name=camera_name,
            organization_id=organization_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


camera = CRUDCamera()
detection = CRUDDetection()
weapon_detection = CRUDWeaponDetection()


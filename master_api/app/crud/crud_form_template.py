from sqlalchemy.orm import Session
from app.models.utility import FormTemplate
from app.schemas.form_template import FormTemplateCreate, FormTemplateUpdate
from datetime import datetime
import uuid

class CRUDFormTemplate:
    def get_all(self, db: Session, organization_id: str = None):
        if organization_id:
            return db.query(FormTemplate).filter(FormTemplate.organization_id == organization_id).all()
        return db.query(FormTemplate).all()

    def create(self, db: Session, *, obj_in: FormTemplateCreate, organization_id: str):
        fields_data = []
        for f in obj_in.fields:
            if hasattr(f, "model_dump"):
                fields_data.append(f.model_dump())
            elif hasattr(f, "dict"):
                fields_data.append(f.dict())
            else:
                fields_data.append(f)
                
        db_obj = FormTemplate(
            id=f"form-{uuid.uuid4()}",
            name=obj_in.name,
            description=obj_in.description,
            fields=fields_data,
            is_active=obj_in.isActive,
            detection_type=obj_in.detectionType or "person",
            organization_id=organization_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: FormTemplate, obj_in: FormTemplateUpdate):
        update_data = obj_in.dict(exclude_unset=True)
        if "isActive" in update_data:
            update_data["is_active"] = update_data.pop("isActive")
        if "detectionType" in update_data:
            update_data["detection_type"] = update_data.pop("detectionType")
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str):
        obj = db.query(FormTemplate).get(id)
        db.delete(obj)
        db.commit()
        return obj

form_template = CRUDFormTemplate()

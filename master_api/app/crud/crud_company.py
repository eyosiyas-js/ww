from datetime import date
from sqlalchemy.orm import Session
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.core.security import get_password_hash
import uuid
from typing import List

class CRUDCompany:
    def get_descendant_org_ids(self, db: Session, parent_id: str) -> List[str]:
        # Simple recursive function for descendant resolution
        ids = [parent_id]
        children = db.query(Organization.id).filter(Organization.parent_id == parent_id).all()
        for child in children:
            ids.extend(self.get_descendant_org_ids(db, child.id))
        return list(set(ids))

    def get_all(self, db: Session):
        return db.query(Organization).all()

    def create(self, db: Session, *, obj_in: CompanyCreate):
        org_id = f"comp-{uuid.uuid4()}"
        db_obj = Organization(
            id=org_id,
            name=obj_in.name,
            admin_email=obj_in.adminEmail,
            status=obj_in.status,
            parent_id=obj_in.parentId,
            lat=obj_in.lat,
            lng=obj_in.lng,
            company_type=obj_in.companyType or "general"
        )
        db.add(db_obj)
        
        # Look up or create the shared system-level "Company Admin" role.
        # This role is NOT tied to any specific organization, so the company's
        # Roles & Permissions section starts empty for custom role creation.
        admin_role = db.query(Role).filter(
            Role.name == "Company Admin",
            Role.is_system == True
        ).first()
        if not admin_role:
            admin_role = Role(
                id="role-company-admin",
                name="Company Admin",
                description="System company administrator",
                permissions=["*"],
                organization_id=None,
                is_system=True
            )
            db.add(admin_role)
            db.flush()
        role_id = admin_role.id
        
        # Create the Admin User
        user_id = f"usr-{uuid.uuid4()}"
        admin_user = User(
            id=user_id,
            email=obj_in.adminEmail,
            hashed_password=get_password_hash("Password123"), # Default password
            full_name=f"{obj_in.name} Admin",
            organization_id=org_id,
            role_id=role_id,
            status="active"
        )
        db.add(admin_user)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Organization, obj_in: CompanyUpdate):
        update_data = obj_in.dict(exclude_unset=True)
        old_admin_email = db_obj.admin_email
        new_admin_email = update_data.get("adminEmail")
        if "adminEmail" in update_data:
            update_data["admin_email"] = update_data.pop("adminEmail")
        if "parentId" in update_data:
            update_data["parent_id"] = update_data.pop("parentId")
        if "companyType" in update_data:
            update_data["company_type"] = update_data.pop("companyType")
        if "cascade_features" in update_data:
            update_data.pop("cascade_features")
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)

        # Sync the email change to the associated admin User record
        # so that login credentials stay in sync with the organization.
        if new_admin_email and new_admin_email != old_admin_email:
            admin_user = db.query(User).filter(
                User.email == old_admin_email,
                User.organization_id == db_obj.id
            ).first()
            if admin_user:
                admin_user.email = new_admin_email
                db.add(admin_user)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str):
        obj = db.query(Organization).get(id)
        db.delete(obj)
        db.commit()
        return obj

company = CRUDCompany()

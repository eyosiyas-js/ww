from sqlalchemy.orm import Session
from app.models.organization_role import Role
from app.schemas.role import RoleCreate, RoleUpdate

class CRUDRole:
    def get_all(self, db: Session, *, organization_id: str = None, include_system: bool = True):
        query = db.query(Role)
        if organization_id:
            if include_system:
                query = query.filter((Role.organization_id == organization_id) | (Role.is_system == True))
            else:
                query = query.filter(Role.organization_id == organization_id)
        elif not include_system:
            query = query.filter(Role.organization_id != None)
            
        return query.all()

    def create(self, db: Session, *, obj_in: RoleCreate, organization_id: str = None):
        import uuid
        db_obj = Role(
            id=f"role-{uuid.uuid4()}",
            name=obj_in.name,
            description=obj_in.description,
            permissions=obj_in.permissions,
            is_system=obj_in.isSystem,
            organization_id=organization_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Role, obj_in: RoleUpdate):
        update_data = obj_in.dict(exclude_unset=True)
        if "permissions" in update_data:
            update_data["permissions"] = update_data.pop("permissions")
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str):
        obj = db.query(Role).get(id)
        db.delete(obj)
        db.commit()
        return obj

role = CRUDRole()

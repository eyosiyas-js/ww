from typing import Optional
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser:
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            id=f"usr-{id(obj_in)}", # Simple ID generation for now
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            organization_id=obj_in.organization_id,
            role_id=obj_in.role_id,
            status=obj_in.status,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_all(self, db: Session) -> list[User]:
        return db.query(User).all()

    def update(self, db: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.dict(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        # Map frontend 'name' to 'full_name' if needed (though UserUpdate should ideally use full_name)
        if "name" in update_data:
            update_data["full_name"] = update_data.pop("name")

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str) -> User:
        obj = db.query(User).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

user = CRUDUser()

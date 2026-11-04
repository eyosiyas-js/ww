from typing import Any, Dict, Optional, Union
from sqlalchemy.orm import Session
from app.models.utility import SystemSetting
from app.schemas.system_setting import SystemSettingCreate, SystemSettingUpdate

class CRUDSystemSetting:
    def get(self, db: Session, key: str) -> Optional[SystemSetting]:
        return db.query(SystemSetting).filter(SystemSetting.key == key).first()

    def get_value(self, db: Session, key: str, default: Any = None) -> Any:
        setting = self.get(db, key)
        if setting:
            return setting.value
        return default

    def create(self, db: Session, *, obj_in: SystemSettingCreate) -> SystemSetting:
        db_obj = SystemSetting(
            key=obj_in.key,
            value=obj_in.value,
            description=obj_in.description
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: SystemSetting,
        obj_in: Union[SystemSettingUpdate, Dict[str, Any]]
    ) -> SystemSetting:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def set_value(self, db: Session, key: str, value: Any, description: Optional[str] = None) -> SystemSetting:
        db_obj = self.get(db, key)
        if db_obj:
            return self.update(db, db_obj=db_obj, obj_in={"value": value, "description": description})
        else:
            return self.create(db, obj_in=SystemSettingCreate(key=key, value=value, description=description))

system_setting = CRUDSystemSetting()

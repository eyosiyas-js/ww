from typing import Any, Optional
from pydantic import BaseModel

class SystemSettingBase(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None

class SystemSetting(SystemSettingBase):
    class Config:
        from_attributes = True

from typing import Optional
from pydantic import BaseModel, EmailStr

class AdminUserBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    companyId: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = "active"

class AdminUserCreate(AdminUserBase):
    name: str
    email: EmailStr
    companyId: str
    role: str

class AdminUserUpdate(AdminUserBase):
    pass

class AdminUser(AdminUserBase):
    id: str
    companyName: str
    lastLogin: str = ""
    createdAt: str

    class Config:
        from_attributes = True

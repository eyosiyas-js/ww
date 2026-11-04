from typing import Optional
from pydantic import BaseModel

class CompanyBase(BaseModel):
    name: Optional[str] = None
    adminEmail: Optional[str] = None
    status: Optional[str] = "active"
    features: Optional[dict] = None
    parentId: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    companyType: Optional[str] = "general"  # "general" or "traffic_police"

class CompanyCreate(CompanyBase):
    name: str
    adminEmail: str

class CompanyUpdate(CompanyBase):
    cascade_features: Optional[bool] = False

class CompanyInDBBase(CompanyBase):
    id: str
    usersCount: int = 0
    camerasCount: int = 0
    casesCount: int = 0
    detectionsCount: int = 0
    createdAt: str

    class Config:
        from_attributes = True

class Company(CompanyInDBBase):
    pass

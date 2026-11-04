from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


class RestrictedAreaPersonBase(BaseModel):
    full_name: str = Field(..., description="Full name")
    employee_id: Optional[str] = Field(None, description="Staff/badge ID")
    role: str = Field(..., description="Job role e.g. Security Guard, Manager")
    department: Optional[str] = Field(None, description="Department")
    phone_number: Optional[str] = Field(None)
    email: Optional[str] = Field(None)
    authorized_cameras: List[str] = Field(default_factory=list, description="List of authorized camera IDs")
    access_level: str = Field(default="standard", description="standard, elevated, admin")
    is_active: bool = Field(default=True)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    profile_photo_url: Optional[str] = None


class RestrictedAreaPersonCreate(RestrictedAreaPersonBase):
    profile_photo_b64: Optional[str] = Field(None, description="Base64 photo for face embedding extraction")


class RestrictedAreaPersonUpdate(BaseModel):
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    authorized_cameras: Optional[List[str]] = None
    access_level: Optional[str] = None
    is_active: Optional[bool] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    profile_photo_url: Optional[str] = None
    profile_photo_b64: Optional[str] = None


class RestrictedAreaPerson(RestrictedAreaPersonBase):
    id: str
    created_at: datetime
    updated_at: datetime
    has_biometric: bool = Field(False, description="Whether face embedding is available")

    class Config:
        from_attributes = True


class RestrictedAreaFaceSearchRequest(BaseModel):
    image_b64: str
    camera_id: str = Field(..., description="Camera where detection occurred")


class FaceMatchResult(BaseModel):
    matched: bool
    authorized: bool = False
    confidence: float = 0.0
    person: Optional[dict] = None
    message: str = ""

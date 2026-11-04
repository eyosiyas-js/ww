from typing import Optional, List
from pydantic import BaseModel

class HistoryItem(BaseModel):
    id: str
    type: str # detection
    title: str
    category: str
    status: str
    timestamp: str
    description: str

class OfficerSchema(BaseModel):
    id: str
    name: str
    badge: str
    unit: str
    avatar: Optional[str] = None
    status: str # available, busy, offline

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None # Caution: Changing email might need verification
    phone: Optional[str] = None
    badge: Optional[str] = None
    unit: Optional[str] = None
    avatar: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UsernameUpdate(BaseModel):
    new_username: str # email

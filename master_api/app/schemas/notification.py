from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class NotificationBase(BaseModel):
    type: str # alert, info, warning, success
    title: str
    message: str
    action_url: Optional[str] = None
    read: bool = False

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationUpdate(BaseModel):
    read: Optional[bool] = None

class Notification(NotificationBase):
    id: str
    timestamp: datetime

    class Config:
        orm_mode = True

from sqlalchemy import Column, ForeignKey, String, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin

class Notification(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    type = Column(String) # alert, info, warning, success
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    action_url = Column(String)
    user_id = Column(String, ForeignKey("user.id"))
    
    user = relationship("User", back_populates="notifications")

class FormTemplate(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    fields = Column(JSON) # List of FormField objects
    is_active = Column(Boolean, default=True)
    detection_type = Column(String, default="person") # "person" or "vehicle"
    organization_id = Column(String, ForeignKey("organization.id"))
    
    organization = relationship("Organization", back_populates="templates")
    detections = relationship("Detection", back_populates="form_template")

class SystemSetting(Base, TimestampMixin):
    key = Column(String, primary_key=True, index=True)
    value = Column(JSON)
    description = Column(String)


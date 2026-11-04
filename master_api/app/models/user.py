from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin

class User(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    organization_id = Column(String, ForeignKey("organization.id"))
    role_id = Column(String, ForeignKey("role.id"))
    status = Column(String, default="active")
    expo_push_token = Column(String, nullable=True)
    
    organization = relationship("Organization", back_populates="users")
    role = relationship("Role", back_populates="users")
    notifications = relationship("Notification", back_populates="user")
    detections = relationship("Detection", back_populates="user")
    officer_location = relationship("OfficerLocation", uselist=False, back_populates="user", cascade="all, delete-orphan")
    detection_assignments = relationship("DetectionAssignment", back_populates="user", cascade="all, delete-orphan")

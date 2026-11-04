from typing import Optional
from sqlalchemy import Boolean, Column, Integer, String, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin

class Organization(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True) # Using string IDs to match mock uuid-like strings
    name = Column(String, index=True, nullable=False)
    admin_email = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="active") # active, suspended, inactive
    company_type = Column(String, default="general") # general, traffic_police
    features = Column(JSON, default=dict) # company-level feature permissions
    parent_id = Column(String, ForeignKey("organization.id"), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    # Self-referential relationship for hierarchical companies
    parent = relationship("Organization", remote_side=[id], backref="children")
    
    users = relationship("User", back_populates="organization")
    roles = relationship("Role", back_populates="organization")
    owned_cameras = relationship("Camera", back_populates="owner", foreign_keys="Camera.organization_id")
    camera_access = relationship("CameraAccess", back_populates="organization", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="organization", foreign_keys="Detection.organization_id")
    assigned_detections = relationship("Detection", foreign_keys="Detection.assigned_company_id")
    templates = relationship("FormTemplate", back_populates="organization")
    officer_locations = relationship("OfficerLocation", back_populates="organization", cascade="all, delete-orphan")

    @property
    def adminEmail(self) -> str:
        return self.admin_email

    @property
    def usersCount(self) -> int:
        return len(self.users)

    @property
    def camerasCount(self) -> int:
        return len(self.owned_cameras)

    @property
    def detectionsCount(self) -> int:
        return len(self.detections)

    @property
    def parentId(self) -> Optional[str]:
        return self.parent_id

    @property
    def companyType(self) -> str:
        return self.company_type or "general"

    @property
    def createdAt(self) -> str:
        return self.created_at.isoformat() if self.created_at else ""

class Role(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    permissions = Column(JSON) # List of permission strings
    organization_id = Column(String, ForeignKey("organization.id"), nullable=True) # Null for system/global roles
    users_count = Column(Integer, default=0)
    is_system = Column(Boolean, default=False)
    
    organization = relationship("Organization", back_populates="roles")
    users = relationship("User", back_populates="role")

    @property
    def isSystem(self) -> bool:
        return self.is_system

    @property
    def usersCount(self) -> int:
        return len(self.users)

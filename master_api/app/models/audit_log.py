from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    """
    Centralized audit log for tracking all system activities.
    Records user actions, system events, and changes across all modules.
    """
    __tablename__ = "audit_log"
    
    id = Column(String, primary_key=True, index=True)
    
    # Actor information
    user_id = Column(String, ForeignKey("user.id"), nullable=True)  # Nullable for system actions
    user_name = Column(String, nullable=True)  # Denormalized for historical records
    user_email = Column(String, nullable=True)
    
    # Organization context
    organization_id = Column(String, ForeignKey("organization.id"), nullable=True)
    organization_name = Column(String, nullable=True)  # Denormalized
    
    # Action details
    action_type = Column(String, nullable=False, index=True)  # login, logout, create, update, delete, assign, etc.
    module = Column(String, nullable=False, index=True)  # detection, user, camera, company, role, etc.
    entity_type = Column(String, nullable=True)  # Specific entity type (e.g., "person", "vehicle" for detections)
    entity_id = Column(String, nullable=True, index=True)  # ID of the affected entity
    entity_name = Column(String, nullable=True)  # Name/description of the affected entity
    
    # Action description
    description = Column(String, nullable=False)  # Human-readable description
    
    # Additional context
    extra_data = Column(JSON, nullable=True)  # Additional structured data (old values, new values, etc.)
    
    # Request context
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Status
    status = Column(String, default="success")  # success, failed, pending
    error_message = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    organization = relationship("Organization", foreign_keys=[organization_id])

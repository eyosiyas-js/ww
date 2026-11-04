from sqlalchemy import Column, ForeignKey, String, Float, Boolean, JSON, LargeBinary, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin

class Camera(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    location = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="online") # online, offline, maintenance
    is_flagged = Column(Boolean, default=False)
    stream_url = Column(String)
    camera_stream_id = Column(String, nullable=True)  # streaming server camera UUID
    organization_id = Column(String, ForeignKey("organization.id"), nullable=True)
    linked_traffic_company_id = Column(String, ForeignKey("organization.id"), nullable=True)
    last_detection_at = Column(DateTime, nullable=True)
    
    owner = relationship("Organization", back_populates="owned_cameras", foreign_keys=[organization_id])
    linked_traffic_company = relationship("Organization", foreign_keys=[linked_traffic_company_id])
    access_grants = relationship("CameraAccess", back_populates="camera", cascade="all, delete-orphan")

class CameraAccess(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    camera_id = Column(String, ForeignKey("camera.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organization.id"), nullable=False)
    
    camera = relationship("Camera", back_populates="access_grants")
    organization = relationship("Organization", back_populates="camera_access")

class Detection(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    category = Column(String, nullable=False) # person, vehicle
    name = Column(String, index=True)
    description = Column(String)
    age = Column(String)
    location = Column(String)
    subcategory = Column(String) # missing, criminal
    crime_type = Column(String, nullable=True) # only when subcategory=criminal
    image_urls = Column(JSON)
    status = Column(String, default="pending") # pending, monitoring, detected
    detected_camera_ids = Column(JSON) # List of camera IDs
    user_id = Column(String, ForeignKey("user.id"))
    organization_id = Column(String, ForeignKey("organization.id"))
    form_template_id = Column(String, ForeignKey("formtemplate.id"), nullable=True)
    dynamic_data = Column(JSON, nullable=True) # Dictionary of field_id -> value
    detection_events = Column(JSON, nullable=True) # List of dicts: {id, camera_id, camera_name, timestamp, snapshot_url}
    
    # Vehicle-specific fields
    plate_number = Column(String, nullable=True)
    code = Column(String, nullable=True)
    region = Column(String, nullable=True)  # Ethiopian region code (AA, OR, AM, etc.)
    
    # Person-specific fields
    national_id_number = Column(String, nullable=True)
    
    assigned_company_id = Column(String, ForeignKey("organization.id"), nullable=True)
    assignment_type = Column(String, default="company") # company, user
    handling_status = Column(String, default="unassigned") # unassigned, pending, in_progress, resolved, failed
    eligible_for_assignment = Column(Boolean, default=True)
    allow_external_assignment = Column(Boolean, default=False) # Traffic: if True, dispatch to officers from ALL traffic companies
    handling_notes = Column(String, nullable=True)
    handling_proof_urls = Column(JSON, nullable=True)
    dispatch_message = Column(String, nullable=True) # Diagnostic message explaining dispatch outcome

    user = relationship("User", back_populates="detections")
    organization = relationship("Organization", back_populates="detections", foreign_keys=[organization_id])
    assigned_company = relationship("Organization", foreign_keys=[assigned_company_id], overlaps="assigned_detections")
    form_template = relationship("FormTemplate", back_populates="detections")
    assignments = relationship("DetectionAssignment", back_populates="detection", cascade="all, delete-orphan")
    national_id_matches = relationship("DetectionNationalIdMatch", back_populates="detection", lazy="select")
    
    face_embedding = Column(LargeBinary, nullable=True)


class WeaponDetection(Base, TimestampMixin):
    """Weapon detections captured by the detection engine."""
    id = Column(String, primary_key=True, index=True)
    weapon_type = Column(String, nullable=False)  # Handgun, Rifle, Knife, Explosive, Other
    description = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)  # 0-100
    image_url = Column(String, nullable=True)   # Captured snapshot from engine
    camera_id = Column(String, ForeignKey("camera.id"), nullable=True)
    camera_name = Column(String, nullable=True)
    organization_id = Column(String, ForeignKey("organization.id"), nullable=True)

    camera = relationship("Camera")
    organization = relationship("Organization")

    @property
    def weaponType(self) -> str:
        return self.weapon_type

    @property
    def createdAt(self) -> str:
        return self.created_at.isoformat() if self.created_at else ""

    @property
    def updatedAt(self) -> str:
        return self.updated_at.isoformat() if self.updated_at else ""

    @property
    def imageUrl(self) -> str:
        return self.image_url

    @property
    def cameraId(self) -> str:
        return self.camera_id

    @property
    def cameraName(self) -> str:
        return self.camera_name

    @property
    def organizationId(self) -> str:
        return self.organization_id

    @property
    def assignedCompanyName(self) -> str:
        return self.organization.name if self.organization else "Super Admin (Fallback)"

class OfficerLocation(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("user.id"), unique=True)
    organization_id = Column(String, ForeignKey("organization.id"))
    lat = Column(Float)
    lng = Column(Float)
    heading = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    is_online = Column(Boolean, default=True)
    last_seen = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="officer_location")
    organization = relationship("Organization", back_populates="officer_locations")


class OfficerLocationHistory(Base, TimestampMixin):
    """Track historical location data for officers"""
    __tablename__ = "officer_location_history"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("user.id"), index=True)
    organization_id = Column(String, ForeignKey("organization.id"))
    lat = Column(Float)
    lng = Column(Float)
    heading = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    recorded_at = Column(DateTime, nullable=False, index=True)
    
    user = relationship("User")
    organization = relationship("Organization")

class DetectionAssignment(Base, TimestampMixin):
    id = Column(String, primary_key=True, index=True)
    detection_id = Column(String, ForeignKey("detection.id"))
    user_id = Column(String, ForeignKey("user.id"))
    distance_at_assignment = Column(Float)
    status = Column(String, default="assigned") # assigned, closed_resolved, closed_failed
    notes = Column(String, nullable=True)
    proof_urls = Column(JSON, nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    detection = relationship("Detection", back_populates="assignments")
    user = relationship("User", back_populates="detection_assignments")

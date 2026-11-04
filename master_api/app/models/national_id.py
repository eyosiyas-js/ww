from sqlalchemy import Column, String, Date, Boolean, JSON, DateTime, ForeignKey, Text, LargeBinary
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from app.models.utility import TimestampMixin


class NationalIdProfile(Base, TimestampMixin):
    """
    National ID Profile model - stores comprehensive citizen information
    This can be populated from mock data initially, then real government API later
    """
    __tablename__ = "national_id_profile"
    
    id = Column(String, primary_key=True, index=True)  # Internal ID
    national_id_number = Column(String, unique=True, index=True, nullable=False)  # Government ID number
    
    # Personal Information
    full_name = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    gender = Column(String, nullable=False)  # Male, Female, Other
    date_of_birth = Column(Date, nullable=False)
    nationality = Column(String, nullable=False)
    
    # Contact & Location
    address = Column(Text, nullable=True)
    region = Column(String, nullable=True)  # Administrative region
    city = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Official Information
    occupation = Column(String, nullable=True)
    status = Column(String, default="active")  # active, inactive, suspended, deceased
    registration_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    issuing_authority = Column(String, nullable=True)
    
    # Emergency Contact
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    emergency_contact_relationship = Column(String, nullable=True)
    
    # Profile Photo
    profile_photo_url = Column(String, nullable=True)
    
    # Additional metadata
    additional_info = Column(JSON, nullable=True)  # For extensible fields
    
    # Verification status
    is_verified = Column(Boolean, default=True)
    verification_date = Column(DateTime, nullable=True)
    
    # Biometric data (Face Embedding for Buffalo L)
    face_embedding = Column(LargeBinary, nullable=True)
    
    # Relationships
    detection_matches = relationship("DetectionNationalIdMatch", back_populates="national_id_profile", cascade="all, delete-orphan")


class DetectionNationalIdMatch(Base, TimestampMixin):
    """
    Links detections to National ID profiles with confidence scores and match metadata
    """
    __tablename__ = "detection_national_id_match"
    
    id = Column(String, primary_key=True, index=True)
    detection_id = Column(String, ForeignKey("detection.id"), nullable=False)
    national_id_profile_id = Column(String, ForeignKey("national_id_profile.id"), nullable=False)
    
    # Match Information
    confidence_score = Column(String, nullable=False)  # High, Medium, Low
    match_type = Column(String, nullable=False)  # face_recognition, manual_verification, id_number
    match_source = Column(String, nullable=False)  # mock_api, government_api, manual
    
    # Match metadata
    match_details = Column(JSON, nullable=True)  # Store additional match information
    verified_by_user_id = Column(String, ForeignKey("user.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="pending")  # pending, confirmed, rejected, under_review
    
    # Relationships
    detection = relationship("Detection", back_populates="national_id_matches")
    national_id_profile = relationship("NationalIdProfile", back_populates="detection_matches")
    verified_by = relationship("User")
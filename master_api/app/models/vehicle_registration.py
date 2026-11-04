from sqlalchemy import Column, String, Date, Boolean, JSON, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from app.models.utility import TimestampMixin


class VehicleRegistration(Base, TimestampMixin):
    """
    Vehicle Registration model - stores comprehensive vehicle information from Transport Bureau
    This can be populated from mock data initially, then real Transport Bureau API later
    """
    __tablename__ = "vehicle_registration"
    
    id = Column(String, primary_key=True, index=True)  # Internal ID
    plate_number = Column(String, unique=True, index=True, nullable=False)  # License plate number
    
    # Vehicle Information
    vehicle_make = Column(String, nullable=False)  # e.g., Toyota, Honda, Nissan
    vehicle_model = Column(String, nullable=False)  # e.g., Camry, Accord, Patrol
    vehicle_year = Column(Integer, nullable=False)  # Manufacturing year
    vehicle_color = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)  # Sedan, SUV, Truck, Motorcycle, etc.
    vin_number = Column(String, unique=True, nullable=True)  # Vehicle Identification Number
    engine_number = Column(String, nullable=True)
    chassis_number = Column(String, nullable=True)
    
    # Registration Information
    registration_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    registration_status = Column(String, default="active")  # active, expired, suspended, revoked
    region_code = Column(String, nullable=True)  # Registration region code
    issuing_authority = Column(String, nullable=True)
    
    # Owner Information
    owner_name = Column(String, nullable=False)
    owner_national_id = Column(String, nullable=True)
    owner_address = Column(Text, nullable=True)
    owner_phone = Column(String, nullable=True)
    owner_email = Column(String, nullable=True)
    
    # Insurance Information
    insurance_company = Column(String, nullable=True)
    insurance_policy_number = Column(String, nullable=True)
    insurance_expiry_date = Column(Date, nullable=True)
    insurance_status = Column(String, nullable=True)  # active, expired, none
    
    # Technical Information
    engine_capacity = Column(String, nullable=True)  # e.g., "2.5L", "3000cc"
    fuel_type = Column(String, nullable=True)  # Petrol, Diesel, Electric, Hybrid
    transmission_type = Column(String, nullable=True)  # Manual, Automatic
    seating_capacity = Column(Integer, nullable=True)
    
    # Status & Flags
    is_stolen = Column(Boolean, default=False)
    is_wanted = Column(Boolean, default=False)
    has_violations = Column(Boolean, default=False)
    violation_count = Column(Integer, default=0)
    outstanding_fines = Column(String, nullable=True)  # Amount in currency
    
    # Additional metadata
    notes = Column(Text, nullable=True)
    additional_info = Column(JSON, nullable=True)  # For extensible fields
    
    # Verification status
    is_verified = Column(Boolean, default=True)
    last_inspection_date = Column(Date, nullable=True)
    next_inspection_date = Column(Date, nullable=True)
    
    # Photo
    vehicle_photo_url = Column(String, nullable=True)
    
    # Relationships
    detection_matches = relationship("DetectionVehicleMatch", back_populates="vehicle_registration")


class DetectionVehicleMatch(Base, TimestampMixin):
    """
    Links vehicle detections to Vehicle Registration records with confidence scores and match metadata
    """
    __tablename__ = "detection_vehicle_match"
    
    id = Column(String, primary_key=True, index=True)
    detection_id = Column(String, ForeignKey("detection.id"), nullable=False)
    vehicle_registration_id = Column(String, ForeignKey("vehicle_registration.id"), nullable=False)
    
    # Match Information
    confidence_score = Column(String, nullable=False)  # High, Medium, Low
    match_type = Column(String, nullable=False)  # plate_recognition, manual_verification, vin_number
    match_source = Column(String, nullable=False)  # mock_api, transport_bureau_api, manual
    
    # Match metadata
    match_details = Column(JSON, nullable=True)  # Store additional match information
    verified_by_user_id = Column(String, ForeignKey("user.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="pending")  # pending, confirmed, rejected, under_review
    
    # Relationships
    detection = relationship("Detection", backref="vehicle_matches")
    vehicle_registration = relationship("VehicleRegistration", back_populates="detection_matches")
    verified_by = relationship("User")

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import date, datetime


class NationalIdProfileBase(BaseModel):
    national_id_number: str = Field(..., description="Government issued National ID number")
    full_name: str = Field(..., description="Complete full name")
    first_name: str = Field(..., description="First name")
    middle_name: Optional[str] = Field(None, description="Middle name")
    last_name: str = Field(..., description="Last name")
    gender: str = Field(..., description="Gender (Male, Female, Other)")
    date_of_birth: date = Field(..., description="Date of birth")
    nationality: str = Field(..., description="Nationality")
    address: Optional[str] = Field(None, description="Full address")
    region: Optional[str] = Field(None, description="Administrative region")
    city: Optional[str] = Field(None, description="City")
    phone_number: Optional[str] = Field(None, description="Phone number")
    email: Optional[str] = Field(None, description="Email address")
    occupation: Optional[str] = Field(None, description="Occupation")
    status: str = Field(default="active", description="Status (active, inactive, suspended, deceased)")
    registration_date: Optional[date] = Field(None, description="ID registration date")
    expiry_date: Optional[date] = Field(None, description="ID expiry date")
    issuing_authority: Optional[str] = Field(None, description="Issuing authority")
    emergency_contact_name: Optional[str] = Field(None, description="Emergency contact name")
    emergency_contact_phone: Optional[str] = Field(None, description="Emergency contact phone")
    emergency_contact_relationship: Optional[str] = Field(None, description="Emergency contact relationship")
    profile_photo_url: Optional[str] = Field(None, description="Profile photo URL")
    additional_info: Optional[Dict[str, Any]] = Field(None, description="Additional information")
    is_verified: bool = Field(default=True, description="Verification status")


class NationalIdProfileCreate(NationalIdProfileBase):
    profile_photo_b64: Optional[str] = Field(None, description="Base64 encoded profile photo for biometric extraction")


class NationalIdProfileUpdate(BaseModel):
    national_id_number: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    status: Optional[str] = None
    registration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    profile_photo_url: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None
    is_verified: Optional[bool] = None


class NationalIdProfile(NationalIdProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime
    verification_date: Optional[datetime] = None
    has_biometric: bool = Field(False, description="Whether the profile has a face embedding")

    class Config:
        from_attributes = True


class DetectionNationalIdMatchBase(BaseModel):
    detection_id: str
    national_id_profile_id: str
    confidence_score: str = Field(..., description="Confidence level (High, Medium, Low)")
    match_type: str = Field(..., description="Type of match (face_recognition, manual_verification, id_number)")
    match_source: str = Field(..., description="Source of match (mock_api, government_api, manual)")
    match_details: Optional[Dict[str, Any]] = Field(None, description="Additional match details")
    verification_notes: Optional[str] = Field(None, description="Verification notes")
    status: str = Field(default="pending", description="Match status (pending, confirmed, rejected, under_review)")


class DetectionNationalIdMatchCreate(DetectionNationalIdMatchBase):
    pass


class DetectionNationalIdMatchUpdate(BaseModel):
    confidence_score: Optional[str] = None
    match_type: Optional[str] = None
    match_source: Optional[str] = None
    match_details: Optional[Dict[str, Any]] = None
    verification_notes: Optional[str] = None
    status: Optional[str] = None


class DetectionNationalIdMatch(DetectionNationalIdMatchBase):
    id: str
    created_at: datetime
    updated_at: datetime
    verified_by_user_id: Optional[str] = None
    national_id_profile: Optional[NationalIdProfile] = None

    class Config:
        from_attributes = True


# API Request/Response schemas
class NationalIdSearchRequest(BaseModel):
    """Request schema for searching National ID database"""
    query_type: str = Field(..., description="Type of search (id_number, face_embedding, name)")
    query_value: str = Field(..., description="Search value (ID number, base64 image, or name)")
    confidence_threshold: Optional[float] = Field(0.7, description="Minimum confidence for face matching")


class NationalIdSearchResponse(BaseModel):
    """Response schema for National ID search results"""
    success: bool
    matches: List[Dict[str, Any]] = Field(default_factory=list)
    total_matches: int = 0
    search_time_ms: int = 0
    message: Optional[str] = None


class DetectionWithNationalId(BaseModel):
    """Enhanced detection schema that includes National ID matches"""
    # Include all standard detection fields
    id: str
    category: str
    name: str
    description: Optional[str] = None
    age: Optional[str] = None
    location: Optional[str] = None
    subcategory: Optional[str] = None
    crime_type: Optional[str] = None
    image_urls: Optional[List[str]] = []
    status: str
    created_at: datetime
    updated_at: datetime
    
    # National ID integration fields
    national_id_matches: List[DetectionNationalIdMatch] = Field(default_factory=list)
    primary_national_id: Optional[NationalIdProfile] = None  # Best/confirmed match
    has_national_id_match: bool = False

    class Config:
        from_attributes = True
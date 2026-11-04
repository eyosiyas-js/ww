from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import date, datetime


# Vehicle Registration Schemas
class VehicleRegistrationBase(BaseModel):
    plate_number: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vehicle_color: str
    vehicle_type: str
    vin_number: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    registration_date: date
    expiry_date: date
    registration_status: str = "active"
    region_code: Optional[str] = None
    issuing_authority: Optional[str] = None
    owner_name: str
    owner_national_id: Optional[str] = None
    owner_address: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    insurance_company: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    insurance_status: Optional[str] = None
    engine_capacity: Optional[str] = None
    fuel_type: Optional[str] = None
    transmission_type: Optional[str] = None
    seating_capacity: Optional[int] = None
    is_stolen: bool = False
    is_wanted: bool = False
    has_violations: bool = False
    violation_count: int = 0
    outstanding_fines: Optional[str] = None
    notes: Optional[str] = None
    additional_info: Optional[dict] = None
    is_verified: bool = True
    last_inspection_date: Optional[date] = None
    next_inspection_date: Optional[date] = None
    vehicle_photo_url: Optional[str] = None


class VehicleRegistrationCreate(VehicleRegistrationBase):
    pass


class VehicleRegistrationUpdate(BaseModel):
    plate_number: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    vehicle_type: Optional[str] = None
    registration_status: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    insurance_status: Optional[str] = None
    is_stolen: Optional[bool] = None
    is_wanted: Optional[bool] = None
    has_violations: Optional[bool] = None
    violation_count: Optional[int] = None
    outstanding_fines: Optional[str] = None
    notes: Optional[str] = None


class VehicleRegistration(VehicleRegistrationBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Detection Vehicle Match Schemas
class DetectionVehicleMatchBase(BaseModel):
    detection_id: str
    vehicle_registration_id: str
    confidence_score: str
    match_type: str
    match_source: str
    match_details: Optional[dict] = None
    verification_notes: Optional[str] = None
    status: str = "pending"


class DetectionVehicleMatchCreate(DetectionVehicleMatchBase):
    pass


class DetectionVehicleMatchUpdate(BaseModel):
    status: Optional[str] = None
    verification_notes: Optional[str] = None
    confidence_score: Optional[str] = None


class DetectionVehicleMatch(DetectionVehicleMatchBase):
    id: str
    verified_by_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    vehicle_registration: Optional[VehicleRegistration] = None

    class Config:
        from_attributes = True


# Search Schemas
class VehicleSearchRequest(BaseModel):
    query_type: str  # plate_number, vin_number, owner_name, owner_national_id
    query_value: str
    confidence_threshold: Optional[float] = 0.7


class VehicleSearchResponse(BaseModel):
    success: bool
    message: str
    matches: List[dict] = []
    search_time_ms: Optional[int] = None


# Detection with Vehicle Info
class DetectionWithVehicle(BaseModel):
    id: str
    category: str
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    plate_number: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    image_urls: List[str] = []
    status: str
    created_at: datetime
    updated_at: datetime
    vehicle_matches: List[DetectionVehicleMatch] = []
    primary_vehicle: Optional[VehicleRegistration] = None
    has_vehicle_match: bool = False

    class Config:
        from_attributes = True

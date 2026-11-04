from typing import List, Optional, Literal, Any
from pydantic import BaseModel, model_validator
from datetime import datetime

# Flexible allowed values for detection classification
CATEGORY_VALUES = Literal["person", "vehicle", "missing_person", "face", "plate"]
SUBCATEGORY_VALUES = Literal["missing", "criminal", "missing_person"]

# ── Camera Schemas ──────────────────────────────
class CameraBase(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = "online"
    isFlagged: Optional[bool] = False
    is_flagged: Optional[bool] = None
    streamUrl: Optional[str] = None
    stream_url: Optional[str] = None
    cameraStreamId: Optional[str] = None
    camera_stream_id: Optional[str] = None
    organizationId: Optional[str] = None
    organization_id: Optional[str] = None
    linkedTrafficCompanyId: Optional[str] = None
    linked_traffic_company_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_camel_and_snake(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "is_flagged" in data and "isFlagged" not in data:
                data["isFlagged"] = data["is_flagged"]
            elif "isFlagged" in data and "is_flagged" not in data:
                data["is_flagged"] = data["isFlagged"]

            if "stream_url" in data and "streamUrl" not in data:
                data["streamUrl"] = data["stream_url"]
            elif "streamUrl" in data and "stream_url" not in data:
                data["stream_url"] = data["streamUrl"]

            if "camera_stream_id" in data and "cameraStreamId" not in data:
                data["cameraStreamId"] = data["camera_stream_id"]
            elif "cameraStreamId" in data and "camera_stream_id" not in data:
                data["camera_stream_id"] = data["cameraStreamId"]

            if "organization_id" in data and "organizationId" not in data:
                data["organizationId"] = data["organization_id"]
            elif "organizationId" in data and "organization_id" not in data:
                data["organization_id"] = data["organizationId"]

            if "linked_traffic_company_id" in data and "linkedTrafficCompanyId" not in data:
                data["linkedTrafficCompanyId"] = data["linked_traffic_company_id"]
            elif "linkedTrafficCompanyId" in data and "linked_traffic_company_id" not in data:
                data["linked_traffic_company_id"] = data["linkedTrafficCompanyId"]
        return data

    @model_validator(mode="after")
    def sync_post_validate(self):
        if self.is_flagged is None:
            self.is_flagged = self.isFlagged or False
        if self.isFlagged is None:
            self.isFlagged = self.is_flagged or False

        if self.stream_url is None:
            self.stream_url = self.streamUrl
        if self.streamUrl is None:
            self.streamUrl = self.stream_url

        if self.camera_stream_id is None:
            self.camera_stream_id = self.cameraStreamId
        if self.cameraStreamId is None:
            self.cameraStreamId = self.camera_stream_id

        if self.organization_id is None:
            self.organization_id = self.organizationId
        if self.organizationId is None:
            self.organizationId = self.organization_id

        if self.linked_traffic_company_id is None:
            self.linked_traffic_company_id = self.linkedTrafficCompanyId
        if self.linkedTrafficCompanyId is None:
            self.linkedTrafficCompanyId = self.linked_traffic_company_id
        return self

class CameraUpdate(CameraBase):
    pass

class CameraCreate(CameraBase):
    name: str # Name is required for creation

class Camera(CameraBase):
    id: str
    organization_id: Optional[str] = None
    lastDetection: Optional[str] = None
    lastDetectionAt: Optional[datetime] = None
    linkedTrafficCompanyName: Optional[str] = None

    class Config:
        from_attributes = True

class CameraAccessBase(BaseModel):
    cameraId: str
    organizationId: str

class CameraAccess(CameraAccessBase):
    id: str
    createdAt: datetime

    class Config:
        from_attributes = True

class CameraAccessToggle(BaseModel):
    organizationId: str
    hasAccess: bool

# ── Detection Schemas ───────────────────────────
class DetectionBase(BaseModel):
    category: CATEGORY_VALUES # person, vehicle
    name: str
    description: Optional[str] = None
    age: Optional[str] = None
    location: Optional[str] = None
    subcategory: Optional[SUBCATEGORY_VALUES] = None
    crime_type: Optional[str] = None
    image_urls: Optional[List[str]] = []
    status: Optional[str] = "pending"
    form_template_id: Optional[str] = None
    dynamic_data: Optional[dict] = None
    assigned_company_id: Optional[str] = None
    handling_status: Optional[str] = "unassigned"
    handling_notes: Optional[str] = None
    handling_proof_urls: Optional[List[str]] = None
    eligible_for_assignment: Optional[bool] = True
    allow_external_assignment: Optional[bool] = False
    # Vehicle-specific fields
    plate_number: Optional[str] = None
    code: Optional[str] = None
    region: Optional[str] = None
    
    # National ID Integration
    national_id_number: Optional[str] = None

    class Config:
        alias_generator = lambda string: "".join(
            word.capitalize() if i > 0 else word 
            for i, word in enumerate(string.split("_"))
        )
        populate_by_name = True

class DetectionCreate(DetectionBase):
    pass

class DetectionUpdate(BaseModel):
    category: Optional[CATEGORY_VALUES] = None
    name: Optional[str] = None
    description: Optional[str] = None
    age: Optional[str] = None
    location: Optional[str] = None
    subcategory: Optional[SUBCATEGORY_VALUES] = None
    crime_type: Optional[str] = None
    image_urls: Optional[List[str]] = None
    status: Optional[str] = None
    form_template_id: Optional[str] = None
    dynamic_data: Optional[dict] = None
    assigned_company_id: Optional[str] = None
    handling_status: Optional[str] = None
    handling_notes: Optional[str] = None
    handling_proof_urls: Optional[List[str]] = None
    eligible_for_assignment: Optional[bool] = None
    # Vehicle-specific fields
    plate_number: Optional[str] = None
    code: Optional[str] = None
    region: Optional[str] = None
    # National ID Integration
    national_id_number: Optional[str] = None

class DetectionAction(BaseModel):
    status: str # "in_progress", "resolved", "failed"
    notes: Optional[str] = None
    proofUrls: Optional[List[str]] = None

class Detection(DetectionBase):
    id: str
    createdAt: str
    updatedAt: str
    detectedCameraIds: Optional[List[str]] = []
    detectionEvents: Optional[List[dict]] = []
    resolvedDynamicData: Optional[List[dict]] = []
    assignedCompanyName: Optional[str] = None
    assignedOfficers: Optional[List[dict]] = None
    dispatchMessage: Optional[str] = None
    assignmentType: Optional[str] = None

    class Config:
        from_attributes = True
        alias_generator = lambda string: "".join(
            word.capitalize() if i > 0 else word 
            for i, word in enumerate(string.split("_"))
        )
        populate_by_name = True

class DetectionPublic(Detection):
    faceEmbedding: Optional[List[float]] = None

# ── Weapon Detection Schemas ────────────────────
class WeaponDetectionBase(BaseModel):
    weaponType: Optional[str] = None
    weapon_type: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[float] = None
    imageUrl: Optional[str] = None
    image_url: Optional[str] = None
    cameraId: Optional[str] = None
    camera_id: Optional[str] = None
    cameraName: Optional[str] = None
    camera_name: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_weapon_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "weapon_type" in data and "weaponType" not in data:
                data["weaponType"] = data["weapon_type"]
            elif "weaponType" in data and "weapon_type" not in data:
                data["weapon_type"] = data["weaponType"]

            if "image_url" in data and "imageUrl" not in data:
                data["imageUrl"] = data["image_url"]
            elif "imageUrl" in data and "image_url" not in data:
                data["image_url"] = data["imageUrl"]

            if "camera_id" in data and "cameraId" not in data:
                data["cameraId"] = data["camera_id"]
            elif "cameraId" in data and "camera_id" not in data:
                data["camera_id"] = data["cameraId"]

            if "camera_name" in data and "cameraName" not in data:
                data["cameraName"] = data["camera_name"]
            elif "cameraName" in data and "camera_name" not in data:
                data["camera_name"] = data["cameraName"]
        return data

    @model_validator(mode="after")
    def sync_weapon_post_validate(self):
        if self.weapon_type is None:
            self.weapon_type = self.weaponType
        if self.weaponType is None:
            self.weaponType = self.weapon_type
        if self.image_url is None:
            self.image_url = self.imageUrl
        if self.imageUrl is None:
            self.imageUrl = self.image_url
        if self.camera_id is None:
            self.camera_id = self.cameraId
        if self.cameraId is None:
            self.cameraId = self.camera_id
        if self.camera_name is None:
            self.camera_name = self.cameraName
        if self.cameraName is None:
            self.cameraName = self.camera_name
        return self

class WeaponDetectionCreate(WeaponDetectionBase):
    pass

class WeaponDetection(WeaponDetectionBase):
    id: str
    organizationId: Optional[str] = None
    assignedCompanyName: Optional[str] = None
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True
        alias_generator = lambda string: "".join(
            word.capitalize() if i > 0 else word 
            for i, word in enumerate(string.split("_"))
        )
        populate_by_name = True


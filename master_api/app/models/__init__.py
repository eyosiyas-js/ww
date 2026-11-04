from app.db.base_class import Base
from app.models.organization_role import Organization, Role
from app.models.user import User
from app.models.operational import Camera, Detection, CameraAccess, WeaponDetection, OfficerLocation, DetectionAssignment, OfficerLocationHistory
from app.models.utility import Notification, FormTemplate, SystemSetting
from app.models.national_id import NationalIdProfile, DetectionNationalIdMatch
from app.models.fingerprint import FingerprintMatchHistory
from app.models.audit_log import AuditLog
from app.models.restricted_area import RestrictedAreaPerson
from app.models.vehicle_registration import VehicleRegistration, DetectionVehicleMatch


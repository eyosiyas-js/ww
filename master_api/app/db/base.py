# Import all the models, so that Base has them before being
# imported by Alembic or used for create_all
from app.db.base_class import Base  # noqa
from app.models import (  # noqa
    Organization, Role,
    User,
    Camera, CameraAccess, Detection, WeaponDetection, OfficerLocation, DetectionAssignment, OfficerLocationHistory,
    Notification, FormTemplate, SystemSetting,
    NationalIdProfile, DetectionNationalIdMatch,
    FingerprintMatchHistory,
    AuditLog,
    RestrictedAreaPerson,
    VehicleRegistration, DetectionVehicleMatch
)


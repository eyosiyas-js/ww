from fastapi import APIRouter
from app.api.v1.endpoints import auth, admin, cameras, detections, notifications, personal, public

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(detections.router, prefix="/detections", tags=["detections"])
from app.api.v1.endpoints import weapon_detections
api_router.include_router(weapon_detections.router, prefix="/weapon-detections", tags=["weapon detections"])

api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(personal.profile_router, prefix="/profile", tags=["profile"])
api_router.include_router(personal.history_router, prefix="/history", tags=["history"])
api_router.include_router(personal.officer_router, prefix="/officers-list", tags=["officers-list"]) # renamed to not conflict
api_router.include_router(public.router, prefix="/public", tags=["public"])
from app.api.v1.endpoints import traffic
api_router.include_router(traffic.router, prefix="/officers", tags=["officers traffic"])
from app.api.v1.endpoints import national_id
api_router.include_router(national_id.router, prefix="/national-id", tags=["national-id"])
from app.api.v1.endpoints import fingerprint
api_router.include_router(fingerprint.router, prefix="/fingerprint-history", tags=["fingerprint-history"])
from app.api.v1.endpoints import vehicle_registration
api_router.include_router(vehicle_registration.router, prefix="/vehicle-registration", tags=["vehicle-registration"])
from app.api.v1.endpoints import restricted_area
api_router.include_router(restricted_area.router, prefix="/restricted-area", tags=["restricted-area"])
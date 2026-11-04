import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import engine
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from fastapi.responses import JSONResponse
@app.exception_handler(Exception)
async def debug_exception_handler(request, exc):
    import traceback
    logger.error(f"Global error: {exc}")
    logger.error(traceback.format_exc())
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        }
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

from datetime import datetime, timedelta
from app import crud, models
from app.db.session import SessionLocal
import asyncio

# Heartbeat timeout: officers not seen within this many seconds are marked offline
OFFICER_HEARTBEAT_TIMEOUT_SECONDS = 90  # 1.5× the 60s mobile update interval


async def reset_camera_alerts():
    """Reset camera alert status if no detection within the configured timeout."""
    while True:
        try:
            db = SessionLocal()
            timeout_mins = crud.system_setting.get_value(db, "camera_alert_timeout_minutes", 5)
            cutoff_time = datetime.utcnow() - timedelta(minutes=float(timeout_mins))
            stale_cameras = db.query(models.Camera).filter(
                models.Camera.is_flagged == True,
                models.Camera.last_detection_at < cutoff_time
            ).all()
            if stale_cameras:
                logger.info(f"Auto-resetting alerts for {len(stale_cameras)} cameras (timeout: {timeout_mins}m)")
                for camera in stale_cameras:
                    camera.is_flagged = False
                db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Error in reset_camera_alerts: {e}")
            if 'db' in locals():
                db.close()
        await asyncio.sleep(30)


async def officer_heartbeat_monitor():
    """
    Background task that runs every 30 seconds.
    Any officer whose last_seen is older than OFFICER_HEARTBEAT_TIMEOUT_SECONDS
    and is still marked is_online=True gets flipped to offline and a WebSocket
    broadcast is sent so the dashboard updates instantly without a page refresh.
    """
    from app.core.websockets import manager

    while True:
        await asyncio.sleep(30)
        try:
            db = SessionLocal()
            cutoff = datetime.utcnow() - timedelta(seconds=OFFICER_HEARTBEAT_TIMEOUT_SECONDS)

            stale = db.query(models.OfficerLocation).filter(
                models.OfficerLocation.is_online == True,
                models.OfficerLocation.last_seen < cutoff
            ).all()

            if stale:
                logger.info(f"[Heartbeat] Marking {len(stale)} officer(s) offline (no update for >{OFFICER_HEARTBEAT_TIMEOUT_SECONDS}s)")

            for loc in stale:
                loc.is_online = False
                db.flush()

                # Load user info for the broadcast
                user = db.query(models.User).filter(models.User.id == loc.user_id).first()
                if user and loc.organization_id:
                    await manager.broadcast_to_org(loc.organization_id, {
                        "type": "officer_status_changed",
                        "userId": loc.user_id,
                        "fullName": user.full_name,
                        "email": user.email,
                        "status": "offline",
                        "isOnline": False,
                        "lastSeen": loc.last_seen.isoformat() + "Z" if loc.last_seen else None,
                        "lat": loc.lat,
                        "lng": loc.lng,
                    })

            if stale:
                db.commit()

            db.close()
        except Exception as e:
            logger.error(f"[Heartbeat] Error: {e}")
            if 'db' in locals():
                db.close()


@app.on_event("startup")
async def startup_event():
    try:
        from app.db.init_db import auto_init_database
        auto_init_database()
        logger.info("Successfully connected to and initialized the database!")
        asyncio.create_task(reset_camera_alerts())
        asyncio.create_task(officer_heartbeat_monitor())
        logger.info(f"[Heartbeat] Officer monitor started (timeout={OFFICER_HEARTBEAT_TIMEOUT_SECONDS}s)")
    except Exception as e:
        logger.error(f"Failed to connect or initialize the database: {e}")



import sys
from fastapi.responses import FileResponse
from fastapi import HTTPException

# Detect frontend directory
frontend_dir = os.environ.get("FRONTEND_DIR")
if not frontend_dir:
    possible_paths = [
        os.path.join(os.getcwd(), "frontend"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend"),
        os.path.join(os.path.dirname(sys.executable), "frontend") if getattr(sys, "frozen", False) else None,
    ]
    for p in possible_paths:
        if p and os.path.isdir(p) and os.path.exists(os.path.join(p, "index.html")):
            frontend_dir = p
            break

if frontend_dir and os.path.isdir(frontend_dir):
    logger.info(f"Serving frontend SPA from {frontend_dir}")
    assets_dir = os.path.join(frontend_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if (
            full_path.startswith("api/")
            or full_path.startswith("uploads/")
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
            or full_path.startswith("redoc")
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "CIMS Backend is running"}


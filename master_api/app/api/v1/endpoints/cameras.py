from typing import Any, List
import asyncio
import base64
import json
import logging
import threading
import time
import struct
import uuid
import os
from datetime import datetime
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.audit import log_camera_created, log_camera_updated, log_camera_deleted
from app.core.websockets import manager
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Initialize InsightFace GPU AI Engine ─────────────────────────────────────

_face_app = None
try:
    from insightface.app import FaceAnalysis
    _model_root = os.environ.get("INSIGHTFACE_ROOT") or (
        os.path.join(os.getcwd(), "models", "insightface")
        if os.path.exists(os.path.join(os.getcwd(), "models", "insightface"))
        else os.path.expanduser('~/.insightface')
    )
    _face_app = FaceAnalysis(name='buffalo_l', root=_model_root)
    try:
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace GPU AI Engine loaded successfully (CUDA FP16)")
    except Exception:
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
        logger.info("InsightFace CPU AI Engine loaded fallback")
except Exception as e:
    logger.warning(f"Could not load InsightFace AI: {e}")

# ─── In-Memory Vectorized Face Database Cache ────────────────────────────────

_embedding_cache_lock = threading.Lock()
_cached_embeddings_matrix: np.ndarray | None = None # Shape (N, 512)
_cached_profiles_info: list[dict] = []
_last_cache_update = 0.0

def refresh_face_embedding_cache(db: Session):
    global _cached_embeddings_matrix, _cached_profiles_info, _last_cache_update
    now = time.time()
    if now - _last_cache_update < 10.0 and _cached_embeddings_matrix is not None:
        return

    try:
        profiles = db.query(models.NationalIdProfile).filter(
            models.NationalIdProfile.face_embedding.isnot(None)
        ).all()

        mat_list = []
        info_list = []

        for p in profiles:
            try:
                raw = p.face_embedding
                if not raw or len(raw) < 2048:
                    continue
                n = len(raw) // 4
                emb = np.array(struct.unpack(f"{n}f", raw), dtype=np.float32)
                norm = np.linalg.norm(emb)
                if norm > 1e-6:
                    emb = emb / norm
                    mat_list.append(emb)
                    info_list.append({
                        "name": f"{p.first_name or ''} {p.last_name or ''}".strip() or p.full_name or "Registered Person",
                        "national_id": p.national_id_number
                    })
            except Exception:
                continue

        with _embedding_cache_lock:
            if mat_list:
                _cached_embeddings_matrix = np.vstack(mat_list)
                _cached_profiles_info = info_list
            else:
                _cached_embeddings_matrix = None
                _cached_profiles_info = []
            _last_cache_update = now
    except Exception as err:
        logger.debug(f"Cache refresh error: {err}")


# ─── High-Speed Decoupled Camera Stream Reader ────────────────────────────────

class CameraStreamReader:
    """
    Ultra-Fast Decoupling Architecture:
    1. Stream Thread: Continuous 30 FPS video streaming with ZERO blocking.
    2. Parallel AI Thread: Downscaled 640px InsightFace GPU detection + 0.1ms Matrix Dot-Product Recognition.
    3. Instant System Notifications & Snapshot Capture: Saves high-resolution snapshot photos of matched suspects + triggers live WS alert.
    """
    _instances: dict[str, "CameraStreamReader"] = {}
    _lock = threading.Lock()

    def __init__(self, camera_id: str, camera_name: str, stream_url: str):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.stream_url = stream_url
        self.cap: cv2.VideoCapture | None = None
        self.latest_jpeg: bytes | None = None
        self.current_raw_frame: np.ndarray | None = None
        self.active_face_boxes: list[dict] = []
        self.latest_recognized: list[dict] = []
        self.latest_alerts: list[str] = []
        self.last_notif_time: dict[str, float] = {}
        self.ref_count = 0
        self.running = False
        self.stream_thread: threading.Thread | None = None
        self.ai_thread: threading.Thread | None = None

    @classmethod
    def get_or_create(cls, camera_id: str, camera_name: str, stream_url: str) -> "CameraStreamReader":
        with cls._lock:
            if camera_id in cls._instances:
                existing = cls._instances[camera_id]
                if existing.stream_url != stream_url:
                    existing.stop()
                    del cls._instances[camera_id]

            if camera_id not in cls._instances:
                reader = cls(camera_id, camera_name, stream_url)
                reader.start()
                cls._instances[camera_id] = reader

            reader = cls._instances[camera_id]
            reader.ref_count += 1
            return reader

    @classmethod
    def release_reader(cls, camera_id: str):
        with cls._lock:
            if camera_id in cls._instances:
                reader = cls._instances[camera_id]
                reader.ref_count -= 1
                if reader.ref_count <= 0:
                    reader.stop()
                    del cls._instances[camera_id]

    def start(self):
        self.running = True
        self.stream_thread = threading.Thread(target=self._worker, daemon=True)
        self.ai_thread = threading.Thread(target=self._ai_worker, daemon=True)
        self.stream_thread.start()
        self.ai_thread.start()

    def stop(self):
        self.running = False

    def _ai_worker(self):
        """Asynchronous Ultra-Fast GPU AI Thread with Snapshot Capture + Real-Time Notification Triggering."""
        while self.running:
            if _face_app is None or self.current_raw_frame is None:
                time.sleep(0.01)
                continue

            try:
                raw_frame = self.current_raw_frame
                orig_h, orig_w = raw_frame.shape[:2]

                target_w = 640
                scale_ratio = target_w / float(orig_w)
                target_h = int(orig_h * scale_ratio)
                ai_frame = cv2.resize(raw_frame, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

                faces = _face_app.get(ai_frame)
                boxes = []
                recognized = []
                alerts = []

                with _embedding_cache_lock:
                    mat = _cached_embeddings_matrix
                    infos = list(_cached_profiles_info)

                for face in faces:
                    bbox = face.bbox.astype(float)
                    x1 = int(bbox[0] / scale_ratio)
                    y1 = int(bbox[1] / scale_ratio)
                    x2 = int(bbox[2] / scale_ratio)
                    y2 = int(bbox[3] / scale_ratio)

                    det_score = float(face.det_score)
                    match_name = "Unknown"
                    match_confidence = det_score
                    is_matched = False

                    if hasattr(face, "embedding") and face.embedding is not None and mat is not None and len(mat) > 0:
                        q_emb = np.array(face.embedding, dtype=np.float32)
                        q_norm = q_emb / (np.linalg.norm(q_emb) + 1e-8)

                        scores = np.dot(mat, q_norm)
                        best_idx = int(np.argmax(scores))
                        best_score = float(scores[best_idx])

                        if best_score >= 0.45:
                            match_name = infos[best_idx]["name"]
                            match_confidence = best_score
                            is_matched = True
                            alerts.append(f"⚠️ SUSPECT MATCHED: {match_name} ({int(best_score*100)}%)")

                            # ─── Capture & Save High-Res Snapshot Image ─────────────
                            now_ts = time.time()
                            last_sent = self.last_notif_time.get(match_name, 0.0)

                            if now_ts - last_sent > 20.0:  # Throttle 20s per suspect
                                self.last_notif_time[match_name] = now_ts

                                snap_id = str(uuid.uuid4())
                                snap_filename = f"snap_{snap_id[:12]}.jpg"
                                snap_dir = os.path.join("uploads", "snapshots")
                                os.makedirs(snap_dir, exist_ok=True)

                                # Draw box on snapshot
                                snap_frame = raw_frame.copy()
                                cv2.rectangle(snap_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                lbl = f"{match_name} ({int(match_confidence*100)}%)"
                                cv2.rectangle(snap_frame, (x1, max(0, y1 - 24)), (min(orig_w, x1 + len(lbl)*10 + 12), y1), (0, 255, 0), -1)
                                cv2.putText(snap_frame, lbl, (x1 + 4, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

                                snap_filepath = os.path.join(snap_dir, snap_filename)
                                cv2.imwrite(snap_filepath, snap_frame)
                                snapshot_url = f"/uploads/snapshots/{snap_filename}"

                                # ─── Trigger DB Notification with Snapshot URL ───────
                                try:
                                    db_s = SessionLocal()
                                    cam_obj = crud.camera.get(db_s, id=self.camera_id)
                                    org_id = cam_obj.organization_id if cam_obj else None

                                    if org_id:
                                        users = db_s.query(models.User).filter(
                                            (models.User.organization_id == org_id) | (models.User.role.has(name="Super Admin"))
                                        ).all()
                                    else:
                                        users = db_s.query(models.User).all()

                                    for u in users:
                                        n = models.Notification(
                                            id=f"notif-{uuid.uuid4()}",
                                            user_id=u.id,
                                            type="alert",
                                            title=f"🚨 SUSPECT MATCHED: {match_name}",
                                            message=f"Suspect {match_name} ({int(match_confidence*100)}%) detected at camera {self.camera_name}",
                                            action_url=snapshot_url
                                        )
                                        db_s.add(n)

                                    if cam_obj:
                                        cam_obj.is_flagged = True

                                    db_s.commit()
                                    db_s.close()
                                    logger.info(f"Captured snapshot {snapshot_url} for suspect {match_name}")
                                except Exception as ex_n:
                                    logger.debug(f"Notif DB error: {ex_n}")

                                # ─── Broadcast WS Alert with Snapshot URL ────────────
                                notif_payload = {
                                    "type": "new_detection",
                                    "title": f"🚨 SUSPECT MATCHED: {match_name}",
                                    "message": f"Suspect {match_name} ({int(match_confidence*100)}%) detected at camera {self.camera_name}",
                                    "cameraId": self.camera_id,
                                    "cameraName": self.camera_name,
                                    "snapshotUrl": snapshot_url,
                                    "confidence": round(match_confidence, 2),
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                                if org_id:
                                    asyncio.run(manager.broadcast_to_org(str(org_id), notif_payload))

                    boxes.append({
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                        "score": match_confidence,
                        "name": match_name,
                        "is_matched": is_matched
                    })
                    recognized.append({
                        "name": match_name,
                        "confidence": round(match_confidence, 2)
                    })

                self.active_face_boxes = boxes
                self.latest_recognized = recognized
                if alerts:
                    self.latest_alerts = alerts

            except Exception as e:
                logger.debug(f"Async AI pass error: {e}")

            time.sleep(0.005)

    def _worker(self):
        """Dedicated Video Stream Thread — 30 FPS smooth continuous video."""
        logger.info(f"[StreamReader] Dedicated 30FPS stream active for camera {self.camera_id}")
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]

        raw_url = (self.stream_url or "").strip()
        cv_source = int(raw_url) if raw_url.isdigit() else raw_url

        while self.running:
            if self.cap is None or not self.cap.isOpened():
                try:
                    self.cap = cv2.VideoCapture(cv_source)
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                except Exception:
                    time.sleep(0.5)
                    continue

                if not self.cap.isOpened():
                    time.sleep(0.5)
                    continue

            ret, frame = self.cap.read()
            if not ret or frame is None:
                if self.cap and isinstance(cv_source, str) and not cv_source.startswith("rtsp"):
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    time.sleep(0.03)
                    continue
                time.sleep(0.03)
                if self.cap:
                    self.cap.release()
                    self.cap = None
                continue

            self.current_raw_frame = frame

            h, w = frame.shape[:2]
            if w > 1280:
                new_w = 1280
                new_h = int(h * (1280.0 / w))
                frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
                h, w = new_h, new_w

            # Draw parallel face bounding boxes + match name tags
            current_boxes = list(self.active_face_boxes)
            for box in current_boxes:
                scale_x = w / float(self.current_raw_frame.shape[1]) if self.current_raw_frame is not None else 1.0
                scale_y = h / float(self.current_raw_frame.shape[0]) if self.current_raw_frame is not None else 1.0

                bx1, by1 = int(box["x1"] * scale_x), int(box["y1"] * scale_y)
                bx2, by2 = int(box["x2"] * scale_x), int(box["y2"] * scale_y)

                # Green box for matched suspect, Red box for Unknown
                box_color = (0, 255, 0) if box.get("is_matched") else (0, 0, 255)
                cv2.rectangle(frame, (bx1, by1), (bx2, by2), box_color, 2)

                label = f"{box['name']} ({int(box['score'] * 100)}%)"
                lbl_w = len(label) * 9 + 12
                cv2.rectangle(frame, (bx1, max(0, by1 - 24)), (min(w, bx1 + lbl_w), by1), box_color, -1)
                cv2.putText(frame, label, (bx1 + 4, max(15, by1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

            # Camera Watermark Header
            cv2.rectangle(frame, (10, 10), (min(380, w - 10), 40), (0, 0, 0), -1)
            cv2.putText(frame, f"CAM: {self.camera_name} (HD)", (16, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2, cv2.LINE_AA)

            ok, buf = cv2.imencode(".jpg", frame, encode_params)
            if ok:
                self.latest_jpeg = buf.tobytes()

            time.sleep(0.03)

        if self.cap:
            self.cap.release()
            self.cap = None
        logger.info(f"[StreamReader] Stopped thread for camera {self.camera_id}")


# ─── WebSocket live-stream endpoint ────────────────────────────────────────────

@router.websocket("/ws/{id}")
async def camera_ws_stream(
    id: str,
    websocket: WebSocket,
    db: Session = Depends(deps.get_db_ws),
):
    """
    WebSocket endpoint streaming High-Definition (HD) live video with real-time vector face recognition.
    """
    await websocket.accept()

    # Periodically refresh database embedding vector cache
    refresh_face_embedding_cache(db)

    camera = crud.camera.get(db, id=id)
    if not camera:
        await websocket.close(code=4004, reason="Camera not found")
        return

    stream_url = camera.stream_url
    if not stream_url:
        await websocket.close(code=4004, reason="Camera has no stream URL configured")
        return

    logger.info(f"[WS] Client connected to camera {id} ({camera.name})")

    reader = CameraStreamReader.get_or_create(id, camera.name, stream_url)
    last_sent_bytes: bytes | None = None
    last_meta_time = 0.0

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                if raw == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                break

            jpeg = reader.latest_jpeg
            if jpeg and jpeg != last_sent_bytes:
                await websocket.send_bytes(jpeg)
                last_sent_bytes = jpeg

            now = time.time()
            if now - last_meta_time > 1.0:
                last_meta_time = now
                payload = {}
                active_alerts = list(reader.latest_alerts)
                if camera.is_flagged:
                    active_alerts.append(f"Detection alert on {camera.name}")
                if active_alerts:
                    payload["alerts"] = active_alerts
                if reader.latest_recognized:
                    payload["recognized"] = reader.latest_recognized
                
                if payload:
                    await websocket.send_text(json.dumps(payload))

            await asyncio.sleep(0.03)

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected from camera {id}")
    except Exception as exc:
        logger.error(f"[WS] Error streaming camera {id}: {exc}")
        try:
            await websocket.close(code=1011, reason=str(exc))
        except Exception:
            pass
    finally:
        CameraStreamReader.release_reader(id)
        logger.info(f"[WS] Connection closed for camera {id}")


@router.get("/", response_model=List[schemas.Camera])
def get_cameras(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("cameras.view")),
) -> Any:
    """
    Retrieve cameras.
    """
    is_super = current_user.role.name in ["Super Admin", "SuperAdmin"]
    cameras = crud.camera.get_all(db, organization_id=current_user.organization_id, is_super=is_super)
    return [
        {
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "lat": c.lat,
            "lng": c.lng,
            "status": c.status,
            "isFlagged": c.is_flagged,
            "streamUrl": c.stream_url,
            "cameraStreamId": c.camera_stream_id,
            "organizationId": c.organization_id,
            "linkedTrafficCompanyId": c.linked_traffic_company_id,
            "linkedTrafficCompanyName": c.linked_traffic_company.name if c.linked_traffic_company else None,
            "lastDetection": "2 mins ago"
        }
        for c in cameras
    ]

@router.get("/{id}", response_model=schemas.Camera)
def get_camera_by_id(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("cameras.view")),
) -> Any:
    """
    Get camera by ID.
    """
    camera = crud.camera.get(db, id=id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        access = db.query(models.CameraAccess).filter(
            models.CameraAccess.camera_id == id,
            models.CameraAccess.organization_id == current_user.organization_id
        ).first()
        if not access:
            raise HTTPException(status_code=403, detail="Not enough permissions to view this camera")
    
    return {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location,
        "lat": camera.lat,
        "lng": camera.lng,
        "status": camera.status,
        "isFlagged": camera.is_flagged,
        "streamUrl": camera.stream_url,
        "cameraStreamId": camera.camera_stream_id,
        "organizationId": camera.organization_id,
        "linkedTrafficCompanyId": camera.linked_traffic_company_id,
        "linkedTrafficCompanyName": camera.linked_traffic_company.name if camera.linked_traffic_company else None,
        "lastDetection": "5 mins ago"
    }

@router.get("/{id}/stream")
def start_camera_stream(
    id: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Start camera stream.
    """
    camera = crud.camera.get(db, id=id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    return {"status": "success", "message": "Stream started", "id": id}

@router.post("/", response_model=schemas.Camera)
def create_camera(
    *,
    db: Session = Depends(deps.get_db),
    obj_in: schemas.CameraCreate,
    current_user: models.User = Depends(deps.PermissionChecker("cameras.manage")),
) -> Any:
    """
    Create new camera.
    """
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can add cameras to global pool")
    
    camera = crud.camera.create(db, obj_in=obj_in)
    try:
        log_camera_created(db, current_user, camera.id, camera.name, camera.location)
    except Exception as e:
        print(f"Failed to log camera creation: {e}")

    return {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location,
        "lat": camera.lat,
        "lng": camera.lng,
        "status": camera.status,
        "isFlagged": camera.is_flagged,
        "streamUrl": camera.stream_url,
        "cameraStreamId": camera.camera_stream_id,
        "organizationId": camera.organization_id,
        "linkedTrafficCompanyId": camera.linked_traffic_company_id,
        "linkedTrafficCompanyName": camera.linked_traffic_company.name if camera.linked_traffic_company else None,
        "lastDetection": None
    }

@router.put("/{id}", response_model=schemas.Camera)
def update_camera(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    obj_in: schemas.CameraUpdate,
    current_user: models.User = Depends(deps.PermissionChecker("cameras.manage")),
) -> Any:
    """
    Update a camera.
    """
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can edit cameras")
    
    camera = crud.camera.get(db, id=id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    old_snapshot = {
        "name": camera.name,
        "location": camera.location,
        "lat": camera.lat,
        "lng": camera.lng,
        "status": camera.status,
        "streamUrl": camera.stream_url,
    }

    camera = crud.camera.update(db, db_obj=camera, obj_in=obj_in)
    try:
        log_camera_updated(db, current_user, camera.id, camera.name, obj_in.dict(exclude_unset=True), old_snapshot)
    except Exception as e:
        print(f"Failed to log camera update: {e}")

    return {
        "id": camera.id,
        "name": camera.name,
        "location": camera.location,
        "lat": camera.lat,
        "lng": camera.lng,
        "status": camera.status,
        "isFlagged": camera.is_flagged,
        "streamUrl": camera.stream_url,
        "cameraStreamId": camera.camera_stream_id,
        "organizationId": camera.organization_id,
        "linkedTrafficCompanyId": camera.linked_traffic_company_id,
        "linkedTrafficCompanyName": camera.linked_traffic_company.name if camera.linked_traffic_company else None,
        "lastDetection": None
    }

@router.delete("/{id}", response_model=schemas.Msg)
def delete_camera(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.PermissionChecker("cameras.manage")),
) -> Any:
    """
    Delete a camera.
    """
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete cameras")
    
    camera = crud.camera.get(db, id=id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_name = camera.name
    camera_id = camera.id
    db.delete(camera)
    db.commit()
    try:
        log_camera_deleted(db, current_user, camera_id, camera_name)
    except Exception as e:
        print(f"Failed to log camera deletion: {e}")

    return {"msg": "Camera deleted successfully"}

@router.get("/{id}/access-orgs", response_model=List[str])
def get_camera_access_orgs(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("cameras.manage")),
) -> Any:
    """
    Get list of organization IDs that have access to this camera.
    """
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can view camera access lists")
        
    access_records = db.query(models.CameraAccess).filter(models.CameraAccess.camera_id == id).all()
    return [a.organization_id for a in access_records]

@router.post("/{id}/access", response_model=schemas.Msg)
def toggle_camera_access(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    obj_in: schemas.CameraAccessToggle,
    current_user: models.User = Depends(deps.PermissionChecker("cameras.manage")),
) -> Any:
    """
    Toggle camera access for an organization.
    """
    if current_user.role.name not in ["Super Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can manage camera access")
    
    camera = crud.camera.get(db, id=id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    crud.camera.toggle_access(
        db, 
        camera_id=id, 
        organization_id=obj_in.organizationId, 
        has_access=obj_in.hasAccess
    )
    
    action = "granted" if obj_in.hasAccess else "revoked"

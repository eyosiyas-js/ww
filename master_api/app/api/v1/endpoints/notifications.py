from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.db.session import SessionLocal
from jose import jwt
from app.core.config import settings
from app.core.websockets import manager

router = APIRouter()

@router.get("/", response_model=List[schemas.Notification])
def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("notifications.view")),
) -> Any:
    """
    Retrieve user notifications.
    """
    notifs = crud.notification.get_user_notifications(db, user_id=current_user.id)
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "read": n.read,
            "actionUrl": n.action_url,
            "timestamp": n.created_at.isoformat()
        }
        for n in notifs
    ]

@router.patch("/{id}/read", response_model=schemas.Notification)
def mark_read(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("notifications.view")),
) -> Any:
    """
    Mark notification as read.
    """
    notif = crud.notification.mark_as_read(db, id=id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {
        "id": notif.id,
        "type": notif.type,
        "title": notif.title,
        "message": notif.message,
        "read": notif.read,
        "actionUrl": notif.action_url,
        "timestamp": notif.created_at.isoformat()
    }

@router.patch("/read-all", response_model=schemas.Msg)
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("notifications.view")),
) -> Any:
    """
    Mark all notifications as read.
    """
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read == False
    ).all()
    for n in notifs:
        n.read = True
    db.commit()
    return {"msg": f"Marked {len(notifs)} as read"}

@router.delete("/{id}", response_model=schemas.Msg)
def delete_notification(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("notifications.view")),
) -> Any:
    """
    Delete notification.
    """
    crud.notification.delete(db, id=id)
    return {"msg": "Notification deleted"}

@router.delete("/", response_model=schemas.Msg)
def clear_all(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.PermissionChecker("notifications.view")),
) -> Any:
    """
    Clear all notifications.
    """
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id).delete()
    db.commit()
    return {"msg": "Notifications cleared"}

@router.websocket("/ws")
async def websocket_notifications(
    websocket: WebSocket,
    token: str
):
    await websocket.accept()
    db = SessionLocal()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
        user = db.query(models.User).filter(models.User.id == token_data.sub).first()
        if not user or user.status != "active":
            await websocket.close(code=1008)
            return

        permissions = user.role.permissions if user.role and user.role.permissions else []
        is_super = user.role.name in ["Super Admin", "Admin"] if user.role else False
        if not (is_super or "*" in permissions or "notifications.view" in permissions):
            await websocket.close(code=1008)
            return
            
        # Store needed info before closing DB
        org_id = str(user.organization_id or "global")

    except Exception:
        await websocket.close(code=1008)
        return
    finally:
        db.close()

    await manager.connect_accepted(websocket, org_id, user_id=token_data.sub)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id, user_id=token_data.sub)

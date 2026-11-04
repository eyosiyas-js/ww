from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.utility import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate

class CRUDNotification:
    def get_user_notifications(self, db: Session, user_id: str, limit: int = 20) -> List[Notification]:
        return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit).all()

    def mark_as_read(self, db: Session, id: str) -> Optional[Notification]:
        notif = db.query(Notification).filter(Notification.id == id).first()
        if notif:
            notif.read = True
            db.commit()
            db.refresh(notif)
        return notif

    def delete(self, db: Session, id: str):
        db.query(Notification).filter(Notification.id == id).delete()
        db.commit()

notification = CRUDNotification()

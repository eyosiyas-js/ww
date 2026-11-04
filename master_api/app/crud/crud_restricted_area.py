import uuid
import struct
import numpy as np
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.restricted_area import RestrictedAreaPerson
from app.schemas.restricted_area import RestrictedAreaPersonCreate, RestrictedAreaPersonUpdate


def get(db: Session, person_id: str) -> Optional[RestrictedAreaPerson]:
    return db.query(RestrictedAreaPerson).filter(RestrictedAreaPerson.id == person_id).first()


def get_all(db: Session, skip: int = 0, limit: int = 200, active_only: bool = False):
    q = db.query(RestrictedAreaPerson)
    if active_only:
        q = q.filter(RestrictedAreaPerson.is_active == True)
    return q.offset(skip).limit(limit).all()


def get_by_camera(db: Session, camera_id: str) -> List[RestrictedAreaPerson]:
    """Return all active persons authorized for a given camera."""
    persons = db.query(RestrictedAreaPerson).filter(
        RestrictedAreaPerson.is_active == True,
        RestrictedAreaPerson.face_embedding.isnot(None)
    ).all()
    return [p for p in persons if camera_id in (p.authorized_cameras or [])]


def create(db: Session, obj_in: RestrictedAreaPersonCreate, face_embedding: Optional[bytes] = None) -> RestrictedAreaPerson:
    data = obj_in.model_dump(exclude={"profile_photo_b64"})
    db_obj = RestrictedAreaPerson(
        id=str(uuid.uuid4()),
        **data,
        face_embedding=face_embedding
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, db_obj: RestrictedAreaPerson, obj_in: RestrictedAreaPersonUpdate, face_embedding: Optional[bytes] = None) -> RestrictedAreaPerson:
    update_data = obj_in.model_dump(exclude_none=True, exclude={"profile_photo_b64"})
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    if face_embedding is not None:
        db_obj.face_embedding = face_embedding
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, person_id: str) -> Optional[RestrictedAreaPerson]:
    obj = db.query(RestrictedAreaPerson).filter(RestrictedAreaPerson.id == person_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj


def match_face(db: Session, camera_id: str, query_embedding_bytes: bytes, threshold: float = 0.45):
    """
    Compare a face embedding against all authorized persons for a camera.
    Returns (matched_person_or_None, confidence, is_authorized).
    """
    query_emb = np.frombuffer(query_embedding_bytes, dtype=np.float32)
    q_norm = query_emb / (np.linalg.norm(query_emb) + 1e-8)

    # All active persons with embeddings
    all_persons = db.query(RestrictedAreaPerson).filter(
        RestrictedAreaPerson.is_active == True,
        RestrictedAreaPerson.face_embedding.isnot(None)
    ).all()

    best_score = -1.0
    best_person = None

    for person in all_persons:
        try:
            n = len(person.face_embedding) // 4
            db_emb = np.array(struct.unpack(f"{n}f", person.face_embedding), dtype=np.float32)
            db_norm = db_emb / (np.linalg.norm(db_emb) + 1e-8)
            score = float(np.dot(q_norm, db_norm))
            if score > best_score:
                best_score = score
                best_person = person
        except Exception:
            continue

    if best_person and best_score >= threshold:
        is_authorized = camera_id in (best_person.authorized_cameras or [])
        return best_person, round(best_score, 4), is_authorized

    return None, round(max(best_score, 0.0), 4), False

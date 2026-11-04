from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base, TimestampMixin


class FingerprintMatchHistory(Base, TimestampMixin):
    """
    Persists every successful fingerprint match for history, analytics, and audit.
    The fingerprint image and face photo are stored as base64 text so no separate
    file storage is required.
    """
    __tablename__ = "fingerprint_match_history"

    id = Column(String, primary_key=True, index=True)

    # Who ran the match
    user_id = Column(String, ForeignKey("user.id"), nullable=False, index=True)
    organization_id = Column(String, ForeignKey("organization.id"), nullable=False, index=True)

    # Matched person details (denormalised from the external biometric service)
    matched_name = Column(String, nullable=False)
    matched_dob = Column(String, nullable=True)       # date of birth as returned by API
    matched_gender = Column(String, nullable=True)
    matched_nationality = Column(String, nullable=True)
    match_score = Column(Float, nullable=False)
    remark = Column(Text, nullable=True)

    # Images stored as base64 strings
    fingerprint_image_b64 = Column(Text, nullable=True)   # the uploaded fingerprint scan
    face_photo_b64 = Column(Text, nullable=True)          # profile photo from biometric DB
    raw_fingerprint_b64 = Column(Text, nullable=True)     # processed fingerprint from API

    # Relationships
    user = relationship("User")
    organization = relationship("Organization")

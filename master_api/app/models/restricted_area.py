from sqlalchemy import Column, String, Boolean, JSON, DateTime, Text, LargeBinary
from app.db.base_class import Base
from app.models.utility import TimestampMixin


class RestrictedAreaPerson(Base, TimestampMixin):
    """
    Restricted Area Authorized Person - completely separate from criminal/NationalID system.
    Used only for access control: determines who is allowed in which camera zones.
    """
    __tablename__ = "restricted_area_person"

    id = Column(String, primary_key=True, index=True)

    # Identity
    full_name = Column(String, nullable=False, index=True)
    employee_id = Column(String, nullable=True, index=True)  # Staff/badge ID
    role = Column(String, nullable=False)        # e.g. "Security Guard", "Manager", "Staff"
    department = Column(String, nullable=True)   # e.g. "Operations", "Finance"
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)

    # Access control
    authorized_cameras = Column(JSON, nullable=False, default=list)  # List of camera IDs
    access_level = Column(String, default="standard")  # standard, elevated, admin
    is_active = Column(Boolean, default=True)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Photo & biometrics
    profile_photo_url = Column(String, nullable=True)
    face_embedding = Column(LargeBinary, nullable=True)  # InsightFace ArcFace embedding

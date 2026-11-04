"""
Centralized audit logging utilities.
Provides functions to log user actions and system events across all modules.

Every update function accepts an `old_obj` snapshot so the log records
exactly which fields changed, their previous value, and their new value.
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.models.audit_log import AuditLog
from app.models.user import User

# ── Field label maps (snake_case → human-readable) ───────────────────────────
_DETECTION_LABELS: Dict[str, str] = {
    "name": "Name",
    "description": "Description",
    "age": "Age",
    "location": "Location",
    "category": "Category",
    "subcategory": "Subcategory",
    "crime_type": "Crime Type",
    "crimeType": "Crime Type",
    "status": "Status",
    "image_urls": "Images",
    "imageUrls": "Images",
    "plate_number": "Plate Number",
    "plateNumber": "Plate Number",
    "code": "Code",
    "region": "Region",
    "eligible_for_assignment": "Eligible for Assignment",
    "eligibleForAssignment": "Eligible for Assignment",
    "form_template_id": "Form Template",
    "formTemplateId": "Form Template",
    "dynamic_data": "Additional Fields",
    "dynamicData": "Additional Fields",
}

_USER_LABELS: Dict[str, str] = {
    "full_name": "Full Name",
    "name": "Full Name",
    "email": "Email",
    "status": "Status",
    "role": "Role",
    "role_id": "Role",
    "organization_id": "Company",
    "companyId": "Company",
}

_CAMERA_LABELS: Dict[str, str] = {
    "name": "Name",
    "location": "Location",
    "lat": "Latitude",
    "lng": "Longitude",
    "status": "Status",
    "stream_url": "Stream URL",
    "streamUrl": "Stream URL",
    "camera_stream_id": "Stream ID",
    "linked_traffic_company_id": "Linked Traffic Company",
}

_COMPANY_LABELS: Dict[str, str] = {
    "name": "Name",
    "status": "Status",
    "parent_id": "Parent Company",
    "parentId": "Parent Company",
    "company_type": "Company Type",
    "features": "Features",
}

_ROLE_LABELS: Dict[str, str] = {
    "name": "Name",
    "permissions": "Permissions",
    "description": "Description",
}

_FORM_LABELS: Dict[str, str] = {
    "name": "Name",
    "description": "Description",
    "is_active": "Active",
    "isActive": "Active",
    "detection_type": "Detection Type",
    "detectionType": "Detection Type",
    "fields": "Fields",
}


def _build_field_diff(
    new_data: Dict[str, Any],
    old_obj: Any,
    label_map: Dict[str, str],
    skip_fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Compare new_data (dict of submitted values) against old_obj (SQLAlchemy model
    or plain dict) and return a list of changed-field records:
        [{"field": "Name", "from": "old", "to": "new"}, ...]

    Only fields that actually changed are included.
    """
    skip = set(skip_fields or [])
    changes: List[Dict[str, Any]] = []

    for key, new_val in new_data.items():
        if key in skip:
            continue

        # Resolve old value from model attribute or dict key
        if isinstance(old_obj, dict):
            old_val = old_obj.get(key)
        else:
            # Try snake_case first, then camelCase
            snake = _to_snake(key)
            old_val = getattr(old_obj, snake, getattr(old_obj, key, None))

        # Normalise for comparison
        if str(old_val) == str(new_val):
            continue
        if old_val is None and new_val is None:
            continue

        label = label_map.get(key, key.replace("_", " ").title())
        changes.append({"field": label, "from": _fmt(old_val), "to": _fmt(new_val)})

    return changes


def _to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    import re
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def _fmt(val: Any) -> str:
    """Format a value for display in the audit log."""
    if val is None:
        return "—"
    if isinstance(val, bool):
        return "Yes" if val else "No"
    if isinstance(val, list):
        return f"[{len(val)} items]"
    if isinstance(val, dict):
        return f"{{{len(val)} keys}}"
    return str(val)


def _build_description(action_type: str, entity_label: str, entity_name: str, changes: List[Dict]) -> str:
    """Build a rich human-readable description."""
    if action_type == "update" and changes:
        field_names = ", ".join(c["field"] for c in changes)
        return f"Updated {entity_label} '{entity_name}' — changed: {field_names}"
    return f"{action_type.replace('_', ' ').capitalize()} {entity_label}: {entity_name}"


# ── Core log_activity ─────────────────────────────────────────────────────────

def log_activity(
    db: Session,
    action_type: str,
    module: str,
    description: str,
    user: Optional[User] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "success",
    error_message: Optional[str] = None,
) -> AuditLog:
    if user:
        user_id = user.id
        user_name = user.full_name
        user_email = user.email
        if not organization_id:
            organization_id = user.organization_id
        organization_name = user.organization.name if user.organization else None
    else:
        user_name = None
        user_email = None
        organization_name = None

    log_entry = AuditLog(
        id=f"audit-{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        user_name=user_name,
        user_email=user_email,
        organization_id=organization_id,
        organization_name=organization_name,
        action_type=action_type,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
        extra_data=extra_data,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        error_message=error_message,
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


# ── Auth ──────────────────────────────────────────────────────────────────────

def log_login(db: Session, user: User, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
    return log_activity(
        db=db, action_type="login", module="auth",
        description=f"{user.full_name} logged in",
        user=user, ip_address=ip_address, user_agent=user_agent,
    )


def log_logout(db: Session, user: User, ip_address: Optional[str] = None):
    return log_activity(
        db=db, action_type="logout", module="auth",
        description=f"{user.full_name} logged out",
        user=user, ip_address=ip_address,
    )


# ── Detections ────────────────────────────────────────────────────────────────

def log_detection_created(db: Session, user: User, detection_id: str, detection_name: str, category: str):
    return log_activity(
        db=db, action_type="create", module="detection",
        entity_type=category, entity_id=detection_id, entity_name=detection_name,
        description=f"Submitted new {category} detection: '{detection_name}'",
        user=user,
        extra_data={"category": category},
    )


def log_detection_updated(
    db: Session,
    user: User,
    detection_id: str,
    detection_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    """
    Log a detection edit with full field-level diff.
    Pass `old_obj` (the SQLAlchemy model snapshot before update) to get
    before/after values for every changed field.
    """
    changes = _build_field_diff(new_data, old_obj, _DETECTION_LABELS) if old_obj else []
    description = _build_description("update", "detection", detection_name, changes)

    return log_activity(
        db=db, action_type="update", module="detection",
        entity_id=detection_id, entity_name=detection_name,
        description=description,
        user=user,
        extra_data={"changes": changes, "fields_submitted": list(new_data.keys())},
    )


def log_detection_deleted(db: Session, user: User, detection_id: str, detection_name: str):
    return log_activity(
        db=db, action_type="delete", module="detection",
        entity_id=detection_id, entity_name=detection_name,
        description=f"Deleted detection: '{detection_name}'",
        user=user,
    )


def log_detection_assigned(db: Session, user: User, detection_id: str, detection_name: str, assignee_name: str):
    return log_activity(
        db=db, action_type="assign", module="detection",
        entity_id=detection_id, entity_name=detection_name,
        description=f"Assigned detection '{detection_name}' to {assignee_name}",
        user=user,
        extra_data={"assignee": assignee_name},
    )


def log_detection_status_change(
    db: Session, user: User,
    detection_id: str, detection_name: str,
    old_status: str, new_status: str,
):
    return log_activity(
        db=db, action_type="status_change", module="detection",
        entity_id=detection_id, entity_name=detection_name,
        description=f"Changed detection '{detection_name}' status: {old_status} → {new_status}",
        user=user,
        extra_data={
            "changes": [{"field": "Status", "from": old_status, "to": new_status}],
            "old_status": old_status,
            "new_status": new_status,
        },
    )


# ── Users ─────────────────────────────────────────────────────────────────────

def log_user_created(db: Session, actor: User, new_user_id: str, new_user_name: str, new_user_email: str):
    return log_activity(
        db=db, action_type="create", module="user",
        entity_id=new_user_id, entity_name=new_user_name,
        description=f"Created user: {new_user_name} ({new_user_email})",
        user=actor,
        extra_data={"email": new_user_email},
    )


def log_user_updated(
    db: Session,
    actor: User,
    target_user_id: str,
    target_user_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    changes = _build_field_diff(new_data, old_obj, _USER_LABELS, skip_fields=["password"]) if old_obj else []
    description = _build_description("update", "user", target_user_name, changes)

    return log_activity(
        db=db, action_type="update", module="user",
        entity_id=target_user_id, entity_name=target_user_name,
        description=description,
        user=actor,
        extra_data={"changes": changes},
    )


def log_user_deleted(db: Session, actor: User, target_user_id: str, target_user_name: str):
    return log_activity(
        db=db, action_type="delete", module="user",
        entity_id=target_user_id, entity_name=target_user_name,
        description=f"Deleted user: '{target_user_name}'",
        user=actor,
    )


# ── Cameras ───────────────────────────────────────────────────────────────────

def log_camera_created(db: Session, user: User, camera_id: str, camera_name: str, location: Optional[str] = None):
    return log_activity(
        db=db, action_type="create", module="camera",
        entity_id=camera_id, entity_name=camera_name,
        description=f"Added camera: '{camera_name}'" + (f" at {location}" if location else ""),
        user=user,
        extra_data={"location": location},
    )


def log_camera_updated(
    db: Session,
    user: User,
    camera_id: str,
    camera_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    changes = _build_field_diff(new_data, old_obj, _CAMERA_LABELS) if old_obj else []
    description = _build_description("update", "camera", camera_name, changes)

    return log_activity(
        db=db, action_type="update", module="camera",
        entity_id=camera_id, entity_name=camera_name,
        description=description,
        user=user,
        extra_data={"changes": changes},
    )


def log_camera_deleted(db: Session, user: User, camera_id: str, camera_name: str):
    return log_activity(
        db=db, action_type="delete", module="camera",
        entity_id=camera_id, entity_name=camera_name,
        description=f"Deleted camera: '{camera_name}'",
        user=user,
    )


# ── Companies ─────────────────────────────────────────────────────────────────

def log_company_created(db: Session, user: User, company_id: str, company_name: str, company_type: Optional[str] = None):
    return log_activity(
        db=db, action_type="create", module="company",
        entity_id=company_id, entity_name=company_name,
        description=f"Created company: '{company_name}'" + (f" ({company_type})" if company_type else ""),
        user=user,
        extra_data={"company_type": company_type},
    )


def log_company_updated(
    db: Session,
    user: User,
    company_id: str,
    company_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    changes = _build_field_diff(new_data, old_obj, _COMPANY_LABELS) if old_obj else []
    description = _build_description("update", "company", company_name, changes)

    return log_activity(
        db=db, action_type="update", module="company",
        entity_id=company_id, entity_name=company_name,
        description=description,
        user=user,
        extra_data={"changes": changes},
    )


def log_company_deleted(db: Session, user: User, company_id: str, company_name: str):
    return log_activity(
        db=db, action_type="delete", module="company",
        entity_id=company_id, entity_name=company_name,
        description=f"Deleted company: '{company_name}'",
        user=user,
    )


# ── Roles ─────────────────────────────────────────────────────────────────────

def log_role_created(db: Session, user: User, role_id: str, role_name: str, permissions: Optional[List[str]] = None):
    return log_activity(
        db=db, action_type="create", module="role",
        entity_id=role_id, entity_name=role_name,
        description=f"Created role: '{role_name}'" + (f" with {len(permissions)} permissions" if permissions else ""),
        user=user,
        extra_data={"permissions": permissions},
    )


def log_role_updated(
    db: Session,
    user: User,
    role_id: str,
    role_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    changes = _build_field_diff(new_data, old_obj, _ROLE_LABELS) if old_obj else []
    description = _build_description("update", "role", role_name, changes)

    return log_activity(
        db=db, action_type="update", module="role",
        entity_id=role_id, entity_name=role_name,
        description=description,
        user=user,
        extra_data={"changes": changes},
    )


def log_role_deleted(db: Session, user: User, role_id: str, role_name: str):
    return log_activity(
        db=db, action_type="delete", module="role",
        entity_id=role_id, entity_name=role_name,
        description=f"Deleted role: '{role_name}'",
        user=user,
    )


# ── Settings ──────────────────────────────────────────────────────────────────

def log_settings_changed(db: Session, user: User, setting_key: str, old_value: Any, new_value: Any):
    return log_activity(
        db=db, action_type="update", module="settings",
        entity_id=setting_key, entity_name=setting_key,
        description=f"Changed setting '{setting_key}': {_fmt(old_value)} → {_fmt(new_value)}",
        user=user,
        extra_data={
            "changes": [{"field": setting_key, "from": _fmt(old_value), "to": _fmt(new_value)}],
            "old_value": old_value,
            "new_value": new_value,
        },
    )


# ── Form Templates ────────────────────────────────────────────────────────────

def log_form_created(db: Session, user: User, form_id: str, form_name: str, detection_type: Optional[str] = None):
    return log_activity(
        db=db, action_type="create", module="form_template",
        entity_id=form_id, entity_name=form_name,
        description=f"Created form template: '{form_name}'" + (f" for {detection_type} detections" if detection_type else ""),
        user=user,
        extra_data={"detection_type": detection_type},
    )


def log_form_updated(
    db: Session,
    user: User,
    form_id: str,
    form_name: str,
    new_data: Dict[str, Any],
    old_obj: Any = None,
):
    changes = _build_field_diff(new_data, old_obj, _FORM_LABELS) if old_obj else []
    description = _build_description("update", "form template", form_name, changes)

    return log_activity(
        db=db, action_type="update", module="form_template",
        entity_id=form_id, entity_name=form_name,
        description=description,
        user=user,
        extra_data={"changes": changes},
    )


def log_form_deleted(db: Session, user: User, form_id: str, form_name: str):
    return log_activity(
        db=db, action_type="delete", module="form_template",
        entity_id=form_id, entity_name=form_name,
        description=f"Deleted form template: '{form_name}'",
        user=user,
    )


# ── Traffic / Officers ────────────────────────────────────────────────────────

def log_traffic_alert_created(db: Session, user: User, alert_id: str, alert_description: str):
    return log_activity(
        db=db, action_type="create", module="traffic",
        entity_id=alert_id, entity_name=alert_description,
        description=f"Created traffic alert: {alert_description}",
        user=user,
    )


def log_officer_location_update(db: Session, user: User, officer_name: str, location: str):
    return log_activity(
        db=db, action_type="update", module="officer",
        entity_name=officer_name,
        description=f"Officer {officer_name} updated location to {location}",
        user=user,
    )

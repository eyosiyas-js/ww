"""
Diagnostic script: WHY are no officers being assigned?
Checks every layer of the dispatch pipeline.
"""
import sys
import os
import math

# Force UTF-8 output on Windows
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.operational import OfficerLocation, Camera, CameraAccess, Detection, DetectionAssignment
from app.models.organization_role import Organization
from app.models.user import User

db: Session = SessionLocal()

print("=" * 70)
print("  DISPATCH DIAGNOSTIC REPORT")
print("=" * 70)

# 1. Organizations
print("\n--- 1. ORGANIZATIONS ---")
orgs = db.query(Organization).all()
for o in orgs:
    print(f"  ID: {o.id}  |  Name: {o.name}  |  Type: {o.company_type}  |  Status: {o.status}")
traffic_orgs = [o for o in orgs if o.company_type == "traffic_police"]
print(f"\n  -> Traffic Police orgs found: {len(traffic_orgs)}")
if not traffic_orgs:
    print("  [CRITICAL] No organizations with company_type='traffic_police' exist!")
else:
    for o in traffic_orgs:
        print(f"    - {o.name} (ID: {o.id}, Status: {o.status})")

# 2. Users in Traffic Orgs
print("\n--- 2. USERS IN TRAFFIC POLICE ORGS ---")
for org in traffic_orgs:
    users = db.query(User).filter(User.organization_id == org.id).all()
    print(f"  Org '{org.name}' has {len(users)} users:")
    for u in users:
        print(f"    - {u.full_name} (ID: {u.id}, Role: {u.role.name if u.role else 'None'}, Status: {u.status})")

# 3. Officer Locations
print("\n--- 3. OFFICER LOCATIONS (all rows) ---")
all_locs = db.query(OfficerLocation).all()
print(f"  Total OfficerLocation rows: {len(all_locs)}")
if len(all_locs) == 0:
    print("  [CRITICAL] No OfficerLocation records exist at all!")
    print("     This means NO officer has ever sent a location update.")
    print("     The mobile app must call POST /officers/location to register.")
else:
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    for loc in all_locs:
        is_stale = loc.last_seen < five_mins_ago if loc.last_seen else True
        status_icon = "[ONLINE]" if loc.is_online and not is_stale else "[OFFLINE/STALE]"
        print(f"  {status_icon} User: {loc.user_id}  |  Org: {loc.organization_id}  |  Online: {loc.is_online}  |  Lat: {loc.lat}  |  Lng: {loc.lng}  |  Last Seen: {loc.last_seen}")
        if is_stale:
            print(f"      [WARN] STALE: last_seen is older than 5 minutes (cutoff: {five_mins_ago})")
        if not loc.is_online:
            print(f"      [WARN] OFFLINE: is_online=False, will be excluded from dispatch")

# 4. Cameras
print("\n--- 4. CAMERAS (lat/lng & linked traffic company) ---")
all_cameras = db.query(Camera).all()
for c in all_cameras:
    has_coords = bool(c.lat and c.lng)
    print(f"  Camera: {c.name} (ID: {c.id})  |  Lat: {c.lat}  |  Lng: {c.lng}  |  HasCoords: {has_coords}  |  Owner Org: {c.organization_id}  |  Linked Traffic: {c.linked_traffic_company_id}")
    if not has_coords:
        print(f"    [WARN] Camera has no lat/lng -- dispatch CANNOT work for this camera")

# 5. Camera Access
print("\n--- 5. CAMERA ACCESS GRANTS ---")
all_access = db.query(CameraAccess).all()
for a in all_access:
    print(f"  Camera: {a.camera_id}  ->  Org: {a.organization_id}")

# 6. Recent Detections
print("\n--- 6. RECENT DETECTIONS (last 5) ---")
recent_dets = db.query(Detection).order_by(Detection.updated_at.desc()).limit(5).all()
for d in recent_dets:
    print(f"  ID: {d.id[:20]}...  |  Category: {d.category}  |  AssignType: {d.assignment_type}  |  HandlingStatus: {d.handling_status}  |  AssignedCompany: {d.assigned_company_id}  |  Org: {d.organization_id}  |  EligibleForAssignment: {d.eligible_for_assignment}  |  AllowExternal: {d.allow_external_assignment}")

# 7. Detection Assignments
print("\n--- 7. DETECTION ASSIGNMENTS (all) ---")
all_assignments = db.query(DetectionAssignment).all()
print(f"  Total assignments: {len(all_assignments)}")
for a in all_assignments:
    print(f"  ASG: {a.id}  |  Detection: {a.detection_id}  |  User: {a.user_id}  |  Status: {a.status}  |  Distance: {a.distance_at_assignment}")

# 8. Distance Check
print("\n--- 8. DISTANCE ANALYSIS ---")
if all_locs and all_cameras:
    def haversine_km(lat1, lng1, lat2, lng2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2)
        return R * 2 * math.asin(math.sqrt(a))

    for cam in all_cameras:
        if not cam.lat or not cam.lng:
            continue
        print(f"\n  Camera '{cam.name}' ({cam.lat}, {cam.lng}):")
        for loc in all_locs:
            if not loc.lat or not loc.lng:
                continue
            dist = haversine_km(cam.lat, cam.lng, loc.lat, loc.lng)
            if dist <= 2.0:
                tag = "[OK] IN RANGE (2km)"
            elif dist <= 5.0:
                tag = "[WARN] IN RANGE (5km only)"
            else:
                tag = "[FAIL] OUT OF RANGE"
            print(f"    -> Officer {loc.user_id}: {dist:.2f} km  |  {tag}")
else:
    print("  [WARN] Cannot compute distances -- missing location data or cameras")

print("\n" + "=" * 70)
print("  END OF DIAGNOSTIC REPORT")
print("=" * 70)

db.close()

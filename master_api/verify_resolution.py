"""Verify the resolution time calculations by examining actual detection data."""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal
from app import models
import datetime

db = SessionLocal()

closed = db.query(models.Detection).filter(
    models.Detection.handling_status.in_(["resolved", "failed"])
).all()

print(f"Total closed detections: {len(closed)}")
print("=" * 100)

creation_hours = []
detection_hours = []

for d in closed:
    if not d.updated_at or not d.created_at:
        continue
    
    creation_diff = (d.updated_at - d.created_at).total_seconds() / 3600
    creation_hours.append(creation_diff)
    
    # Find earliest detection event
    events = d.detection_events if isinstance(d.detection_events, list) else []
    earliest_ts = None
    for evt in events:
        ts_str = evt.get("timestamp") if isinstance(evt, dict) else None
        if ts_str:
            try:
                ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if ts.tzinfo:
                    ts = ts.replace(tzinfo=None)
                if earliest_ts is None or ts < earliest_ts:
                    earliest_ts = ts
            except:
                continue
    
    det_diff = None
    if earliest_ts:
        det_diff = (d.updated_at - earliest_ts).total_seconds() / 3600
        detection_hours.append(det_diff)
    
    print(f"ID: {d.id[:12]}... | Status: {d.handling_status:8s}")
    print(f"  created_at:       {d.created_at}")
    print(f"  updated_at:       {d.updated_at}")
    print(f"  first_event_ts:   {earliest_ts or 'NO EVENTS'}")
    print(f"  creation→close:   {creation_diff:.2f}h")
    print(f"  detection→close:  {f'{det_diff:.2f}h' if det_diff is not None else 'N/A (no events)'}")
    if earliest_ts:
        gap = (earliest_ts - d.created_at).total_seconds() / 60
        print(f"  gap (created→detected): {gap:.1f} minutes")
    print()

print("=" * 100)
if creation_hours:
    print(f"Avg Creation→Close:  {sum(creation_hours)/len(creation_hours):.1f}h  (from {len(creation_hours)} detections)")
if detection_hours:
    print(f"Avg Detection→Close: {sum(detection_hours)/len(detection_hours):.1f}h  (from {len(detection_hours)} detections)")
    print(f"\nNote: {len(creation_hours) - len(detection_hours)} detections had no camera events (manual-only)")

db.close()

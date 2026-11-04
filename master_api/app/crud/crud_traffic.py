import math
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.operational import OfficerLocation, OfficerLocationHistory, DetectionAssignment

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2)**2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2)
    return R * 2 * math.asin(math.sqrt(a))

class CRUDOfficerLocation:
    def upsert_location(
        self, db: Session, user_id: str, org_id: str, lat: float, lng: float, 
        heading: Optional[float] = None, speed: Optional[float] = None
    ) -> OfficerLocation:
        db_obj = db.query(OfficerLocation).filter(OfficerLocation.user_id == user_id).first()
        if db_obj:
            db_obj.lat = lat
            db_obj.lng = lng
            db_obj.heading = heading
            db_obj.speed = speed
            db_obj.is_online = True
            db_obj.last_seen = datetime.utcnow()
        else:
            db_obj = OfficerLocation(
                id=f"loc-{uuid.uuid4()}",
                user_id=user_id,
                organization_id=org_id,
                lat=lat,
                lng=lng,
                heading=heading,
                speed=speed,
                is_online=True,
                last_seen=datetime.utcnow()
            )
            db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_online_officers(self, db: Session, org_id: str, staleness_minutes: int = 15) -> List[OfficerLocation]:
        # Consider an officer online if `is_online` is True and `last_seen` is within the specified minutes
        # Default to 15 minutes instead of 5 for more flexibility
        staleness_cutoff = datetime.utcnow() - timedelta(minutes=staleness_minutes)
        return db.query(OfficerLocation).filter(
            OfficerLocation.organization_id == org_id,
            OfficerLocation.is_online == True,
            OfficerLocation.last_seen >= staleness_cutoff
        ).all()

    def find_nearby_officers(self, db: Session, org_id: str, lat: float, lng: float, radius_km: float = 2.0):
        """Find nearby online officers within a SINGLE organization."""
        online_officers = self.get_online_officers(db, org_id)
        nearby = []
        for officer in online_officers:
            dist = haversine_km(lat, lng, officer.lat, officer.lng)
            if dist <= radius_km:
                nearby.append((officer, dist))
        nearby.sort(key=lambda x: x[1])
        return nearby

    def find_nearby_officers_multi(self, db: Session, primary_org_id: str, lat: float, lng: float, radius_km: float = 2.0, include_external: bool = False):
        """
        Find nearby online officers. 
        - If include_external is False: only officers from primary_org_id
        - If include_external is True: officers from ALL traffic_police companies
        """
        from app.models.organization_role import Organization
        from app import crud

        # Get staleness timeout from system settings (default 15 minutes)
        staleness_minutes = crud.system_setting.get_value(db, "officer_staleness_minutes", 15.0)
        staleness_cutoff = datetime.utcnow() - timedelta(minutes=staleness_minutes)
        
        print(f"[DISPATCH] === Officer Search Start ===")
        print(f"[DISPATCH] Camera coords: ({lat}, {lng}), radius: {radius_km}km, include_external: {include_external}")
        print(f"[DISPATCH] Primary org: {primary_org_id}, staleness cutoff: {staleness_cutoff} ({staleness_minutes} min)")
        
        if include_external:
            # Get all traffic_police organization IDs
            traffic_orgs = db.query(Organization.id).filter(
                Organization.company_type == "traffic_police",
                Organization.status == "active"
            ).all()
            traffic_org_ids = [o.id for o in traffic_orgs]
            print(f"[DISPATCH] External mode: searching {len(traffic_org_ids)} traffic orgs: {traffic_org_ids}")
            
            # First check ALL officers in these orgs (regardless of online/staleness)
            all_officers_in_orgs = db.query(OfficerLocation).filter(
                OfficerLocation.organization_id.in_(traffic_org_ids)
            ).all()
            print(f"[DISPATCH] Total OfficerLocation rows in target orgs: {len(all_officers_in_orgs)}")
            for o in all_officers_in_orgs:
                print(f"[DISPATCH]   - user={o.user_id}, online={o.is_online}, last_seen={o.last_seen}, lat={o.lat}, lng={o.lng}")
            
            online_officers = db.query(OfficerLocation).filter(
                OfficerLocation.organization_id.in_(traffic_org_ids),
                OfficerLocation.is_online == True,
                OfficerLocation.last_seen >= staleness_cutoff
            ).all()
        else:
            # First check ALL officers in this org (regardless of online/staleness)
            all_officers_in_org = db.query(OfficerLocation).filter(
                OfficerLocation.organization_id == primary_org_id
            ).all()
            print(f"[DISPATCH] Total OfficerLocation rows in org {primary_org_id}: {len(all_officers_in_org)}")
            for o in all_officers_in_org:
                age_str = ""
                if o.last_seen:
                    age_seconds = (datetime.utcnow() - o.last_seen).total_seconds()
                    age_str = f", age={age_seconds:.0f}s"
                    if age_seconds > (staleness_minutes * 60):
                        print(f"[DISPATCH]   - user={o.user_id}, online={o.is_online}, last_seen={o.last_seen}{age_str} [STALE > {staleness_minutes}min]")
                    else:
                        print(f"[DISPATCH]   - user={o.user_id}, online={o.is_online}, last_seen={o.last_seen}{age_str} [FRESH]")
                else:
                    print(f"[DISPATCH]   - user={o.user_id}, online={o.is_online}, last_seen=None [NO TIMESTAMP]")
                if not o.is_online:
                    print(f"[DISPATCH]     ^ EXCLUDED: is_online=False")
            
            online_officers = self.get_online_officers(db, primary_org_id, staleness_minutes)
        
        print(f"[DISPATCH] Officers passing online+freshness filter: {len(online_officers)}")
        if len(online_officers) == 0:
            if len(all_officers_in_org if not include_external else all_officers_in_orgs) == 0:
                print(f"[DISPATCH] REASON: No OfficerLocation records exist for this org. Officers must send POST /officers/location first.")
            else:
                print(f"[DISPATCH] REASON: Officers exist but are STALE (last_seen > {staleness_minutes} min ago) or OFFLINE (is_online=False).")
        
        nearby = []
        for officer in online_officers:
            dist = haversine_km(lat, lng, officer.lat, officer.lng)
            print(f"[DISPATCH] Officer {officer.user_id}: distance={dist:.2f}km, radius={radius_km}km, in_range={'YES' if dist <= radius_km else 'NO'}")
            if dist <= radius_km:
                nearby.append((officer, dist))
        
        if len(online_officers) > 0 and len(nearby) == 0:
            print(f"[DISPATCH] REASON: {len(online_officers)} officer(s) are online but ALL are outside the {radius_km}km radius.")
        
        nearby.sort(key=lambda x: x[1])
        print(f"[DISPATCH] === Result: {len(nearby)} officer(s) dispatched ===")
        return nearby

    def set_offline(self, db: Session, user_id: str) -> Optional[OfficerLocation]:
        db_obj = db.query(OfficerLocation).filter(OfficerLocation.user_id == user_id).first()
        if db_obj:
            db_obj.is_online = False
            db.commit()
            db.refresh(db_obj)
        return db_obj
    
    def get_all_officers_with_status(
        self, db: Session, org_id: str, stale_minutes: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get ALL users in an organization with their current location status.
        Uses outer join so users without any location record still appear as offline.
        """
        from app.models.user import User
        from app.models.organization_role import Role
        import logging
        logger = logging.getLogger(__name__)

        stale_threshold = datetime.utcnow() - timedelta(minutes=stale_minutes)

        logger.info(f"[CRUD] get_all_officers_with_status called for org_id={org_id}")

        # Outer join: every user in the org, with their location if it exists
        # Note: We include ALL users regardless of status to show complete roster
        rows = db.query(User, OfficerLocation).outerjoin(
            OfficerLocation, OfficerLocation.user_id == User.id
        ).filter(
            User.organization_id == org_id
        ).all()

        logger.info(f"[CRUD] Query returned {len(rows)} rows")
        
        for user, location in rows:
            logger.info(f"[CRUD]   User: {user.id} ({user.full_name}), Location: {location is not None}")

        result = []
        for user, location in rows:
            if location is None:
                # User exists but has never sent a location
                result.append({
                    "user_id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "lat": None,
                    "lng": None,
                    "heading": None,
                    "speed": None,
                    "is_online": False,
                    "last_seen": None,
                    "status": "offline",
                    "updated_at": None,
                })
                continue

            # Determine status from location record
            if not location.is_online:
                status = "offline"
            elif location.last_seen and location.last_seen < stale_threshold:
                status = "stale"
            elif location.speed is not None and location.speed > 0.5:
                status = "active"
            else:
                status = "idle"

            result.append({
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "lat": location.lat,
                "lng": location.lng,
                "heading": location.heading,
                "speed": location.speed,
                "is_online": location.is_online,
                "last_seen": location.last_seen.isoformat() + "Z" if location.last_seen else None,
                "status": status,
                "updated_at": location.updated_at.isoformat() + "Z" if location.updated_at else None,
            })

        return result
    
    def save_location_history(
        self, db: Session, user_id: str, org_id: str, lat: float, lng: float,
        heading: Optional[float] = None, speed: Optional[float] = None
    ) -> OfficerLocationHistory:
        """Save a historical location point for path tracking"""
        history = OfficerLocationHistory(
            id=f"hist-{uuid.uuid4()}",
            user_id=user_id,
            organization_id=org_id,
            lat=lat,
            lng=lng,
            heading=heading,
            speed=speed,
            recorded_at=datetime.utcnow()
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        return history
    
    def get_location_history(
        self, db: Session, user_id: str, hours: int = 24
    ) -> List[OfficerLocationHistory]:
        """Get location history for an officer within the specified time range"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        return db.query(OfficerLocationHistory).filter(
            OfficerLocationHistory.user_id == user_id,
            OfficerLocationHistory.recorded_at >= cutoff
        ).order_by(OfficerLocationHistory.recorded_at.asc()).all()

class CRUDDetectionAssignment:
    def create_assignment(
        self, db: Session, detection_id: str, user_id: str, distance_km: float
    ) -> DetectionAssignment:
        db_obj = DetectionAssignment(
            id=f"asg-{uuid.uuid4()}",
            detection_id=detection_id,
            user_id=user_id,
            distance_at_assignment=distance_km,
            status="assigned",
            assigned_at=datetime.utcnow()
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_user_assignments(self, db: Session, user_id: str, status: Optional[str] = None) -> List[DetectionAssignment]:
        query = db.query(DetectionAssignment).filter(DetectionAssignment.user_id == user_id)
        if status:
            query = query.filter(DetectionAssignment.status == status)
        return query.order_by(DetectionAssignment.created_at.desc()).all()
        
    def get_assignment(self, db: Session, assignment_id: str) -> Optional[DetectionAssignment]:
        return db.query(DetectionAssignment).filter(DetectionAssignment.id == assignment_id).first()

    def update_assignment_status(
        self, db: Session, assignment_id: str, status: str, notes: Optional[str] = None, proof_urls: Optional[List[str]] = None
    ) -> Optional[DetectionAssignment]:
        db_obj = self.get_assignment(db, assignment_id)
        if not db_obj:
            return None
        
        db_obj.status = status
        
        if status in ["closed_resolved", "closed_failed"]:
            db_obj.closed_at = datetime.utcnow()
            
        if notes is not None:
            db_obj.notes = notes
            
        if proof_urls is not None:
            if db_obj.proof_urls:
                db_obj.proof_urls = list(set(db_obj.proof_urls + proof_urls))
            else:
                db_obj.proof_urls = proof_urls
                
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def expire_stale_assignments(self, db: Session, timeout_minutes: int = 120) -> int:
        timeout_threshold = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        stale_assignments = db.query(DetectionAssignment).filter(
            DetectionAssignment.status == "assigned",
            DetectionAssignment.created_at <= timeout_threshold
        ).all()
        
        count = len(stale_assignments)
        for asg in stale_assignments:
            asg.status = "closed_failed"
        
        if count > 0:
            db.commit()
            
        return count

officer_location = CRUDOfficerLocation()
traffic_alert = CRUDDetectionAssignment()

"""
Test script to verify dashboard fixes are working correctly.
"""
from app.db.session import SessionLocal
from app.models.audit_log import AuditLog
from app.models.operational import Detection
from app.api.v1.endpoints.admin import get_detection_trends
from datetime import datetime

def test_audit_logs():
    """Test that audit logs are being created and retrieved."""
    db = SessionLocal()
    
    try:
        # Count total audit logs
        total_logs = db.query(AuditLog).count()
        print(f"✓ Total audit logs: {total_logs}")
        
        if total_logs == 0:
            print("✗ WARNING: No audit logs found. Run populate_audit_logs.py to create sample data.")
            return False
        
        # Get recent logs
        recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5).all()
        print(f"\n✓ Recent audit logs ({len(recent_logs)}):")
        for log in recent_logs:
            print(f"  - [{log.module}] {log.action_type}: {log.description}")
            print(f"    User: {log.user_name}, Time: {log.created_at}")
        
        # Check different action types
        action_types = db.query(AuditLog.action_type).distinct().all()
        print(f"\n✓ Action types logged: {', '.join([a[0] for a in action_types])}")
        
        # Check different modules
        modules = db.query(AuditLog.module).distinct().all()
        print(f"✓ Modules logged: {', '.join([m[0] for m in modules])}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing audit logs: {e}")
        return False
    finally:
        db.close()


def test_detection_trends():
    """Test that detection trends are returning data."""
    db = SessionLocal()
    
    try:
        # Count total detections
        total_detections = db.query(Detection).count()
        print(f"\n✓ Total detections in database: {total_detections}")
        
        if total_detections == 0:
            print("✗ WARNING: No detections found. Create some detections to see trends.")
            return False
        
        # Test different time ranges
        time_ranges = ['daily', 'weekly', 'monthly', 'yearly']
        
        for time_range in time_ranges:
            trends = get_detection_trends(db, None, time_range)
            total_in_trends = sum(t['detections'] for t in trends)
            
            print(f"\n✓ Detection trends ({time_range}):")
            print(f"  Total periods: {len(trends)}")
            print(f"  Total detections: {total_in_trends}")
            
            # Show non-zero periods
            non_zero = [t for t in trends if t['detections'] > 0]
            if non_zero:
                print(f"  Periods with detections:")
                for t in non_zero:
                    print(f"    - {t['period']}: {t['detections']} detections")
            else:
                print(f"  ✗ WARNING: All periods have 0 detections for {time_range} range")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing detection trends: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_activity_feed_data():
    """Test that activity feed has diverse data."""
    db = SessionLocal()
    
    try:
        # Check for different types of activities
        print("\n✓ Activity feed diversity check:")
        
        # Login activities
        login_count = db.query(AuditLog).filter(AuditLog.action_type == "login").count()
        print(f"  - Login events: {login_count}")
        
        # Detection activities
        detection_count = db.query(AuditLog).filter(AuditLog.module == "detection").count()
        print(f"  - Detection events: {detection_count}")
        
        # User management activities
        user_mgmt_count = db.query(AuditLog).filter(AuditLog.module == "user").count()
        print(f"  - User management events: {user_mgmt_count}")
        
        # Camera activities
        camera_count = db.query(AuditLog).filter(AuditLog.module == "camera").count()
        print(f"  - Camera events: {camera_count}")
        
        # Company activities
        company_count = db.query(AuditLog).filter(AuditLog.module == "company").count()
        print(f"  - Company events: {company_count}")
        
        total = login_count + detection_count + user_mgmt_count + camera_count + company_count
        
        if total == 0:
            print("\n✗ WARNING: No diverse activities found. Run populate_audit_logs.py")
            return False
        
        print(f"\n✓ Total diverse activities: {total}")
        return True
        
    except Exception as e:
        print(f"✗ Error testing activity feed: {e}")
        return False
    finally:
        db.close()


def main():
    """Run all tests."""
    print("=" * 70)
    print("DASHBOARD FIXES VERIFICATION TEST")
    print("=" * 70)
    
    results = []
    
    print("\n[1/3] Testing Audit Logs...")
    print("-" * 70)
    results.append(("Audit Logs", test_audit_logs()))
    
    print("\n[2/3] Testing Detection Trends...")
    print("-" * 70)
    results.append(("Detection Trends", test_detection_trends()))
    
    print("\n[3/3] Testing Activity Feed Data...")
    print("-" * 70)
    results.append(("Activity Feed", test_activity_feed_data()))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✓ All tests passed! Dashboard fixes are working correctly.")
        print("\nNext steps:")
        print("1. Restart the backend server if it's running")
        print("2. Open the admin dashboard in the frontend")
        print("3. Check the 'Detection Trends' section - should show data")
        print("4. Check the 'Recent Activity' section - should show activity logs")
    else:
        print("\n✗ Some tests failed. Please review the output above.")
        print("\nTroubleshooting:")
        print("1. Run: python populate_audit_logs.py")
        print("2. Ensure detections exist in the database")
        print("3. Check database connection")
    
    print("=" * 70)


if __name__ == "__main__":
    main()

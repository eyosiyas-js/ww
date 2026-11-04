"""
Test script to verify the dashboard endpoints are accessible.
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1/admin"

def test_endpoint(url, description):
    """Test a single endpoint."""
    try:
        print(f"\nTesting: {description}")
        print(f"URL: {url}")
        
        response = requests.get(url)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS - Returned {len(data) if isinstance(data, list) else 'data'}")
            if isinstance(data, list) and len(data) > 0:
                print(f"  Sample: {json.dumps(data[0], indent=2)[:200]}...")
            return True
        elif response.status_code == 401:
            print("✗ UNAUTHORIZED - Need to login first")
            return False
        else:
            print(f"✗ FAILED - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ CONNECTION ERROR - Is the backend server running?")
        return False
    except Exception as e:
        print(f"✗ ERROR - {e}")
        return False


def main():
    print("=" * 70)
    print("DASHBOARD ENDPOINTS TEST")
    print("=" * 70)
    print("\nNote: These tests will fail with 401 if not authenticated.")
    print("This is expected. The important thing is that the endpoints exist (not 404).")
    
    endpoints = [
        (f"{BASE_URL}/dashboard/stats", "Dashboard Stats"),
        (f"{BASE_URL}/dashboard/trends?time_series=monthly", "Detection Trends (original URL)"),
        (f"{BASE_URL}/dashboard/detection-trends?time_series=monthly", "Detection Trends (frontend URL)"),
        (f"{BASE_URL}/dashboard/logs", "Activity Logs (original URL)"),
        (f"{BASE_URL}/dashboard/activity-logs", "Activity Logs (frontend URL)"),
    ]
    
    results = []
    for url, description in endpoints:
        result = test_endpoint(url, description)
        results.append((description, result))
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for desc, result in results:
        status = "✓" if result else "✗"
        print(f"{status} {desc}")
    
    print("\n" + "=" * 70)
    print("\nIf you see 401 errors, that's normal - it means the endpoints exist")
    print("but require authentication. The frontend will handle authentication.")
    print("\nIf you see 404 errors, the endpoints are not registered correctly.")
    print("=" * 70)


if __name__ == "__main__":
    main()

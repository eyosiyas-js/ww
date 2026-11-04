import requests
import json
import sys

base_url = "http://localhost:8000/api/v1"

def verify_analytics():
    print("--- Verifying Analytics V2 Upgrade ---")
    
    # 1. Login
    print("Logging in...")
    r = requests.post(f"{base_url}/auth/login", data={"username": "admin@cims.com", "password": "admin123"})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        return False
    token = r.json().get("accessToken")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login success.")

    # 2. Test Detailed Analytics
    print("\nTesting /admin/analytics/detailed...")
    r = requests.get(f"{base_url}/admin/analytics/detailed", headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Total Detections: {data['totalDetections']}")
        print(f"Total Cases: {data['totalCases']}")
        print(f"Categories found: {len(data['recordsByCategory'])}")
        print(f"Locations found: {len(data['recordsByLocation'])}")
        for cat in data['recordsByCategory']:
            print(f" - {cat['category']}: {cat['count']}")
    else:
        print(f"Error: {r.text}")
        return False

    # 3. Test Raw Submissions
    print("\nTesting /admin/analytics/raw...")
    r = requests.get(f"{base_url}/admin/analytics/raw", headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} raw submissions.")
        if data:
            first = data[0]
            print(f"First record: [{first['type']}] {first['title']} at {first['location']}")
            if 'details' in first and first['details']:
                print(f"Details present: {list(first['details'].keys())}")
    else:
        print(f"Error: {r.text}")
        return False

    print("\n--- Verification Complete: SUCCESS ---")
    return True

if __name__ == "__main__":
    if verify_analytics():
        sys.exit(0)
    else:
        sys.exit(1)

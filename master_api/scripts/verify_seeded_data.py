import requests
import json
import logging

logging.basicConfig(level=logging.INFO)

API_URL = "http://127.0.0.1:8000/api/v1"

def test_seeded_data():
    # 1. Login as super admin to get token
    login_data = {
        "username": "admin@cims.com",
        "password": "admin123"
    }
    print("Testing Login...")
    resp = requests.post(f"{API_URL}/auth/login", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Test Detailed Analytics (All Companies)
    print("\n--- Detailed Analytics (All Companies) ---")
    resp = requests.get(f"{API_URL}/admin/analytics/detailed", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total Detections: {data.get('totalDetections')}")
        print(f"Total Cases: {data.get('totalCases')}")
        print("Records By Category:")
        for cat in data.get('recordsByCategory', []):
            print(f"  {cat['category']}: {cat['count']}")
        print("Records By Location (First 3):")
        for loc in data.get('recordsByLocation', [])[:3]:
            print(f"  {loc['location']}: {loc['count']}")
        print("Monthly Trends (First 3):")
        for trend in data.get('monthlyTrends', [])[:3]:
            print(f"  {trend['month']}: Detections: {trend['detections']}, Cases Closed: {trend['casesClosed']}")
    else:
        print(f"Detailed Analytics failed: {resp.text}")

    # 3. Test Raw Submissions
    print("\n--- Raw Submissions ---")
    resp = requests.get(f"{API_URL}/admin/analytics/raw", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total Raw Submissions Returned: {len(data)}")
        if len(data) > 0:
            print("First 3 Submissions:")
            for item in data[:3]:
                print(f"  [{item['type']}] {item['title']} - {item['category']} at {item['location']} ({item['companyName']})")
    else:
        print(f"Raw Submissions failed: {resp.text}")

    # 4. Test Filtering by Company
    print("\n--- Detailed Analytics (Filtered by Metro Police Dept) ---")
    # First get companies to find the ID
    resp = requests.get(f"{API_URL}/admin/companies", headers=headers)
    target_company_id = None
    if resp.status_code == 200:
        companies = resp.json()
        for c in companies:
            if c['name'] == 'Metro Police Dept':
                target_company_id = c['id']
                break
    
    if target_company_id:
        resp = requests.get(f"{API_URL}/admin/analytics/detailed?company_id={target_company_id}", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"Filtered Total Detections: {data.get('totalDetections')}")
            print(f"Filtered Total Cases: {data.get('totalCases')}")
        else:
            print(f"Filtered Detailed Analytics failed: {resp.text}")
    else:
        print("Could not find Metro Police Dept for filtering test.")

if __name__ == "__main__":
    test_seeded_data()

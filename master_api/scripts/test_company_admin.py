import requests
import json
import logging

logging.basicConfig(level=logging.INFO)

API_URL = "http://127.0.0.1:8000/api/v1"

def test_company_admin_flow():
    # 1. Login as Company Admin
    login_data = {
        "username": "admin@city-watch.com",
        "password": "password123"
    }
    print("Testing Company Admin Login...")
    resp = requests.post(f"{API_URL}/auth/login", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Test Detailed Analytics with explicit category="all" (as sent by UI)
    print("\n--- Detailed Analytics (category=all) ---")
    resp = requests.get(f"{API_URL}/admin/analytics/detailed?category=all", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total Detections: {data.get('totalDetections')}")
        print(f"Total Cases: {data.get('totalCases')}")
    else:
        print(f"Detailed Analytics failed: {resp.text}")

    # 3. Test retrieving users (Should work now with relaxed permission check)
    print("\n--- List Users ---")
    resp = requests.get(f"{API_URL}/admin/users", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Successfully retrieved {len(data)} users within organization.")
    else:
        print(f"List Users failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    test_company_admin_flow()

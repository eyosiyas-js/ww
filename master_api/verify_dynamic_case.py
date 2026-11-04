import requests
import json

base_url = "http://localhost:8001/api/v1"

def get_token():
    print("Logging in...")
    r = requests.post(f"{base_url}/auth/login", data={"username": "admin@cims.com", "password": "admin123"})
    if r.status_code == 200:
        return r.json()["accessToken"]
    print(f"Login failed: {r.status_code} {r.text}")
    return None

def test_dynamic_case():
    token = get_token()
    if not token:
        return
    headers = {"Authorization": f"Bearer {token}"}
    print("--- Testing Dynamic Case Submission ---")
    
    # 1. Create a Form Template
    print("Creating form template...")
    template_data = {
        "name": "Traffic Incident Form",
        "description": "Form for reporting traffic related incidents",
        "isActive": True,
        "fields": [
            {"id": "field_vehicle_plate", "label": "Vehicle Plate", "type": "text", "required": True},
            {"id": "field_driver_license", "label": "Driver License", "type": "text", "required": False},
            {"id": "field_incident_detail", "label": "Incident Detail", "type": "textarea", "required": True}
        ]
    }
    r = requests.post(f"{base_url}/admin/forms", headers=headers, json=template_data)
    if r.status_code != 200:
        print(f"Failed to create template: {r.status_code} {r.text}")
        return
    template = r.json()
    template_id = template['id']
    print(f"Template created: {template_id}")

    # 2. Get Active Template
    print("\nFetching active template...")
    r = requests.get(f"{base_url}/admin/forms/active", headers=headers)
    if r.status_code != 200:
        print(f"Failed to fetch active template: {r.status_code} {r.text}")
    else:
        print(f"Active template: {r.json()['name']}")

    # 3. Create Case with Dynamic Data
    print("\nCreating case with dynamic data...")
    case_data = {
        "title": "Speeding Vehicle in Sector 7",
        "assignedTo": "Officer Sarah Williams",
        "instructions": "Follow and report location",
        "priority": "high",
        "formTemplateId": template_id,
        "dynamicData": {
            "field_vehicle_plate": "XYZ-9876",
            "field_incident_detail": "Vehicle was traveling at 120km/h in a 60km/h zone."
        }
    }
    r = requests.post(f"{base_url}/cases/", headers=headers, json=case_data)
    print(f"Create Case: {r.status_code}")
    if r.status_code == 200:
        case = r.json()
        print(f"Case created with ID: {case['id']}")
        print(f"Stored dynamic data: {json.dumps(case['dynamicData'], indent=2)}")
    else:
        print(f"Error: {r.text}")

if __name__ == "__main__":
    test_dynamic_case()

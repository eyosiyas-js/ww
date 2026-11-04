import requests
try:
    response = requests.get("http://localhost:8000/api/v1/users/me", headers={"Authorization": "Bearer test"})
    print(f"Status: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")

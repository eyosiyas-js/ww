import urllib.request
import json
try:
    with urllib.request.urlopen('http://localhost:8000/api/v1/public/detections') as response:
        data = json.loads(response.read().decode())
        for d in data:
            if d.get("category") == "vehicle":
                print(f"ID: {d.get('id')}")
                print(f"Plate: {d.get('plateNumber')}, Code: {d.get('code')}")
                print("---")
except Exception as e:
    print(e)

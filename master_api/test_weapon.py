from fastapi.testclient import TestClient
from app.main import app
from app.api import deps

def override_checker():
    class MockRole:
        name = 'Super Admin'
        permissions = []
        organization_id = 'mock-org'
        is_system = True
    class MockUser:
        id = 'mock-id'
        organization_id = 'mock-org'
        role = MockRole()
    return MockUser()

app.dependency_overrides[deps.get_current_user] = override_checker
class MockPermChecker:
    def __init__(self, _):
        pass
    def __call__(self, *args, **kwargs):
        return override_checker()

deps.PermissionChecker = MockPermChecker

client = TestClient(app)
try:
    response = client.post('/api/v1/weapon-detections/simulate', data={'weapon_type': 'Handgun', 'confidence': '0.9', 'camera_id': 'cam-org-campus-sec-0'})
    print('STATUS:', response.status_code)
    print('BODY:', response.text)
except Exception as e:
    import traceback
    traceback.print_exc()

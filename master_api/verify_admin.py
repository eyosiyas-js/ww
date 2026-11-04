import requests
import json

base_url = "http://localhost:8000/api/v1"

def test_admin_crud():
    print("--- Testing Super Admin Integration ---")
    
    # 1. Login
    print("Loging in...")
    r = requests.post(f"{base_url}/auth/login", data={"username": "admin@cims.com", "password": "admin123"})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        return
    token = r.json().get("accessToken")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login success.")

    # 2. List Companies
    print("Fetching companies...")
    r = requests.get(f"{base_url}/admin/companies", headers=headers)
    print(f"Companies: {r.status_code}")
    if r.status_code == 200:
        companies = r.json()
        print(f"Found {len(companies)} companies.")
        if companies:
            print(f"First company: {companies[0]['name']}")

    # 3. List Users
    print("\nFetching users...")
    r = requests.get(f"{base_url}/admin/users", headers=headers)
    print(f"Users: {r.status_code}")
    if r.status_code == 200:
        users = r.json()
        print(f"Found {len(users)} users.")
        if users:
            print(f"First user: {users[0]['name']} ({users[0]['email']})")

    # 4. Create User
    print("\nCreating test user...")
    new_user = {
        "name": "Test User",
        "email": f"test-{id(new_user) if 'new_user' in locals() else 123}@example.com",
        "companyId": companies[0]['id'] if 'companies' in locals() and companies else "comp-1",
        "role": "User",
        "status": "active"
    }
    r = requests.post(f"{base_url}/admin/users", headers=headers, json=new_user)
    print(f"Create User: {r.status_code}")
    if r.status_code == 200:
        created_user = r.json()
        user_id = created_user['id']
        print(f"Created user ID: {user_id}")
        
        # 5. Update User
        print("\nUpdating test user...")
        update_data = {"name": "Updated Test User"}
        r = requests.patch(f"{base_url}/admin/users/{user_id}", headers=headers, json=update_data)
        print(f"Update User: {r.status_code}")
        
        # 6. Delete User
        print("\nDeleting test user...")
        r = requests.delete(f"{base_url}/admin/users/{user_id}", headers=headers)
        print(f"Delete User: {r.status_code}")

if __name__ == "__main__":
    test_admin_crud()

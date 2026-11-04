from app.db.session import SessionLocal
from app.crud.crud_traffic import officer_location

db = SessionLocal()

org_id = "comp-73971369-c1eb-497d-b91e-c17d602b06b0"  # Boss Traffic
print(f"Testing officer query for org: {org_id}\n")

officers = officer_location.get_all_officers_with_status(db, org_id=org_id)

print(f"Total officers returned: {len(officers)}\n")

for o in officers:
    print(f"Officer: {o['full_name']} ({o['email']})")
    print(f"  Status: {o['status']}")
    print(f"  Location: lat={o['lat']}, lng={o['lng']}")
    print(f"  Last seen: {o['last_seen']}")
    print(f"  Is online: {o['is_online']}")
    print()

db.close()

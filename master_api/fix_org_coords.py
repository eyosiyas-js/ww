import sqlite3

def fix_orgs():
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    
    # 1. Update or Insert Organizations
    orgs = [
        ('comp-001', 'Metro Police Dept', 'admin@metropd.gov', 40.7128, -74.0060),
        ('comp-002', 'City Watch Corp', 'admin@citywatch.com', 40.7138, -74.0070),
        ('comp-004', 'Guardian Security', 'admin@guardian.com', 40.7148, -74.0080),
        ('comp-005', 'Sentinel Services', 'admin@sentinel.co', 40.7158, -74.0090)
    ]
    
    # First, handle the existing 'org-metro-police' by renaming its ID if it exists
    cursor.execute("UPDATE organization SET id = 'comp-001', name = 'Metro Police Dept', admin_email = 'admin@metropd.gov' WHERE id = 'org-metro-police'")
    
    for id, name, email, lat, lng in orgs:
        # Check if ID exists
        cursor.execute("SELECT id FROM organization WHERE id = ?", (id,))
        if not cursor.fetchone():
            # Check if email exists (to avoid unique constraint error)
            cursor.execute("SELECT id FROM organization WHERE admin_email = ?", (email,))
            existing = cursor.fetchone()
            if existing:
                # Update existing record's ID and data
                cursor.execute("""
                    UPDATE organization 
                    SET id = ?, name = ?, lat = ?, lng = ?, updated_at = datetime('now') 
                    WHERE id = ?
                """, (id, name, lat, lng, existing[0]))
                print(f"Updated existing org with email {email} to ID {id}")
            else:
                # Insert new
                cursor.execute("""
                    INSERT INTO organization (id, name, admin_email, plan, status, lat, lng, created_at, updated_at) 
                    VALUES (?, ?, ?, 'enterprise', 'active', ?, ?, datetime('now'), datetime('now'))
                """, (id, name, email, lat, lng))
                print(f"Inserted {name} ({id})")
        else:
            # Update existing ID's data
            cursor.execute("""
                UPDATE organization 
                SET name = ?, lat = ?, lat = ?, lng = ?, admin_email = ?, updated_at = datetime('now') 
                WHERE id = ?
            """, (name, lat, lat, lng, email, id))
            print(f"Updated {name} ({id})")

    # Update foreign keys in other tables
    cursor.execute("UPDATE camera SET organization_id = 'comp-001' WHERE organization_id = 'org-metro-police'")
    cursor.execute("UPDATE detection SET organization_id = 'comp-001' WHERE organization_id = 'org-metro-police'")
    cursor.execute("UPDATE user SET organization_id = 'comp-001' WHERE organization_id = 'org-metro-police'")
    
    # Ensure current test user is in comp-001
    cursor.execute("UPDATE user SET organization_id = 'comp-001' WHERE email = 'admin@cims.com'")

    conn.commit()
    conn.close()
    print("Done fixing organizations.")

if __name__ == "__main__":
    fix_orgs()

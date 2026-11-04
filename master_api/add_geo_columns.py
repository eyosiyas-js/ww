import sqlite3

def upgrade_db():
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    
    # Check for columns in organization
    cursor.execute("PRAGMA table_info(organization)")
    org_columns = [col[1] for col in cursor.fetchall()]
    
    if 'lat' not in org_columns:
        try:
            conn.execute('ALTER TABLE organization ADD COLUMN lat FLOAT;')
            print("Added 'lat' to organization.")
        except Exception as e:
            print(f"Error adding lat: {e}")
            
    if 'lng' not in org_columns:
        try:
            conn.execute('ALTER TABLE organization ADD COLUMN lng FLOAT;')
            print("Added 'lng' to organization.")
        except Exception as e:
            print(f"Error adding lng: {e}")

    # Check for columns in detection
    cursor.execute("PRAGMA table_info(detection)")
    det_columns = [col[1] for col in cursor.fetchall()]
    
    new_det_cols = [
        ('assigned_company_id', 'VARCHAR'),
        ('handling_status', "VARCHAR DEFAULT 'unassigned'"),
        ('handling_notes', 'VARCHAR'),
        ('handling_proof_urls', 'JSON')
    ]
    
    for col_name, col_type in new_det_cols:
        if col_name not in det_columns:
            try:
                conn.execute(f'ALTER TABLE detection ADD COLUMN {col_name} {col_type};')
                print(f"Added '{col_name}' to detection.")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Database upgrade check complete.")

if __name__ == "__main__":
    upgrade_db()

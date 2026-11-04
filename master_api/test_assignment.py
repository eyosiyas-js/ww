import sqlite3
import uuid

def prepare_test():
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    
    # 1. Ensure comp-002 exists
    cursor.execute("SELECT id FROM organization WHERE id = 'comp-002'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO organization (id, name, admin_email, plan, status) VALUES ('comp-002', 'City Watch Corp', 'admin@citywatch.com', 'professional', 'active')")
        print("Created comp-002")

    # 2. Ensure a user exists for comp-002
    cursor.execute("SELECT email FROM user WHERE organization_id = 'comp-002'")
    user = cursor.fetchone()
    if not user:
        # Create a user. Note: hashed_password for 'admin123'
        user_id = f"usr-{uuid.uuid4()}"
        cursor.execute("""
            INSERT INTO user (id, email, hashed_password, full_name, organization_id, status) 
            VALUES (?, 'admin@citywatch.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L6s57Wy60Q2pUhu', 'City Watch Admin', 'comp-002', 'active')
        """, (user_id,))
        print("Created user admin@citywatch.com in comp-002")
    else:
        print(f"Found existing user in comp-002: {user[0]}")

    # 3. Assign a detection to comp-002
    # Find a detection that belongs to comp-001
    cursor.execute("SELECT id FROM detection WHERE organization_id = 'comp-001' LIMIT 1")
    det = cursor.fetchone()
    if det:
        cursor.execute("""
            UPDATE detection 
            SET assigned_company_id = 'comp-002', handling_status = 'pending' 
            WHERE id = ?
        """, (det[0],))
        print(f"Assigned detection {det[0]} to comp-002")
    else:
        print("No detections found to assign.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    prepare_test()

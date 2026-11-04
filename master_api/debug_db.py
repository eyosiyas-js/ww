import sqlite3
import json

try:
    conn = sqlite3.connect('test.db')
    c = conn.cursor()
    print("--- DETECTIONS ---")
    c.execute('SELECT id, name, organization_id, user_id FROM detection LIMIT 10')
    for row in c.fetchall():
        print(f"Detection: {row[0]}, Org: {row[2]}, User: {row[3]}")

    print("\n--- USERS ---")
    c.execute('SELECT id, email, organization_id, role_id FROM user LIMIT 10')
    for row in c.fetchall():
        print(f"User: {row[0]}, Email: {row[1]}, Org: {row[2]}, Role: {row[3]}")

    print("\n--- ROLES ---")
    c.execute('SELECT id, name, permissions FROM role')
    for row in c.fetchall():
        print(f"Role: {row[1]}, Perms: {row[2]}")
        
    print("\n--- CAMERAS ---")
    c.execute('SELECT id, name, organization_id FROM camera LIMIT 10')
    for row in c.fetchall():
        print(f"Camera: {row[0]}, Org: {row[2]}")
        
except Exception as e:
    print("Error:", e)

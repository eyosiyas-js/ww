import sqlite3
import json

def upgrade_db():
    conn = sqlite3.connect('test.db')
    try:
        conn.execute('ALTER TABLE organization ADD COLUMN features JSON DEFAULT \'{}\';')
        conn.commit()
        print("Successfully added features column to organization table.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_db()

import sqlite3
import os

# Database path
DB_PATH = "test.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(detection)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "detection_events" not in columns:
            print("Adding detection_events column to detection table...")
            cursor.execute("ALTER TABLE detection ADD COLUMN detection_events JSON")
            print("Column added successfully.")
        else:
            print("Column detection_events already exists.")

        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

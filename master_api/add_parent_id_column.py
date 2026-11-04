import sqlite3

def upgrade_db():
    conn = sqlite3.connect('test.db')
    try:
        conn.execute('ALTER TABLE organization ADD COLUMN parent_id VARCHAR;')
        conn.commit()
        print("Successfully added parent_id column to organization table.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_db()

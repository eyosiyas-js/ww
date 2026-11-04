import sqlite3

def upgrade_db():
    conn = sqlite3.connect('test.db')
    try:
        conn.execute('ALTER TABLE "case" ADD COLUMN created_by VARCHAR;')
        conn.commit()
        print("Successfully added created_by column to case table.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_db()

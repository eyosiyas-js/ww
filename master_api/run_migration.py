import os
from sqlalchemy import text
from app.db.session import engine

def main():
    migration_file = "migration_v3_normalize_categories.sql"
    with open(migration_file, 'r') as f:
        sql = f.read()

    with engine.begin() as conn:
        conn.execute(text(sql))
    
    print("Migration applied successfully!")

if __name__ == "__main__":
    main()

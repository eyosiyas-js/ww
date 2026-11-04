import sqlite3
import psycopg2
from sqlalchemy import create_engine, MetaData, Table, select, insert, text
from app.core.config import settings

# Source: SQLite
sqlite_uri = "sqlite:///./test.db"
sqlite_engine = create_engine(sqlite_uri)

# Target: PostgreSQL
pg_uri = settings.SQLALCHEMY_DATABASE_URI
pg_engine = create_engine(pg_uri)

def migrate_data():
    tables_to_migrate = [
        "organization",
        "role",
        "user",
        "formtemplate",
        "camera",
        "detection",
        "notification",
        "cameraaccess"
    ]
    
    sqlite_conn = sqlite_engine.connect()
    pg_conn = pg_engine.connect()
    
    metadata_sqlite = MetaData()
    metadata_sqlite.reflect(bind=sqlite_engine)
    
    metadata_pg = MetaData()
    metadata_pg.reflect(bind=pg_engine)
    
    # Disable foreign key checks for the session
    print("Disabling PostgreSQL constraints...")
    pg_conn.execute(text("SET session_replication_role = 'replica'"))
    
    print("Truncating tables in PostgreSQL...")
    for table_name in reversed(tables_to_migrate):
        try:
            pg_conn.execute(text(f"TRUNCATE TABLE \"{table_name}\" CASCADE"))
            pg_conn.commit()
            print(f"  Truncated {table_name}")
        except Exception as e:
            print(f"  Error truncating {table_name}: {e}")
            pg_conn.rollback()

    for table_name in tables_to_migrate:
        print(f"Migrating table {table_name}...")
        
        try:
            s_table = Table(table_name, metadata_sqlite, autoload_with=sqlite_engine)
            p_table = Table(table_name, metadata_pg, autoload_with=pg_engine)
            
            rows = sqlite_conn.execute(select(s_table)).fetchall()
            print(f"  Found {len(rows)} rows in SQLite.")
            
            if rows:
                data = [dict(row._mapping) for row in rows]
                pg_conn.execute(insert(p_table), data)
                pg_conn.commit()
                print(f"  Successfully migrated {len(data)} rows.")
            else:
                print("  No rows to migrate.")
        except Exception as e:
            print(f"  Error migrating {table_name}: {str(e)[:500]}")
            pg_conn.rollback()
        
    print("Resetting sequences...")
    for table_name in tables_to_migrate:
        try:
            # Check if table has an 'id' column before resetting sequence
            p_table = Table(table_name, metadata_pg, autoload_with=pg_engine)
            if 'id' in p_table.columns:
                pg_conn.execute(text(f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM \"{table_name}\""))
                pg_conn.commit()
                print(f"  Reset sequence for {table_name}")
        except Exception as e:
            # print(f"  Could not reset sequence for {table_name}: {e}")
            pg_conn.rollback()

    # Re-enable foreign key checks
    print("Re-enabling PostgreSQL constraints...")
    pg_conn.execute(text("SET session_replication_role = 'origin'"))
    pg_conn.commit()

    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate_data()

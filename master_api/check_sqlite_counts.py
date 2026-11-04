import sqlite3
from sqlalchemy import create_engine, MetaData, Table, select, func

def check_sqlite_counts():
    tables = [
        "organization",
        "role",
        "user",
        "formtemplate",
        "camera",
        "detection",
        "notification",
        "cameraaccess"
    ]
    
    sqlite_engine = create_engine("sqlite:///./test.db")
    sqlite_conn = sqlite_engine.connect()
    
    metadata_sqlite = MetaData()
    metadata_sqlite.reflect(bind=sqlite_engine)
    
    print("SQLite Table Counts:")
    for table_name in tables:
        try:
            s_table = Table(table_name, metadata_sqlite, autoload_with=sqlite_engine)
            s_count = sqlite_conn.execute(select(func.count()).select_from(s_table)).scalar()
            print(f"{table_name:<20}: {s_count}")
        except Exception as e:
            print(f"{table_name:<20}: Error {e}")
            
    sqlite_conn.close()

if __name__ == "__main__":
    check_sqlite_counts()

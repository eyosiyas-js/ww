import sqlite3
import psycopg2
from sqlalchemy import create_engine, MetaData, Table, select, func
from app import models
from app.core.config import settings

def verify_parity():
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
    pg_engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    
    sqlite_conn = sqlite_engine.connect()
    pg_conn = pg_engine.connect()
    
    metadata_sqlite = MetaData()
    metadata_sqlite.reflect(bind=sqlite_engine)
    
    metadata_pg = MetaData()
    metadata_pg.reflect(bind=pg_engine)
    
    print("-" * 65)
    print(f"{'Table':<20} | {'SQLite':<10} | {'PG':<10} | {'Status':<10}")
    print("-" * 65)
    
    all_ok = True
    for table_name in tables:
        try:
            s_table = Table(table_name, metadata_sqlite, autoload_with=sqlite_engine)
            p_table = Table(table_name, metadata_pg, autoload_with=pg_engine)
            
            s_count = sqlite_conn.execute(select(func.count()).select_from(s_table)).scalar()
            p_count = pg_conn.execute(select(func.count()).select_from(p_table)).scalar()
            
            status = "OK" if s_count == p_count else "MISMATCH"
            if s_count != p_count:
                all_ok = False
                
            print(f"{table_name:<20} | {s_count:<10} | {p_count:<10} | {status:<10}")
        except Exception as e:
            print(f"{table_name:<20} | Error: {str(e)[:40]}")
        
    sqlite_conn.close()
    pg_conn.close()
    return all_ok

if __name__ == "__main__":
    verify_parity()

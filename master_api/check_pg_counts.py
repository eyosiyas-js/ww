import psycopg2
from sqlalchemy import create_engine, MetaData, Table, select, func
from app.core.config import settings

def check_pg_counts():
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
    
    pg_engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    pg_conn = pg_engine.connect()
    
    metadata_pg = MetaData()
    metadata_pg.reflect(bind=pg_engine)
    
    print("PostgreSQL Table Counts:")
    for table_name in tables:
        try:
            p_table = Table(table_name, metadata_pg, autoload_with=pg_engine)
            p_count = pg_conn.execute(select(func.count()).select_from(p_table)).scalar()
            print(f"{table_name:<20}: {p_count}")
        except Exception as e:
            print(f"{table_name:<20}: Error {e}")
            
    pg_conn.close()

if __name__ == "__main__":
    check_pg_counts()

import sys
import os
# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import psycopg2
from app.core.config import settings

def test_conn():
    try:
        print(f"Connecting to {settings.POSTGRES_SERVER} as {settings.POSTGRES_USER}...")
        conn = psycopg2.connect(
            host=settings.POSTGRES_SERVER,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            dbname="postgres" # Connect to default db first
        )
        print("Connection successful!")
        
        # Check if cims_db exists
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname='cims_db'")
        exists = cur.fetchone()
        if not exists:
            print("cims_db does not exist. Creating it...")
            cur.execute("CREATE DATABASE cims_db")
            print("cims_db created.")
        else:
            print("cims_db already exists.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_conn()

import sqlite3
import psycopg2
from app.core.config import settings

def find_missing_ids():
    # SQLite IDs
    s_conn = sqlite3.connect('test.db')
    s_ids = set([r[0] for r in s_conn.execute('SELECT id FROM organization').fetchall()])
    s_conn.close()
    
    # PG IDs
    p_conn = psycopg2.connect(user='postgres', password='1234', host='localhost', dbname='cims')
    cur = p_conn.cursor()
    cur.execute('SELECT id FROM organization')
    p_ids = set([r[0] for r in cur.fetchall()])
    cur.close()
    p_conn.close()
    
    print(f"SQLite IDs ({len(s_ids)}): {s_ids}")
    print(f"PG IDs ({len(p_ids)}): {p_ids}")
    print(f"Missing in PG: {s_ids - p_ids}")
    print(f"Extra in PG: {p_ids - s_ids}")

if __name__ == "__main__":
    find_missing_ids()

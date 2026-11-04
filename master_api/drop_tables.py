import psycopg2

def drop_all_tables():
    try:
        conn = psycopg2.connect(
            user="postgres",
            password="1234",
            host="localhost",
            dbname="cims"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
        """)
        tables = cursor.fetchall()
        
        for table in tables:
            print(f"Dropping table {table[0]}...")
            cursor.execute(f"DROP TABLE IF EXISTS \"{table[0]}\" CASCADE")
            
        print("All tables dropped successfully.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    drop_all_tables()

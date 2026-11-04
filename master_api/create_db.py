import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database():
    passwords = ["1234", "postgres", ""]
    for pwd in passwords:
        try:
            print(f"Trying password: '{pwd}'")
            conn = psycopg2.connect(
                user="postgres",
                password=pwd,
                host="localhost",
                dbname="postgres"
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            print(f"Success with password: '{pwd}'")
            
            cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'cims'")
            exists = cursor.fetchone()
            
            if not exists:
                cursor.execute("CREATE DATABASE cims")
                print("Database 'cims' created successfully.")
            else:
                print("Database 'cims' already exists.")
            return True
        except Exception as e:
            print(f"Failed with password '{pwd}': {e}")
    return False

if __name__ == "__main__":
    create_database()

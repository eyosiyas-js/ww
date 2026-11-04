import psycopg2

def fix_db():
    conn_params = {
        "dbname": "cims",
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": "5432"
    }
    
    try:
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("=== Comprehensive Database Fix ===\n")

        # ── 1. Create missing TABLES ──
        tables_sql = [
            ("detectionassignment", """
                CREATE TABLE IF NOT EXISTS detectionassignment (
                    id VARCHAR PRIMARY KEY,
                    detection_id VARCHAR REFERENCES detection(id),
                    user_id VARCHAR REFERENCES "user"(id),
                    distance_at_assignment FLOAT,
                    status VARCHAR DEFAULT 'assigned',
                    notes VARCHAR,
                    proof_urls JSON,
                    assigned_at TIMESTAMP,
                    closed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_detectionassignment_id ON detectionassignment(id);
            """),
            ("officerlocation", """
                CREATE TABLE IF NOT EXISTS officerlocation (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR UNIQUE REFERENCES "user"(id),
                    organization_id VARCHAR REFERENCES organization(id),
                    lat FLOAT,
                    lng FLOAT,
                    heading FLOAT,
                    speed FLOAT,
                    is_online BOOLEAN DEFAULT TRUE,
                    last_seen TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_officerlocation_id ON officerlocation(id);
            """),
            ("weapondetection", """
                CREATE TABLE IF NOT EXISTS weapondetection (
                    id VARCHAR PRIMARY KEY,
                    weapon_type VARCHAR NOT NULL,
                    description VARCHAR,
                    confidence FLOAT,
                    image_url VARCHAR,
                    camera_id VARCHAR REFERENCES camera(id),
                    camera_name VARCHAR,
                    organization_id VARCHAR REFERENCES organization(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_weapondetection_id ON weapondetection(id);
            """),
            ("systemsetting", """
                CREATE TABLE IF NOT EXISTS systemsetting (
                    key VARCHAR PRIMARY KEY,
                    value JSON,
                    description VARCHAR,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_systemsetting_key ON systemsetting(key);
            """),
        ]
        
        for table_name, sql in tables_sql:
            try:
                cur.execute(sql)
                print(f"  ✓ Table ready: {table_name}")
            except Exception as e:
                conn.rollback()
                conn.autocommit = True
                print(f"  ✕ Error with table {table_name}: {e}")

        # ── 2. Add missing COLUMNS ──
        columns_to_add = [
            # detection table
            ("detection", "assignment_type", "VARCHAR DEFAULT 'company'"),
            ("detection", "allow_external_assignment", "BOOLEAN DEFAULT FALSE"),
            ("detection", "region", "VARCHAR"),
            ("detection", "code", "VARCHAR"),
            ("detection", "dispatch_message", "VARCHAR"),
            # formtemplate table
            ("formtemplate", "detection_type", "VARCHAR DEFAULT 'person'"),
        ]
        
        print()
        for table, col_name, col_type in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type};")
                print(f"  ✓ Added column: {table}.{col_name}")
            except psycopg2.errors.DuplicateColumn:
                conn.rollback()
                conn.autocommit = True
                print(f"  - Already exists: {table}.{col_name}")
            except Exception as e:
                conn.rollback()
                conn.autocommit = True
                print(f"  ✕ Error adding {table}.{col_name}: {e}")
        
        cur.close()
        conn.close()
        print("\n=== Database fix completed ===")
        
    except Exception as e:
        print(f"Could not connect to database: {e}")

if __name__ == "__main__":
    fix_db()

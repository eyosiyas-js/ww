"""
Migration script: Add crime_type, form_template_id, dynamic_data to Detection table.
Also drops the Case table if it exists.
Run from backend1/backend/ directory:
  python scripts/migrate_detection_enhancement.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

def migrate():
    with engine.connect() as conn:
        # 1. Add new columns to detection table
        columns_to_add = [
            ("crime_type", "VARCHAR"),
            ("form_template_id", "VARCHAR"),
            ("dynamic_data", "JSON"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE detection ADD COLUMN {col_name} {col_type}"))
                print(f"✓ Added column '{col_name}' to detection table")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"  Column '{col_name}' already exists, skipping")
                else:
                    print(f"  Warning adding '{col_name}': {e}")
        
        # 2. Drop the case table if it exists
        try:
            conn.execute(text("DROP TABLE IF EXISTS \"case\""))
            print("✓ Dropped 'case' table")
        except Exception as e:
            print(f"  Warning dropping case table: {e}")
        
        conn.commit()
        print("\n✅ Migration complete!")

if __name__ == "__main__":
    migrate()

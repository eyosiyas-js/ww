import traceback
from app.db.session import engine
from sqlalchemy import text

def add_face_embedding_column():
    try:
        with engine.connect() as conn:
            with conn.execution_options(isolation_level="AUTOCOMMIT"):
                print("Adding face_embedding column to detection table...")
                conn.execute(text("ALTER TABLE detection ADD COLUMN IF NOT EXISTS face_embedding BYTEA;"))
            
            print("Success! face_embedding column added.")
    except Exception as e:
        with open("error.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())

if __name__ == "__main__":
    add_face_embedding_column()

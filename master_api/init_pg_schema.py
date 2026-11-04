from app.db.base import Base
from sqlalchemy import create_engine
from app.core.config import settings

def init_schema():
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        print(f"Connecting to {settings.SQLALCHEMY_DATABASE_URI}...")
        Base.metadata.create_all(bind=engine)
        print("Schema created successfully using Base.metadata.")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    init_schema()

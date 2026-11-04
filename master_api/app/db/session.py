from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

if "sqlite" in settings.SQLALCHEMY_DATABASE_URI:
    engine = create_engine(
        settings.SQLALCHEMY_DATABASE_URI, pool_pre_ping=True, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

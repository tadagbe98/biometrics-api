"""
Configuration base de données - PostgreSQL avec SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# URL de connexion (mettre dans .env en production)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://biometrics_user:password123@localhost:5432/biometrics_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

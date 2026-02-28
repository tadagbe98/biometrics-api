"""
Modèles de base de données
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    consent_given = Column(Boolean, default=False)  # RGPD

    measurements = relationship("Measurement", back_populates="user")
    api_keys = relationship("ApiKey", back_populates="user")


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # temperature, hr, steps, hrv, respiration
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)  # °C, bpm, steps/min
    confidence = Column(Float, nullable=True)  # Score de confiance ML (0-1)
    raw_data = Column(Text, nullable=True)  # JSON des données brutes
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="measurements")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)          # Nom du projet
    key = Column(String, unique=True, index=True, nullable=False)  # bm_xxxx...
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")


class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

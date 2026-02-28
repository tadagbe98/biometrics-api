"""
Schémas Pydantic - Validation des données entrantes/sortantes
"""
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Literal
from datetime import datetime


# ---- Auth ----
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    consent_given: bool = False

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit avoir au moins 8 caractères")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    consent_given: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Measurements ----
MeasurementType = Literal["temperature", "hr", "steps", "hrv", "respiration", "activity"]

class MeasurementSubmit(BaseModel):
    type: MeasurementType
    value: float
    timestamp: Optional[datetime] = None
    raw_data: Optional[dict] = None
    notes: Optional[str] = None

class MeasurementOut(BaseModel):
    id: int
    type: str
    value: float
    unit: Optional[str]
    confidence: Optional[float]
    timestamp: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True


# ---- Estimates ----
class TemperatureEstimateInput(BaseModel):
    battery_temp: float  # Température batterie (°C)
    contact_time: int    # Durée contact en secondes
    ambient_temp: Optional[float] = 25.0  # Température ambiante

class TemperatureEstimateOut(BaseModel):
    estimated_temp: float
    confidence: float
    interpretation: str
    disclaimer: str = "Cette estimation est à titre informatif uniquement. Consultez un médecin pour un diagnostic."

class HRVInput(BaseModel):
    hr_samples: List[float]  # Liste de fréquences cardiaques (bpm)

class HRVOut(BaseModel):
    mean_hr: float
    hrv_sdnn: float   # Standard deviation of NN intervals
    hrv_rmssd: float  # Root mean square of successive differences
    interpretation: str


# ---- Sharing ----
class ShareCreate(BaseModel):
    duration_hours: int = 24

class ShareOut(BaseModel):
    token: str
    expires_at: datetime
    share_url: str


# ---- API Keys ----
class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyOut(BaseModel):
    id: int
    name: str
    key: str
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class ApiKeyCreated(BaseModel):
    id: int
    name: str
    key: str
    created_at: datetime
    message: str = "Conservez cette clé en sécurité, elle ne sera plus affichée."

    class Config:
        from_attributes = True

"""
Schémas Pydantic - Validation des données entrantes/sortantes
"""
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Literal
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────
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


# ── Measurements ──────────────────────────────────────────────
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


# ── Estimates : Température ───────────────────────────────────

class TemperatureEstimateInput(BaseModel):
    battery_temp: float   # T° batterie après contact cutané (°C)
    contact_time: int     # Durée contact peau-téléphone (secondes)
    ambient_temp: Optional[float] = 25.0  # T° avant contact (ambiante)

    @validator('contact_time')
    def min_contact(cls, v):
        if v < 10:
            raise ValueError("contact_time doit être ≥ 10 secondes")
        return v

    @validator('battery_temp')
    def valid_battery_temp(cls, v):
        if not (15 <= v <= 60):
            raise ValueError("battery_temp doit être entre 15°C et 60°C")
        return v

class TemperatureEstimateOut(BaseModel):
    estimated_temp: float
    confidence: float
    interpretation: str
    disclaimer: str = "Cette estimation est à titre informatif uniquement."


# ── Estimates : HRV / Fréquence Cardiaque ────────────────────

class HRVInput(BaseModel):
    hr_samples: List[float]   # Fréquences cardiaques (bpm) depuis PPG caméra
    is_rr: bool = False       # True si les valeurs sont des intervalles RR en ms

class HRVOut(BaseModel):
    mean_hr: float
    hrv_sdnn: float    # Standard deviation of NN intervals (ms)
    hrv_rmssd: float   # Root mean square of successive differences (ms)
    interpretation: str


# ── Estimates : Fréquence Respiratoire ───────────────────────

class RespirationEstimateInput(BaseModel):
    respiration_rate: float   # resp/min, calculé côté mobile (détection pics RMS)
    peaks_count: Optional[int] = None      # Nombre de cycles détectés
    duration: Optional[int] = None        # Durée de la mesure (secondes)
    noise_level: Optional[float] = None   # Bruit ambiant 0–100
    confidence: Optional[float] = None    # Confiance calculée mobile (0–1)

    @validator('respiration_rate')
    def valid_rr(cls, v):
        if not (1 <= v <= 80):
            raise ValueError("respiration_rate doit être entre 1 et 80 resp/min")
        return v

class RespirationEstimateOut(BaseModel):
    respiration_rate: int
    confidence: float
    interpretation: str
    disclaimer: str = "Cette estimation est à titre informatif uniquement."


# ── Sharing ───────────────────────────────────────────────────

class ShareCreate(BaseModel):
    duration_hours: int = 24

class ShareOut(BaseModel):
    token: str
    expires_at: datetime
    share_url: str


# ── API Keys ──────────────────────────────────────────────────

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

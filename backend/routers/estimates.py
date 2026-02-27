"""
Router Estimations ML - Température et HRV
Modèle inspiré de FeverPhone (non médical)
"""
from fastapi import APIRouter, Depends
import models
import schemas
from auth_utils import get_current_user
import math

router = APIRouter()

DISCLAIMER = "Estimation à titre informatif uniquement. Non certifié médical. Consultez un professionnel de santé."


# ---- Modèle ML simplifié pour la température ----
# Basé sur la corrélation batterie/température corporelle (inspiré FeverPhone)
def estimate_body_temperature(battery_temp: float, contact_time: int, ambient_temp: float) -> tuple[float, float]:
    """
    Estimation de la température corporelle basée sur :
    - La température de la batterie du téléphone (mesurée par l'app mobile)
    - La durée de contact avec la peau (front, poignet)
    - La température ambiante
    
    Formule simplifiée (à remplacer par un vrai modèle ML entraîné) :
    T_corps ≈ α * T_batterie + β * T_ambiante + γ * log(contact_time) + δ
    """
    # Coefficients calibrés (à affiner avec des données réelles)
    alpha = 0.62
    beta = 0.15
    gamma = 0.8
    delta = 10.2
    
    contact_factor = math.log(max(contact_time, 1))
    estimated = alpha * battery_temp + beta * ambient_temp + gamma * contact_factor + delta
    
    # Borner entre 35°C et 42°C (plage humaine)
    estimated = max(35.0, min(42.0, estimated))
    
    # Confidence basée sur la durée de contact (plus long = plus fiable)
    confidence = min(0.95, 0.5 + (contact_time / 200))
    
    return round(estimated, 1), round(confidence, 2)


def interpret_temperature(temp: float) -> str:
    if temp < 36.0:
        return "Hypothermie légère possible (< 36°C)"
    elif temp < 37.5:
        return "Température normale (36.0 - 37.4°C)"
    elif temp < 38.0:
        return "Légèrement élevée (37.5 - 37.9°C)"
    elif temp < 39.0:
        return "Fièvre légère (38.0 - 38.9°C)"
    elif temp < 40.0:
        return "Fièvre modérée (39.0 - 39.9°C)"
    else:
        return "Fièvre élevée (≥ 40°C) - Consultez un médecin"


# ---- Calcul HRV depuis les données PPG ----
def compute_hrv(hr_samples: list) -> dict:
    """
    Calcul des métriques HRV à partir d'une liste de fréquences cardiaques (bpm)
    Conversion bpm → intervalles RR en ms
    """
    if len(hr_samples) < 2:
        return {"mean_hr": hr_samples[0] if hr_samples else 0, "hrv_sdnn": 0, "hrv_rmssd": 0}
    
    # Convertir bpm en intervalles RR (ms)
    rr_intervals = [60000 / hr for hr in hr_samples if hr > 0]
    
    # Mean HR
    mean_hr = round(sum(hr_samples) / len(hr_samples), 1)
    
    # SDNN - écart-type des intervalles NN
    mean_rr = sum(rr_intervals) / len(rr_intervals)
    sdnn = math.sqrt(sum((rr - mean_rr) ** 2 for rr in rr_intervals) / len(rr_intervals))
    
    # RMSSD - racine carrée des différences successives au carré
    successive_diffs = [(rr_intervals[i+1] - rr_intervals[i])**2 for i in range(len(rr_intervals)-1)]
    rmssd = math.sqrt(sum(successive_diffs) / len(successive_diffs)) if successive_diffs else 0
    
    return {
        "mean_hr": mean_hr,
        "hrv_sdnn": round(sdnn, 1),
        "hrv_rmssd": round(rmssd, 1)
    }


def interpret_hrv(rmssd: float) -> str:
    if rmssd < 20:
        return "HRV faible - Stress élevé possible ou récupération insuffisante"
    elif rmssd < 40:
        return "HRV modérée - État normal"
    elif rmssd < 70:
        return "HRV bonne - Bonne récupération"
    else:
        return "HRV excellente - Excellent état de récupération"


# ---- Endpoints ----

@router.post("/temperature", response_model=schemas.TemperatureEstimateOut)
def estimate_temperature(
    data: schemas.TemperatureEstimateInput,
    current_user: models.User = Depends(get_current_user)
):
    """Estimer la température corporelle via capteurs smartphone"""
    estimated_temp, confidence = estimate_body_temperature(
        data.battery_temp,
        data.contact_time,
        data.ambient_temp or 25.0
    )
    
    return {
        "estimated_temp": estimated_temp,
        "confidence": confidence,
        "interpretation": interpret_temperature(estimated_temp),
        "disclaimer": DISCLAIMER
    }


@router.post("/hrv", response_model=schemas.HRVOut)
def estimate_hrv(
    data: schemas.HRVInput,
    current_user: models.User = Depends(get_current_user)
):
    """Calculer la variabilité de la fréquence cardiaque (HRV) depuis données PPG"""
    if len(data.hr_samples) < 2:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Au moins 2 échantillons requis")
    
    hrv_data = compute_hrv(data.hr_samples)
    
    return {
        **hrv_data,
        "interpretation": interpret_hrv(hrv_data["hrv_rmssd"])
    }

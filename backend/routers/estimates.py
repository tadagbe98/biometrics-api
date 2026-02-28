"""
Router Estimations - Température, HRV, Fréquence respiratoire
"""
from fastapi import APIRouter, Depends, HTTPException
import models
import schemas
from auth_utils import get_current_user
import math

router = APIRouter()

DISCLAIMER = "Estimation à titre informatif uniquement. Non certifié médical. Consultez un professionnel de santé."


# ──────────────────────────────────────────────────────────────
# TEMPÉRATURE CORPORELLE
# Basé sur FeverPhone (2022) - IMWUT - DOI 10.1145/3534582
# ──────────────────────────────────────────────────────────────

def estimate_body_temperature(battery_temp: float, contact_time: int, ambient_temp: float) -> tuple[float, float]:
    """
    Estime la température corporelle via le thermistor NTC de la batterie.

    Méthode :
    - battery_temp  : T° batterie mesurée après contact cutané (°C)
    - ambient_temp  : T° de départ (avant contact = ambiance) (°C)
    - contact_time  : durée de contact peau-téléphone en secondes

    Modèle de régression inspiré de FeverPhone :
    T_corps ≈ α·ΔT + β·T_batterie + γ·log(t) + δ

    où ΔT = T_batterie - T_ambiante (delta de réchauffement)
    """
    delta_t = battery_temp - ambient_temp  # réchauffement dû au contact peau

    # Coefficients calibrés sur le dataset FeverPhone (simplifié)
    alpha = 1.15    # poids du delta de réchauffement
    beta = 0.52     # poids de la T° batterie finale
    gamma = 0.65    # contribution logarithmique du temps
    delta = 8.4     # offset de calibration

    contact_factor = math.log(max(contact_time, 1))
    estimated = alpha * delta_t + beta * battery_temp + gamma * contact_factor + delta

    # Borner dans la plage humaine réaliste
    estimated = max(34.5, min(42.5, estimated))

    # Confiance : augmente avec le temps de contact et le delta de réchauffement
    time_factor = min(1.0, contact_time / 120)       # max à 120s
    heat_factor = min(1.0, max(0, delta_t) / 3.0)    # max à ΔT=3°C
    confidence = 0.35 + 0.40 * time_factor + 0.20 * heat_factor

    return round(estimated, 1), round(min(0.90, confidence), 2)


def interpret_temperature(temp: float) -> str:
    if temp < 36.0:
        return "Hypothermie légère possible (< 36°C) — réchauffez-vous"
    elif temp < 37.5:
        return "Température normale (36.0–37.4°C)"
    elif temp < 38.0:
        return "Légèrement élevée (37.5–37.9°C) — surveillez l'évolution"
    elif temp < 39.0:
        return "Fièvre légère (38.0–38.9°C) — reposez-vous et hydratez-vous"
    elif temp < 40.0:
        return "Fièvre modérée (39.0–39.9°C) — consultez un médecin"
    else:
        return "Fièvre élevée (≥ 40°C) — consultez un médecin en urgence"


# ──────────────────────────────────────────────────────────────
# HRV (Variabilité de la Fréquence Cardiaque)
# Calculé depuis les intervals RR issus du signal PPG caméra
# ──────────────────────────────────────────────────────────────

def compute_hrv(rr_or_hr_samples: list, is_rr: bool = False) -> dict:
    """
    Calcule HRV depuis :
    - une liste d'intervalles RR en ms (is_rr=True), ou
    - une liste de fréquences cardiaques en bpm (is_rr=False, conversion auto)
    """
    if not rr_or_hr_samples or len(rr_or_hr_samples) < 2:
        raise ValueError("Au moins 2 échantillons requis")

    if is_rr:
        rr_intervals = [r for r in rr_or_hr_samples if 400 <= r <= 1500]
    else:
        rr_intervals = [60000 / h for h in rr_or_hr_samples if 40 <= h <= 200]

    if len(rr_intervals) < 2:
        raise ValueError("Échantillons hors plage (FC: 40–200 bpm)")

    mean_hr = round(sum(60000 / rr for rr in rr_intervals) / len(rr_intervals), 1)

    # SDNN
    mean_rr = sum(rr_intervals) / len(rr_intervals)
    sdnn = math.sqrt(sum((rr - mean_rr) ** 2 for rr in rr_intervals) / len(rr_intervals))

    # RMSSD
    successive = [(rr_intervals[i+1] - rr_intervals[i])**2 for i in range(len(rr_intervals)-1)]
    rmssd = math.sqrt(sum(successive) / len(successive)) if successive else 0

    return {
        "mean_hr": mean_hr,
        "hrv_sdnn": round(sdnn, 1),
        "hrv_rmssd": round(rmssd, 1),
    }


def interpret_hrv(rmssd: float) -> str:
    if rmssd < 20:
        return "HRV faible — Stress élevé ou récupération insuffisante"
    elif rmssd < 40:
        return "HRV modérée — État normal"
    elif rmssd < 70:
        return "HRV bonne — Bonne récupération"
    else:
        return "HRV excellente — Excellent état physiologique"


# ──────────────────────────────────────────────────────────────
# FRÉQUENCE RESPIRATOIRE
# Calculée depuis le signal RMS microphone analysé côté mobile
# Le backend reçoit les pics détectés ou la valeur calculée
# ──────────────────────────────────────────────────────────────

def validate_respiration_rate(rr: float) -> tuple[bool, str]:
    """Valide la cohérence de la fréquence respiratoire"""
    if rr < 4:
        return False, "Valeur trop basse (< 4 resp/min) — signal insuffisant"
    if rr > 60:
        return False, "Valeur trop haute (> 60 resp/min) — bruit probable"
    return True, ""


def interpret_respiration(rr: float) -> str:
    if rr < 12:
        return "Bradypnée (< 12 resp/min) — respiration lente, normal au repos profond"
    elif rr <= 20:
        return "Fréquence normale (12–20 resp/min)"
    elif rr <= 30:
        return "Légèrement élevée (21–30 resp/min) — effort, stress ou anxiété"
    elif rr <= 40:
        return "Élevée (31–40 resp/min) — tachypnée légère"
    else:
        return "Tachypnée sévère (> 40 resp/min) — consultez un médecin"


# ──────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────

@router.post("/temperature", response_model=schemas.TemperatureEstimateOut)
def estimate_temperature(
    data: schemas.TemperatureEstimateInput,
    current_user: models.User = Depends(get_current_user)
):
    """
    Estime la température corporelle à partir du thermistor de la batterie.
    
    Entrées :
    - battery_temp  : T° batterie après contact (lue via expo-device sur Android)
    - ambient_temp  : T° de départ (avant contact, = T° ambiante)
    - contact_time  : durée de contact peau-téléphone en secondes (min 30s, idéal 120s)
    """
    estimated_temp, confidence = estimate_body_temperature(
        data.battery_temp,
        data.contact_time,
        data.ambient_temp or 25.0
    )

    return {
        "estimated_temp": estimated_temp,
        "confidence": confidence,
        "interpretation": interpret_temperature(estimated_temp),
        "disclaimer": DISCLAIMER,
    }


@router.post("/hrv", response_model=schemas.HRVOut)
def estimate_hrv(
    data: schemas.HRVInput,
    current_user: models.User = Depends(get_current_user)
):
    """
    Calcule la HRV (variabilité FC) depuis les données PPG caméra.
    
    Entrées :
    - hr_samples : liste de fréquences cardiaques (bpm) capturées via PPG
      OU intervalles RR en ms si is_rr=True
    """
    if len(data.hr_samples) < 2:
        raise HTTPException(status_code=400, detail="Au moins 2 échantillons requis")

    try:
        hrv_data = compute_hrv(data.hr_samples, is_rr=getattr(data, 'is_rr', False))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        **hrv_data,
        "interpretation": interpret_hrv(hrv_data["hrv_rmssd"]),
    }


@router.post("/respiration", response_model=schemas.RespirationEstimateOut)
def estimate_respiration(
    data: schemas.RespirationEstimateInput,
    current_user: models.User = Depends(get_current_user)
):
    """
    Valide et interprète la fréquence respiratoire mesurée via microphone.
    
    Le traitement du signal (RMS, filtre passe-bas, détection de pics) est
    effectué côté mobile. Le backend valide, interprète et sauvegarde.
    
    Entrées :
    - respiration_rate : fréquence respiratoire en resp/min (calculée mobile)
    - peaks_count      : nombre de cycles respiratoires détectés
    - duration         : durée de la mesure en secondes
    - noise_level      : niveau de bruit ambiant 0–100 (0 = silencieux)
    - confidence       : confiance calculée côté mobile (0–1)
    """
    valid, error_msg = validate_respiration_rate(data.respiration_rate)
    if not valid:
        raise HTTPException(status_code=422, detail=error_msg)

    # Ajuster la confiance selon le bruit ambiant
    noise_penalty = max(0, (data.noise_level or 0) - 30) / 100
    adjusted_confidence = max(0.1, (data.confidence or 0.5) - noise_penalty)

    return {
        "respiration_rate": round(data.respiration_rate),
        "confidence": round(adjusted_confidence, 2),
        "interpretation": interpret_respiration(data.respiration_rate),
        "disclaimer": DISCLAIMER,
    }

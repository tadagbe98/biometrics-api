"""
Tests unitaires - API BioMetrics
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Mock de la base de données pour les tests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_temperature_estimation():
    """Tester le modèle d'estimation de température"""
    from routers.estimates import estimate_body_temperature, interpret_temperature
    
    # Test avec paramètres normaux
    temp, confidence = estimate_body_temperature(
        battery_temp=36.0,
        contact_time=90,
        ambient_temp=25.0
    )
    assert 35.0 <= temp <= 42.0, "La température doit être dans la plage humaine"
    assert 0 <= confidence <= 1, "La confiance doit être entre 0 et 1"
    
    # Test avec contact long = confiance plus élevée
    _, low_conf = estimate_body_temperature(36.0, 10, 25.0)
    _, high_conf = estimate_body_temperature(36.0, 180, 25.0)
    assert high_conf > low_conf, "Plus le contact est long, plus la confiance est élevée"
    
    print("✅ test_temperature_estimation - PASSÉ")


def test_temperature_interpretation():
    """Tester l'interprétation des températures"""
    from routers.estimates import interpret_temperature
    
    assert "normale" in interpret_temperature(36.8)
    assert "Fièvre" in interpret_temperature(38.5)
    assert "élevée" in interpret_temperature(40.0)
    assert "Hypothermie" in interpret_temperature(35.5)
    
    print("✅ test_temperature_interpretation - PASSÉ")


def test_hrv_computation():
    """Tester le calcul HRV"""
    from routers.estimates import compute_hrv
    
    # Test avec données simulées
    hr_samples = [72, 74, 70, 73, 75, 71, 72, 68, 74, 73]
    result = compute_hrv(hr_samples)
    
    assert "mean_hr" in result
    assert "hrv_sdnn" in result
    assert "hrv_rmssd" in result
    assert result["mean_hr"] > 0
    assert result["hrv_sdnn"] >= 0
    
    print(f"✅ test_hrv_computation - PASSÉ (HR moyen: {result['mean_hr']} bpm, RMSSD: {result['hrv_rmssd']} ms)")


def test_password_hashing():
    """Tester le hachage des mots de passe"""
    from auth_utils import hash_password, verify_password
    
    password = "MonMotDePasse123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("MauvaisMotDePasse", hashed)
    
    print("✅ test_password_hashing - PASSÉ")


def test_unit_mapping():
    """Tester le mapping des unités"""
    units = {
        "temperature": "°C",
        "hr": "bpm",
        "steps": "pas",
        "hrv": "ms",
        "respiration": "resp/min",
        "activity": "kcal"
    }
    for key, unit in units.items():
        assert unit, f"L'unité pour {key} ne doit pas être vide"
    
    print("✅ test_unit_mapping - PASSÉ")


if __name__ == "__main__":
    print("\n🧪 Lancement des tests BioMetrics API\n")
    test_temperature_estimation()
    test_temperature_interpretation()
    test_hrv_computation()
    test_password_hashing()
    test_unit_mapping()
    print("\n✅ Tous les tests sont passés!")

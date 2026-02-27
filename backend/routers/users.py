"""
Router Utilisateurs - Partage de données, gestion profil
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth_utils import get_current_user
from datetime import datetime, timedelta
import secrets
import os

router = APIRouter()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


@router.post("/share", response_model=schemas.ShareOut)
def create_share_link(
    share_data: schemas.ShareCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Générer un lien de partage temporaire de ses données"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=share_data.duration_hours)
    
    share_token = models.ShareToken(
        user_id=current_user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(share_token)
    db.commit()
    
    return {
        "token": token,
        "expires_at": expires_at,
        "share_url": f"{BASE_URL}/api/v1/users/shared/{token}"
    }


@router.get("/shared/{token}")
def get_shared_data(token: str, db: Session = Depends(get_db)):
    """Accéder aux données partagées via un token public"""
    share_token = db.query(models.ShareToken).filter(
        models.ShareToken.token == token,
        models.ShareToken.is_active == True
    ).first()
    
    if not share_token:
        raise HTTPException(status_code=404, detail="Lien de partage invalide")
    
    if share_token.expires_at < datetime.utcnow():
        share_token.is_active = False
        db.commit()
        raise HTTPException(status_code=410, detail="Lien de partage expiré")
    
    # Retourner les mesures récentes (48h)
    recent_measurements = db.query(models.Measurement).filter(
        models.Measurement.user_id == share_token.user_id,
        models.Measurement.timestamp >= datetime.utcnow() - timedelta(hours=48)
    ).order_by(models.Measurement.timestamp.desc()).all()
    
    user = db.query(models.User).filter(models.User.id == share_token.user_id).first()
    
    return {
        "user_name": user.name,
        "shared_at": share_token.created_at,
        "expires_at": share_token.expires_at,
        "measurements": [
            {
                "type": m.type,
                "value": m.value,
                "unit": m.unit,
                "timestamp": m.timestamp
            } for m in recent_measurements
        ],
        "disclaimer": "Données à titre informatif uniquement. Non médical."
    }


@router.delete("/share/{token}")
def revoke_share(
    token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Révoquer un lien de partage"""
    share_token = db.query(models.ShareToken).filter(
        models.ShareToken.token == token,
        models.ShareToken.user_id == current_user.id
    ).first()
    
    if not share_token:
        raise HTTPException(status_code=404, detail="Lien introuvable")
    
    share_token.is_active = False
    db.commit()
    return {"message": "Lien de partage révoqué"}

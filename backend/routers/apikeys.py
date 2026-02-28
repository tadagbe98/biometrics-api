"""
Router API Keys - Génération et gestion des clés API développeurs
"""
import secrets
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth_utils import get_current_user

router = APIRouter()

def generate_api_key() -> str:
    """Génère une clé API au format bm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"""
    return f"bm_{secrets.token_hex(24)}"


@router.post("/", response_model=schemas.ApiKeyCreated, status_code=status.HTTP_201_CREATED)
def create_api_key(
    data: schemas.ApiKeyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Générer une nouvelle clé API"""
    # Max 10 clés par utilisateur
    count = db.query(models.ApiKey).filter(
        models.ApiKey.user_id == current_user.id,
        models.ApiKey.is_active == True
    ).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 clés API actives atteint")

    api_key = models.ApiKey(
        user_id=current_user.id,
        name=data.name,
        key=generate_api_key()
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key


@router.get("/", response_model=list[schemas.ApiKeyOut])
def list_api_keys(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lister toutes ses clés API"""
    keys = db.query(models.ApiKey).filter(
        models.ApiKey.user_id == current_user.id
    ).order_by(models.ApiKey.created_at.desc()).all()

    # Masquer la clé sauf les 8 derniers caractères
    for key in keys:
        key.key = f"bm_{'*' * 40}{key.key[-8:]}"
    return keys


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
def revoke_api_key(
    key_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Révoquer une clé API"""
    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.id == key_id,
        models.ApiKey.user_id == current_user.id
    ).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="Clé API introuvable")

    api_key.is_active = False
    db.commit()
    return {"message": "Clé API révoquée avec succès"}


def get_user_from_api_key(api_key: str, db: Session) -> models.User:
    """Récupère l'utilisateur depuis une clé API (pour les routes protégées par API key)"""
    key_obj = db.query(models.ApiKey).filter(
        models.ApiKey.key == api_key,
        models.ApiKey.is_active == True
    ).first()
    if not key_obj:
        raise HTTPException(status_code=401, detail="Clé API invalide ou révoquée")

    # Mettre à jour last_used_at
    key_obj.last_used_at = datetime.utcnow()
    db.commit()

    user = db.query(models.User).filter(models.User.id == key_obj.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur inactif")
    return user

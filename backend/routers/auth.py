"""
Router Authentification - Register, Login, Me
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth_utils import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Créer un nouveau compte utilisateur"""
    # Vérifier si l'email existe déjà
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Créer l'utilisateur
    user = models.User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
        consent_given=user_data.consent_given
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Générer le token
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Connexion et récupération du token JWT"""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Informations de l'utilisateur connecté"""
    return current_user


@router.delete("/me")
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer son compte et toutes ses données (droit RGPD)"""
    # Supprimer les mesures
    db.query(models.Measurement).filter(
        models.Measurement.user_id == current_user.id
    ).delete()
    # Supprimer les tokens de partage
    db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).delete()
    # Supprimer l'utilisateur
    db.delete(current_user)
    db.commit()
    return {"message": "Compte et données supprimés avec succès"}

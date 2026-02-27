"""
Router Mesures - Submit, Latest, History
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
import models
import schemas
from auth_utils import get_current_user
from datetime import datetime, date
from typing import Optional, List
import json

router = APIRouter()

# Unités par type de mesure
UNITS = {
    "temperature": "°C",
    "hr": "bpm",
    "steps": "pas",
    "hrv": "ms",
    "respiration": "resp/min",
    "activity": "kcal"
}


@router.post("/submit", response_model=schemas.MeasurementOut)
def submit_measurement(
    data: schemas.MeasurementSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soumettre une nouvelle mesure depuis le mobile"""
    measurement = models.Measurement(
        user_id=current_user.id,
        type=data.type,
        value=data.value,
        unit=UNITS.get(data.type),
        timestamp=data.timestamp or datetime.utcnow(),
        raw_data=json.dumps(data.raw_data) if data.raw_data else None,
        notes=data.notes
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/latest/{measurement_type}", response_model=schemas.MeasurementOut)
def get_latest(
    measurement_type: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dernière mesure d'un type donné"""
    m = db.query(models.Measurement).filter(
        models.Measurement.user_id == current_user.id,
        models.Measurement.type == measurement_type
    ).order_by(desc(models.Measurement.timestamp)).first()
    
    if not m:
        raise HTTPException(status_code=404, detail=f"Aucune mesure '{measurement_type}' trouvée")
    return m


@router.get("/history/{measurement_type}", response_model=List[schemas.MeasurementOut])
def get_history(
    measurement_type: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(100, le=500),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Historique des mesures sur une période"""
    query = db.query(models.Measurement).filter(
        models.Measurement.user_id == current_user.id,
        models.Measurement.type == measurement_type
    )
    
    if from_date:
        query = query.filter(models.Measurement.timestamp >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.filter(models.Measurement.timestamp <= datetime.combine(to_date, datetime.max.time()))
    
    return query.order_by(desc(models.Measurement.timestamp)).limit(limit).all()


@router.get("/summary")
def get_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Résumé de toutes les dernières mesures"""
    types = ["temperature", "hr", "steps", "hrv", "respiration", "activity"]
    summary = {}
    
    for t in types:
        m = db.query(models.Measurement).filter(
            models.Measurement.user_id == current_user.id,
            models.Measurement.type == t
        ).order_by(desc(models.Measurement.timestamp)).first()
        
        if m:
            summary[t] = {
                "value": m.value,
                "unit": m.unit,
                "timestamp": m.timestamp.isoformat(),
                "confidence": m.confidence
            }
    
    return {"user": current_user.name, "summary": summary}


@router.delete("/{measurement_id}")
def delete_measurement(
    measurement_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer une mesure spécifique"""
    m = db.query(models.Measurement).filter(
        models.Measurement.id == measurement_id,
        models.Measurement.user_id == current_user.id
    ).first()
    
    if not m:
        raise HTTPException(status_code=404, detail="Mesure introuvable")
    
    db.delete(m)
    db.commit()
    return {"message": "Mesure supprimée"}

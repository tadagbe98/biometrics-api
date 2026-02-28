"""
BioMetrics API - Mesure de Données Corporelles
Auteur: TADAGBE LANDRY
Version: 1.0
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
from datetime import datetime

from routers import auth, measurements, estimates, users, apikeys
from database import engine, Base

# Création des tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BioMetrics API",
    description="API de mesure de données corporelles - Usage personnel bien-être",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS pour React Web et React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En prod: spécifier les domaines
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentification"])
app.include_router(measurements.router, prefix="/api/v1/measurements", tags=["Mesures"])
app.include_router(estimates.router, prefix="/api/v1/estimate", tags=["Estimations ML"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Utilisateurs"])
app.include_router(apikeys.router, prefix="/api/v1/keys", tags=["Clés API"])

@app.get("/")
def root():
    return {
        "app": "BioMetrics API",
        "version": "1.0.0",
        "status": "running",
        "disclaimer": "Cet outil est uniquement à titre informatif. Non médical.",
        "docs": "/api/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

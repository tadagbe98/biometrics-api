"""
BioMetrics API - Mesure de Données Corporelles
Auteur: TADAGBE LANDRY
Version: 1.1 - Fix CORS Railway + Vercel
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from datetime import datetime

from routers import auth, measurements, estimates, users
from database import engine, Base
from middleware import RateLimitMiddleware, LoggingMiddleware, SecurityHeadersMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BioMetrics API",
    description="API de mesure de données corporelles - Usage personnel bien-être",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# ----------------------------------------------------------------
# CORS CORRIGÉ
#
# PROBLÈME : allow_origins=["*"] + allow_credentials=True
# → Interdit par la spec CORS (RFC 6454) — le navigateur bloque.
#
# SOLUTION : lister explicitement les origines autorisées.
# Ajoutez votre vraie URL Vercel dans EXTRA_ALLOWED_ORIGINS sur Railway.
# ----------------------------------------------------------------
ALLOWED_ORIGINS = [
    # Dev local
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]

# Lire les origines supplémentaires depuis la variable d'env Railway
# Sur Railway : Settings → Variables → ALLOWED_ORIGINS=https://votre-app.vercel.app
raw = os.getenv("ALLOWED_ORIGINS", "")
if raw:
    for origin in raw.split(","):
        origin = origin.strip()
        if origin:
            ALLOWED_ORIGINS.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
    max_age=600,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Routers
app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["Authentification"])
app.include_router(measurements.router, prefix="/api/v1/measurements", tags=["Mesures"])
app.include_router(estimates.router,    prefix="/api/v1/estimate",     tags=["Estimations ML"])
app.include_router(users.router,        prefix="/api/v1/users",        tags=["Utilisateurs"])

@app.get("/")
def root():
    return {
        "app": "BioMetrics API",
        "version": "1.1.0",
        "status": "running",
        "disclaimer": "Cet outil est uniquement à titre informatif. Non médical.",
        "docs": "/api/docs",
        "allowed_origins": ALLOWED_ORIGINS,  # Debug temporaire
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

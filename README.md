# 💗 BioMetrics - Suivi de Données Corporelles

> API et applications de suivi de bien-être personnel via les capteurs smartphone.  
> Projet de **TADAGBE LANDRY** — Abidjan, Côte d'Ivoire 🇨🇮

---

## ⚠️ Disclaimer
> Cet outil est **exclusivement à usage personnel et de bien-être**. Il ne constitue pas un dispositif médical certifié. Les données fournies sont des estimations indicatives. Consultez un professionnel de santé pour tout diagnostic médical.

---

## 🏗️ Architecture

```
biometrics-api/
├── backend/              # API FastAPI (Python)
│   ├── main.py           # Point d'entrée
│   ├── database.py       # Config PostgreSQL
│   ├── models.py         # Modèles SQLAlchemy
│   ├── schemas.py        # Validation Pydantic
│   ├── auth_utils.py     # JWT, hachage mots de passe
│   ├── routers/
│   │   ├── auth.py       # Register/Login/Me
│   │   ├── measurements.py  # CRUD mesures
│   │   ├── estimates.py  # ML: Température & HRV
│   │   └── users.py      # Partage de données
│   └── tests.py          # Tests unitaires
│
├── frontend-web/         # App React Web (PWA)
│   └── src/
│       ├── App.jsx
│       ├── pages/Dashboard.jsx
│       ├── pages/AuthPage.jsx
│       ├── hooks/useMeasurements.js
│       ├── contexts/AuthContext.js
│       └── utils/api.js
│
├── mobile-app/           # App React Native (Expo)
│   └── src/
│       ├── screens/HomeScreen.js
│       ├── screens/TemperatureScanScreen.js
│       ├── screens/HeartRateScreen.js
│       └── utils/api.js
│
├── docker-compose.yml    # Backend + PostgreSQL
├── .github/workflows/    # CI/CD GitHub Actions
└── .env.example          # Variables d'environnement
```

---

## 🚀 Démarrage Rapide

### Prérequis
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### 1. Backend

```bash
# Copier les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrer PostgreSQL + API avec Docker
docker-compose up -d

# OU lancer manuellement
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

L'API sera disponible sur : http://localhost:8000  
Documentation Swagger : http://localhost:8000/api/docs

### 2. Frontend Web

```bash
cd frontend-web
npm install
npm start
# Accès sur http://localhost:3000
```
SECRET_KEY=499985928e8b0a2bc906e79364fda6d77d928f1f7eaca851f592437f91e36c53
DATABASE_URL=postgresql://biometrics_user:password123@localhost:5432/biometrics_db
### 3. Application Mobile

```bash
cd mobile-app
npm install
npx expo start
# Scanner le QR code avec Expo Go (Android/iOS)
```

---

## 📡 API Endpoints

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/auth/register` | Créer un compte |
| POST | `/api/v1/auth/login` | Connexion (retourne JWT) |
| GET | `/api/v1/auth/me` | Infos utilisateur connecté |
| DELETE | `/api/v1/auth/me` | Supprimer son compte (RGPD) |

### Mesures
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/measurements/submit` | Soumettre une mesure |
| GET | `/api/v1/measurements/latest/:type` | Dernière mesure |
| GET | `/api/v1/measurements/history/:type` | Historique |
| GET | `/api/v1/measurements/summary` | Résumé de toutes les mesures |

### Estimations ML
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/estimate/temperature` | Estimation température (FeverPhone) |
| POST | `/api/v1/estimate/hrv` | Calcul HRV depuis données PPG |

### Types de mesures supportés
- `temperature` — Température corporelle (°C)
- `hr` — Fréquence cardiaque (bpm)
- `steps` — Nombre de pas
- `hrv` — Variabilité cardiaque (ms)
- `respiration` — Fréquence respiratoire (resp/min)
- `activity` — Calories brûlées (kcal)

---

## 🔬 Modèle ML - Estimation de Température

Inspiré du projet **FeverPhone** (Université de Washington), le modèle estime la température corporelle à partir de :
- La **température de la batterie** (capteur interne Android)
- La **durée de contact** peau-écran
- La **température ambiante** (capteur environnemental)

```
T_corps ≈ 0.62 × T_batterie + 0.15 × T_ambiante + 0.8 × log(contact_time) + 10.2
```

⚠️ Ce modèle est une approximation. Pour une meilleure précision, entraîner le modèle avec des données réelles (voir section "Amélioration ML").

---

## 📊 Base de Données

### Tables
- **users** — Comptes utilisateurs (email, nom, mot de passe haché)
- **measurements** — Mesures physiologiques avec timestamps
- **share_tokens** — Tokens de partage temporaires

### Migration avec Alembic

```bash
cd backend
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

## 🔒 Sécurité & RGPD

- **JWT** pour l'authentification (expiration 24h)
- **Bcrypt** pour le hachage des mots de passe
- **Consentement explicite** requis à l'inscription
- **Droit à la suppression** : `DELETE /api/v1/auth/me`
- HTTPS obligatoire en production
- Logs anonymisés (pas de données personnelles en clair)

---

## 🧪 Tests

```bash
# Backend
cd backend
python tests.py

# Avec pytest
pytest tests.py -v

# Frontend
cd frontend-web
npm test
```

---

## 🌍 Déploiement Production (Recommandé pour CI)

### Render.com (~7$/mois)
1. Créer un compte sur render.com
2. Connecter le repo GitHub
3. Créer un Web Service → pointer sur `/backend`
4. Ajouter les variables d'environnement
5. Créer une base de données PostgreSQL sur Render

### Variables en production
```
DATABASE_URL=postgresql://...  (fourni par Render)
SECRET_KEY=...                  (générer un secret fort)
BASE_URL=https://votre-app.onrender.com
ENVIRONMENT=production
```

---

## 🗺️ Roadmap

### V1.0 (Actuel)
- [x] API REST avec authentification JWT
- [x] CRUD des mesures (température, FC, pas, HRV)
- [x] Modèle ML estimation température
- [x] Calcul HRV depuis PPG
- [x] Dashboard React Web avec graphiques
- [x] App React Native (Expo)
- [x] Partage de données temporaire

### V2.0 (À venir)
- [ ] Notifications push (fièvre > 38°C)
- [ ] Intégration IA plus avancée (TensorFlow.js)
- [ ] Export PDF des données
- [ ] Mode hors-ligne avec sync
- [ ] Tableau de bord famille
- [ ] Intégration Google Fit / Apple Health

---

## 👨‍💻 Auteur

**TADAGBE LANDRY**  
📍 Abidjan, Côte d'Ivoire  
📧 Projet BioMetrics v1.0

---

## 📄 Licence

Usage personnel. Non médical. Voir DISCLAIMER en tête de ce document.

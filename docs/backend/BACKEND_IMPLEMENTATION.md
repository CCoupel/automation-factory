# Implémentation Backend - Automation Factory

Ce document décrit les détails techniques et l'implémentation concrète du backend FastAPI.

---

## 🏗️ **Structure du Projet**

### Organisation des Fichiers
```
backend/
├── app/
│   ├── main.py                    # Point d'entrée FastAPI
│   ├── version.py                 # Versioning
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Configuration centralisée
│   │   ├── database.py            # Connexion SQLite/SQLAlchemy
│   │   ├── security.py            # JWT et cryptographie
│   │   └── dependencies.py        # Dependencies FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                # Modèle utilisateur
│   │   ├── playbook.py            # Modèle playbook
│   │   ├── user_preferences.py    # Préférences utilisateur (favoris)
│   │   ├── custom_variable_type.py # Types variables custom (v1.16.0)
│   │   └── base.py                # Classe base SQLAlchemy
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                # Schémas Pydantic utilisateur
│   │   ├── playbook.py            # Schémas Pydantic playbook
│   │   ├── galaxy.py              # Schémas Galaxy API
│   │   └── variable_type.py       # Schémas types variables (v1.16.0)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py              # Router principal
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── auth.py            # Authentification
│   │       ├── playbooks.py       # Gestion playbooks
│   │       ├── admin.py           # Administration
│   │       ├── ansible.py         # Ansible docs API (v1.10.0)
│   │       ├── user_favorites.py  # Favoris utilisateur (DB storage)
│   │       ├── variable_types.py  # Types variables (v1.16.0)
│   │       └── admin_configuration.py # Config admin
│   └── services/
│       ├── __init__.py
│       ├── ansible_collections_service.py # Service docs Ansible
│       ├── ansible_versions_service.py    # Service versions Ansible
│       ├── variable_type_service.py       # Service validation types (v1.16.0)
│       ├── playbook_service.py     # Service playbooks
│       └── cache_service.py        # Service cache Redis
├── requirements.txt               # Dépendances Python
├── Dockerfile                    # Image Docker
└── alembic/                      # Migrations DB (future)
```

---

## 🚀 **Point d'Entrée : main.py**

### Configuration FastAPI
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()  # Initialisation DB + utilisateur admin
    yield
    # Shutdown (cleanup si nécessaire)

app = FastAPI(
    title="Automation Factory API",
    description="API backend pour Automation Factory",
    version="1.8.1",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configuré selon environnement
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router principal
app.include_router(api_router, prefix="/api")
```

---

## 🗄️ **Base de Données : database.py**

### Configuration SQLAlchemy
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "sqlite+aiosqlite:///./automation_factory.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Logs SQL en développement
    connect_args={"check_same_thread": False}
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """Dependency pour injection session DB"""
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """Initialisation base + données par défaut"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Création utilisateur admin par défaut
    await create_default_admin_user()
```

---

## 🔐 **Sécurité : security.py**

### JWT Implementation
```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

# Configuration
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérification mot de passe bcrypt"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash mot de passe avec bcrypt"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Création token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Décoding et validation token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

### Dependencies d'Authentification
```python
# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Récupération utilisateur actuel via JWT"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = payload.get("sub")
    user = await get_user_by_id(db, user_id)
    
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Vérification droits admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges"
        )
    return current_user
```

---

## 👤 **Modèles de Données**

### User Model
```python
# models/user.py
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Playbook Model
```python
# models/playbook.py
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Playbook(Base):
    __tablename__ = "playbooks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # JSON serialized
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="playbooks")
```

---

## 📋 **Schémas Pydantic**

### User Schemas
```python
# schemas/user.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

### Playbook Schemas
```python
# schemas/playbook.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class PlaybookBase(BaseModel):
    name: str
    content: Dict[str, Any]

class PlaybookCreate(PlaybookBase):
    pass

class PlaybookUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[Dict[str, Any]] = None

class PlaybookResponse(PlaybookBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

---

## 🌌 **Service Galaxy SMART**

### Architecture 3-Niveaux
```python
# services/galaxy_service_smart.py
import asyncio
import aiohttp
from typing import List, Dict, Optional
from app.services.cache_service import CacheService

class GalaxyServiceSmart:
    def __init__(self):
        self.base_url = "https://galaxy.ansible.com/api/v3"
        self.cache = CacheService()
        self.popular_namespaces = []
        self.background_task = None

    async def initialize(self):
        """Niveau 1: Chargement namespaces populaires"""
        popular_list = [
            "community", "ansible", "redhat", "kubernetes", 
            "google", "amazon", "microsoft", "docker", "nginx", "apache"
        ]
        
        for namespace in popular_list[:10]:  # Limiter à 10
            await self.enrich_namespace(namespace)
            
        # Lancer enrichissement background
        self.background_task = asyncio.create_task(self.background_enrichment())

    async def enrich_namespace(self, namespace: str) -> Dict:
        """Niveau 3: Enrichissement on-demand"""
        # Vérifier cache
        cached = await self.cache.get(f"galaxy:namespace:{namespace}")
        if cached:
            return cached

        # Appel API Galaxy
        async with aiohttp.ClientSession() as session:
            # Récupérer détails namespace
            namespace_url = f"{self.base_url}/namespaces/?name={namespace}"
            async with session.get(namespace_url) as response:
                if response.status == 200:
                    data = await response.json()
                    
            # Récupérer collections
            collections_url = f"{self.base_url}/collections/?namespace={namespace}"
            async with session.get(collections_url) as response:
                collections_data = await response.json()

        # Traitement et cache
        enriched_data = self.process_namespace_data(data, collections_data)
        await self.cache.set(f"galaxy:namespace:{namespace}", enriched_data, ttl=1800)
        
        return enriched_data

    async def background_enrichment(self):
        """Niveau 2: Enrichissement background"""
        all_namespaces = await self.get_all_namespaces()
        
        for namespace in all_namespaces:
            if namespace not in self.popular_namespaces:
                await self.enrich_namespace(namespace["name"])
                await asyncio.sleep(0.1)  # Rate limiting
```

---

## 📡 **Endpoints API**

### Authentification Endpoints
```python
# api/endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserLogin, UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Connexion utilisateur"""
    user = await authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Inscription utilisateur"""
    # Vérifier email unique
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Créer utilisateur
    hashed_password = get_password_hash(user_data.password)
    user = await create_user(db, user_data, hashed_password)
    return user

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Profil utilisateur actuel"""
    return current_user
```

### Playbooks Endpoints
```python
# api/endpoints/playbooks.py
@router.get("/", response_model=List[PlaybookResponse])
async def get_user_playbooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Liste des playbooks de l'utilisateur"""
    playbooks = await get_playbooks_by_user(db, current_user.id, skip, limit)
    return playbooks

@router.post("/", response_model=PlaybookResponse)
async def create_playbook(
    playbook_data: PlaybookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Création nouveau playbook"""
    playbook = await create_user_playbook(db, playbook_data, current_user.id)
    return playbook

@router.put("/{playbook_id}", response_model=PlaybookResponse)
async def update_playbook(
    playbook_id: str,
    playbook_data: PlaybookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mise à jour playbook"""
    # Vérifier propriétaire
    playbook = await get_playbook_by_id(db, playbook_id)
    if not playbook or playbook.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )
    
    updated_playbook = await update_user_playbook(db, playbook_id, playbook_data)
    return updated_playbook
```

---

## 🔧 **Types de Variables Personnalisables (v1.16.0)**

### Modèle CustomVariableType
```python
# models/custom_variable_type.py
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class CustomVariableType(Base):
    __tablename__ = "custom_variable_types"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False)  # ex: 'mail', 'ip', 'json'
    label = Column(String(100), nullable=False)              # ex: 'Email Address'
    description = Column(Text, nullable=True)
    pattern = Column(String(500), nullable=False)            # regexp OU filtre
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
```

### Service de Validation
```python
# services/variable_type_service.py
import re
import json
import yaml

BUILTIN_TYPES = {'string', 'int', 'bool', 'list', 'dict'}

SUPPORTED_FILTERS = {
    'from_json': lambda v: json.loads(v),
    'from_yaml': lambda v: yaml.safe_load(v),
}

def validate_value(value: str, pattern: str) -> tuple[bool, str, Any]:
    """
    Valide une valeur contre un pattern.
    - Si pattern commence par '|' : c'est un filtre Ansible
    - Sinon : c'est une expression régulière
    """
    if pattern.startswith('|'):
        filter_name = pattern[1:].strip()
        if filter_name not in SUPPORTED_FILTERS:
            return False, f"Filtre inconnu: {filter_name}", None
        try:
            parsed = SUPPORTED_FILTERS[filter_name](value)
            return True, "Validation réussie", parsed
        except Exception as e:
            return False, f"Erreur de validation: {str(e)}", None
    else:
        # Validation regexp
        try:
            if re.fullmatch(pattern, value):
                return True, "Match", value
            return False, "Format invalide", None
        except re.error as e:
            return False, f"Regexp invalide: {str(e)}", None
```

### Endpoints API Variable Types
```python
# api/endpoints/variable_types.py

# Endpoints publics (utilisateurs authentifiés)
@router.get("/variable-types")
async def get_variable_types(...) -> List[VariableTypeResponse]:
    """Liste types builtin + custom actifs"""

@router.post("/variable-types/validate")
async def validate_value(...) -> ValidateValueResponse:
    """Valide une valeur contre un type"""

# Endpoints admin
@router.get("/variable-types/admin")
async def admin_get_all_types(...) -> List[VariableTypeResponse]:
    """Liste tous les types custom (actifs + inactifs)"""

@router.post("/variable-types/admin")
async def admin_create_type(...) -> VariableTypeResponse:
    """Crée un type custom"""

@router.put("/variable-types/admin/{type_id}")
async def admin_update_type(...) -> VariableTypeResponse:
    """Modifie un type custom"""

@router.delete("/variable-types/admin/{type_id}")
async def admin_delete_type(...) -> dict:
    """Supprime un type custom"""
```

### Types Prédéfinis Exemples
| name | label | pattern |
|------|-------|---------|
| mail | Email | `^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$` |
| ip | IP Address | `^(\d{1,3}\.){3}\d{1,3}$` |
| url | URL | `^https?://.*` |
| json | JSON | `\| from_json` |
| yaml | YAML | `\| from_yaml` |

---

## 👤 **Favoris Utilisateur (DB Storage)**

### Stockage en Base de Données
```python
# api/endpoints/user_favorites.py
# IMPORTANT: Toutes les données stockées en DB, PAS de fichiers /tmp

@router.get("/user/favorites")
async def get_favorite_namespaces(...):
    """Favoris namespaces depuis user_preferences.favorite_namespaces"""

@router.get("/user/favorites/collections")
async def get_favorite_collections(...):
    """Favoris collections depuis user_preferences.galaxy_settings"""

@router.get("/user/favorites/modules")
async def get_favorite_modules(...):
    """Favoris modules depuis user_preferences.galaxy_settings"""
```

### SQLAlchemy JSON Change Detection
```python
# IMPORTANT: SQLAlchemy ne détecte pas les modifications in-place des JSON
# Solution: Toujours créer une copie avant modification

# ❌ Ne fonctionne PAS
preferences.galaxy_settings["favorite_collections"].append(collection)
await db.commit()  # Changement non détecté !

# ✅ Fonctionne
galaxy_settings = dict(preferences.galaxy_settings or {})
favorites = list(galaxy_settings.get("favorite_collections", []))
favorites.append(collection)
galaxy_settings["favorite_collections"] = favorites
preferences.galaxy_settings = galaxy_settings.copy()  # Nouvelle référence
await db.commit()  # Changement détecté ✓
```

---

## 🎯 **Cache Service Redis**

### Implementation Cache
```python
# services/cache_service.py
import redis.asyncio as redis
import json
from typing import Any, Optional

class CacheService:
    def __init__(self):
        self.redis_client = redis.from_url("redis://redis:6379/0")

    async def get(self, key: str) -> Optional[Any]:
        """Récupération valeur cache"""
        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Stockage valeur cache"""
        try:
            serialized = json.dumps(value, default=str)
            await self.redis_client.setex(key, ttl, serialized)
        except Exception as e:
            print(f"Cache set error: {e}")

    async def delete(self, key: str):
        """Suppression clé cache"""
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")

    async def exists(self, key: str) -> bool:
        """Vérification existence clé"""
        try:
            return await self.redis_client.exists(key) > 0
        except Exception:
            return False
```

---

## 🔧 **Configuration : config.py**

### Settings Centralisées
```python
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./automation_factory.db"
    
    # JWT
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    
    # Redis
    redis_url: str = "redis://redis:6379/0"
    
    # Galaxy API
    galaxy_base_url: str = "https://galaxy.ansible.com/api/v3"
    galaxy_cache_ttl: int = 1800
    
    # CORS
    backend_cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://coupel.net"
    ]
    
    # Debug
    debug: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 🧪 **Tests et Validation**

### Test Structure
```python
# tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    """Test connexion réussie"""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials():
    """Test connexion échec"""
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "wrong"}
    )
    assert response.status_code == 401

def test_protected_endpoint():
    """Test endpoint protégé"""
    # Sans token
    response = client.get("/api/auth/me")
    assert response.status_code == 403
    
    # Avec token
    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

---

## 🚀 **Déploiement Docker**

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code application
COPY . .

# Port exposition
EXPOSE 8000

# Command start
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Requirements.txt
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
aiosqlite==0.19.0
alembic==1.12.1
pydantic[email]==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis[hiredis]==5.0.1
aiohttp==3.9.0
asyncio-throttle==1.0.2
```

---

## 📊 **Monitoring et Logs**

### Logging Configuration
```python
import logging
import sys
from pythonjsonlogger import jsonlogger

# Configuration logs JSON
logHandler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
logHandler.setFormatter(formatter)

logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

# Usage dans services
logger.info("Namespace enriched", extra={
    "namespace": namespace,
    "duration_ms": duration,
    "cache_hit": cache_hit
})
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-29*

*Voir aussi :*
- [Spécifications Backend](BACKEND_SPECS.md)
- [Galaxy Integration](GALAXY_INTEGRATION.md)
- [Frontend Implementation](../frontend/FRONTEND_IMPLEMENTATION.md)
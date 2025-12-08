# Guide Claude - Ansible Builder Backend

Ce document contient toute la documentation technique backend du projet Ansible Builder.

---

## 🎨 Stack Technique

### Framework et Outils

**Backend:**
- **Framework**: FastAPI (Python 3.11+) - v1.3.8 avec initialisation automatique
- **Base de données**: SQLite (par défaut) ou PostgreSQL (prod) - configurable via DATABASE_TYPE
- **ORM**: SQLAlchemy 2.0 (async avec asyncio)
- **Drivers DB**: aiosqlite (SQLite), asyncpg (PostgreSQL)
- **Auth**: JWT (python-jose) + BCrypt (passlib) + utilisateur admin auto-créé
- **Validation**: Pydantic v2
- **Intégration Ansible**: ansible-runner, pyyaml (à implémenter)

**Infrastructure:**
- **Conteneurisation**: Docker
- **Orchestration**: Kubernetes
- **Reverse Proxy**: Nginx (frontend) + Ingress (K8s)
- **Développement Local**: Docker Compose

---

## 📊 Architecture de Données

### Modèles de Données (Implémentés)

#### User
**Fichier:** `app/models/user.py`

```python
class User(Base):
    __tablename__ = "users"

    id: str (UUID as string, primary key)
    email: str (unique, index)
    username: str (unique, index)
    hashed_password: str (bcrypt)
    is_active: bool (default: True)
    is_admin: bool (default: False)
    created_at: datetime
    updated_at: datetime

    # Relations
    playbooks: relationship("Playbook", cascade="all, delete-orphan")
```

**Méthodes:**
- `to_dict(include_sensitive=False)` - Sérialisation en dict
- `generate_uuid()` - Génération UUID string

#### Playbook
**Fichier:** `app/models/playbook.py`

```python
class Playbook(Base):
    __tablename__ = "playbooks"

    id: str (UUID as string, primary key)
    name: str
    description: str (optional)
    content: JSON (structure complète du playbook)
    owner_id: str (FK -> users.id, CASCADE DELETE)
    created_at: datetime
    updated_at: datetime

    # Relations
    owner: relationship("User")
```

**Structure content (JSON):**
```json
{
  "plays": [...],
  "modules": [...],
  "links": [...],
  "variables": {...}
}
```

#### Collection
```python
class Collection(Base):
    __tablename__ = "collections"

    id: UUID
    namespace: str
    name: str
    version: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Relations
    modules: List[Module]
```

#### Module
```python
class Module(Base):
    __tablename__ = "modules"

    id: UUID
    collection_id: UUID (FK -> collections.id)
    name: str
    description: Optional[str]
    documentation: JSONB  # Structure complète de la doc du module
    parameters: JSONB  # Liste des paramètres avec types et validation
    created_at: datetime
    updated_at: datetime

    # Relations
    collection: Collection
```

---

## 🔌 API Endpoints
a chaque mise a jour de l'image du backend, tu verifie la bonne reponse des differentes API
### Authentication (Implémenté avec Auto-Setup v1.3.8+)
**Fichier:** `app/api/endpoints/auth.py`

**🚀 Initialisation Automatique (v1.3.8+) :**
- **Database:** Création automatique des tables au démarrage
- **Logs de démarrage avec émojis** pour diagnostic
- **Utilisateur admin par défaut** créé si n'existe pas

**🔑 Utilisateur Admin Par Défaut :**
- **Email:** `admin@example.com`
- **Password:** `admin`
- **Créé automatiquement** au démarrage de l'application
- **Type:** Admin (`is_admin: true`)
- **Status:** Actif (`is_active: true`)

**📊 Logs de Démarrage :**
```
🚀 Starting Ansible Builder API v1.3.8
📄 Database type: sqlite
🔗 Database URL: sqlite+aiosqlite:///./ansible_builder.db
✅ Database initialized successfully
👤 Created default admin user: admin@example.com / admin
```

**POST /api/auth/register**
- Créer un nouveau compte utilisateur
- Body: `{ email: str, username: str, password: str }`
- Validation: Email unique, username unique, password min 6 caractères
- Response `201`: `{ user: {...}, token: "jwt..." }`
- Response `400`: Email ou username déjà pris

**POST /api/auth/login**
- Connexion utilisateur
- Body: `{ email: str, password: str }`
- Validation: Credentials valides, compte actif
- Response `200`: `{ user: {...}, token: "jwt..." }`
- Response `401`: Email ou mot de passe incorrect
- Response `403`: Compte désactivé

**GET /api/auth/verify**
- Vérifier le token JWT et retourner l'utilisateur actuel
- Headers: `Authorization: Bearer <token>`
- Response `200`: `UserResponse`
- Response `401`: Token invalide

**POST /api/auth/logout**
- Déconnexion (suppression côté client)
- Response `200`: `{ message: "Successfully logged out" }`

### Playbooks (Implémenté)
**Fichier:** `app/api/endpoints/playbooks.py`

**GET /api/playbooks**
- Lister les playbooks de l'utilisateur authentifié
- Headers: `Authorization: Bearer <token>`
- Response `200`: `List[PlaybookResponse]` (sans content)
- Tri: Par `updated_at` décroissant

**POST /api/playbooks**
- Créer un nouveau playbook
- Headers: `Authorization: Bearer <token>`
- Body: `{ name: str, description?: str, content: dict }`
- Response `201`: `PlaybookDetailResponse` (avec content)

**GET /api/playbooks/{playbook_id}**
- Récupérer un playbook avec contenu complet
- Headers: `Authorization: Bearer <token>`
- Validation: Ownership (seulement le propriétaire)
- Response `200`: `PlaybookDetailResponse`
- Response `404`: Playbook introuvable
- Response `403`: Pas le propriétaire

**PUT /api/playbooks/{playbook_id}**
- Mettre à jour un playbook
- Headers: `Authorization: Bearer <token>`
- Body: `{ name?: str, description?: str, content?: dict }`
- Validation: Ownership
- Response `200`: `PlaybookDetailResponse`
- Response `404`: Playbook introuvable
- Response `403`: Pas le propriétaire

**DELETE /api/playbooks/{playbook_id}**
- Supprimer un playbook
- Headers: `Authorization: Bearer <token>`
- Validation: Ownership
- Response `204`: No content
- Response `404`: Playbook introuvable
- Response `403`: Pas le propriétaire

### Admin (Implémenté)
**Fichier:** `app/api/endpoints/admin.py`

**GET /api/admin/users**
- Lister tous les utilisateurs (admin uniquement)
- Headers: `Authorization: Bearer <token>` (admin)
- Response `200`: `List[UserResponse]`
- Response `403`: Pas admin

**PUT /api/admin/users/{user_id}/password**
- Changer le mot de passe d'un utilisateur (admin uniquement)
- Headers: `Authorization: Bearer <token>` (admin)
- Body: `{ new_password: str }`
- Response `200`: `{ message: "Password updated..." }`
- Response `404`: Utilisateur introuvable

**PATCH /api/admin/users/{user_id}**
- Activer/désactiver un utilisateur ou modifier privilèges admin
- Headers: `Authorization: Bearer <token>` (admin)
- Body: `{ is_active?: bool, is_admin?: bool }`
- Sécurité: Impossible de se désactiver soi-même ou retirer ses propres privilèges
- Response `200`: `UserResponse`
- Response `400`: Action interdite sur soi-même
- Response `404`: Utilisateur introuvable

**DELETE /api/admin/users/{user_id}/playbooks**
- Purger tous les playbooks d'un utilisateur (admin uniquement)
- Headers: `Authorization: Bearer <token>` (admin)
- Response `200`: `{ message: "Purged X playbook(s)...", deleted_count: X }`
- Response `404`: Utilisateur introuvable

**DELETE /api/admin/users/{user_id}**
- Supprimer un utilisateur et ses playbooks (admin uniquement)
- Headers: `Authorization: Bearer <token>` (admin)
- Sécurité: Impossible de se supprimer soi-même
- Response `204`: No content
- Response `400`: Impossible de se supprimer
- Response `404`: Utilisateur introuvable

### Collections & Modules

**GET /api/collections**
- Lister toutes les collections disponibles
- Query params: `?search=...&page=1&limit=50`
- Response: `{ collections: [...], total }`

**GET /api/collections/{id}/modules**
- Lister les modules d'une collection
- Response: `{ modules: [...] }`

**GET /api/modules/{id}**
- Récupérer les détails d'un module
- Response: `{ module, documentation, parameters }`

**POST /api/sync/collections**
- Synchroniser les collections depuis Ansible Galaxy (admin only)
- Response: `{ synced: count, errors: [...] }`

---

## 🛠️ Services

### Service de Collecte (À Implémenter)

**`services/ansible_collector.py`**

Responsable de collecter les modules depuis Ansible Galaxy:

```python
class AnsibleCollector:
    async def sync_collections(self):
        """Synchronise toutes les collections depuis Galaxy"""
        pass

    async def sync_collection(self, namespace: str, name: str):
        """Synchronise une collection spécifique"""
        pass

    async def parse_module_documentation(self, module_path: str):
        """Parse la documentation d'un module Ansible"""
        pass

    async def extract_module_parameters(self, doc: dict):
        """Extrait les paramètres et leur validation depuis la doc"""
        pass
```

**Approche technique:**
- Utiliser `ansible-galaxy collection list` pour lister les collections
- Parser les fichiers de documentation YAML des modules
- Extraire les paramètres, types, validations, exemples
- Stocker dans PostgreSQL avec JSONB pour flexibilité

### Service de Compilation (À Implémenter)

**`services/yaml_compiler.py`**

Responsable de transformer la structure graphique en YAML Ansible:

```python
class YAMLCompiler:
    def compile_playbook(self, playbook: Playbook) -> str:
        """Compile un playbook en YAML Ansible"""
        pass

    def compile_play(self, play: Play) -> dict:
        """Compile un PLAY en structure dict"""
        pass

    def compile_blocks(self, modules: List[ModuleBlock], links: List[Link]) -> List[dict]:
        """Compile les blocks avec leurs 3 sections (tasks, rescue, always)"""
        pass

    def resolve_task_order(self, modules: List[ModuleBlock], links: List[Link]) -> List[str]:
        """Résout l'ordre des tâches via les liens (topological sort)"""
        pass

    def compile_task(self, module: ModuleBlock) -> dict:
        """Compile une tâche individuelle"""
        pass
```

**Algorithme de résolution d'ordre:**
1. Construire un graphe dirigé depuis les liens
2. Détecter les cycles (invalide)
3. Tri topologique pour obtenir l'ordre d'exécution
4. Grouper par blocks (tasks, rescue, always)

**Gestion des blocks 3 sections:**
```yaml
- block:
    - name: Task 1
      module: ...
    - name: Task 2
      module: ...
  rescue:
    - name: On error
      module: ...
  always:
    - name: Cleanup
      module: ...
```

### Service d'Authentification (À Implémenter)

**`services/auth_service.py`**

```python
class AuthService:
    def create_user(self, email: str, password: str) -> User:
        """Créer un nouvel utilisateur"""
        pass

    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authentifier un utilisateur"""
        pass

    def create_access_token(self, user_id: UUID) -> str:
        """Créer un JWT token"""
        pass

    def verify_token(self, token: str) -> Optional[UUID]:
        """Vérifier un JWT token"""
        pass
```

**Librairies:**
- `passlib` pour hash bcrypt
- `python-jose` pour JWT
- `python-multipart` pour forms

---

## 🚀 Déploiement

### Configuration

**1. Créer le fichier `.env`:**
```bash
cd backend
cp .env.example .env
# Éditer .env et configurer les variables
```

**Variables clés:**
- `DATABASE_TYPE`: `sqlite` (dev) ou `postgresql` (prod)
- `SECRET_KEY`: Clé secrète pour JWT (à changer en prod!)
- `SQLITE_DB_PATH`: Chemin vers la base SQLite (si DATABASE_TYPE=sqlite)
- `POSTGRES_*`: Configuration PostgreSQL (si DATABASE_TYPE=postgresql)

### Développement Local

**1. Installation des dépendances:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**2. Initialiser la base de données:**
```bash
# Avec les valeurs par défaut (admin / admin@ansible-builder.local / admin123)
python init_db.py

# Ou avec des valeurs personnalisées
python init_db.py --email admin@example.com --username superadmin --password StrongP@ssw0rd
```

**3. Lancer le serveur de développement:**
```bash
# Avec uvicorn directement
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Ou avec le script main.py
python main.py
```

**4. Accès:**
- API: http://localhost:8000
- Documentation interactive (Swagger): http://localhost:8000/docs
- Documentation alternative (ReDoc): http://localhost:8000/redoc

**Endpoints utiles:**
- `GET /` - Info de l'API
- `GET /health` - Health check

### Production (Kubernetes)

```bash
# Créer le namespace
kubectl apply -f k8s/namespace.yaml

# Déployer PostgreSQL
kubectl apply -f k8s/postgresql/

# Déployer Redis
kubectl apply -f k8s/redis/

# Déployer Backend
kubectl apply -f k8s/backend/
```

**Configuration requise:**

**`k8s/backend/deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ansible-builder-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ansible-builder-backend
  template:
    metadata:
      labels:
        app: ansible-builder-backend
    spec:
      containers:
      - name: backend
        image: ansible-builder-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: redis-url
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: jwt-secret
```

---

## 🔮 Prochaines Étapes

### Backend
- [x] Implémenter les modèles de données User et Playbook
- [x] Créer les endpoints CRUD pour playbooks
- [x] Authentification JWT avec BCrypt
- [x] Gestion des utilisateurs admin
- [x] Script d'initialisation de base de données
- [x] Support SQLite et PostgreSQL
- [ ] Implémenter modèles Collection et Module
- [ ] Service de collecte des modules Ansible Galaxy
- [ ] Service de compilation YAML (transformer les blocks 3 sections)
- [ ] Tests unitaires et d'intégration (pytest)
- [ ] Documentation OpenAPI complète avec exemples

### DevOps
- [ ] CI/CD pipeline (GitHub Actions ou GitLab CI)
- [ ] Tests automatisés (pytest backend)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Logging centralisé (ELK ou Loki)
- [ ] Healthchecks et readiness probes
- [ ] Secrets management (Vault ou K8s Secrets)

---

## 📝 Structure du Projet

```
backend/
├── app/
│   ├── core/                   # Configuration et utilitaires
│   │   ├── config.py           # Settings (Pydantic BaseSettings)
│   │   ├── database.py         # SQLAlchemy async setup
│   │   ├── security.py         # JWT + BCrypt
│   │   └── dependencies.py     # FastAPI dependencies (auth)
│   ├── models/                 # Modèles SQLAlchemy
│   │   ├── __init__.py
│   │   ├── user.py             # ✅ Implémenté
│   │   ├── playbook.py         # ✅ Implémenté
│   │   ├── collection.py       # ⏳ À implémenter
│   │   └── module.py           # ⏳ À implémenter
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py             # ✅ Implémenté
│   │   ├── playbook.py         # ✅ Implémenté
│   │   ├── collection.py       # ⏳ À implémenter
│   │   └── module.py           # ⏳ À implémenter
│   ├── api/                    # API endpoints
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # ✅ Implémenté (register, login, verify, logout)
│   │   │   ├── playbooks.py    # ✅ Implémenté (CRUD complet)
│   │   │   ├── admin.py        # ✅ Implémenté (gestion users)
│   │   │   ├── collections.py  # ⏳ À implémenter
│   │   │   └── modules.py      # ⏳ À implémenter
│   │   └── router.py           # ✅ Agrégation des routers
│   └── services/               # Business logic
│       ├── ansible_collector.py # ⏳ À implémenter
│       └── yaml_compiler.py     # ⏳ À implémenter
├── main.py                     # ✅ Point d'entrée FastAPI
├── init_db.py                  # ✅ Script d'initialisation DB + admin
├── .env.example                # ✅ Configuration template
├── .env                        # Configuration locale (git ignored)
├── requirements.txt            # ✅ Dépendances Python
├── CLAUDE_BACKEND.md           # ✅ Documentation backend
└── README.md                   # ⏳ À créer
```

---

## 🔒 Sécurité

### Meilleures Pratiques

1. **Authentification:**
   - JWT avec expiration courte (15 minutes)
   - Refresh tokens avec rotation
   - Rate limiting sur endpoints auth

2. **Validation:**
   - Pydantic pour validation des inputs
   - Sanitization des données utilisateur
   - Limite de taille des playbooks (max 10MB)

3. **Base de données:**
   - Prepared statements (SQLAlchemy)
   - Pas de SQL raw
   - Indexes sur colonnes de recherche

4. **Secrets:**
   - Jamais de secrets dans le code
   - Variables d'environnement ou Vault
   - Rotation régulière des secrets

5. **CORS:**
   - Restreindre les origins autorisées
   - Credentials: true uniquement si nécessaire

---

## 📊 Performance

### Optimisations

1. **Cache Redis:**
   - Cache des collections et modules (TTL 24h)
   - Cache des playbooks compilés (TTL 1h)
   - Invalidation sur update

2. **Database:**
   - Indexes sur user_id, created_at, email
   - JSONB indexes pour recherche dans plays/modules
   - Connection pooling

3. **Async:**
   - Toutes les opérations I/O en async
   - asyncpg pour PostgreSQL
   - aioredis pour Redis

4. **Pagination:**
   - Limite par défaut: 20 items
   - Max: 100 items par page

---

## 🧪 Tests

### Stratégie de Test

```bash
# Lancer tous les tests
pytest

# Tests avec coverage
pytest --cov=app --cov-report=html

# Tests spécifiques
pytest tests/test_playbooks.py -v
```

**Types de tests:**
- Tests unitaires pour services
- Tests d'intégration pour endpoints
- Tests de validation pour le compilateur YAML
- Tests de performance pour endpoints critiques

**Fixtures:**
```python
@pytest.fixture
def test_db():
    """Base de données de test"""
    pass

@pytest.fixture
def test_user():
    """Utilisateur de test"""
    pass

@pytest.fixture
def test_playbook():
    """Playbook de test avec blocks 3 sections"""
    pass
```

---

## 🔄 **Changelog Backend - Session 2025-12-07**

### 🎯 **Version 1.9.0_2 - Stabilisation Production**

**Problèmes Corrigés :**

#### 1. Galaxy API Rate Limiting
**Issue :** Synchronisation automatique au démarrage saturait l'API Galaxy
- ❌ **Symptôme :** `🚨 Rate limits hit (56 times), reducing to 2`
- ❌ **Impact :** 404 errors + 429 rate limiting bloquait l'application  
- ✅ **Fix :** Désactivé `galaxy_cache_service.startup_full_sync()` dans `main.py:65`

**Code Modifié :**
```python
# backend/app/main.py:62-66
# AVANT 
asyncio.create_task(galaxy_cache_service.startup_full_sync())

# APRÈS
# asyncio.create_task(galaxy_cache_service.startup_full_sync())
print("Galaxy cache synchronization DISABLED to avoid rate limits")
```

#### 2. Base SQLite Persistence
**Issue :** Container sans répertoire de données persistant
- ❌ **Symptôme :** `sqlite3.OperationalError: unable to open database file`
- ❌ **Cause :** Répertoire `/app/data/` manquant dans container
- ✅ **Fix :** Volume Docker + création répertoire automatique

**Configuration Docker :**
```yaml
# docker-compose.remote.yml
environment:
  - SQLITE_DB_PATH=/app/data/ansible_builder.db
volumes:
  - backend_data:/app/data
```

#### 3. Authentification Robuste
**Améliorations :**
- ✅ **Utilisateur admin auto-créé** : `admin@example.com` / `admin123`
- ✅ **BCrypt fix** : `bcrypt==4.0.1` explicite (compatibilité passlib)
- ✅ **Gestion erreurs** : Try/catch pour hash password au démarrage

#### 4. Architecture Docker Remote
**Nouveau Déploiement :** Support Docker distant TCP sans Kubernetes
- ✅ **Docker Host** : `192.168.1.217:2375`
- ✅ **Stack 3-composants** : backend + frontend + nginx proxy
- ✅ **Réseau unifié** : Tous containers sur même réseau Docker
- ✅ **DNS interne** : `backend:8000`, `frontend:5173`

### 📦 **Déploiement Production-Ready**

**Images Buildées :**
```bash
# Backend v1.9.0_2
docker build -f backend/Dockerfile.dev -t ansible-builder-backend:1.9.0_2 backend/

# Déploiement remote
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.remote.yml up -d
```

**Configuration Finale :**
```yaml
# docker-compose.remote.yml
services:
  backend:
    image: ansible-builder-backend:1.9.0_2
    environment:
      - DATABASE_TYPE=sqlite
      - SQLITE_DB_PATH=/app/data/ansible_builder.db
    volumes:
      - backend_data:/app/data
```

### 🧪 **Tests de Validation**

**Endpoints Testés :**
```bash
# Health Check
curl http://192.168.1.217/health
> "healthy"

# Version API 
curl http://192.168.1.217/api/version
> {"version":"1.9.0_2","name":"Ansible Builder API"}

# Auth (Swagger)
http://192.168.1.217/docs
> admin@example.com / admin123
```

### ⚠️ **Limitations Temporaires**

1. **Galaxy API :** Synchronisation manuelle uniquement
   - **Raison :** Éviter rate limits lors du développement
   - **Solution future :** Implement rate limiting + retry logic

2. **SQLite Single Pod :** Non-scalable horizontalement
   - **Scope :** Phase développement uniquement
   - **Migration prod :** PostgreSQL + réplication recommandée

### 🎯 **Prochaines Étapes Techniques**

**Phase 2 (Version 1.10.0) :**
- [ ] Galaxy API avec rate limiting intelligent
- [ ] Service compilation YAML (blocks 3-sections)
- [ ] Tests automatisés (pytest + fixtures)
- [ ] Migration PostgreSQL pour production

**Architecture Future :**
- [ ] Redis cache pour Galaxy data
- [ ] WebSocket pour real-time sync frontend
- [ ] Monitoring logs centralisé (structuré JSON)

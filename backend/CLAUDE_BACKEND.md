# Guide Claude - Ansible Builder Backend

Ce document contient toute la documentation technique backend du projet Ansible Builder.

---

## 🎨 Stack Technique

### Framework et Outils

**Backend:**
- **Framework**: FastAPI (Python 3.11+)
- **Base de données**: PostgreSQL (avec support JSONB pour structures flexibles)
- **Cache/Queue**: Redis
- **ORM**: SQLAlchemy (async)
- **Migration**: Alembic
- **Auth**: JWT + OAuth2
- **Intégration Ansible**: ansible-runner, pyyaml

**Infrastructure:**
- **Conteneurisation**: Docker
- **Orchestration**: Kubernetes
- **Reverse Proxy**: Nginx (frontend) + Ingress (K8s)
- **Développement Local**: Docker Compose

---

## 📊 Architecture de Données

### Modèles de Données (À Implémenter)

#### User
```python
class User(Base):
    __tablename__ = "users"

    id: UUID
    email: str (unique, index)
    hashed_password: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Relations
    playbooks: List[Playbook]
```

#### Playbook
```python
class Playbook(Base):
    __tablename__ = "playbooks"

    id: UUID
    user_id: UUID (FK -> users.id)
    name: str
    description: Optional[str]
    version: str
    created_at: datetime
    updated_at: datetime

    # Structure du playbook en JSONB
    plays: JSONB  # Array de Play objects
    modules: JSONB  # Array de ModuleBlock objects
    links: JSONB  # Array de Link objects

    # Relations
    user: User
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

## 🔌 API Endpoints (À Implémenter)

### Authentication

**POST /api/auth/register**
- Créer un nouveau compte utilisateur
- Body: `{ email, password }`
- Response: `{ user, access_token }`

**POST /api/auth/login**
- Connexion utilisateur
- Body: `{ email, password }`
- Response: `{ access_token, token_type }`

**POST /api/auth/refresh**
- Rafraîchir le token JWT
- Headers: `Authorization: Bearer <token>`
- Response: `{ access_token }`

### Playbooks

**GET /api/playbooks**
- Lister les playbooks de l'utilisateur
- Query params: `?page=1&limit=20&search=...`
- Response: `{ playbooks: [...], total, page, limit }`

**POST /api/playbooks**
- Créer un nouveau playbook
- Body: `{ name, description?, version?, plays?, modules?, links? }`
- Response: `{ playbook }`

**GET /api/playbooks/{id}**
- Récupérer un playbook par ID
- Response: `{ playbook }`

**PUT /api/playbooks/{id}**
- Mettre à jour un playbook
- Body: `{ name?, description?, version?, plays?, modules?, links? }`
- Response: `{ playbook }`

**DELETE /api/playbooks/{id}**
- Supprimer un playbook
- Response: `{ success: true }`

**POST /api/playbooks/{id}/compile**
- Compiler un playbook en YAML Ansible
- Response: `{ yaml: "..." }`

**POST /api/playbooks/{id}/download**
- Télécharger le playbook compilé
- Response: File (application/x-yaml)

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

### Développement Local

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Lancer le serveur de développement
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# API accessible sur http://localhost:8000
# Documentation auto sur http://localhost:8000/docs
```

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
- [ ] Implémenter les modèles de données (User, Playbook, Module, Collection)
- [ ] Créer les endpoints CRUD pour playbooks
- [ ] Service de collecte des modules Ansible Galaxy
- [ ] Service de compilation YAML (transformer les blocks 3 sections)
- [ ] Authentification JWT
- [ ] Gestion des erreurs et validation Pydantic
- [ ] Tests unitaires et d'intégration (pytest)
- [ ] Documentation OpenAPI complète

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
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── config.py               # Configuration (env vars)
│   ├── database.py             # SQLAlchemy setup
│   ├── models/                 # Modèles SQLAlchemy
│   │   ├── user.py
│   │   ├── playbook.py
│   │   ├── collection.py
│   │   └── module.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user.py
│   │   ├── playbook.py
│   │   ├── collection.py
│   │   └── module.py
│   ├── routers/                # API endpoints
│   │   ├── auth.py
│   │   ├── playbooks.py
│   │   ├── collections.py
│   │   └── modules.py
│   ├── services/               # Business logic
│   │   ├── auth_service.py
│   │   ├── ansible_collector.py
│   │   └── yaml_compiler.py
│   └── dependencies.py         # FastAPI dependencies
├── alembic/                    # Migrations
│   └── versions/
├── tests/                      # Tests pytest
│   ├── test_auth.py
│   ├── test_playbooks.py
│   └── test_compiler.py
├── requirements.txt
├── Dockerfile
└── README.md
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

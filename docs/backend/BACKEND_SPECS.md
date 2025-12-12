# Spécifications Backend - Ansible Builder

Ce document décrit les spécifications fonctionnelles et l'architecture du backend API de l'application.

---

## 🏗️ **Architecture Backend**

### Stack Technique
- **Framework :** FastAPI (Python 3.11)
- **Base de données :** SQLite (single-pod production)
- **Cache :** Redis (pour Galaxy API)
- **Authentification :** JWT Bearer Token
- **Container :** Docker avec uvicorn ASGI server

### Structure API
```
/api
├── /auth              # Authentification et gestion utilisateurs
├── /playbooks         # Gestion des playbooks
├── /admin             # Administration système
├── /collections       # Collections Ansible
├── /galaxy            # Galaxy API et cache
├── /user/favorites    # Favoris utilisateur
├── /admin/configuration # Configuration admin
└── /version           # Version API
```

---

## 🔐 **Authentification & Autorisation**

### Système d'Authentification
- **Type :** JWT Bearer Token
- **Durée :** Configurable (défaut : 24h)
- **Stockage client :** localStorage
- **Headers :** `Authorization: Bearer <token>`

### Rôles Utilisateur
```python
class UserRole:
    USER = "user"      # Utilisateur standard
    ADMIN = "admin"    # Administrateur système
```

### Endpoints Auth
```
POST /api/auth/login           # Connexion utilisateur
POST /api/auth/register        # Inscription (si activé)
POST /api/auth/refresh         # Renouvellement token
GET  /api/auth/me             # Profil utilisateur actuel
PUT  /api/auth/password       # Changement mot de passe
```

---

## 📚 **Gestion des Playbooks**

### Modèle de Données
```python
class Playbook:
    id: str                    # UUID unique
    name: str                  # Nom du playbook
    content: PlaybookContent   # Structure JSON
    user_id: str               # Propriétaire
    created_at: datetime
    updated_at: datetime
    is_shared: bool = False    # Partage (future feature)
```

### Structure PlaybookContent
```json
{
  "version": "1.0.0",
  "inventory": "hosts",
  "plays": [
    {
      "id": "play-uuid",
      "name": "Play Name",
      "hosts": "all",
      "variables": [],
      "pre_tasks": [],
      "tasks": [],
      "post_tasks": [],
      "handlers": []
    }
  ]
}
```

### Endpoints Playbooks
```
GET    /api/playbooks         # Liste des playbooks utilisateur
POST   /api/playbooks         # Création nouveau playbook
GET    /api/playbooks/{id}    # Détail playbook
PUT    /api/playbooks/{id}    # Mise à jour playbook
DELETE /api/playbooks/{id}    # Suppression playbook
```

---

## 🌌 **Galaxy API Integration**

### Service SMART
Architecture 3-niveaux pour optimisation performance :

1. **Niveau 1 :** Popular namespaces (10) - Chargé au démarrage
2. **Niveau 2 :** Background enrichment - Tâche asynchrone
3. **Niveau 3 :** On-demand enrichment - À la sélection

### Cache Redis
```python
# Structure cache
galaxy:namespaces           # Liste complète
galaxy:namespace:{name}     # Détail namespace
galaxy:collections:{ns}     # Collections par namespace
galaxy:modules:{ns}:{col}   # Modules par collection
```

### Endpoints Galaxy
```
GET /api/galaxy/smart/status       # Statut du service SMART
GET /api/galaxy/namespaces         # Liste namespaces
GET /api/galaxy/namespace/{name}   # Détail namespace
GET /api/galaxy/collections/{ns}   # Collections namespace
GET /api/galaxy/modules/{ns}/{col} # Modules collection
```

---

## ⭐ **Favoris Utilisateur**

### Modèle de Données
```python
class UserFavorite:
    user_id: str              # UUID utilisateur
    item_type: str            # "namespace", "collection", "module"
    item_name: str            # Nom de l'élément
    created_at: datetime
```

### Stockage
- **Développement :** Fichier JSON `/tmp/user_favorites.json`
- **Production :** Même stockage (single-pod SQLite)

### Endpoints Favoris
```
GET    /api/user/favorites                    # Liste favoris utilisateur
POST   /api/user/favorites                    # Ajout favori
DELETE /api/user/favorites/{type}/{name}      # Suppression favori
```

---

## ⚙️ **Configuration Admin**

### Modèle de Configuration
```python
class AdminConfig:
    standard_namespaces: List[str]  # Namespaces standards
    # Futures configurations...
```

### Stockage Configuration
- **Développement :** Fichier JSON `/tmp/admin_configuration.json`
- **Production :** Même système (évolutif vers DB)

### Endpoints Admin Configuration
```
GET /api/admin/configuration/standard-namespaces    # Lecture config
PUT /api/admin/configuration/standard-namespaces    # Mise à jour
GET /api/admin/configuration/info                   # Info générale
```

### Sécurité Admin
- Endpoints protégés par `get_current_admin`
- Vérification rôle `user.is_admin = True`
- Retour `403 Forbidden` si non-admin

---

## 🔄 **Gestion des Versions**

### Système de Versions
```python
# Version endpoint
GET /api/version
{
  "version": "1.8.1",
  "name": "Ansible Builder API"
}
```

### Versioning Rules
- **Format :** `X.Y.Z[_n]`
- **Phase 1 :** Développement avec suffixe `_n`
- **Phase 2 :** Production sans suffixe
- **Source :** `backend/app/version.py`

---

## 🗄️ **Base de Données**

### Schema SQLite
```sql
-- Utilisateurs
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Playbooks
CREATE TABLE playbooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,        -- JSON content
    user_id TEXT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_shared BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Favoris utilisateur
CREATE TABLE user_favorites (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,      -- namespace, collection, module
    item_name TEXT NOT NULL,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, item_type, item_name),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Initialisation
- **Utilisateur admin par défaut :** `admin@example.com / admin123`
- **Base créée automatiquement** au premier démarrage
- **Migrations :** Gérées manuellement (simple structure)

---

## 🔧 **Configuration d'Environnement**

### Variables d'Environnement
```bash
# Base de données
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=/tmp/ansible_builder_dev.db

# Cache Redis
REDIS_URL=redis://redis:6379

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Debug
DEBUG=True  # Development only
```

### Mode de Déploiement
- **Développement :** Docker Compose
- **Production :** Kubernetes avec pods séparés

---

## 📊 **Monitoring & Logging**

### Logs Structure
```python
# Format logs
{
    "timestamp": "2025-12-12T15:30:00Z",
    "level": "INFO",
    "module": "galaxy_service",
    "message": "Namespace enriched",
    "namespace": "community",
    "duration_ms": 150
}
```

### Métriques Clés
- **API Response Time :** < 2s (99th percentile)
- **Galaxy Cache Hit Rate :** > 90%
- **User Sessions :** Durée moyenne
- **Error Rate :** < 0.1%

### Health Checks
```
GET /api/health              # Basic health
GET /api/galaxy/smart/status # Galaxy service status
GET /api/version             # Version info
```

---

## 🚀 **Performance & Optimisations**

### Galaxy API Optimisations
- **Cache multi-niveaux :** Redis + mémoire locale
- **Enrichissement asynchrone :** Background tasks
- **Réduction API calls :** 100+ → 11 appels (-90%)

### Database Optimisations
- **Index utilisateur :** `users.email`, `users.username`
- **Index playbooks :** `playbooks.user_id`, `playbooks.created_at`
- **Index favoris :** `user_favorites.user_id`

### Memory Management
- **Limite cache Redis :** 256MB max
- **TTL Cache :** 30 minutes Galaxy data
- **Cleanup automatique :** Données expirées

---

## 🔒 **Sécurité**

### Authentification
- **Hash passwords :** bcrypt avec salt
- **JWT secrets :** Rotation recommandée
- **Rate limiting :** À implémenter (future)

### Validation des Données
- **Pydantic models :** Validation automatique entrées
- **SQL injection :** Protection ORM SQLAlchemy
- **XSS protection :** Échappement automatique JSON

### CORS & Headers
```python
# CORS Configuration
CORS_ORIGINS = [
    "https://coupel.net",
    "http://192.168.1.217:5173"
]
```

---

## 🧪 **Tests**

### Types de Tests
- **Unit tests :** Services individuels
- **Integration tests :** API endpoints
- **Performance tests :** Charge Galaxy API

### Coverage Cible
- **Services :** > 80%
- **Endpoints :** > 90%
- **Critical paths :** 100%

---

## 🔄 **Évolution Future**

### Roadmap Technique
1. **Database migration :** SQLite → PostgreSQL
2. **Rate limiting :** Protection API
3. **Websockets :** Real-time collaboration
4. **Microservices :** Galaxy service séparé

### Scalabilité
- **Horizontal scaling :** Multi-pod K8s
- **Database clustering :** Read replicas
- **Cache distribué :** Redis Cluster

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-12*

*Voir aussi :*
- [Implémentation Backend](BACKEND_IMPLEMENTATION.md)
- [Galaxy Integration](GALAXY_INTEGRATION.md)
- [Frontend Specs](../frontend/FRONTEND_SPECS.md)
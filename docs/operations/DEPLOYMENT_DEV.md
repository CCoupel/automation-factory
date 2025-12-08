# Déploiement Environnement de Développement

## Phase 1 : Développement Local avec Docker Compose

### Prérequis
- Docker configuré pour host distant : `192.168.1.217:2375`
- Images taguées en DEV

### Procédure de Build et Tag

```bash
# 1. Build des images
cd "C:\Users\cyril\Documents\VScode\Ansible Builder"
docker --host tcp://192.168.1.217:2375 build -t ghcr.io/ccoupel/ansible-builder-backend:1.6.0_X ./backend
docker --host tcp://192.168.1.217:2375 build -t ghcr.io/ccoupel/ansible-builder-frontend:1.8.0 ./frontend

# 2. Tag pour développement local
docker --host tcp://192.168.1.217:2375 tag ghcr.io/ccoupel/ansible-builder-backend:1.6.0_X ansible-builder-backend:dev
docker --host tcp://192.168.1.217:2375 tag ghcr.io/ccoupel/ansible-builder-frontend:1.8.0 ansible-builder-frontend:dev

# 3. Déploiement docker-compose
docker-compose --host tcp://192.168.1.217:2375 up -d
```

### Configuration Docker Compose

**Fichier :** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL désactivé pour développement local (utilise SQLite)
  
  redis:
    image: redis:7-alpine
    container_name: ansible-builder-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  backend:
    image: ansible-builder-backend:dev
    container_name: ansible-builder-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_TYPE=sqlite
      - SQLITE_DB_PATH=/tmp/ansible_builder_dev.db
      - DEBUG=True
    depends_on:
      redis:
        condition: service_healthy

  frontend:
    image: ansible-builder-frontend:dev
    container_name: ansible-builder-frontend
    ports:
      - "5173:80"
    environment:
      - BASE_PATH=
    depends_on:
      - backend
```

### URLs d'Accès Phase 1

#### Accès Direct (Recommandé pour Phase 1)
- **Interface Web :** http://192.168.1.217:5173
- **API Backend via Proxy :** http://192.168.1.217:5173/api/version
- **API Backend Direct :** http://192.168.1.217:8000/api/version

#### Accès via Proxy Nginx (Phase 2 seulement)
- **Interface Web :** http://192.168.1.217
- **API Backend :** http://192.168.1.217/api/version

> **Note :** Le proxy nginx existant (port 80) est configuré pour l'ancien réseau. 
> En Phase 1, utiliser l'accès direct docker-compose (port 5173).

### Authentification Développement

**Compte Admin Automatique :**
- **Email :** admin@example.com
- **Mot de passe :** admin123
- **Créé automatiquement** au premier démarrage du backend

### Tests de Validation

```bash
# 1. Test page d'accueil
curl -s "http://192.168.1.217:5173/" | head -5

# 2. Test API version
curl -s "http://192.168.1.217:5173/api/version"

# 3. Test authentification
curl -s -X POST "http://192.168.1.217:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 4. Test Galaxy API
curl -s "http://192.168.1.217:5173/api/galaxy/namespaces?limit=3"
```

### Debugging

```bash
# Vérifier status containers
docker-compose --host tcp://192.168.1.217:2375 ps

# Logs backend
docker --host tcp://192.168.1.217:2375 logs ansible-builder-backend --tail 20

# Logs frontend  
docker --host tcp://192.168.1.217:2375 logs ansible-builder-frontend --tail 20

# Restart service spécifique
docker-compose --host tcp://192.168.1.217:2375 restart backend
```

### Nettoyage

```bash
# Arrêter environnement
docker-compose --host tcp://192.168.1.217:2375 down

# Nettoyer volumes (attention: perte données)
docker-compose --host tcp://192.168.1.217:2375 down -v
```

---

## Différences Phase 1 vs Phase 2

| Aspect | Phase 1 (Dev Local) | Phase 2 (Production) |
|---------|---------------------|----------------------|
| **Base de données** | SQLite | PostgreSQL K8s |
| **Accès** | http://192.168.1.217:5173 | https://coupel.net/ansible-builder |
| **Proxy** | Nginx intégré frontend | Ingress K8s |
| **Versions** | Tags :dev | Tags versionnés |
| **Authentification** | admin/admin123 | Comptes utilisateurs |
| **Scaling** | 1 réplique | Autoscaling |

---

**Dernière mise à jour :** 2025-12-08  
**Version :** Backend 1.6.0 / Frontend 1.8.0
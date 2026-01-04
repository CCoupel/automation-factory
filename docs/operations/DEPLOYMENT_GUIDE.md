# Guide de Déploiement - Ansible Builder

Guide complet pour déployer Ansible Builder en développement et production.

---

## 🚀 **Déploiement Développement**

### Phase 1 : Local Testing

#### Prérequis
- Docker host : `192.168.1.217:2375`
- Ports disponibles : `5173` (frontend), `8000` (backend)

#### Commandes
```bash
# Build backend avec version incrémentée _n
export DOCKER_HOST=tcp://192.168.1.217:2375
docker build -t ansible-builder-backend:1.5.0_4 backend/

# Build frontend avec version incrémentée
docker build -t ansible-builder-frontend:1.7.0_2 frontend/

# Déploiement local
docker run -d -p 8000:8000 ansible-builder-backend:1.5.0_4
docker run -d -p 5173:80 ansible-builder-frontend:1.7.0_2
```

#### Validation
```bash
# Test backend
curl http://192.168.1.217:8000/api/version

# Test frontend
curl http://192.168.1.217:5173

# Test Galaxy API
curl http://192.168.1.217:8000/api/galaxy/smart/status
```

---

### Phase 2 : Architecture Nginx Reverse Proxy (Staging)

**🏗️ Architecture recommandée pour staging/intégration**

#### Structure
```
nginx (port 80) → Point d'entrée unique
├── / → frontend (Vite dev server, port 5173)
└── /api/* → backend (FastAPI, port 8000)
```

#### Configuration docker-compose.staging.yml
```yaml
version: '3.8'

services:
  # Backend FastAPI
  backend:
    image: ansible-builder-backend:X.Y.Z_n
    container_name: ansible-builder-backend-staging
    environment:
      - DATABASE_URL=postgresql://ansible_user:ansible_password@ansible-db:5432/ansible_db
      - DEBUG=true
      - HOST=0.0.0.0
      - PORT=8000
    restart: unless-stopped
    networks:
      - ansiblebuilder_default

  # Frontend Vite Dev Server
  frontend:
    image: ansible-builder-frontend:X.Y.Z_n-vite
    container_name: ansible-builder-frontend-staging
    restart: unless-stopped
    networks:
      - ansiblebuilder_default
    depends_on:
      - backend

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: ansible-builder-nginx-staging
    ports:
      - "80:80"
    restart: unless-stopped
    networks:
      - ansiblebuilder_default
    depends_on:
      - frontend
      - backend
    configs:
      - source: nginx_conf
        target: /etc/nginx/nginx.conf

configs:
  nginx_conf:
    content: |
      worker_processes 1;
      
      events {
          worker_connections 1024;
      }
      
      http {
          include       /etc/nginx/mime.types;
          default_type  application/octet-stream;
      
          access_log /var/log/nginx/access.log;
          error_log /var/log/nginx/error.log;
      
          gzip on;
          gzip_vary on;
          gzip_min_length 1024;
          gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
      
          server {
              listen 80;
              server_name localhost;
              
              # Backend API Routing
              location /api/ {
                  proxy_pass http://backend:8000/api/;
                  proxy_http_version 1.1;
                  proxy_set_header Host $$host;
                  proxy_set_header X-Real-IP $$remote_addr;
                  proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                  proxy_set_header X-Forwarded-Proto $$scheme;
                  
                  add_header 'Access-Control-Allow-Origin' '*' always;
                  add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
                  add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
                  
                  if ($$request_method = 'OPTIONS') {
                      add_header 'Access-Control-Allow-Origin' '*';
                      add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
                      add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
                      add_header 'Access-Control-Max-Age' 1728000;
                      add_header 'Content-Type' 'text/plain; charset=utf-8';
                      add_header 'Content-Length' 0;
                      return 204;
                  }
              }
              
              # Health endpoint
              location = /health {
                  access_log off;
                  return 200 "healthy\n";
                  add_header Content-Type text/plain;
              }
              
              # Frontend Routing (MUST BE LAST)
              location / {
                  proxy_pass http://frontend:5173;
                  proxy_http_version 1.1;
                  proxy_set_header Upgrade $$http_upgrade;
                  proxy_set_header Connection 'upgrade';
                  proxy_set_header Host $$host;
                  proxy_set_header X-Real-IP $$remote_addr;
                  proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                  proxy_set_header X-Forwarded-Proto $$scheme;
                  proxy_cache_bypass $$http_upgrade;
                  proxy_read_timeout 86400;
              }
          }
      }

networks:
  ansiblebuilder_default:
    external: true
```

#### Procédure de déploiement Phase 2
```bash
# 1. Build images localement sur le serveur staging
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-backend:X.Y.Z_n backend/
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-frontend:X.Y.Z_n-vite -f frontend/Dockerfile.dev frontend/

# 2. Déploiement avec docker-compose
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml up -d

# 3. Validation santé complète
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend API OK
curl -I http://192.168.1.217/                # Frontend OK (Vite dev)
```

#### Points clés Phase 2
- **Images locales** : Build sur 192.168.1.217, pas de push vers ghcr.io
- **Frontend Vite** : Utiliser `Dockerfile.dev` pour serveur développement
- **Nginx central** : Point d'entrée unique sur port 80
- **Réseau interne** : Backend/Frontend non exposés directement
- **Configuration inline** : nginx.conf intégré dans docker-compose

---

## 🏗️ **Déploiement Production**

### Phase 2 : Kubernetes

#### Build Production
```bash
# Suppression suffixe _n pour production
docker tag ansible-builder-backend:1.5.0_4 ghcr.io/ccoupel/ansible-builder-backend:1.5.0
docker tag ansible-builder-frontend:1.7.0_2 ghcr.io/ccoupel/ansible-builder-frontend:1.7.0

# Authentification registry
cat github_token.txt | docker login ghcr.io -u ccoupel --password-stdin

# Push vers registry
docker push ghcr.io/ccoupel/ansible-builder-backend:1.5.0
docker push ghcr.io/ccoupel/ansible-builder-frontend:1.7.0
```

#### Déploiement Helm
```bash
# Configuration kubeconfig
export KUBECONFIG=kubeconfig.txt

# Déploiement avec nouvelles versions
helm upgrade ansible-builder ./helm/ansible-builder \
  --values custom-values.yaml \
  --set backend.image.tag=1.5.0 \
  --set frontend.image.tag=1.7.0 \
  --set backend.image.pullPolicy=Always \
  --set frontend.image.pullPolicy=Always

# Vérification rollout
kubectl rollout status deployment/ansible-builder-backend
kubectl rollout status deployment/ansible-builder-frontend
```

---

## 📋 **Configuration Environnements**

### Développement Local
```yaml
# docker-compose.local.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_TYPE=sqlite
      - SQLITE_DB_PATH=/tmp/ansible_builder.db
      - DEBUG=true
      
  frontend:
    build: ./frontend  
    ports: ["5173:80"]
    depends_on: [backend]
```

### Production Kubernetes
```yaml
# custom-values.yaml
backend:
  replicaCount: 1
  image:
    repository: ghcr.io/ccoupel/ansible-builder-backend
    tag: "1.5.0"
    pullPolicy: Always
  env:
    DATABASE_TYPE: sqlite
    SQLITE_DB_PATH: /tmp/ansible_builder.db
  autoscaling:
    enabled: false

frontend:
  image:
    repository: ghcr.io/ccoupel/ansible-builder-frontend
    tag: "1.7.0"
    pullPolicy: Always
```

---

## 🔧 **Scripts de Déploiement**

### Scripts Existants
- `debug-and-deploy.ps1` : Build + deploy K8s rapide
- `quick-deploy.ps1` : Déploiement production simplifié  
- `fix-and-deploy.ps1` : Corrections + redéploiement

### Usage Recommandé
```bash
# Développement : utiliser scripts existants
./TOOLING/debug-and-deploy.ps1

# Production : commandes manuelles pour contrôle
# (voir section déploiement production ci-dessus)
```

---

## ✅ **Checklist Complète Déploiement Production**

### Tâches OBLIGATOIRES pour chaque mise en production

Ces tâches doivent être exécutées **systématiquement** et dans l'ordre.

---

### 🚀 PHASE DÉPLOIEMENT

#### 1. Push Images vers Registry
```bash
# Tag images pour production (supprimer suffixe -rc.X)
docker -H tcp://192.168.1.217:2375 tag ansible-builder-backend:X.Y.Z-rc.N ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
docker -H tcp://192.168.1.217:2375 tag ansible-builder-frontend:X.Y.Z-rc.N ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z

# Login et push
echo "TOKEN" | docker -H tcp://192.168.1.217:2375 login ghcr.io -u ccoupel --password-stdin
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
```

#### 2. Mettre à jour custom-values.yaml
```yaml
# Modifier les tags dans custom-values.yaml
backend:
  image:
    tag: "X.Y.Z"    # ← Nouvelle version

frontend:
  image:
    tag: "X.Y.Z"    # ← Nouvelle version
```

#### 3. Déploiement Helm
```bash
export KUBECONFIG=kubeconfig.txt

helm upgrade ansible-builder ./helm/ansible-builder \
  -f custom-values.yaml \
  --namespace ansible-builder
```

#### 4. Validation Production
```bash
# Vérifier les pods
kubectl get pods -n ansible-builder

# Vérifier les images déployées
kubectl get deployments -n ansible-builder -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.template.spec.containers[0].image}{"\n"}{end}'

# Health checks
curl -s https://coupel.net/ansible-builder/api/version
curl -s -I https://coupel.net/ansible-builder/
```

---

### 📝 PHASE POST-DÉPLOIEMENT

#### 5. Git - Commit et Tag
```bash
# Commit tous les changements
git add -A
git commit -m "feat: Description de la version X.Y.Z"

# Créer le tag de version
git tag -a vX.Y.Z -m "vX.Y.Z - Titre de la release"

# Push avec tags
git push ccoupel master --tags
```

#### 6. Documentation - CLAUDE.md
Mettre à jour la section "Status Actuel" :
- Version Développement
- Version Production
- Dernière mise à jour

#### 7. Site Marketing (submodule)
```bash
cd marketing/

# Mettre à jour index.html :
# - Hero badge (Version X.Y)
# - Timeline (ajouter nouvelle version en "current")
# - Docker/Helm examples (image tags)
# - Footer version

git add -A
git commit -m "feat: Update to version X.Y.Z"
git push origin main

# Retour au repo principal
cd ..
git add marketing
git commit -m "chore: Update marketing submodule to vX.Y.Z"
git push ccoupel master
```

---

### Checklist Résumé

| # | Phase | Tâche | Commande/Action |
|---|-------|-------|-----------------|
| 1 | 🚀 Deploy | Push images ghcr.io | `docker push ghcr.io/ccoupel/ansible-builder-*:X.Y.Z` |
| 2 | 🚀 Deploy | **custom-values.yaml** | Mettre à jour `backend.image.tag` et `frontend.image.tag` |
| 3 | 🚀 Deploy | Helm upgrade | `helm upgrade ansible-builder ...` |
| 4 | 🚀 Deploy | Health checks | `curl https://coupel.net/ansible-builder/api/version` |
| 5 | 📝 Post | Git commit | `git add -A && git commit` |
| 6 | 📝 Post | Git tag | `git tag -a vX.Y.Z` |
| 7 | 📝 Post | Git push | `git push ccoupel master --tags` |
| 8 | 📝 Post | CLAUDE.md | Mettre à jour versions |
| 9 | 📝 Post | Site marketing | Mettre à jour index.html + push submodule |

---

*Voir aussi :*
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Testing Strategy](TESTING_STRATEGY.md)
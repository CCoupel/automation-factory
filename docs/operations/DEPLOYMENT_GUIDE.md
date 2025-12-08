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

*Voir aussi :*
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Testing Strategy](TESTING_STRATEGY.md)
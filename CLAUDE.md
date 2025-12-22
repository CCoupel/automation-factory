Session_id: 767f34c1-c453-4c33-b9a2-e8eaf2d2fa45

# Guide Claude - Ansible Builder

Ce document est l'index principal pour les futures instances de Claude travaillant sur ce projet. Il contient les liens vers toute la documentation technique organisée.

---

## 🚀 **Status Actuel**

**Version Production :** Backend 1.12.2 / Frontend 1.12.2 ✅ **DEPLOYED**
**Version Développement :** 1.12.2-rc.1
**URL Production :** https://coupel.net/ansible-builder
**URL Staging :** http://192.168.1.217 (nginx reverse proxy)
**Dernière mise à jour :** 2025-12-22

## 📚 **Documentation Organisée**

### 🎯 **Documentation Projet**
- **[Vue d'Ensemble](docs/core/PROJECT_OVERVIEW.md)** - Description du projet et objectifs
- **[Décisions Architecture](docs/core/ARCHITECTURE_DECISIONS.md)** - Choix techniques importants
- **[Process Développement](docs/core/DEVELOPMENT_PROCESS.md)** - Méthodologie et phases

### 💻 **Documentation Frontend**
- **[Spécifications Frontend](docs/frontend/FRONTEND_SPECS.md)** - Interface utilisateur et fonctionnalités
- **[Implémentation Frontend](docs/frontend/FRONTEND_IMPLEMENTATION.md)** - Détails techniques React/TypeScript
- **[Optimisations Frontend](frontend/docs/README_OPTIMISATION.md)** - Refactoring et optimisations

### ⚙️ **Documentation Backend**
- **[Spécifications Backend](docs/backend/BACKEND_SPECS.md)** - APIs, architecture et modèles de données
- **[Implémentation Backend](docs/backend/BACKEND_IMPLEMENTATION.md)** - Détails techniques FastAPI/Python
- **[Intégration Galaxy](docs/backend/GALAXY_INTEGRATION.md)** - Service Galaxy API SMART

### 🚀 **Documentation Opérations**
- **[Guide Déploiement](docs/operations/DEPLOYMENT_GUIDE.md)** - Docker, Kubernetes, environnements
- **[Phase 1 - Développement](docs/operations/PHASE1_DEVELOPMENT.md)** - Développement local
- **[Phase 2 - Intégration](docs/operations/PHASE2_INTEGRATION.md)** - Staging (nginx reverse proxy)
- **[Phase 3 - Production](docs/operations/PHASE3_PRODUCTION.md)** - Production (Kubernetes)

### 📋 **Travail en Cours**
- **[Travail en Cours](docs/work/WORK_IN_PROGRESS.md)** - Versions, features, bugs en cours
- **[Backlog Projet](docs/work/BACKLOG.md)** - Roadmap et fonctionnalités prévues
- **[Historique Réalisations](docs/work/DONE.md)** - Fonctionnalités implémentées par version
- **[Métriques Performance](docs/work/PERFORMANCE_METRICS.md)** - Mesures et optimisations

---

## 🛠️ **Quick Start pour Claude**

1. **Nouvelle session :** Lire `docs/work/WORK_IN_PROGRESS.md` pour l'état actuel
2. **Nouvelle feature :** Consulter `docs/core/DEVELOPMENT_PROCESS.md` (processus 3 phases)
3. **Phase 1 :** Voir `docs/operations/PHASE1_DEVELOPMENT.md` - Développement local
4. **Phase 2 :** Voir `docs/operations/PHASE2_INTEGRATION.md` - Staging (nginx reverse proxy)
5. **Phase 3 :** Voir `docs/operations/PHASE3_PRODUCTION.md` - Production (Kubernetes)

## ⚠️ **RÈGLES CRITIQUES pour Claude**

### 🚫 **INTERDICTIONS ABSOLUES**
- **NE JAMAIS** passer d'une phase à l'autre sans validation utilisateur
- **NE JAMAIS** démarrer une phase sans relire sa procédure complète
- **NE JAMAIS** ignorer les gates et critères de passage

### ✅ **OBLIGATIONS**
- **TOUJOURS** demander "go" explicite entre phases
- **TOUJOURS** relire PHASE[X]_[NAME].md avant débuter  
- **TOUJOURS** attendre réponse utilisateur avant continuer

## 📋 **Règles de Versioning**

**Format :** `X.Y.Z-rc.n`
- **X** : Structure base de données
- **Y** : Nouvelle fonctionnalité
- **Z** : Bugfix
- **-rc.n** : Release Candidate (incrémental pendant développement)

**Variable d'environnement ENVIRONMENT :**
- `STAGING` : Affiche la version complète avec `-rc.n`
- `PROD` (défaut) : Masque le suffixe `-rc.n`

**Workflow :**
1. **Développement** : Version `X.Y.Z-rc.1` dans les fichiers sources
2. **Phase 2 Staging** : ENVIRONMENT=STAGING → affiche `X.Y.Z-rc.n`
3. **Phase 3 Production** : ENVIRONMENT=PROD (défaut) → affiche `X.Y.Z`

**Avantage :** Images identiques staging/production (même code, même build)

---

## 🎯 **Contact Points**

**URLs :**
- **Production :** https://coupel.net/ansible-builder
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel

**Configuration :**
- **Kubeconfig :** kubeconfig.txt
- **GitHub Token :** github_token.txt
- **Custom Values :** custom-values.yaml

---

## 🏗️ **Architecture Phase 2 - Nginx Reverse Proxy (PERMANENT)**

**⚠️ IMPORTANT :** En Phase 2, TOUJOURS utiliser cette architecture nginx reverse proxy

### Structure
```
nginx (port 80) → Point d'entrée unique
├── / → frontend (Vite dev server, port 5173)
└── /api/* → backend (FastAPI, port 8000)
```

### Procédure de déploiement Phase 2
```bash
# 1. Build images localement sur staging server
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-backend:X.Y.Z_n backend/
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-frontend:X.Y.Z_n-vite -f frontend/Dockerfile.dev frontend/

# 2. Update docker-compose.staging.yml avec nouvelles versions

# 3. Déploiement
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml up -d

# 4. Validation santé OBLIGATOIRE
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend API OK
curl -I http://192.168.1.217/                # Frontend OK (Vite)
```

### Points clés PERMANENTS
- **Images locales** : Build sur 192.168.1.217, PAS de push ghcr.io
- **Frontend Vite** : TOUJOURS utiliser `Dockerfile.dev` (pas `Dockerfile`)
- **Nginx central** : Point d'entrée unique sur port 80
- **Configuration inline** : nginx.conf dans docker-compose.staging.yml
- **Validation santé** : TOUJOURS tester les 3 endpoints

**Voir détails complets :** [Guide Déploiement Phase 2](docs/operations/DEPLOYMENT_GUIDE.md#phase-2--architecture-nginx-reverse-proxy-staging)

---

*Ce fichier est maintenu automatiquement. Pour les détails techniques, consultez la documentation spécialisée ci-dessus.*
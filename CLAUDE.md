Session_id: 767f34c1-c453-4c33-b9a2-e8eaf2d2fa45

# Guide Claude - Ansible Builder

Ce document est l'index principal pour les futures instances de Claude travaillant sur ce projet. Il contient les liens vers toute la documentation technique organisée.

---

## 🚀 **Status Actuel**

**Version Développement :** Backend 2.0.0 / Frontend 2.0.0
**Version Production :** Backend 2.0.0 / Frontend 2.0.0  ✅ **DEPLOYED**
**URL Production :** https://coupel.net/ansible-builder
**URL Staging :** http://192.168.1.217 (nginx reverse proxy)
**Dernière mise à jour :** 2026-01-01

## 📚 **Documentation Organisée**

### 🎯 **Documentation Projet**
- **[Vue d'Ensemble](docs/core/PROJECT_OVERVIEW.md)** - Description du projet et objectifs
- **[Décisions Architecture](docs/core/ARCHITECTURE_DECISIONS.md)** - Choix techniques importants
- **[Process Développement](docs/core/DEVELOPMENT_PROCESS.md)** - Méthodologie et phases
- **[Gestion des Versions](docs/core/VERSION_MANAGEMENT.md)** - Format, affichage et implémentation

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

### 🗄️ **RÈGLE STOCKAGE DONNÉES**
- **TOUJOURS** stocker les données utilisateur en base de données (pas fichiers `/tmp`)
- **TOUJOURS** lier les données à l'utilisateur (multi-tenant)
- **RAISON** : Scalabilité horizontale, persistence, multi-utilisateur
- **Voir** : [Décisions Architecture](docs/core/ARCHITECTURE_DECISIONS.md#règle-critique--stockage-en-base-de-données)

## 📋 **Règles de Versioning**

> **📖 Documentation complète :** [Gestion des Versions](docs/core/VERSION_MANAGEMENT.md)

**Format :** `X.Y.Z[-rc.n]`

| Composant | Description |
|-----------|-------------|
| **X** | Version majeure (changements DB/breaking) |
| **Y** | Version mineure (nouvelles fonctionnalités) |
| **Z** | Version patch (bugfixes) |
| **-rc.n** | Release Candidate (staging/dev uniquement) |

**Affichage par Environnement :**

| Environnement | Variable | Version Affichée |
|---------------|----------|------------------|
| Production | `ENVIRONMENT=PROD` | `1.13.0` (sans RC) |
| Staging | `ENVIRONMENT=STAGING` | `1.13.0-rc.4` (complet) |

**Fichiers à synchroniser :**
- `backend/app/version.py` : `__version__ = "X.Y.Z-rc.n"`
- `frontend/package.json` : `"version": "X.Y.Z-rc.n"`
- `docker-compose.staging.yml` : Tags images Docker

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

## 🏗️ **Architecture Phase 2 - Build Once Deploy Everywhere**

**⚠️ IMPORTANT :** Même image Docker en staging et production (nginx pour frontend)

### Structure
```
nginx (port 80) → Point d'entrée unique
├── / → ansible-builder-frontend (nginx, port 80)
└── /api/* → ansible-builder-backend (FastAPI, port 8000)
```

### Procédure de déploiement Phase 2
```bash
# 1. Build images localement sur staging server (Dockerfile PRODUCTION)
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-backend:X.Y.Z-rc.n -f backend/Dockerfile backend/
docker -H tcp://192.168.1.217:2375 build -t ansible-builder-frontend:X.Y.Z-rc.n -f frontend/Dockerfile frontend/

# 2. Update docker-compose.staging.yml avec nouvelles versions

# 3. Déploiement
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml up -d

# 4. Validation santé OBLIGATOIRE
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend API OK
curl -I http://192.168.1.217/                # Frontend OK (nginx)
```

### Points clés PERMANENTS
- **Build Once Deploy Everywhere** : Même Dockerfile pour staging et production
- **Images locales** : Build sur 192.168.1.217, PAS de push ghcr.io en Phase 2
- **Frontend nginx** : TOUJOURS utiliser `frontend/Dockerfile` (pas Dockerfile.dev)
- **Noms de services** : `ansible-builder-backend`, `ansible-builder-frontend` (alignés sur K8s)
- **Nginx central** : Point d'entrée unique sur port 80
- **Validation santé** : TOUJOURS tester les 3 endpoints

**Voir détails complets :** [Phase 2 Intégration](docs/operations/PHASE2_INTEGRATION.md)

---

*Ce fichier est maintenu automatiquement. Pour les détails techniques, consultez la documentation spécialisée ci-dessus.*
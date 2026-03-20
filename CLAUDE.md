Session_id: 767f34c1-c453-4c33-b9a2-e8eaf2d2fa45

# Guide Claude - Automation Factory

Ce document est l'index principal pour les futures instances de Claude travaillant sur ce projet. Il contient les liens vers toute la documentation technique organisée.

---

## 🚀 **Status Actuel**

**Version Développement :** Backend 2.4.3 / Frontend 2.4.3
**Version Production :** Backend 2.4.3 / Frontend 2.4.3  ✅ **DEPLOYED**
**URL Production :** https://coupel.net/automation-factory
**URL Staging :** http://192.168.1.217 (nginx reverse proxy)
**URL Marketing :** https://ccoupel.bitbucket.io
**Dernière mise à jour :** 2026-03-20

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
- **[GitHub Issues](https://github.com/CCoupel/automation-factory/issues)** - Roadmap et fonctionnalités prévues (backlog migré)
- **[Historique Réalisations](docs/work/DONE.md)** - Fonctionnalités implémentées par version
- **[Métriques Performance](docs/work/PERFORMANCE_METRICS.md)** - Mesures et optimisations

---

## 🛠️ **Quick Start pour Claude**

1. **Nouvelle session :** Lire `docs/work/WORK_IN_PROGRESS.md` pour l'état actuel
2. **Nouvelle feature :** Consulter `docs/core/DEVELOPMENT_PROCESS.md` (processus 3 phases)
3. **Phase 1 :** Voir `docs/operations/PHASE1_DEVELOPMENT.md` - Développement local
4. **Phase 2 :** Voir `docs/operations/PHASE2_INTEGRATION.md` - Staging (nginx reverse proxy)
5. **Phase 3 :** Voir `docs/operations/PHASE3_PRODUCTION.md` - Production (Kubernetes)
6. **Tests :** Voir `backend/tests/` et `frontend/src/**/__tests__/`
7. **i18n**: All UI strings use `useTranslation()` — see `frontend/src/locales/`

## ⚠️ **RÈGLES CRITIQUES pour Claude**

### 🚫 **INTERDICTIONS ABSOLUES**
- **NE JAMAIS** passer d'une phase à l'autre sans validation utilisateur
- **NE JAMAIS** démarrer une phase sans relire sa procédure complète
- **NE JAMAIS** ignorer les gates et critères de passage

### ✅ **OBLIGATIONS**
- **TOUJOURS** demander "go" explicite entre phases
- **TOUJOURS** relire PHASE[X]_[NAME].md avant débuter
- **TOUJOURS** attendre réponse utilisateur avant continuer

### 🧪 **RÈGLES TESTS**
- **TOUJOURS** écrire des tests pour tout nouvel endpoint backend (dans `backend/tests/`)
- **TOUJOURS** écrire des tests pour tout nouveau service backend
- **TOUJOURS** écrire des tests frontend pour tout nouveau service, hook ou contexte
- **NE JAMAIS** merger du code qui diminue la couverture de tests
- **TOUJOURS** vérifier que les tests passent avant de passer en Phase 2 :
  - Backend : `cd backend && python -m pytest tests/ -v --cov=app`
  - Frontend : `cd frontend && npm test`
- **Fixtures partagées** : Utiliser `backend/tests/conftest.py` (ne pas dupliquer les fixtures)
- **Pattern backend** : Tests d'intégration avec SQLite en mémoire via conftest, mocks pour les services externes
- **Pattern frontend** : Vitest + React Testing Library, mock httpClient via `vi.mock()`

### 🌐 **i18n RULES**
- **NEVER** hardcode user-facing text in React components
- **ALWAYS** use `useTranslation()` from react-i18next for all visible text
- **ALWAYS** add keys to both locale files (`en/` and `fr/`)
- **Namespaces**: `common`, `auth`, `playbook`, `dialogs`, `admin`, `errors`
- **Locale files**: `frontend/src/locales/{en,fr}/{namespace}.json`
- **Default language**: English (`fallbackLng: 'en'`)
- **Parity check**: Every key added in `en/` must exist in `fr/` and vice versa
- **Completeness test**: `frontend/src/i18n/__tests__/i18n.test.ts` verifies EN/FR parity

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
- **Production :** https://coupel.net/automation-factory
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
├── / → automation-factory-frontend (nginx, port 80)
└── /api/* → automation-factory-backend (FastAPI, port 8000)
```

### Procédure de déploiement Phase 2
```bash
# 1. Build images localement sur staging server (Dockerfile PRODUCTION)
docker -H tcp://192.168.1.217:2375 build -t automation-factory-backend:X.Y.Z-rc.n -f backend/Dockerfile backend/
docker -H tcp://192.168.1.217:2375 build -t automation-factory-frontend:X.Y.Z-rc.n -f frontend/Dockerfile frontend/

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
- **Noms de services** : `automation-factory-backend`, `automation-factory-frontend` (alignés sur K8s)
- **Nginx central** : Point d'entrée unique sur port 80
- **Validation santé** : TOUJOURS tester les 3 endpoints

**Voir détails complets :** [Phase 2 Intégration](docs/operations/PHASE2_INTEGRATION.md)

---

## 🚀 **Déploiement Production - HELM EXCLUSIF**

**⚠️ RÈGLES ABSOLUES :** Déploiement production via Helm + images venant EXCLUSIVEMENT du pipeline CI GitHub Actions.

### ❌ INTERDIT en Production
```bash
# NE JAMAIS utiliser kubectl set image
kubectl set image deployment/... # INTERDIT - Casse la cohérence Helm

# NE JAMAIS builder ou retagger des images localement pour la prod
docker build ...  # INTERDIT - Les images prod viennent du pipeline CI
docker tag automation-factory-backend:rc... ghcr.io/...  # INTERDIT
```

### ✅ OBLIGATOIRE en Production
```bash
# 1. Pousser sur main → déclenche le pipeline CI GitHub Actions
git push https://<PAT>@github.com/CCoupel/automation-factory.git main

# 2. Surveiller ACTIVEMENT le pipeline CI (Claude le fait, pas l'utilisateur)
GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --branch main --limit 3
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory
# Attendre conclusion: success — si failure: analyser logs, corriger, repousser

# 3. Vérifier les images sur ghcr.io
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[0].metadata.container.tags'

# 4. Mise à jour custom-values.yaml avec le tag X.Y.Z (sans -rc.n)

# 5. Déploiement via Helm UNIQUEMENT
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --timeout 300s
```

### Rollback Production
```bash
# Via Helm (recommandé)
KUBECONFIG=kubeconfig.txt helm rollback automation-factory -n automation-factory

# Voir historique
KUBECONFIG=kubeconfig.txt helm history automation-factory -n automation-factory
```

**Voir détails complets :** [Phase 3 Production](docs/operations/PHASE3_PRODUCTION.md)

---

*Ce fichier est maintenu automatiquement. Pour les détails techniques, consultez la documentation spécialisée ci-dessus.*

---

## 🤖 Workflow Team Claude

Utiliser `/start-session` pour démarrer une session de travail collaborative.
Voir `.claude/commands/` pour les commandes disponibles.

| Commande | Description |
|----------|-------------|
| `/start-session` | Crée la TEAM `myTEAM` avec tous les agents |
| `/feature <description>` | Développement d'une nouvelle fonctionnalité |
| `/bugfix <description>` | Correction de bug |
| `/hotfix <description>` | Correction urgente en production |
| `/refactor <description>` | Refactoring de code |
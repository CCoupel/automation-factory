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
- **[Intégration Galaxy](docs/backend/GALAXY_INTEGRATION.md)** - ⚠️ **obsolète** (décrit `galaxy_service_smart.py`, remplacé par `galaxy_roles_service.py`/`galaxy_source_service.py` — voir `.claude/agents/dev-backend.md`)

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
- **Namespaces**: `common`, `auth`, `playbook`, `dialogs`, `admin`, `errors`, `project`
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
> **Migration v3 (2026-09-16)** : décision prise d'adopter à terme le schéma `X.Y.Z.a` du
> template (voir `.claude/agents/context/COMMON.template.md` section 5). Le code de
> production actuel (`backend/app/version.py`, `/api/version`, frontend, CHANGELOG) reste
> sur `X.Y.Z[-rc.n]` ci-dessous jusqu'à une tâche dédiée de migration — ne pas mélanger les
> deux schémas dans un même déploiement.

**Format actif (code de production) :** `X.Y.Z[-rc.n]`

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

> ⚠️ **Déclencheur réel corrigé (2026-09-16)** : `.github/workflows/release.yml` — le pipeline qui
> build et push les images se déclenche **uniquement sur un push de tag `v*.*.*`**, PAS sur un
> push vers `main` (`test.yml` tourne sur push/PR vers `main` mais ne build/push aucune image).
> `release.yml` lit en plus la version à taguer depuis `helm/automation-factory/Chart.yaml`
> (`version:`/`appVersion:`), pas depuis le tag git ni `backend/app/version.py` — ce fichier doit
> donc être bumpé et commité sur `main` **avant** de pousser le tag qui déclenche le build.

```bash
# 1. Bumper helm/automation-factory/Chart.yaml (version: / appVersion: → X.Y.Z) et commit sur main
git push https://<PAT>@github.com/CCoupel/automation-factory.git main

# 2. Créer et pousser le tag — c'est CE push qui déclenche le pipeline CI GitHub Actions
git tag vX.Y.Z && git push https://<PAT>@github.com/CCoupel/automation-factory.git vX.Y.Z

# 3. Surveiller ACTIVEMENT le pipeline CI (Claude le fait, pas l'utilisateur)
GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --limit 3
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory
# Attendre conclusion: success — si failure: analyser logs, corriger, repousser un nouveau tag

# 4. Vérifier les images sur ghcr.io
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[0].metadata.container.tags'

# 5. Mise à jour custom-values.yaml avec le tag X.Y.Z (sans -rc.n)

# 6. Déploiement via Helm UNIQUEMENT
# Secrets (2026-09-16) : custom-values.yaml ne contient plus de valeurs en clair — fournies
# via --set depuis un .env local non commité (voir .env.example). kubeconfig.txt gitignoré.
source .env   # DEPLOY_DB_PASSWORD, DEPLOY_JWT_SECRET_KEY
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --set postgresql.auth.password="$DEPLOY_DB_PASSWORD" \
  --set backend.env.SECRET_KEY="$DEPLOY_JWT_SECRET_KEY" \
  --timeout 300s

# 7. Smoke tests obligatoires post-déploiement — voir .claude/agents/qa.md
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

> **Migration v3 (2026-09-16)** : ce projet est passé du modèle CDP séparé/Team-AF à
> l'architecture teamleader du template actuel. Le "Claude principal" EST le teamleader —
> plus de spawn de CDP en cours de session. Tous les agents sont pré-spawnés par
> `/start-session` et restent IDLE. Voir `.claude/agents/context/TEAMMATES_PROTOCOL.template.md`
> pour le détail du protocole.

### Démarrage de Session

```
1. Lancer /start-session
2. Lire .claude/memory/MEMORY.md (état du projet, décisions, version courante)
3. Attendre les instructions de l'utilisateur
```

### Configuration Projet

| Paramètre | Valeur |
|-----------|--------|
| Projet | Automation Factory |
| Team | automation-factory-team |
| Backend | Python / FastAPI |
| Frontend | React / TypeScript |
| Base de données | PostgreSQL (+ SQLite dev/tests) |
| Build | `cd frontend && npm run build` |
| Tests | `cd backend && python -m pytest tests/ -v --cov=app && cd ../frontend && npm test` |

### Commandes Disponibles

| Commande | Usage |
|----------|-------|
| `/start-session` | Démarrer la session (team, mémoire, backlog) |
| `/end-session` | Clôturer la session (mémoire, git, dissolution team) |
| `/team-status` | État des agents, fermeture sélective |
| `/feature <desc>` | Nouveau workflow feature |
| `/bugfix <desc>` | Workflow correction de bug |
| `/hotfix <desc>` | Correction urgente prod |
| `/refactor <desc>` | Refactoring |
| `/deploy qualif\|prod` | Déploiement |
| `/review [scope]` | Revue de code |
| `/qa [scope]` | Validation QA |
| `/secu [scope]` | Audit sécurité |
| `/backlog [desc]` | Consulter / traiter les GitHub Issues |
| `/milestone status` | Progression du milestone actif |
| `/progression` | État d'avancement des agents en cours |
| `/context-audit [scope]` | Audit doc (doublons, refs cassées) |
| `/init-project` | Réinitialiser / mettre à jour le projet |

---

## Agents Disponibles

| Nom | Rôle | Fichier | Spawn |
|-----|------|---------|-------|
| `planner` | Plan d'implémentation | `.claude/agents/implementation-planner.template.md` (+ `implementation-planner.md`) | permanent |
| `dev-backend` | Backend (Python/FastAPI) | `.claude/agents/dev-backend.template.md` (+ `dev-backend.md`) | permanent |
| `dev-frontend` | Frontend (React/TypeScript) | `.claude/agents/dev-frontend.template.md` (+ `dev-frontend.md`) | permanent |
| `test-writer` | Scripts de tests + procédures QA | `.claude/agents/test-writer.template.md` (+ `test-writer.md`) | permanent |
| `code-reviewer` | Revue de code | `.claude/agents/code-reviewer.template.md` (+ `code-reviewer.md`) | permanent |
| `qa` | Exécution des tests et validation | `.claude/agents/qa.template.md` (+ `qa.md`) | permanent |
| `doc-updater` | Documentation | `.claude/agents/doc-updater.template.md` (+ `doc-updater.md`) | permanent |
| `deployer` | Déploiement QUALIF/PROD | `.claude/agents/deploy.template.md` (+ `deploy.md`) | permanent |
| `security` | Audit sécurité | `.claude/agents/security.template.md` (+ `security.md`) | ponctuel |
| `infra` | Infrastructure | `.claude/agents/infra.template.md` (+ `infra.md`) | ponctuel |
| `marketing-release` | Communication de release | `.claude/agents/marketing-release.template.md` (+ `marketing-release.md`) | ponctuel |

<!-- BEGIN TEAMLEADER_PROTOCOL — maintenu par le template, ne pas modifier manuellement -->

## Rôle Teamleader — Règles Critiques

> Ce bloc est maintenu par le template. Pour le mettre à jour : `/init-project` option d (step d6).

### Identité

Tu es le **teamleader** et le **Chef De Projet (CDP)** — un seul rôle, jamais délégué à un agent séparé.
Tu **coordonnes et dispatches**. Tu n'exécutes aucune tâche technique toi-même.

### Délégation Stricte — Outils Interdits

| Outil interdit | Déléguer à |
|---------------|-----------|
| `Edit`, `Write`, `MultiEdit` | `dev-*`, `doc-updater` |
| `Bash` (build / test / git) | `qa`, `deployer`, `dev-*` |
| `Read` (code applicatif) | `code-reviewer`, `planner` |
| `Glob`, `Grep` (recherche code) | `planner`, `dev-*` |

**`Read` autorisé uniquement pour** : `CLAUDE.md`, `MEMORY.md`, `project-config.json`, `_work/handoff/*.md`, `_work/reports/*.md`, `contracts/CHANGELOG.md`

**Ne jamais** exécuter une tâche technique soi-même — spawner l'agent approprié.

### Dispatcher une tâche

Tous les teammates sont spawned au démarrage (`/start-session`) et sont en IDLE.
**Pendant la session : uniquement `SendMessage` — jamais de spawn.**

```
SendMessage({ to: "<nom-canonique>", content: "<tâche complète>" })
→ Attendre ACTIF (confirmation) + DONE (références fichiers)
```

Plusieurs agents en parallèle — même tour :
```
SendMessage({ to: "dev-backend",  content: "<tâche>" })
SendMessage({ to: "dev-frontend", content: "<tâche>" })
```

### Nommage des Agents — Règle Absolue

Le paramètre `name` dans `Task` est **toujours le nom canonique simple** : `qa`, `dev-backend`, `planner`…
**Jamais de suffixe** (`qa-1`, `qa-2`…). Un rôle = un nom = une adresse `SendMessage` permanente.

**Noms canoniques** :
```
planner, dev-backend, dev-frontend, test-writer, code-reviewer, qa, doc-updater,
deployer, security, infra, marketing-release
```

### Validation des rapports DONE

Un `DONE` valide ne contient **jamais** de contenu inline (code, diff, extraits).
Format attendu : références fichiers uniquement (`_work/reports/`, `_work/handoff/`, SHA).

Si un agent envoie du contenu inline → corriger :
```
SendMessage({
  to: "<agent>",
  content: "Rapport invalide — écris le contenu dans _work/reports/<agent>-<timestamp>.md et renvoie le DONE avec la référence."
})
```

<!-- END TEAMLEADER_PROTOCOL -->

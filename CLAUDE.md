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

**Format actif (migration v2.4.4, depuis 2026-09-18) :** `X.Y.Z.a` (dev/staging) / `X.Y.Z` (prod)

| Composant | Description | Gestion |
|-----------|-------------|---------|
| **X** | Version majeure (changements DB/breaking) | Titre du milestone GitHub |
| **Y** | Version mineure (nouvelles fonctionnalités) | Titre du milestone GitHub |
| **Z** | Version patch (bugfixes) | Titre du milestone GitHub |
| **.a** | Compteur de build (dev/staging uniquement) | Incrémenté à chaque BUILD par `deployer` |

**Affichage par Environnement :**

| Environnement | Variable | Format | Exemple | is_rc | build |
|---------------|----------|--------|---------|-------|-------|
| Production | `ENVIRONMENT=PROD` | `X.Y.Z` | `2.4.4` | `false` | `null` |
| Staging | `ENVIRONMENT=STAGING` | `X.Y.Z.a` | `2.4.4.3` | `true` | `3` |

**Outil unique de gestion :** `python3 scripts/version.py`
- `get` — imprime version brute (`X.Y.Z.a`)
- `get --base` — imprime base (`X.Y.Z`)
- `get --build` — imprime compteur (`a`)
- `start X.Y.Z` — ouverture cycle (écrit `X.Y.Z.0`)
- `bump-build` — incrémente à BUILD
- `release` — retire `.a` à PUBLISH PROD
- `check [--tag vX.Y.Z]` — valide cohérence

**Fichiers synchronisés** (jamais édités manuellement, toujours par `scripts/version.py`) :
- `backend/app/version.py` : ligne `__version__` (4 segments dev/staging, 3 segments prod)
- `frontend/package.json` : champ `"version"` (4 segments dev/staging, 3 segments prod)
- `helm/automation-factory/Chart.yaml` : `version:` et `appVersion:` (3 segments uniquement, écris à ouverture cycle)
- `docker-compose.staging.yml` : image tags via `AF_IMAGE_TAG` env (4 segments, ex: `X.Y.Z.a`)

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

## 🏗️ **Architecture Phase 2 - QUALIF (Promotion sans rebuild)**

**Workflow** : `/build` → manifeste local → `/publish qualif` (promote) → `/deploy qualif` (staging via Docker Compose)

### Structure
```
nginx (port 80) → Point d'entrée unique
├── / → automation-factory-frontend (nginx, port 80)
└── /api/* → automation-factory-backend (FastAPI, port 8000)
```

### Procédure de déploiement QUALIF
```bash
# 1. BUILD — images X.Y.Z.a construites sur daemon 192.168.1.217
python3 scripts/version.py bump-build  # -> X.Y.Z.a
docker -H tcp://192.168.1.217:2375 build -t automation-factory-backend:X.Y.Z.a -f backend/Dockerfile backend/
docker -H tcp://192.168.1.217:2375 build -t automation-factory-frontend:X.Y.Z.a -f frontend/Dockerfile frontend/

# 2. PUBLISH QUALIF — promotion (zéro rebuild)
# Vérifier manifeste + copier vers build/qualif_vX.Y.Z/ + écrire release.env (AF_IMAGE_TAG=X.Y.Z.a)

# 3. DEPLOY QUALIF — installe depuis release.env
docker -H tcp://192.168.1.217:2375 compose --env-file release.env -f docker-compose.staging.yml up -d
sleep 30
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend API OK — version=X.Y.Z.a, is_rc=true
curl -I http://192.168.1.217/                # Frontend OK (nginx)

# 4. E2E Tests
./e2e-tests.sh

# 5. Gate "go" avant PROD (validation utilisateur)
```

### Points clés PERMANENTS
- **Promotion sans rebuild** : Images X.Y.Z.a construites une fois, promues à QUALIF sans reconstruire
- **Manifeste** : Traçabilité image IDs, git SHA, built_at dans `build/candidate_vX.Y.Z/manifest-X.Y.Z.a.json`
- **release.env** : Configuré dans `build/qualif_vX.Y.Z/release.env` (AF_IMAGE_TAG=X.Y.Z.a) — utilisé par compose
- **Frontend nginx** : TOUJOURS utiliser `frontend/Dockerfile` (pas Dockerfile.dev)
- **Noms de services** : `automation-factory-backend`, `automation-factory-frontend` (alignés sur K8s)
- **Nginx central** : Point d'entrée unique sur port 80
- **Validation santé** : TOUJOURS tester les 3 endpoints + E2E avant "go"

**Voir détails complets :** [Phase 2 Intégration](docs/operations/PHASE2_INTEGRATION.md)

---

## 🚀 **Déploiement Production - HELM EXCLUSIF (Rebuild-CI)**

**⚠️ RÈGLES ABSOLUES :** Déploiement production via Helm + images venant EXCLUSIVEMENT du pipeline CI GitHub Actions depuis un tag figé.

### Workflow
```
/publish prod (merge + tag vX.Y.Z)
    ↓
.github/workflows/release.yml déclenché
    ↓
rebuild déterministe : clone tag, build images, push `:X.Y.Z` sur ghcr.io
    ↓
/deploy prod (helm upgrade depuis custom-values.yaml)
    ↓
smoke tests + monitoring 30 min
```

### ❌ INTERDIT en Production
```bash
# NE JAMAIS utiliser kubectl set image
kubectl set image deployment/... # INTERDIT - Casse la cohérence Helm

# NE JAMAIS builder ou retagger des images localement pour la prod
docker build ...  # INTERDIT - Les images prod viennent du pipeline CI
docker tag automation-factory-backend:X.Y.Z.3 ghcr.io/...  # INTERDIT (4 segments)

# NE JAMAIS pousser de tag à 4 segments
git tag v2.4.4.1 && git push ...  # INTERDIT — uniquement v2.4.4 (3 segments)
```

### ✅ OBLIGATOIRE en Production

**Déclencheur réel** : `.github/workflows/release.yml` se déclenche **uniquement sur un push de tag
`vX.Y.Z`** (exactement 3 segments), **PAS sur un push vers `main`**. Job `validate` rejette tout tag
malformé (`v2.4.4.1`, `v2.4.4-rc.1`, etc.).

```bash
# 1. PUBLISH PROD — sur branche milestone/vX.Y.Z
python3 scripts/version.py release     # Retire .a (X.Y.Z.a → X.Y.Z)
python3 scripts/version.py check       # Valide cohérence fichiers
git commit "chore(version): Release vX.Y.Z" && git push

# 2. Merger sur main et tagger
git checkout main && git merge --no-ff milestone/vX.Y.Z -m "Release vX.Y.Z"
git push https://<PAT>@github.com/CCoupel/automation-factory.git main

# 3. Créer et pousser le tag — C'EST CE PUSH QUI DÉCLENCHE LA CI
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push https://<PAT>@github.com/CCoupel/automation-factory.git vX.Y.Z

# 4. Surveiller ACTIVEMENT le pipeline CI (deployer le fait)
GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --limit 3
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory
# Attendre conclusion: success — si failure: analyser logs, corriger, rollback

# 5. Vérifier les images sur ghcr.io (tags X.Y.Z uniquement, JAMAIS 4 segments)
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "X.Y.Z")'

# 6. DEPLOY PROD — mise à jour custom-values.yaml + helm upgrade
sed -i "s/image:.*:.*$/image: automation-factory-backend:X.Y.Z/" custom-values.yaml

# Secrets (2026-09-16) : custom-values.yaml ne contient plus de valeurs en clair — fournies
# via --set depuis un .env local non commité (voir .env.example). kubeconfig.txt gitignoré.
source .env   # DEPLOY_DB_PASSWORD, DEPLOY_JWT_SECRET_KEY
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --set postgresql.auth.password="$DEPLOY_DB_PASSWORD" \
  --set backend.env.SECRET_KEY="$DEPLOY_JWT_SECRET_KEY" \
  --timeout 300s

# 7. Smoke tests obligatoires post-déploiement
#    Doit vérifier : version=X.Y.Z (3 segments), is_rc=false, build=null
./smoke-test-production.sh
curl -s https://coupel.net/automation-factory/api/version | jq .

# 8. Monitoring 30 minutes obligatoire
./monitor-production-30min.sh
```

### Rollback Production
```bash
# Via Helm (recommandé)
KUBECONFIG=kubeconfig.txt helm rollback automation-factory -n automation-factory

# Voir historique
KUBECONFIG=kubeconfig.txt helm history automation-factory -n automation-factory

# Fallback kubectl UNIQUEMENT si helm rollback échoue
KUBECONFIG=kubeconfig.txt kubectl rollout undo deployment/automation-factory-backend -n automation-factory
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

### ⚠️ Phase Init — Gestion de Version (Override Projet)

**Le template générique contient des snippets incompatibles avec ce projet** :

| Template (❌ N'UTILISER PAS) | Projet (✅ UTILISER) |
|-----|-----|
| `echo "X.Y.Z.0" > backend/app/version.py` | `python3 scripts/version.py start X.Y.Z` |
| `echo "X.Y.Z+1.0" > backend/app/version.py` (hotfix) | `python3 scripts/version.py start X.Y.Z+1` |

**Raison** : L'édition directe par `echo` écraserait le fichier complètement, perdant `VERSION_FEATURES` et autres métadonnées critiques.

**Règle absolue** : Toujours utiliser `scripts/version.py` pour toute modification de version (ouverture cycle, hotfix, tout).

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
| `/build` | Compilation de la version candidate — agnostique à l'environnement |
| `/publish qualif\|prod` | Mise à disposition pour un environnement (promotion ou rebuild déterministe via CI) |
| `/deploy qualif\|prod` | Installation de l'artefact déjà publié |
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
| `planner` | Plan d'implémentation + contrats API | `.claude/agents/implementation-planner.template.md` (+ `implementation-planner.md`) | permanent |
| `dev-backend` | Backend (Python/FastAPI) | `.claude/agents/dev-backend.template.md` (+ `dev-backend.md`) | permanent |
| `dev-frontend` | Frontend (React/TypeScript) | `.claude/agents/dev-frontend.template.md` (+ `dev-frontend.md`) | permanent |
| `test-writer` | Scripts de tests + procédures QA | `.claude/agents/test-writer.template.md` (+ `test-writer.md`) | permanent |
| `code-reviewer` | Revue de code | `.claude/agents/code-reviewer.template.md` (+ `code-reviewer.md`) | permanent |
| `qa` | Exécution des tests et validation | `.claude/agents/qa.template.md` (+ `qa.md`) | permanent |
| `doc-updater` | Documentation | `.claude/agents/doc-updater.template.md` (+ `doc-updater.md`) | permanent |
| `deployer` | Build + Publication + Déploiement QUALIF/PROD | `.claude/agents/deploy.template.md` (+ `deploy.md`) | permanent |
| `security` | Audit sécurité | `.claude/agents/security.template.md` (+ `security.md`) | ponctuel |
| `infra` | Infrastructure (si configurée) | `.claude/agents/infra.template.md` (+ `infra.md`) | ponctuel |
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
planner, dev-backend, dev-frontend, dev-firmware, dev-plugin,
test-writer, code-reviewer, qa, doc-updater, deployer, security, infra
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

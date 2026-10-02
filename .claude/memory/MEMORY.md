# Mémoire Claude - Automation Factory

> Architecture projet : `CLAUDE.md` (chargé automatiquement)

## Démarrage de session

Utiliser `/start-session` pour démarrer chaque session : crée la TEAM.
Source de vérité MEMORY : `.claude/memory/MEMORY.md` uniquement (versionné Git).

## Contexte projet

**Automation Factory** — Constructeur graphique de playbooks Ansible en mode SaaS.

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript, Vite, Material-UI, @dnd-kit, Zustand |
| Backend | FastAPI / Python 3.11+, SQLAlchemy async, Redis |
| DB | PostgreSQL (staging/prod) · SQLite (dev local) |
| Infra | Docker, Kubernetes (Helm), Nginx |
| Tests backend | pytest + SQLite in-memory (conftest.py) |
| Tests frontend | Vitest + React Testing Library |
| i18n | react-i18next, locales EN/FR dans `frontend/src/locales/` |

**Versions actuelles :**
- Production : backend `2.4.3` / frontend `2.4.3` — https://coupel.net/automation-factory ✅ DEPLOYED
- Staging : `2.4.3`
- **En développement** : milestone v2.4.4 (branche `milestone/v2.4.4`, non poussée)

**Versioning (depuis v2.4.4 — migration complète) :**
- Dev/Staging : `X.Y.Z.a` (ex: `2.4.4.3` — compteur `.a` incrémenté à BUILD)
- Prod : `X.Y.Z` (ex: `2.4.4` — sans compteur, figé)
- Outil unique : `scripts/version.py` (get, start, bump-build, release, check)
- Anciens schémas (legacy) : `X.Y.Z-rc.n` et `X.Y.Z_n` acceptés en lecture (compat), plus jamais écrits

**3 phases de développement :**
1. Phase 1 — Local natif (`:8000` / `:5173`) → gate : tests 100% + "go" user
2. Phase 2 — Staging Docker sur `192.168.1.217` → gate : validation user + "go"
3. Phase 3 — Production Kubernetes via Helm exclusivement

## Corrections comportementales

- **TeamDelete** : proposer après livraison validée, jamais automatiquement
- **Agents** : prompts génériques — tâches via TaskCreate + TaskUpdate
- **Commande /start-session** : créer la TEAM directement, nom toujours `Team-AF`
- **Architecture team** : CDP = team leader, Claude = interface utilisateur
- **Phases** : jamais passer à la phase suivante sans "go" explicite de l'utilisateur
- **Tests** : toujours écrire tests pour tout nouvel endpoint/service ; ne jamais diminuer la couverture
- **i18n** : toujours `useTranslation()`, clés dans `en/` ET `fr/` en même temps
- **Données** : toujours en DB (pas `/tmp`), toujours liées à l'utilisateur (multi-tenant)
- **Production** : déploiement Helm exclusif — jamais `kubectl set image`
- **BORE** (depuis v2.4.4) : QUALIF = promotion sans rebuild (images X.Y.Z.a locales, manifeste + release.env) ; PROD = rebuild déterministe CI depuis tag git (source figée, images X.Y.Z poussées ghcr.io)
- **Déploiement** : BUILD/PUBLISH/DEPLOY scindés (voir `.claude/agents/deploy.md` v2.4.4)
  - BUILD : compilation unique → manifeste local
  - PUBLISH QUALIF : promotion sans rebuild
  - DEPLOY QUALIF : Docker Compose staging
  - PUBLISH PROD : merge + tag → CI rebuild
  - DEPLOY PROD : Helm Kubernetes

---

## Cycle en cours : v2.4.4 (Migration Versioning X.Y.Z.a) — PHASES 0-6 COMPLÉTÉES

**Status** : ✅ Outillage + Documentation + Code applicatif migrés, Review corrigée, QA VALIDATED

### Phase 0-1 (Décisions & Ouverture)
✅ Milestone GitHub `v2.4.4` créé (issue #94)
✅ Branche `milestone/v2.4.4` locale (non poussée)

### Phase 2 (Code applicatif)
✅ Backend : `scripts/version.py` (CLI unique), `version.py` (`X.Y.Z.a` format), `/api/version` (champs `build`, `is_build_candidate`)
✅ Frontend : `useVersionInfo.ts` (strip 4e segment PROD), `docker-entrypoint.sh` (sed ciblé), `package.json` (4 segments)
✅ Tests : 371/371 backend pass, 281/295 frontend (14 pré-existants, Node 20 vs 26 issue)

### Phase 3 (Infra/CI)
✅ `release.yml` : job `validate` (regex strict `^v\d+\.\d+\.\d+$`), rebuild-CI depuis tag
✅ `docker-compose.staging.yml` : `AF_IMAGE_TAG` env (obligatoire)
✅ `.claude/project-config.json` : `environments[QUALIF/PROD]` + `commands.version_read`

### Phase 4 (Scripts vérification)
✅ `smoke-test-production.sh`, `monitor-production-30min.sh`, `e2e-tests.sh` : `scripts/version.py get`, vérif is_rc/build

### Phase 5 (Runbook deploy.md)
✅ Restructuration complète : BUILD → PUBLISH QUALIF → DEPLOY QUALIF → PUBLISH PROD → DEPLOY PROD
✅ Checklist 20/20 non-régression (règles opérationnelles conservées)
✅ Corrections : jq regex 4-segments, python3 prefix, BORE resync, staging X.Y.Z.a

### Phase 6 (Documentation & Compagnons)
✅ `CLAUDE.md` : Versioning section, BORE QUALIF/PROD, Phase Init override
✅ `docs/core/VERSION_MANAGEMENT.md` : Réécriture complète, cycle mermaid
✅ `docs/operations/*` : `-rc.n` → `X.Y.Z.a`, BORE clarifiée
✅ `contracts/` : Versioning contracts (C-1 to C-5), `is_build_candidate`
✅ Compagnons agents : `qa.md`, `dev-backend.md`, `implementation-planner.md`, `doc-updater.md`

### ⏳ Phase 7 (À faire — NON INCLUS DANS CE CYCLE)
**Premier cycle réel** : `/build` → manifeste `2.4.4.1` → `/publish qualif` → `/deploy qualif` (staging `2.4.4.1`, is_rc=true) → gate "go" → `/publish prod` (merge, tag `v2.4.4`, CI rebuild) → `/deploy prod` (helm, smoke, monitor 30min) → clôture milestone

**ATTENTION** : Ce cycle (0-6) est du développement documenté d'outillage. Rien n'a été buildé/publié/déployé réellement. `main` reste sur l'ancien schéma jusqu'à Phase 7. Prod/staging toujours en 2.4.3.

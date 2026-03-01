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
- Production : backend `2.3.0` / frontend `2.3.5` — https://coupel.net/automation-factory
- En cours : `2.3.6-rc.1` (Phase 2 Intégration)

**Versioning :**
- Dev : `X.Y.Z_n` · Staging : `X.Y.Z-rc.n` · Prod : `X.Y.Z`

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
- **BORE** : pas de rebuild en Phase 3 — retag de l'image staging validée

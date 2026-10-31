# Adaptations projet — Automation Factory

> Complète `implementation-planner.template.md` (renommé depuis `planner.md`).

## ⚠️ Docs de référence obsolètes — ne pas planifier dessus sans vérifier le code réel
`docs/backend/BACKEND_SPECS.md` et `docs/core/ARCHITECTURE_DECISIONS.md` contiennent des
informations **périmées et contredites par le code réel** :
- "Base de données : SQLite (single-pod production)" — **faux**, la prod utilise PostgreSQL
  (StatefulSet Helm, `asyncpg`) ; SQLite (`aiosqlite`) sert uniquement en dev local/tests
- "Cache : Redis (pour Galaxy API)" — **faux**, Redis n'est jamais importé dans `app/` malgré
  la dépendance présente ; le cache réel est en mémoire (`app/services/cache_service.py`)
- "State Management : useState" (frontend) — **faux**, l'état réel est hybride Zustand
  (`stores/`, 3 fichiers) + 7 React Context (`contexts/`)
Avant tout plan touchant DB/cache/state, vérifier le code (`app/core/database.py`,
`app/services/cache_service.py`, `frontend/src/stores/`), pas ces docs.

## Contraintes projet à intégrer dans tout plan
- Toujours prévoir les clés i18n dans `en/` ET `fr/` simultanément (7 namespaces réels :
  `common`, `auth`, `playbook`, `dialogs`, `admin`, `errors`, `project`)
- Toujours prévoir le stockage en DB (jamais `/tmp`), lié à `current_user` (pattern réel :
  `api/endpoints/playbooks.py` — `.where(Playbook.owner_id == current_user.id)`)
- **Dérogation projet — Alembic n'est pas utilisé** — aucune migration DB dans ce projet, le schéma est recréé via
  `Base.metadata.create_all()` (`core/database.py::init_db()`) ; ne jamais planifier de tâche
  "créer une migration Alembic", signaler plutôt l'impact du changement de schéma directement

## Règles de versioning projet
- `X.Y.Z` est porté par le titre du milestone GitHub — le plan ne le choisit pas ; signaler au
  teamleader tout changement de schéma DB (impact potentiel sur X)
- Build counter `.a` en dev/staging (ex: `2.4.4.3`), retiré en prod (ex: `2.4.4`) — voir `.claude/agents/deploy.md` et la
  section "Règles de Versioning" de `CLAUDE.md` (schéma actif depuis v2.4.4 ; géré uniquement par `scripts/version.py`)

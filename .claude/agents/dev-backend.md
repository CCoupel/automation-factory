# Adaptations projet — Automation Factory

> Complète `dev-backend.template.md` (générique FastAPI/Django/Flask) avec la structure et les
> règles réelles du backend Automation Factory.

## Stack
- **FastAPI** (Python 3.11+) — async/await, Pydantic v2, APIRouter
- **SQLAlchemy** async — modèles + sessions. ⚠️ **Alembic est dans `requirements.txt` mais n'est PAS
  utilisé** : aucun dossier `alembic/` n'existe dans le repo. Le schéma est créé via
  `Base.metadata.create_all` (`core/database.py::init_db()`, appelé par `backend/init_db.py`) —
  pas de fichiers de migration versionnés. Ne pas dire à un dev de faire `alembic revision`.
- **PostgreSQL** (prod/staging, driver `asyncpg`) + **SQLite** (dev local/tests, driver `aiosqlite`)
- **Cache réel = en mémoire, pas Redis** : `app/services/cache_service.py` (`EnhancedCache`,
  décorateur `@cached_async`, TTL, stats hits/misses) est le mécanisme de cache effectivement
  utilisé (Galaxy notamment). `redis`/`hiredis` sont dans `requirements.txt` et `REDIS_URL` existe
  dans `core/config.py`, un service `redis` tourne dans `docker-compose.yml` (dev local) — mais
  **aucun client Redis n'est instancié nulle part dans `app/`** (absent aussi de
  `docker-compose.staging.yml`). Ne pas supposer que le cache passe par Redis.
- **Auth JWT** : `core/security.py` (bcrypt via `passlib`, JWT via `python-jose`) +
  `core/dependencies.py` (`get_current_user`, `get_current_admin`, et des dépendances réutilisables
  `get_<entité>_or_404` pour le fetch+404). Tout endpoint protégé doit utiliser
  `Depends(get_current_user)` / `Depends(get_db)`, pas de logique d'auth ad-hoc.
- **Deux canaux temps réel distincts, ne pas les confondre** :
  `app/services/sse_manager.py` (SSE, notifications de cache) et
  `app/services/websocket_manager.py` (WebSocket, collaboration temps réel, pattern
  event-sourcing avec snapshot — feature v2.4.0, voir `app/api/endpoints/websocket.py`)
- **`ansible`/`ansible-runner`/`ansible-lint` sont dans `requirements.txt` mais `ansible_runner`
  n'est importé nulle part dans `app/`** : les endpoints Ansible (`api/endpoints/ansible.py`) ne
  jouent pas de playbooks — ils exposent des métadonnées (versions, collections) récupérées via
  `core/http_service.py::BaseHTTPService` (appels HTTP), pas via ansible-runner.
- **pytest** — tests d'intégration avec SQLite in-memory via `conftest.py`

## Structure réelle
```
backend/app/
├── api/endpoints/    ← Nouveaux endpoints ici
├── api/router.py     ← Enregistrement des routers
├── models/           ← Modèles SQLAlchemy
├── schemas/           ← Schémas Pydantic (séparés des modèles SQLAlchemy)
├── services/         ← Logique métier
├── core/             ← Config, sécurité (security.py), DB (database.py), auth deps (dependencies.py)
├── main.py           ← Point d'entrée
└── version.py        ← __version__ = "X.Y.Z-rc.n"
backend/tests/
└── conftest.py       ← Fixtures partagées (ne pas dupliquer)
```

## Règles spécifiques projet
- **Multi-tenant** : toujours lier les données à `current_user`
- **Jamais** stocker de données dans `/tmp` ou en mémoire volatile — toujours en base
- Mocks pour services externes en test : Galaxy API (HTTP), pas de Redis/ansible-runner à mocker
  puisqu'ils ne sont pas utilisés en pratique (voir Stack ci-dessus)

## Intégration Galaxy (composant sensible, cache multi-niveaux)
⚠️ `docs/backend/GALAXY_INTEGRATION.md` est **obsolète** — il décrit un unique
`galaxy_service_smart.py` qui n'existe plus. L'architecture réelle (depuis v2.3.0, "Multi-sources")
est répartie en plusieurs services :
- `app/services/galaxy_roles_service.py`, `app/services/galaxy_source_service.py`
- Endpoints : `app/api/endpoints/galaxy_roles.py` (namespaces/collections/roles standalone),
  `app/api/endpoints/galaxy_sources.py` (admin CRUD des sources Galaxy configurées, reorder, test
  de connexion)
- Côté frontend : `galaxyModuleSchemaService.ts`, `galaxyRolesApiService.ts`, `galaxySourceService.ts`,
  contexte `GalaxyCacheContext.tsx`, UI `ModulesZoneCached.tsx`
- Toute modification structurelle de ce composant doit s'accompagner d'une mise à jour de
  `docs/backend/GALAXY_INTEGRATION.md` (déléguer à `doc-updater`) — la doc actuelle induit en erreur

## Validation
```bash
cd backend && ruff check .
cd backend && python -m pytest tests/ -v --cov=app
```
> `ruff==0.7.0` est bien présent dans `requirements.txt` (confirmé) mais n'est appelé dans aucun
> workflow CI (`.github/workflows/*.yml`) — le lancer manuellement reste recommandé avant commit.

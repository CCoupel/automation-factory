# Adaptations projet — Automation Factory

> Complète `code-reviewer.template.md` avec la checklist technique réelle du projet.

## Backend (FastAPI/Python)
- [ ] Endpoints async corrects (`async def`)
- [ ] Requêtes DB : `select(...)` + `await db.execute(...)` (pattern async SQLAlchemy 2.x
      constant dans `app/services/` — jamais de `session.query()` legacy)
- [ ] Relations chargées via `selectinload`/`joinedload` quand pertinent (déjà utilisé dans
      `collaboration.py`, `playbooks.py`, `project_shares.py`) — signaler un risque N+1 si une
      route boucle sur une relation non pré-chargée
- [ ] Schémas Pydantic dans `app/schemas/` : convention `XCreate`/`XUpdate`/`XResponse` (voir
      fichiers existants, ex. `playbook.py`) — un nouveau schéma doit suivre ce triplet
- [ ] Validation Pydantic aux frontières uniquement
- [ ] Multi-tenant : données liées à `current_user` — pattern réel confirmé dans
      `api/endpoints/playbooks.py` (`.where(Playbook.owner_id == current_user.id)` +
      helper `check_playbook_access(playbook_id, current_user.id, db)`), à répliquer pour toute
      nouvelle ressource utilisateur
- [ ] Pas de données en `/tmp` ou mémoire volatile
- [ ] Pas de handler d'exception global ni de classes d'exception custom dans ce projet —
      `HTTPException` FastAPI standard utilisée directement dans les endpoints ; ne pas chercher
      un pattern de gestion d'erreur centralisé qui n'existe pas
- [ ] Tests écrits et passants (`cd backend && python -m pytest tests/ -v --cov=app`)

## Frontend (React 18/TypeScript)
- [ ] Pas de texte hardcodé — `useTranslation()` partout
- [ ] Clés i18n dans `en/` ET `fr/` (7 namespaces réels : `common`, `auth`, `playbook`,
      `dialogs`, `admin`, `errors`, `project`)
- [ ] Appels API via `getHttpClient()` (`utils/httpClient.ts`) — jamais de `fetch()` brut ;
      pattern déjà respecté à 100% dans `frontend/src/services/` (13/13 fichiers), à faire
      respecter pour tout nouveau service
- [ ] TypeScript strict — pas de `any`, pas de `@ts-ignore`
- [ ] Pas de `console.log` oublié
- [ ] Lint propre : `npm run lint` — ⚠️ **actuellement cassé** : ESLint 9.39.1 installé mais
      aucun `eslint.config.js` (flat config requis depuis ESLint 9) ni `.eslintrc.*` dans
      `frontend/`. CI (`test.yml`) ne lance jamais ce script. Ne pas bloquer une review sur
      l'échec de cette commande précise tant qu'elle n'est pas reconfigurée — le signaler comme
      dette technique séparée plutôt que comme régression du changement revu.
- [ ] Build propre : `npx tsc --noEmit`
- [ ] Tests écrits et passants

## Ce que la CI vérifie réellement (`.github/workflows/test.yml`)
- Job `backend-tests` : `pytest --cov=app` (rapport de couverture uploadé, **pas de seuil
  minimum appliqué**)
- Job `frontend-tests` : `npm run test:coverage` (idem, pas de seuil)
- Job `integration-test` : `docker compose up -d --build` (compose **dev**, pas staging) puis
  smoke tests `/health`, `/api/version`, `/api/ping`, `/` (HTML)
- **Le lint n'est jamais exécuté en CI** (backend `ruff` ni frontend `eslint`) — c'est donc
  entièrement au reviewer de le vérifier manuellement

## Sécurité (projet)
- [ ] Pas d'injection SQL (SQLAlchemy paramétré)
- [ ] Pas de XSS (pas de `dangerouslySetInnerHTML`)
- [ ] Pas de secrets dans le code
- [ ] Endpoints protégés par authentification si nécessaire — via `Depends(get_current_user)` /
      `Depends(get_current_admin)` (`core/dependencies.py`), pas de logique JWT ad-hoc dans l'endpoint

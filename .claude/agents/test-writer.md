# Adaptations projet — Automation Factory

> Complète `test-writer.template.md` avec les conventions de test réelles du projet.

## Tests backend (pytest)
- Intégration via SQLite in-memory (pattern `conftest.py`)
- Mocks pour services externes : Galaxy API (HTTP). Redis et ansible-runner n'ont **aucun usage
  réel** dans `app/` (dépendances présentes mais non branchées — voir `dev-backend.md`) : inutile
  de les mocker.
- Fixtures partagées dans `backend/tests/conftest.py` — ne jamais dupliquer
- Par endpoint : minimum 1 test succès + 1 test erreur + 1 test auth (via `Depends(get_current_user)`)

## Tests frontend (Vitest + React Testing Library)
- Tests unitaires pour services (`services/*.ts` — wrappers fins autour de `httpClient`), hooks,
  contextes, stores Zustand (`stores/`)
- Pattern réel de mock : les services appellent `getHttpClient()` (pas `httpClient` directement) —
  mocker `getHttpClient` pour retourner un objet `{ get, post, put, delete }` en `vi.fn()` (voir
  `frontend/src/services/__tests__/playbookService.test.ts` pour le pattern exact), pas `httpClient`
  brut
- Tests de parité i18n : `frontend/src/i18n/__tests__/i18n.test.ts`

## Règles absolues
- **Jamais** diminuer la couverture de tests
- `backend/pyproject.toml` exclut de la couverture : `app/services/ansible_*`, `cache_*`, `sse_*`,
  `websocket_*` — ne pas s'étonner d'un % de couverture backend qui ignore ces modules
- `frontend/vitest.config.ts` exclut de la couverture (avec justification documentée dans le
  fichier lui-même — ne pas tenter de les couvrir en unitaire, ce sont des cas E2E/intégration) :
  `src/components/zones/**` (éditeur drag-and-drop, trop stateful pour de l'unitaire — nécessite
  simulation DnD complète), `src/main.tsx`/`App.tsx`/`MainLayout.tsx` (bootstrap, contexte
  navigateur complet requis), `src/hooks/usePlaybookWebSocket.ts` (fichier absent du repo — exclusion résiduelle) + `useCollaborationSync.ts` +
  `src/contexts/CollaborationContext.tsx` (WebSocket temps réel — nécessite un vrai backend,
  couvert par E2E)
- Galaxy API : toujours mocké via `unittest.mock.patch`/`AsyncMock` dans les tests backend (voir
  `backend/tests/test_galaxy_roles_service.py`) — jamais d'appel réseau réel dans les tests

> Couverture de référence au 2026-09-16 (à rafraîchir périodiquement, pas une constante figée) :
> backend ~47% (118 tests), frontend ~24% (80 tests).

## Rangement des tests (décision projet 2026-10-31)
- Nouveaux tests backend rangés en lots `backend/tests/<famille>/<theme>/<lot>/` (convention `context/COMMON.md` §15) ;
  frontend dans `frontend/src/**/__tests__/` selon le même découpage par lot quand c'est pertinent.
- `tests/INDEX.md` : une ligne par lot (chemin terminé par `/`). Les tests existants restent en place, sans migration.

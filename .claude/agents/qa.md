# Adaptations projet — Automation Factory

> Complète `qa.template.md`. Mapping vers le template : **Phase 1 = local**, **Phase 2 = QUALIF
> (staging 192.168.1.217)**, **Phase 3 = PROD**.

## Validation par phase

### Local
- Backend répond sur `:8000`, frontend charge sur `:5173`
- Endpoints `/api/version` et `/version` OK
- Tests de non-régression API : `./test-api-regression.sh`
- Format version affiché : `X.Y.Z_n`

### QUALIF — Staging (192.168.1.217)
```bash
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend OK
curl -I http://192.168.1.217/               # Frontend OK
```
- Tests E2E : `./e2e-tests.sh`
- Performances : `./performance-tests.sh` → < 2s response time
- Format version : `X.Y.Z.a`
- Tester les scénarios utilisateur des nouvelles features

### PROD
- Valider https://coupel.net/automation-factory
- `./smoke-test-production.sh` (accessibilité + version)
- `./monitor-production-30min.sh` (30 min, check toutes les 5 min) : 0 erreur critique
- Format version : `X.Y.Z` (sans RC), `environment=PROD`, `is_rc=false`

## Critères GO / NO-GO (projet)
- Local : 100% tests unitaires, API répond, interface charge
- QUALIF : tous endpoints OK, < 2s, 0 erreur critique
- PROD : métriques stables 30 min, 0 régression

> ✅ **2026-09-16 (test-writer, suite au smoke test PROD v2.4.3, voir
> `_work/reports/qa-20260916-152354.md` et `_work/reports/test-writer-20260916-*.md`)** :
> `smoke-test-production.sh`, `monitor-production-30min.sh` et `quick-monitoring-check.sh` sont
> corrigés et réexécutables tels quels :
> - Fins de ligne CRLF → LF sur les 4 scripts `.sh` à la racine (`e2e-tests.sh`,
>   `smoke-test-production.sh`, `monitor-production-30min.sh`, `quick-monitoring-check.sh`) —
>   règle `.gitattributes` (`*.sh text eol=lf`) ajoutée pour éviter la régression.
> - Assertion de version figée `1.9.0` remplacée par une lecture dynamique de
>   `backend/app/version.py` (repo checkout local), surchargeable via `EXPECTED_VERSION` —
>   fallback `2.4.3` si le fichier est absent. S'applique à `smoke-test-production.sh` Test 3,
>   `monitor-production-30min.sh` Check 3, `quick-monitoring-check.sh` Check 3.
> - Route Galaxy obsolète `/api/galaxy/namespaces/community/collections` remplacée par
>   `/api/galaxy-roles/standalone/namespaces` (confirmée fonctionnelle). S'applique aux 3 mêmes
>   scripts.
>
> ⚠️ **`e2e-tests.sh` reste cassé** (seule la CRLF a été corrigée — hors scope de cette
> correction, script QUALIF avec un problème de fond différent, voir ci-dessous) : Test 7 compare
> encore `$VERSION == "1.9.0-rc.1"` → échoue TOUJOURS. **Ne jamais traiter l'échec de cette
> assertion précise comme un vrai échec de déploiement** — lire la version réellement retournée
> par `/api/version` et la comparer manuellement à la version attendue du déploiement en cours.
>
> **`e2e-tests.sh` a un problème plus sérieux** : `BASE_URL="http://192.168.1.217:8000"` cible le
> backend directement sur le port 8000, mais `docker-compose.staging.yml` **ne publie pas ce
> port** sur l'hôte (`automation-factory-backend` n'a pas de section `ports:` — uniquement
> accessible via le réseau Docker interne, proxié par nginx sur `/api/`). Les tests 1, 3, 4, 5, 6
> (health backend, Galaxy namespaces, schema module, gestion erreur, performance) ne peuvent donc
> **pas aboutir tels quels** depuis l'extérieur du serveur staging — soit les exécuter depuis un
> conteneur du même réseau Docker, soit les réécrire pour cibler `http://192.168.1.217/api/...`
> (via nginx, port 80) comme le fait déjà `smoke-test-production.sh` pour la prod.
>
> **`performance-tests.sh` et `test-api-regression.sh` sont plus cassés encore — pas juste la
> version, les endpoints eux-mêmes n'existent plus.** Vérifié contre les routes réelles
> (`backend/app/api/endpoints/galaxy_roles.py` : `APIRouter(prefix="/galaxy-roles")`,
> `galaxy_sources.py` : `APIRouter(prefix="/galaxy-sources")`) :
> - Les deux scripts appellent `/api/galaxy/namespaces` et
>   `/api/galaxy/modules/{module}/schema` — **ces routes n'existent plus du tout** (ancien
>   `galaxy_service_smart.py`, remplacé par `galaxy_roles_service.py`/`galaxy_source_service.py`
>   avec les préfixes `/api/galaxy-roles/...` et `/api/galaxy-sources/...`). Ces requêtes
>   renverront 404 systématiquement, pas juste un test qui échoue.
> - `test-api-regression.sh` teste le format de version avec la regex
>   `^[0-9]+\.[0-9]+\.[0-9]+_[0-9]+$` (séparateur `_`) — ne correspond ni au schéma documenté
>   `X.Y.Z[-rc.n]` (séparateur `-`) ni à la valeur réelle actuelle de
>   `backend/app/version.py` (`__version__ = "2.4.3"`, sans suffixe RC).
> - `performance-tests.sh` cible aussi `192.168.1.217:8000` en direct — même problème de port
>   non publié que `e2e-tests.sh` ci-dessus.
> - Seuls les checks `/api/health`, `/api/auth/status`, `/api/playbooks` (préfixes inchangés)
>   restent valides dans `test-api-regression.sh`, exécutés depuis l'hôte staging lui-même
>   (`localhost:8000`, en interne ça fonctionne).
> - **Ne pas utiliser ces deux scripts pour valider la partie Galaxy d'un déploiement** — tester
>   manuellement `/api/galaxy-roles/standalone/namespaces` et
>   `/api/galaxy-roles/collections/{namespace}/{collection}/roles` à la place.

### CI — smoke tests déjà automatisés (indépendant des scripts manuels ci-dessus)

`.github/workflows/test.yml` job `integration-test` (après `backend-tests`/`frontend-tests`,
sur chaque push/PR vers `main`) : `docker compose up -d --build` (dev compose, pas staging) puis
smoke tests `curl` sur `/health`, `/api/version` (juste `test -n "$VERSION"`, pas de comparaison
figée), `/api/ping`, et `/` (contenu HTML). Aucun seuil de couverture n'est appliqué en CI — les
rapports de couverture sont uploadés en artifact mais rien ne bloque le pipeline dessus.
`/api/ping` n'apparaît dans aucun des scripts QUALIF/PROD manuels ci-dessus alors qu'il est
vérifié en CI — à garder en tête si un futur script manuel est réécrit.

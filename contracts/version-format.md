# Contrat de format de version — `X.Y.Z.a`

> Source : `_work/reports/plan-20260918-163620.md` (sections C-3, C-4). Milestone `v2.4.4`.

## `scripts/version.py` (CLI, source unique de lecture/écriture)

| Commande | Effet | Fichiers touchés |
|----------|-------|------------------|
| `get` | imprime `__version__` brut | — |
| `get --base` | imprime `X.Y.Z` | — |
| `get --build` | imprime `a` (ou vide) | — |
| `start X.Y.Z` | écrit `X.Y.Z.0` (ouverture de cycle) + `Chart.yaml` `version:`/`appVersion:` = `X.Y.Z` | `version.py` (ligne `__version__` uniquement), `frontend/package.json` (`version` uniquement), `helm/automation-factory/Chart.yaml` |
| `bump-build` | `X.Y.Z.a` → `X.Y.Z.(a+1)`, imprime la nouvelle valeur | `version.py`, `package.json` |
| `release` | `X.Y.Z.a` → `X.Y.Z` (PUBLISH PROD) | `version.py`, `package.json` (Chart.yaml déjà à `X.Y.Z`) |
| `check [--tag vX.Y.Z]` | exit ≠ 0 si les 3 fichiers divergent sur `X.Y.Z`, si format invalide, ou si `--tag` fourni et ≠ | — |

Règles :
- Écriture par regex ciblée (jamais réécriture complète de `version.py`).
- `package-lock.json` racine `version` aligné aussi (champ `version` + `packages[""].version`) pour éviter un diff parasite.
- Format validé : `^\d+\.\d+\.\d+(\.\d+)?$`.
- Stdlib Python uniquement (utilisable en CI sans dépendances).
- `bump-build` sur une version `X.Y.Z` sans `a` (ex. juste après `release`) → erreur explicite (protège le rollback PUBLISH PROD, cf. `deploy.md`).

Premier cycle réel de ce milestone : `scripts/version.py start 2.4.4` → `version.py`/`package.json` = `2.4.4.0`, `Chart.yaml` = `2.4.4`.

## Contrat tag / CI (`release.yml`)

- Tag PROD : `^v\d+\.\d+\.\d+$` **uniquement**. Tout autre tag matchant le glob de déclenchement (`v2.4.4.1`, `v2.4.4-rc.1`) → job `validate` échoue, aucune image poussée.
- Version publiée = tag sans `v`. Garde : `python scripts/version.py check --tag $TAG` doit passer (`version.py` = `package.json` = `Chart.yaml` = `X.Y.Z`, **sans `a`**).
- Images : `ghcr.io/ccoupel/automation-factory-{backend,frontend}:X.Y.Z` (+ `latest`), chart OCI `X.Y.Z`. Plus jamais de tag image avec `a` sur ghcr.io.
- Exemple concret de ce cycle : tag `v2.4.4` → build OK ; tag `v2.4.4.1` ou `v2.4.4-rc.1` → échec au job `validate` sans push d'image.

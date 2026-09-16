# Adaptations projet — Automation Factory

> Complète `doc-updater.template.md` avec les fichiers de documentation réels du projet.

## Fichiers à maintenir

### Documentation de travail (à chaque feature/fix)
- `docs/work/WORK_IN_PROGRESS.md` — état actuel, version en cours (déjà cohérent avec
  `backend/app/version.py` au 2026-09-16 : `2.4.3` des deux côtés)
- `docs/work/DONE.md` — fonctionnalités livrées par version
- **GitHub Issues** — roadmap (backlog migré, ne plus modifier `docs/work/BACKLOG.md` directement)
- `CHANGELOG.md` — format `## [X.Y.Z] - YYYY-MM-DD` (Added/Fixed/Changed)

> ⚠️ **Trois documents se recoupent pour "qu'est-ce qui a été livré en version X"** :
> `CHANGELOG.md` (format technique Keep-a-Changelog), `docs/work/DONE.md` (historique narratif,
> quasi le même contenu que CHANGELOG pour les releases récentes), et
> `docs/releases/vX.Y.Z/release-notes.md` (texte public orienté utilisateur — c'est CETTE
> dernière source, pas CHANGELOG/DONE, que `marketing-release` utilise pour publier). Mettre à
> jour les trois à chaque release, mais ne pas dupliquer le texte : CHANGELOG = technique,
> DONE = historique interne, `docs/releases/` = public.

> ⚠️ **Lien mort dans l'index `CLAUDE.md`** : `docs/work/PERFORMANCE_METRICS.md` est référencé
> dans la section "Documentation Organisée" mais **n'existe pas** sur disque — soit créer le
> fichier, soit retirer l'entrée de l'index.

> Docs existants mais absents de l'index `CLAUDE.md` (non rattachés au menu principal) :
> `docs/core/EVENT_SOURCING_SPEC.md`, `docs/operations/TESTING_STRATEGY.md`,
> `docs/work/BACKLOG.md` (déjà noté ci-dessus), `docs/releases/v2.3.6/` et `v2.4.3/`,
> `docs/work/PHASE1_METRICS_v1.9.0_2.md`, `docs/work/TEST_REPORT_v1.15.0_1.md` (ces deux
> derniers, au nommage versionné explicite, sont probablement des rapports ponctuels archivés,
> pas des docs vivantes à maintenir).

> Backlog géré via [GitHub Issues](https://github.com/CCoupel/automation-factory/issues).
> `docs/work/BACKLOG.md` est conservé comme index de référence vers les issues.

### Documentation technique (si architecture modifiée)
- `docs/core/ARCHITECTURE_DECISIONS.md`
- `docs/backend/BACKEND_SPECS.md` — si nouveau endpoint ou service
- `docs/frontend/FRONTEND_SPECS.md` — si nouvelle feature UI
- `docs/backend/GALAXY_INTEGRATION.md` — si changement Galaxy API
  ⚠️ **déjà obsolète au 2026-09-16** : décrit un service unique `galaxy_service_smart.py` qui
  n'existe plus (architecture réelle : `galaxy_roles_service.py` + `galaxy_source_service.py`,
  feature "Multi-sources" v2.3.0) — à rafraîchir dès la prochaine tâche qui touche cette zone
- `docs/core/DEVELOPMENT_PROCESS.md`
  ⚠️ **déjà obsolète au 2026-09-16** : décrit un modèle à 2 phases (Dev / Production) et une
  branche `master`, alors que le process réel (voir `CLAUDE.md` racine, `PHASE2_INTEGRATION.md`,
  `PHASE3_PRODUCTION.md`) est à 3 phases (Local / QUALIF staging / PROD K8s) sur `main` — ne pas
  se fier à sa section "Stratégie de Tests" pour les critères GO/NO-GO réels (voir `qa.md`)

### Versioning (à chaque bump de version)
- `backend/app/version.py` : `__version__ = "X.Y.Z-rc.n"`
- `frontend/package.json` : `"version": "X.Y.Z-rc.n"`
- `docker-compose.staging.yml` : **tags des images uniquement** (structure = responsabilité de `infra`)

## Règles
- `WORK_IN_PROGRESS.md` : toujours refléter la phase courante
- `DONE.md` : documenter uniquement après validation utilisateur
- Ne jamais laisser `WORK_IN_PROGRESS.md` pointer vers une phase terminée

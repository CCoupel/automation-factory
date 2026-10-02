# Procédure de Test — Migration versioning `X.Y.Z[-rc.n]` → `X.Y.Z.a`

**Version** : 2.4.4
**Date** : 2026-09-18
**Testeur** : QA
**Sources** : `_work/reports/plan-20260918-163620.md`, `contracts/version-format.md`, `contracts/http-endpoints.md`, `contracts/CHANGELOG.md`

## Prérequis

- [ ] Environnement : QUALIF (192.168.1.217) + PROD (coupel.net/automation-factory, lecture seule) + LOCAL pour `scripts/version.py`
- [ ] Accès : shell sur le repo avec Python 3 (pour `scripts/version.py`), `kubectl`/`helm` configurés (PROD, lecture seule pour `/api/version`), accès `gh` (vérification tags CI)
- [ ] Données : aucun jeu de données métier requis — uniquement les fichiers de version (`backend/app/version.py`, `frontend/package.json`, `helm/automation-factory/Chart.yaml`)
- [ ] Le premier cycle réel de ce milestone est `v2.4.4` (`scripts/version.py start 2.4.4` déjà exécuté ou en cours — vérifier avec `git log`)

## Scénarios

### Scénario 1 — `scripts/version.py` : lecture/écriture ciblée

**Objectif** : Vérifier que l'outil CLI ne modifie que la ligne/le champ de version ciblé (aucune perte de `VERSION_FEATURES` ni d'autre contenu).

| Étape | Action | Résultat Attendu | Résultat Obtenu | OK ? |
|-------|--------|-------------------|------------------|------|
| 1 | `python3 scripts/version.py get` sur un `version.py` à `2.4.4.0` | Imprime `2.4.4.0` | | |
| 2 | `python3 scripts/version.py get --base` | Imprime `2.4.4` | | |
| 3 | `python3 scripts/version.py get --build` | Imprime `0` | | |
| 4 | `git diff backend/app/version.py` après `bump-build` | Diff = 1 seule ligne modifiée (`__version__`), `VERSION_FEATURES` intact | | |
| 5 | `bump-build` sur une version `2.4.4` (sans `a`, ex. juste après `release`) | Erreur explicite, aucun fichier modifié | | |
| 6 | `check --tag v2.4.4.1` alors que `version.py`/`package.json`/`Chart.yaml` sont à `2.4.4` | Exit code ≠ 0 (format tag invalide) | | |
| 7 | `check --tag v2.4.4` avec les 3 fichiers alignés sur `2.4.4` (sans `a`) | Exit code 0 | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 2 — Matrice `/api/version` : formats × environnements

**Objectif** : Vérifier que `GET /api/version` respecte le contrat C-1 (`contracts/http-endpoints.md`) pour chaque combinaison environnement × format de version stockée en interne.

| # | `ENVIRONMENT` | `__version__` interne | `version` attendu | `base_version` attendu | `build` attendu | `is_rc` attendu | `is_build_candidate` attendu | Résultat Obtenu | OK ? |
|---|----------------|------------------------|--------------------|--------------------------|-------------------|--------------------|--------------------------------|------------------|------|
| 1 | STAGING | `2.4.4.3` | `2.4.4.3` | `2.4.4` | `3` | `true` | `true` | | |
| 2 | DEV | `2.4.4.3` | `2.4.4.3` | `2.4.4` | `3` | `true` | `true` | | |
| 3 | PROD | `2.4.4` | `2.4.4` | `2.4.4` | `null` | `false` | `false` | | |
| 4 | PROD | `2.4.4.3` *(image QUALIF déployée par erreur)* | `2.4.4` | `2.4.4` | `3` *(exposé dans `build` malgré tout)* | `false` | `false` | | |
| 5 | STAGING | `2.4.3-rc.2` *(legacy, transition)* | `2.4.3-rc.2` (ou équivalent affiché) | `2.4.3` | `null` | `true` | — (peut être absent, rétrocompat) | | |
| 6 | PROD | `2.4.3-rc.2` *(legacy)* | `2.4.3` | `2.4.3` | `null` | `false` | — | | |

> Ligne 4 = cas critique : c'est le signal qui doit déclencher l'échec du smoke test PROD (`is_rc=false` **et** `build=null` attendus en PROD légitime — ici `build` non-null révèle l'anomalie malgré `is_rc=false`).

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 3 — Frontend `useVersionInfo` : affichage croisé PROD/STAGING

**Objectif** : Vérifier que le hook applique le bon masquage du 4e segment / suffixe legacy selon l'environnement, sans jamais altérer les données brutes de l'API.

| Étape | Contexte (`packageJson.version` / `environment` API) | Résultat Attendu (`frontendVersion`) | Résultat Obtenu | OK ? |
|-------|-------------------------------------------------------|----------------------------------------|------------------|------|
| 1 | `2.4.4.3` / `STAGING` | `2.4.4.3` (inchangé) | | |
| 2 | `2.4.4.3` / `PROD` (artefact non nettoyé) | `2.4.4` (4e segment retiré) | | |
| 3 | `2.4.4` / `PROD` | `2.4.4` (inchangé) | | |
| 4 | `2.4.3-rc.2` / `PROD` *(non-régression legacy)* | `2.4.3` | | |
| 5 | `2.4.3-rc.2` / `STAGING` *(non-régression legacy)* | `2.4.3-rc.2` (inchangé) | | |
| 6 | Backend renvoie `is_build_candidate` absent, `is_rc=true` | `isReleaseCandidate = true` (fallback sur `is_rc`) | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 4 — Scripts PROD (smoke / monitor / quick-check)

**Objectif** : Vérifier que les 3 scripts de vérification PROD lisent bien `EXPECTED_VERSION` via `scripts/version.py get --base` (avec fallback), normalisent correctement, et détectent une image QUALIF déployée par erreur.

| Étape | Action | Résultat Attendu | Résultat Obtenu | OK ? |
|-------|--------|---------------------|------------------|------|
| 1 | Lancer `./smoke-test-production.sh` sans `EXPECTED_VERSION` (repo local à jour) | `EXPECTED_VERSION` = base version courante (ex. `2.4.4`), pas de 4e segment | | |
| 2 | `EXPECTED_VERSION=2.4.4.9` (forcé) puis relancer | Normalisation → `2.4.4` avant comparaison (sed regex) | | |
| 3 | Simuler une réponse `/api/version` PROD légitime (`is_rc:false`, `build:null`) | Test 3bis "PROD guard" ✅ | | |
| 4 | Simuler une réponse `/api/version` PROD avec `build:3` (anomalie) | Test 3bis "PROD guard" ❌ (détection réussie) | | |
| 5 | Idem pour `quick-monitoring-check.sh` (Check 3bis) et `monitor-production-30min.sh` (Check 3bis) | Même comportement (garde is_rc=false + build=null) | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 5 — `e2e-tests.sh` Test 7 (clôture de l'échec permanent connu)

**Objectif** : Vérifier que le Test 7 compare désormais à `scripts/version.py get` (4 segments) et n'échoue plus systématiquement (référence : `.claude/agents/qa.md`, échec connu figé sur `1.9.0-rc.1`).

| Étape | Action | Résultat Attendu | Résultat Obtenu | OK ? |
|-------|--------|---------------------|------------------|------|
| 1 | Staging déployé avec la version candidate courante (ex. `2.4.4.1`) | `EXPECTED_VERSION` = sortie de `scripts/version.py get` = `2.4.4.1` | | |
| 2 | `./e2e-tests.sh` Test 7 | ✅ "Build candidate deployed: 2.4.4.1 (is_rc=true, build=1)" | | |
| 3 | `scripts/version.py` absent du checkout (cas dégradé) | Test 7 échoue explicitement avec message clair (pas de faux positif silencieux) | | |
| 4 | Staging déployé avec une version différente de `scripts/version.py get` (dérive) | Test 7 échoue avec message détaillant l'écart (`attendu X, obtenu Y`) | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 6 — `test-version-api.py` : champs `build` / `is_build_candidate`

**Objectif** : Vérifier que le script d'inspection manuelle affiche bien les nouveaux champs.

| Étape | Action | Résultat Attendu | Résultat Obtenu | OK ? |
|-------|--------|---------------------|------------------|------|
| 1 | `python3 test-version-api.py` contre un backend local STAGING (`2.4.4.3`) | Affiche `Build: 3` et `Is Build Candidate: True` | | |
| 2 | Idem contre un backend PROD (`2.4.4`) | Affiche `Build: None` et `Is Build Candidate: False` | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

### Scénario 7 — Tags CI invalides (garde-fou `release.yml`)

**Objectif** : Vérifier que seul un tag `vX.Y.Z` strict déclenche un build/push d'image PROD, et que tout tag à 4 segments ou legacy `-rc.n` échoue proprement au job `validate` **sans pousser d'image**.

| Étape | Tag testé | Résultat Attendu | Résultat Obtenu | OK ? |
|-------|-----------|---------------------|------------------|------|
| 1 | `v2.4.4` | Job `validate` passe, build + push image `ghcr.io/.../automation-factory-{backend,frontend}:2.4.4` | | |
| 2 | `v2.4.4.1` | Job `validate` échoue (regex `^v\d+\.\d+\.\d+$` ne matche pas) — **aucune image poussée** | | |
| 3 | `v2.4.4-rc.1` | Job `validate` échoue — **aucune image poussée** | | |
| 4 | `v2.4.4` mais `Chart.yaml`/`package.json` désynchronisés (ex. encore `2.4.3`) | `scripts/version.py check --tag v2.4.4` échoue → job `validate` échoue | | |
| 5 | `workflow_dispatch` manuel (pas de tag) | Version lue depuis `Chart.yaml`, `check` exécuté sans `--tag`, comportement cohérent | | |
| 6 | Vérification post-run : `gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions` après un tag invalide (étapes 2/3) | Aucun tag à 4 segments ni `-rc.n` présent sur ghcr.io | | |

**Verdict** : [ ] PASS  [ ] FAIL

---

## Critères de Validation

- [ ] Tous les scénarios nominaux (1, 2, 3, 6) passent
- [ ] Les scénarios de détection d'anomalie (4, 5 étape 3-4, 7 étapes 2-3) échouent **comme attendu** (le test doit "réussir à échouer" — c'est le comportement correct)
- [ ] Aucune régression sur l'affichage de version existant (formats legacy `-rc.n` toujours supportés en lecture, cf. Scénario 3 étapes 4-6)
- [ ] `e2e-tests.sh` Test 7 ne référence plus jamais `1.9.0-rc.1` en dur
- [ ] Aucun tag à 4 segments ni `-rc.n` ne se retrouve jamais sur `ghcr.io` (Scénario 7 étape 6)
- [ ] Messages d'erreur lisibles pour QA/CDP dans tous les cas d'échec volontaire (Scénarios 4, 5, 7)

## Notes QA

[Espace pour observations — renseigner en particulier si `scripts/version.py` n'est pas encore livré au moment du test (dépendance dev-backend, tâche 1.2 du plan) : dans ce cas, ré-exécuter le Scénario 1 et les étapes dépendantes des Scénarios 4/5 une fois l'outil disponible.]

# Changelog des contrats

> Source : `_work/reports/plan-20260918-163620.md` (section C-5). Milestone `v2.4.4`.

## [20260918] — Migration versioning X.Y.Z.a

- [CHANGED] `GET /api/version` — `version` en STAGING devient `X.Y.Z.a` (ex-`X.Y.Z-rc.n`) ; `is_rc` = "build candidat" (`a` présent, env != `PROD`)
- [NEW] `GET /api/version` — champs `build` (int|null) et `is_build_candidate` (bool)
- [DEPRECATED] `GET /api/version` — `is_rc` (conservé, alias de `is_build_candidate`)
- [CHANGED] `GET /version` (frontend nginx) — `X.Y.Z.a` en staging
- [BREAKING — outillage, pas API] Tags git : seuls `vX.Y.Z` déclenchent `release.yml` ; format `-rc.n` abandonné

Aucun BREAKING côté API HTTP (champs conservés, seuls les formats de valeur changent).

Consommateurs connus du format : `useVersionInfo.ts`, 3 scripts de monitoring PROD (`smoke-test-production.sh`, `monitor-production-30min.sh`, `quick-monitoring-check.sh`), `e2e-tests.sh`, `test-version-api.py`.

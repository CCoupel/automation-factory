# Contrats HTTP — Migration versioning `X.Y.Z.a`

> Source : `_work/reports/plan-20260918-163620.md` (sections C-1, C-2). Milestone `v2.4.4`.

## `GET /api/version`

**Auth** : Public — **Description** : version affichée et métadonnées de build.

Response 200 :
```json
{
  "version": "string   — PROD: 'X.Y.Z' ; STAGING/DEV: 'X.Y.Z.a' (ou 'X.Y.Z' si a absent)",
  "base_version": "string — toujours 'X.Y.Z' (clé de VERSION_FEATURES)",
  "internal_version": "string — valeur brute de __version__ (debug), ex '2.4.4.3'",
  "build": "integer|null — NEW : compteur a ; null si absent (image prod) ",
  "environment": "'PROD' | 'STAGING' | 'DEV'",
  "name": "string",
  "description": "string",
  "is_rc": "boolean — CHANGED (sémantique) : true ssi build != null ET environment != 'PROD'. Conservé pour compat frontend/scripts ; DEPRECATED au profit de is_build_candidate",
  "is_build_candidate": "boolean — NEW : alias explicite de is_rc",
  "features": "object — VERSION_FEATURES[base_version] ou {}"
}
```

Exemples :
- STAGING `2.4.4.3` → `{version:"2.4.4.3", base_version:"2.4.4", build:3, is_rc:true}`
- PROD image `2.4.4` → `{version:"2.4.4", base_version:"2.4.4", build:null, is_rc:false}`
- PROD recevant par erreur une image `2.4.4.3` → `version:"2.4.4"`, `internal_version:"2.4.4.3"`, `build:3`, `is_rc:false` (signal détectable par smoke test, cf. `contracts/version-format.md` §C-4)

Rétrocompat lecture (transition / rollback repo) : `get_base_version()` accepte encore `X.Y.Z-rc.n` et `X.Y.Z_n` en entrée (build = null pour ces formats), mais aucun outil n'écrit plus ces formats.

## `GET /version` (frontend nginx)

```json
{"version":"X.Y.Z.a"|"X.Y.Z", "name":"Automation Factory Frontend", "environment":"production|staging"}
```

En PROD le 4e segment est retiré par l'entrypoint (sed **limité à la ligne `/version`**, jamais un sed global — cf. contrainte C6 du plan : ne doit pas muter une IP/adresse `a.b.c.d` présente ailleurs dans `nginx.conf`).

---
model: opus
---
# Adaptations projet — Automation Factory

> Complète `security.template.md` avec le contexte sécurité réel du projet.

## 🚨 INCIDENTS ACTIFS CONNUS — à ne jamais re-signaler comme "nouvelle découverte", mais à garder ouverts tant que non résolus par l'utilisateur

Ces trois éléments ont été trouvés lors de la préparation de cette migration (2026-09-16) et
communiqués à l'utilisateur. Ce ne sont PAS des tâches à corriger automatiquement — la
correction (rotation de secrets, réécriture d'historique git, etc.) est une décision utilisateur
à fort impact. Le rôle de l'agent `security` est de les garder visibles et de détecter toute
**nouvelle** occurrence de la même classe de problème.

1. **`kubeconfig.txt` a été tracké dans git, dans un dépôt PUBLIC** (`gh repo view` → `isPrivate:
   false`), depuis au moins 2026-01-01 (`git log -- kubeconfig.txt`). C'est le fichier de
   credentials complets du cluster Kubernetes de production. Il n'est plus tracké à HEAD et est
   dans `.gitignore`, mais **reste présent dans l'historique git public** : exposition active tant
   que les credentials ne sont pas rotés côté cluster (rotation non confirmée).
2. **`custom-values.yaml` (tracké, public) a contenu le JWT `SECRET_KEY` de production en clair**.
   À HEAD la valeur est vide (`""`, fournie par `--set backend.env.SECRET_KEY` au déploiement),
   mais l'ancienne valeur **reste dans l'historique git public** : tant qu'elle n'est pas rotée,
   n'importe qui peut forger des tokens JWT valides pour l'API de production (rotation non confirmée).
3. **Un Personal Access Token GitHub est en clair dans `.git/config`** (deux remotes : `github`
   → `CCoupel/automation-factory`, `fabiendupont` → `fabiendupont/ccoupel-automation-factory`).
   Config git locale (pas commité dans le contenu du repo), mais visible par quiconque a accès à
   la machine ou à un `git remote -v` partagé/loggé.

**Ne pas tenter de corriger ces trois points dans le cadre d'une tâche non explicitement dédiée
à leur remédiation** — les signaler à chaque audit `/secu` tant qu'ils sont présents.

## Authentification réelle
- JWT via `python-jose` + hachage `passlib`/`bcrypt` — `backend/app/core/security.py`
  (`create_access_token`/`decode_access_token`, algorithme `HS256`, expiration
  `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Dépendances FastAPI : `Depends(get_current_user)` / `Depends(get_current_admin)`
  (`backend/app/core/dependencies.py`) — jamais de logique JWT ad-hoc dans un endpoint
- `SECRET_KEY` a une valeur par défaut faible dans le code
  (`backend/app/core/config.py: SECRET_KEY: str = "your-secret-key-change-in-production"`) —
  acceptable comme défaut de dev tant que **toute** valeur réelle en staging/prod vient bien
  d'une variable d'environnement / Secret K8s (c'est le cas en prod via Helm `--set`, voir
  incident #2 ci-dessus pour le problème réel : l'ancienne valeur est exposée dans l'historique).

## Multi-tenant — vérifié, pas seulement documenté
La règle "RÈGLE STOCKAGE DONNÉES" de `CLAUDE.md` (toute donnée liée à `current_user`) est
effectivement appliquée dans le code, pas juste déclarée : confirmé sur
`backend/app/api/endpoints/playbooks.py` (`.where(Playbook.owner_id == current_user.id)`,
création avec `owner_id=current_user.id`). Lors d'un audit, échantillonner 2-3 routers
similaires pour confirmer que chaque nouvel endpoint respecte le même filtrage — c'est le point
de régression le plus probable sur un nouvel endpoint.

## CORS
`backend/main.py` : `CORSMiddleware` avec `allow_origins=settings.cors_origins_list` (liste
explicite de ports localhost/192.168.1.84 dev, pas de wildcard `*`), mais
`allow_headers=["*"]` + `expose_headers=["*"]` + `allow_credentials=True` combinés — large mais
cohérent avec une liste d'origines fermée. Vérifier que `CORS_ORIGINS` en prod ne contient
jamais `*` ni une origine non maîtrisée.

## Pas de rate limiting
Aucune lib de rate limiting (`slowapi` ou équivalent) dans `requirements.txt`, aucun middleware
de throttling trouvé — les endpoints d'auth (`/api/auth/*`) n'ont aucune protection brute-force
applicative. À signaler comme recommandation dans tout rapport `/secu all` ou `/secu backend`,
pas comme un défaut bloquant introduit par un changement donné.

## Audit de dépendances
- Backend : `ruff==0.7.0` présent (lint, pas audit sécurité) — **pas de `pip-audit`** installé
  ni configuré en CI.
- Frontend : `npm audit` fonctionne (disponible nativement).
- **Pas de `.github/dependabot.yml`** — aucune mise à jour automatique de dépendances configurée.
- `commands.audit` dans `project-config.json` reflète cet état (frontend uniquement) — ne pas
  supposer qu'un audit backend automatisé existe.

## Secrets — bonnes pratiques déjà en place (ne pas casser)
- `backend/.env.example` documente les variables sans valeurs réelles — tracké, correct.
- `.gitignore` ignore `.env`/`.env.local` et `kubeconfig.txt` (plus tracké). `custom-values.yaml`
  reste tracké mais sans secret (valeurs vides, fournies par `--set`) — ne jamais y réintroduire
  de valeur réelle. Le `.gitignore` ne retire rien de l'historique (incidents #1/#2).

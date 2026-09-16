# Adaptations projet — Automation Factory

> Complète `security.template.md` avec le contexte sécurité réel du projet.

## 🚨 INCIDENTS ACTIFS CONNUS — à ne jamais re-signaler comme "nouvelle découverte", mais à garder ouverts tant que non résolus par l'utilisateur

Ces trois éléments ont été trouvés lors de la préparation de cette migration (2026-09-16) et
communiqués à l'utilisateur. Ce ne sont PAS des tâches à corriger automatiquement — la
correction (rotation de secrets, réécriture d'historique git, etc.) est une décision utilisateur
à fort impact. Le rôle de l'agent `security` est de les garder visibles et de détecter toute
**nouvelle** occurrence de la même classe de problème.

1. **`kubeconfig.txt` est tracké dans git, dans un dépôt PUBLIC** (`gh repo view` → `isPrivate:
   false`), depuis au moins 2026-01-01 (`git log -- kubeconfig.txt`). C'est le fichier de
   credentials complets du cluster Kubernetes de production (utilisé partout comme
   `KUBECONFIG=kubeconfig.txt helm ...`). Exposition publique active tant que non retiré de
   l'historique ET que les credentials ne sont pas rotés côté cluster.
2. **`custom-values.yaml` (tracké, public) contient le JWT `SECRET_KEY` de production en clair**
   (valeur réelle non reproduite ici — voir `custom-values.yaml` ligne `SECRET_KEY:`). Consommé
   par `helm/automation-factory/templates/backend-secret.yaml`
   (`.Values.backend.env.SECRET_KEY`). Un secret Kubernetes lu depuis une valeur Helm en clair,
   elle-même dans un fichier public : n'importe qui peut forger des tokens JWT valides pour
   l'API de production.
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
  d'une variable d'environnement / Secret K8s (c'est le cas en prod via Helm, voir incident #2
  ci-dessus pour le problème réel : la valeur elle-même est exposée, pas le mécanisme).

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
- `.gitignore` (nouveau, staged) ignore `.env`/`.env.local` — mais **`kubeconfig.txt` et
  `custom-values.yaml` n'y sont pas ajoutés** (incidents #1/#2 ci-dessus : ils sont déjà commités,
  les ajouter au `.gitignore` maintenant n'empêche pas la ré-exposition à chaque modification
  tant qu'ils restent trackés — signaler cette limite si on propose ce fix).

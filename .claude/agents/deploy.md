# Adaptations projet — Automation Factory

> Complète `deploy.template.md`. Le mapping QUALIF/PROD du template correspond aux
> environnements réels du projet : **QUALIF = staging (192.168.1.217)**, **PROD = Kubernetes/Helm**.

## Principe BORE (Build Once, Run Everywhere)
- Build unique via le pipeline GitHub Actions CI (voir déclencheur réel ci-dessous — PAS un
  simple push sur `main`)
- Même image en staging et production — pas de rebuild
- Différences via variables d'environnement : `ENVIRONMENT=STAGING` vs `PROD`

## ⚠️ Déclencheur réel du pipeline CI (`.github/workflows/release.yml`)

**`CLAUDE.md` et `PHASE3_PRODUCTION.md` disent "push sur main déclenche le pipeline" — c'est
inexact.** Vérifié dans `.github/workflows/release.yml` :

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

Le pipeline qui build et push les images (`release.yml`) se déclenche **uniquement sur un push
de tag `vX.Y.Z`**, PAS sur un push vers `main` (`test.yml` — les tests unitaires — se déclenche
lui sur push/PR vers `main`, mais ne build ni ne push aucune image).

**Conséquence critique** : le tag `vX.Y.Z` doit être créé et poussé **AVANT** de pouvoir
vérifier les images sur ghcr.io, pas après les smoke tests comme la doc "Finalisation" le
suggère. De plus, `release.yml` lit la version à taguer depuis `helm/automation-factory/Chart.yaml`
(`version:`/`appVersion:`) — **PAS** depuis le tag git lui-même ni depuis `backend/app/version.py`.
`Chart.yaml` doit donc être bumpé à `X.Y.Z` et commité sur `main` AVANT de pousser le tag,
sinon les images publiées porteront l'ancien numéro de version.

## QUALIF — Staging (192.168.1.217, Docker Compose)

```bash
# 1. Bump version (backend/app/version.py + frontend/package.json) en X.Y.Z-rc.n AVANT le build

# 2. Build images (Dockerfile PRODUCTION — nginx, pas Vite dev)
DOCKER_HOST=tcp://192.168.1.217:2375 docker build \
  -t automation-factory-backend:X.Y.Z-rc.n -f backend/Dockerfile backend/
DOCKER_HOST=tcp://192.168.1.217:2375 docker build \
  -t automation-factory-frontend:X.Y.Z-rc.n -f frontend/Dockerfile frontend/
# PAS de push ghcr.io — images restent locales sur 192.168.1.217

# 3. Arrêter l'environnement précédent avant de redéployer
DOCKER_HOST=tcp://192.168.1.217:2375 docker compose -f docker-compose.staging.yml down
DOCKER_HOST=tcp://192.168.1.217:2375 docker system prune -f

# 4. Déployer
DOCKER_HOST=tcp://192.168.1.217:2375 docker compose -f docker-compose.staging.yml up -d
sleep 30   # stabilisation

# 5. Health checks OBLIGATOIRES
curl -I http://192.168.1.217/health
curl http://192.168.1.217/api/version
curl -I http://192.168.1.217/

# 6. Vérifier que la version déployée contient bien "-rc."
VERSION=$(curl -s http://192.168.1.217/api/version | jq -r .version)
[[ $VERSION == *"-rc."* ]] || echo "❌ Version RC attendue, obtenu: $VERSION"

# 7. Suite E2E fonctionnelle OBLIGATOIRE (au-delà des 3 health checks ci-dessus) — voir
# docs/operations/PHASE2_INTEGRATION.md section 3 : Ansible API (namespaces/collections/modules,
# schema, erreur 404), pas seulement la disponibilité des services. Arrêt obligatoire si un seul
# test critique échoue.
./e2e-tests.sh
```

⚠️ **Gate obligatoire avant Phase 3** : E2E 100% + démo/validation utilisateur explicite —
**ne jamais enchaîner sur le déploiement PROD automatiquement**, même si tout est vert
(voir `docs/operations/PHASE2_INTEGRATION.md` section "Transition vers Phase 3" : toujours
demander confirmation explicite "go" à l'utilisateur).

## PROD — Kubernetes (Helm exclusif)

⚠️ **Les images production viennent EXCLUSIVEMENT du pipeline GitHub Actions CI.**
Ne jamais builder localement ni retagger des images staging pour la production.

```bash
# 1. Bumper helm/automation-factory/Chart.yaml (version: ET appVersion: -> X.Y.Z) AVANT tout —
#    release.yml lit la version à publier depuis Chart.yaml, pas depuis le tag git.
#    Committer ce bump sur main.
git push https://<PAT>@github.com/CCoupel/automation-factory.git main

# 2. Pousser le tag vX.Y.Z — c'est CE PUSH DE TAG (pas le push sur main) qui déclenche
#    release.yml (déclencheur réel : `on: push: tags: v*.*.*`)
git tag vX.Y.Z && git push https://<PAT>@github.com/CCoupel/automation-factory.git --tags

GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --branch main --limit 3
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory
GITHUB_TOKEN=<PAT> gh run view <run_id> --log-failed --repo CCoupel/automation-factory

GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[0].metadata.container.tags'
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-frontend/versions \
  --jq '.[0].metadata.container.tags'

# custom-values.yaml mis à jour avec le tag X.Y.Z (sans -rc.n)

# Secrets (2026-09-16) : custom-values.yaml ne contient plus les valeurs en clair
# (postgresql.auth.password, backend.env.SECRET_KEY) — fournies via --set depuis un .env
# local non commité (voir .env.example à la racine). kubeconfig.txt est gitignoré, à
# récupérer localement par chaque opérateur — plus jamais committé.
source .env   # DEPLOY_DB_PASSWORD, DEPLOY_JWT_SECRET_KEY
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory --values custom-values.yaml --timeout 300s \
  --set postgresql.auth.password="$DEPLOY_DB_PASSWORD" \
  --set backend.env.SECRET_KEY="$DEPLOY_JWT_SECRET_KEY"

KUBECONFIG=kubeconfig.txt kubectl get pods -n automation-factory
KUBECONFIG=kubeconfig.txt helm list -n automation-factory

# Smoke tests OBLIGATOIRES (doit afficher X.Y.Z SANS -rc.n, environment=PROD, is_rc=false)
./smoke-test-production.sh
curl -s https://coupel.net/automation-factory/api/version

# Finalisation doc (le tag est déjà poussé depuis l'étape 2 — ceci est juste le commit doc)
git add docs/work/WORK_IN_PROGRESS.md docs/work/DONE.md custom-values.yaml
git commit -m "docs: Finalize vX.Y.Z - transfer to DONE.md" && git push

# Rollback — helm d'abord, fallback kubectl si helm rollback échoue
KUBECONFIG=kubeconfig.txt helm rollback automation-factory -n automation-factory
# Si helm rollback échoue uniquement :
KUBECONFIG=kubeconfig.txt kubectl rollout undo deployment/automation-factory-backend -n automation-factory
KUBECONFIG=kubeconfig.txt kubectl rollout undo deployment/automation-factory-frontend -n automation-factory
```

⚠️ **Après un déploiement PROD : monitorer les métriques 30 minutes** avant de considérer le
déploiement terminé (pas de rebuild toléré si un souci apparaît — rollback Helm uniquement).

## Règles absolues (projet)
- **JAMAIS** `kubectl set image` — casse la cohérence Helm (fallback rollback uniquement)
- **JAMAIS** builder ou retagger des images localement pour la prod
- **TOUJOURS** bumper `helm/automation-factory/Chart.yaml` puis pousser le **tag `vX.Y.Z`**
  (pas seulement `main`) pour déclencher `release.yml`, attendre CI success, vérifier ghcr.io
  AVANT `helm upgrade`
- **TOUJOURS** valider les 3 health checks + la suite `./e2e-tests.sh` après le déploiement staging
- **TOUJOURS** obtenir une confirmation "go" explicite de l'utilisateur avant de passer QUALIF → PROD
- **TOUJOURS** monitorer 30 min après un déploiement PROD (`./monitor-production-30min.sh`)

## Configuration par environnement

| Élément | QUALIF (staging) | PROD |
|---------|-------------------|------|
| URL | http://192.168.1.217 | https://coupel.net/automation-factory |
| Versionnement affiché | `X.Y.Z-rc.n` | `X.Y.Z` (RC masqué) |
| Registry | build local sur 192.168.1.217 | ghcr.io/ccoupel (via CI) |
| Déploiement | `docker compose` | `helm upgrade` |

> Note : le versionnement **actif en code de production** est `X.Y.Z[-rc.n]` (RC = release
> candidate) — voir section "Règles de Versioning" de `CLAUDE.md`. Le schéma `X.Y.Z.a`
> (compteur de build) décrit dans `context/COMMON.md` du template est la cible retenue pour une
> migration future, mais n'est PAS encore implémenté dans le code — ne pas mélanger les deux
> schémas dans un même déploiement.

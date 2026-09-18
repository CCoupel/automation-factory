# Adaptations projet — Automation Factory

> Complète `deploy.template.md`. Le mapping QUALIF/PROD du template correspond aux
> environnements réels du projet : **QUALIF = staging (192.168.1.217)**, **PROD = Kubernetes/Helm**.

## Principe BORE (Build Once, Run Everywhere) — Migration v2.4.4

**BORE réécrit pour la migration versioning `X.Y.Z.a`** :
- **QUALIF (staging)** : images `X.Y.Z.a` construites localement sur daemon 192.168.1.217, promus sans rebuild
- **PROD (Kubernetes)** : rebuild déterministe depuis la même source figée, déclenché par un tag `vX.Y.Z` poussé en CI
- Aucune image à 4 segments ne sort de ghcr.io ; prod affiche toujours `X.Y.Z` (le `a` retiré)
- Différences via variables d'environnement : `ENVIRONMENT=STAGING` vs `PROD`, détectables par smoke tests

## ⚠️ Outil unique de versioning : `scripts/version.py`

Remplace tous les snippets template `cat backend/app/version.py` ou `echo … > backend/app/version.py`
(interdits, risqueraient d'écraser `VERSION_FEATURES`). Commandes disponibles :

| Commande | Effet |
|----------|-------|
| `python3 scripts/version.py get` | Imprime `X.Y.Z.a` brut |
| `python3 scripts/version.py get --base` | Imprime `X.Y.Z` |
| `python3 scripts/version.py get --build` | Imprime `a` (ou vide) |
| `python3 scripts/version.py start X.Y.Z` | Ouverture de cycle : `X.Y.Z.0` + Chart.yaml `X.Y.Z` |
| `python3 scripts/version.py bump-build` | Incrémente `a` (BUILD) |
| `python3 scripts/version.py release` | Retire `a` (PUBLISH PROD) |
| `python3 scripts/version.py check [--tag vX.Y.Z]` | Valide cohérence fichiers/format |

## Déclencheur réel du pipeline CI (`.github/workflows/release.yml`)

Le pipeline qui build et push les images (`release.yml`) se déclenche **uniquement sur un push
de tag `vX.Y.Z`** (exactement 3 segments), **PAS sur un push vers `main`** (`test.yml` — les tests
unitaires — se déclenche lui sur push/PR vers `main`, mais ne build ni ne push aucune image).

**Conséquence** : le tag `vX.Y.Z` doit être créé et poussé après que `scripts/version.py release`
a retiré le `a`, puis la CI rebuild depuis la source figée, et les images `:X.Y.Z` (sans `a`)
sont publiées sur ghcr.io. Job `validate` rejette tout tag malformé (`v2.4.4.1`, `v2.4.4-rc.1`,
etc.).

---

## Tâche BUILD (une seule fois par cycle ou rebuild, agnostique environnement)

**Prérequis** : branche `milestone/vX.Y.Z`, repo propre, tests passants.

### Étapes BUILD
```bash
# 1. Vérifier l'état du repo
git status
git branch -v
npm test  # et autres tests CI du projet-config.json

# 2. Incrémenter et commiter
VERSION=$(python3 scripts/version.py bump-build)
DIR_VERSION=$(python3 scripts/version.py get --base)  # X.Y.Z sans a
git add backend/app/version.py frontend/package.json frontend/package-lock.json
git commit -m "chore(version): Bump to $VERSION (build)"
git push origin milestone/vX.Y.Z

# 3. Construire les images Docker sur le daemon 192.168.1.217
#    (C5 : Docker absent WSL, tous les builds via daemon distant)
docker -H tcp://192.168.1.217:2375 build \
  -t automation-factory-backend:$VERSION \
  -f backend/Dockerfile backend/

docker -H tcp://192.168.1.217:2375 build \
  -t automation-factory-frontend:$VERSION \
  -f frontend/Dockerfile frontend/

# ⚠️ JAMAIS frontend/Dockerfile.dev (nginx production requis)

# 4. Créer le manifeste de build — l'artefact candidat
BUILD_DIR=$(git rev-parse --show-toplevel)/build/candidate_v$DIR_VERSION
mkdir -p "$BUILD_DIR"

BACKEND_IMG_ID=$(docker -H tcp://192.168.1.217:2375 image inspect \
  --format '{{.Id}}' automation-factory-backend:$VERSION)
FRONTEND_IMG_ID=$(docker -H tcp://192.168.1.217:2375 image inspect \
  --format '{{.Id}}' automation-factory-frontend:$VERSION)
GIT_SHA=$(git rev-parse HEAD)
BUILT_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$BUILD_DIR/manifest-$VERSION.json" << EOF
{
  "version": "$VERSION",
  "git_sha": "$GIT_SHA",
  "backend_image_id": "$BACKEND_IMG_ID",
  "frontend_image_id": "$FRONTEND_IMG_ID",
  "built_at": "$BUILT_AT"
}
EOF

echo "✅ BUILD réussi"
echo "Manifeste : $BUILD_DIR/manifest-$VERSION.json"
```

### Gestion des erreurs BUILD
- **CODE** → dev-backend/dev-frontend : correction du code, recommencer BUILD
- **INFRA** (daemon 192.168.1.217 injoignable, image storage plein, etc.) → infra : corriger, recommencer BUILD

---

## Tâche PUBLISH QUALIF (promotion, zéro rebuild)

**Prérequis** : BUILD réussi, manifeste validé.

### Étapes PUBLISH QUALIF
```bash
# 1. Vérifier le manifeste candidat
VERSION=$(python3 scripts/version.py get)
DIR_VERSION=$(python3 scripts/version.py get --base)
BUILD_DIR=$(git rev-parse --show-toplevel)/build/candidate_v$DIR_VERSION
MANIFEST="$BUILD_DIR/manifest-$VERSION.json"

test -f "$MANIFEST" || { echo "❌ Manifeste non trouvé : $MANIFEST"; exit 1; }

# 2. Vérifier que les images IDs présentes sur 192.168.1.217 == manifeste
BACKEND_ID=$(jq -r .backend_image_id "$MANIFEST")
FRONTEND_ID=$(jq -r .frontend_image_id "$MANIFEST")

BACKEND_EXISTS=$(docker -H tcp://192.168.1.217:2375 image inspect "$BACKEND_ID" 2>/dev/null && echo "yes" || echo "no")
FRONTEND_EXISTS=$(docker -H tcp://192.168.1.217:2375 image inspect "$FRONTEND_ID" 2>/dev/null && echo "yes" || echo "no")

[[ $BACKEND_EXISTS == "yes" && $FRONTEND_EXISTS == "yes" ]] || \
  { echo "❌ Images non présentes sur 192.168.1.217 — relancer BUILD"; exit 1; }

# 3. Créer le répertoire de qualification et écrire release.env
QUALIF_DIR=$(git rev-parse --show-toplevel)/build/qualif_v$DIR_VERSION
mkdir -p "$QUALIF_DIR"
cp "$MANIFEST" "$QUALIF_DIR/"

cat > "$QUALIF_DIR/release.env" << EOF
AF_IMAGE_TAG=$VERSION
EOF

echo "✅ PUBLISH QUALIF réussi"
echo "Images : $VERSION sur 192.168.1.217"
echo "release.env : $QUALIF_DIR/release.env"
```

**Important** : pas de push ghcr.io (images restent locales sur 192.168.1.217).

---

## Tâche DEPLOY QUALIF (installe le publié, jamais de build)

**Prérequis** : PUBLISH QUALIF réussi.

### Étapes DEPLOY QUALIF
```bash
# 1. Charger la configuration
VERSION=$(python3 scripts/version.py get)
DIR_VERSION=$(python3 scripts/version.py get --base)
QUALIF_DIR=$(git rev-parse --show-toplevel)/build/qualif_v$DIR_VERSION
RELEASE_ENV="$QUALIF_DIR/release.env"

test -f "$RELEASE_ENV" || { echo "❌ release.env non trouvé"; exit 1; }

# 2. Arrêter et nettoyer l'environnement précédent
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml down
docker -H tcp://192.168.1.217:2375 system prune -f

# 3. Déployer avec les bonnes images
docker -H tcp://192.168.1.217:2375 compose \
  --env-file "$RELEASE_ENV" \
  -f docker-compose.staging.yml up -d

sleep 30  # stabilisation

# 4. Health checks obligatoires (3 endpoints)
curl -I http://192.168.1.217/health || exit 1
curl http://192.168.1.217/api/version || exit 1
curl -I http://192.168.1.217/ || exit 1

# 5. Vérifier que la version est correcte ET est un candidat (is_rc=true)
DEPLOYED_VERSION=$(curl -s http://192.168.1.217/api/version | jq -r '.version')
IS_RC=$(curl -s http://192.168.1.217/api/version | jq '.is_rc')

[[ $DEPLOYED_VERSION == $VERSION ]] || \
  { echo "❌ Version déployée ($DEPLOYED_VERSION) ≠ version attendue ($VERSION)"; exit 1; }

[[ $IS_RC == "true" ]] || \
  { echo "❌ is_rc devrait être true en QUALIF (c'est un candidat)"; exit 1; }

echo "✅ Version $DEPLOYED_VERSION déployée, is_rc=$IS_RC"

# 6. Suite E2E obligatoire (voir docs/operations/PHASE2_INTEGRATION.md)
#    Teste les APIs Ansible, schemas, erreurs 404, etc.
#    Arrêt sur tout échec critique.
./e2e-tests.sh || exit 1

echo "✅ DEPLOY QUALIF réussi — E2E 100%"
```

### Gate obligatoire
**E2E 100% + démo/validation utilisateur + "go" explicite avant PUBLISH PROD**  
Jamais d'enchaînement automatique. Le déploiement QUALIF doit être approuvé manuellement.

---

## Tâche PUBLISH PROD (merge + tag → rebuild CI)

**Prérequis** : DEPLOY QUALIF validé, "go" utilisateur, CHANGELOG à jour.

### Étapes PUBLISH PROD
```bash
# 1. Prérequis
VERSION=$(python3 scripts/version.py get)
echo "VERSION courante = $VERSION (avec .a)"

# 2. Retirer le .a et vérifier
python3 scripts/version.py release
python3 scripts/version.py check
NEW_VERSION=$(python3 scripts/version.py get)
echo "VERSION après release = $NEW_VERSION (sans .a)"

# 3. Vérifier que CHANGELOG.md contient l'entrée
grep -q "$(scripts/version.py get)" CHANGELOG.md || \
  { echo "❌ CHANGELOG.md ne contient pas la version — contactez doc-updater"; exit 1; }

# 4. Commiter sur milestone/vX.Y.Z
git add backend/app/version.py frontend/package.json frontend/package-lock.json
git commit -m "chore(version): Release v$NEW_VERSION"

# 5. Merger sur main
git push origin milestone/vX.Y.Z
git checkout main
git merge --no-ff milestone/vX.Y.Z -m "Release v$NEW_VERSION"
git push https://<PAT>@github.com/CCoupel/automation-factory.git main

# 6. Tagger et déclencher la CI (c'est LE point critique)
git tag -a v$NEW_VERSION -m "Release v$NEW_VERSION"
git push https://<PAT>@github.com/CCoupel/automation-factory.git v$NEW_VERSION

echo "✅ Tag v$NEW_VERSION poussé — CI déclenché"

# 7. Surveiller activement le pipeline CI
GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --limit 3
# Attendre conclusion: success
# Si failure : analyser les logs, corriger, repousser un nouveau tag (version++) ou rollback
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory
GITHUB_TOKEN=<PAT> gh run view <run_id> --log-failed --repo CCoupel/automation-factory

# 8. Vérifier les images sur ghcr.io (quand CI verte)
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$NEW_VERSION'") | .metadata.container.tags'
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-frontend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$NEW_VERSION'") | .metadata.container.tags'

# ⚠️ Aucun tag à 4 segments (ex. X.Y.Z.1) ne doit apparaître
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | .metadata.container.tags[] | select(test("\.[0-9]$"))' | grep . && \
  { echo "❌ Tag à 4 segments détecté sur ghcr.io — abort"; exit 1; } || \
  echo "✅ Aucun tag 4 segments sur ghcr.io"

echo "✅ PUBLISH PROD réussi"
```

### Rollback PUBLISH PROD
```bash
# En cas d'échec CI ou détection d'incohérence :

# 1. Revert le merge + suppression du tag local et remote
git revert --no-edit HEAD  # Revert du merge
git push https://<PAT>@github.com/CCoupel/automation-factory.git main
git tag -d v$NEW_VERSION
git push https://<PAT>@github.com/CCoupel/automation-factory.git --delete v$NEW_VERSION

# 2. La branche milestone/vX.Y.Z revient à X.Y.Z.a via un revert du commit "Release"
#    (important : le prochain BUILD saura faire bump-build sur une version avec .a, pas sans)
git revert --no-edit <commit-sha-du-release>
git push https://<PAT>@github.com/CCoupel/automation-factory.git milestone/vX.Y.Z

echo "✅ Rollback PUBLISH PROD — branche revertie"
```

---

## Tâche DEPLOY PROD (Helm exclusif, jamais de rebuild)

**Prérequis** : PUBLISH PROD réussi, tag + CI verte + ghcr validé.

### Étapes DEPLOY PROD
```bash
# 1. Vérifier la publication complète
VERSION=$(python3 scripts/version.py get)  # X.Y.Z sans .a
echo "VERSION = $VERSION"

# Vérifier que ghcr contient les images
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$VERSION'")' | grep -q . || \
  { echo "❌ Image backend:$VERSION non trouvée sur ghcr.io"; exit 1; }

# 2. Mise à jour custom-values.yaml avec le tag X.Y.Z (sans .a)
#    Éditer manuellement ou programmatiquement — exemple :
sed -i "s/image:.*:.*$/image: automation-factory-backend:$VERSION/" custom-values.yaml
# Vérifier le changement
git diff custom-values.yaml

# 3. Déploiement via Helm — UNIQUEMENT (jamais kubectl set image)
#    Secrets fournis via .env local (gitignoré, voir .env.example)
source .env   # DEPLOY_DB_PASSWORD, DEPLOY_JWT_SECRET_KEY
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --set postgresql.auth.password="$DEPLOY_DB_PASSWORD" \
  --set backend.env.SECRET_KEY="$DEPLOY_JWT_SECRET_KEY" \
  --timeout 300s

# 4. Vérifier le rollout
kubectl get pods -n automation-factory
helm list -n automation-factory

# 5. Smoke tests obligatoires
#    Doit afficher X.Y.Z SANS .a, environment=PROD, is_rc=false, build=null
./smoke-test-production.sh
curl -s https://coupel.net/automation-factory/api/version | jq .

SMOKE_VERSION=$(curl -s https://coupel.net/automation-factory/api/version | jq -r '.version')
SMOKE_IS_RC=$(curl -s https://coupel.net/automation-factory/api/version | jq '.is_rc')
SMOKE_BUILD=$(curl -s https://coupel.net/automation-factory/api/version | jq '.build')

[[ $SMOKE_VERSION == $VERSION ]] || \
  { echo "❌ Smoke: version ($SMOKE_VERSION) ≠ attendue ($VERSION)"; exit 1; }
[[ $SMOKE_IS_RC == "false" ]] || \
  { echo "❌ Smoke: is_rc=$SMOKE_IS_RC (devrait être false en PROD)"; exit 1; }
[[ $SMOKE_BUILD == "null" ]] || \
  { echo "❌ Smoke: build=$SMOKE_BUILD (devrait être null en PROD, 4e segment absent)"; exit 1; }

echo "✅ Smoke tests OK — PROD $VERSION (is_rc=false, build=null)"

# 6. Rollback (en cas d'échec rollout)
#    Helm rollback d'abord (recommandé)
KUBECONFIG=kubeconfig.txt helm rollback automation-factory -n automation-factory

# Fallback kubectl uniquement si helm rollback échoue
KUBECONFIG=kubeconfig.txt kubectl rollout undo deployment/automation-factory-backend -n automation-factory
KUBECONFIG=kubeconfig.txt kubectl rollout undo deployment/automation-factory-frontend -n automation-factory

# 7. Monitoring 30 minutes obligatoire
#    Vérifier les logs, métriques, aucun rebuild toléré
./monitor-production-30min.sh

echo "✅ DEPLOY PROD réussi — monitoring 30 min complet"

# 8. Finalisation doc (commits optionnels, juste la traçabilité)
git add custom-values.yaml docs/work/WORK_IN_PROGRESS.md docs/work/DONE.md
git commit -m "docs: Finalize v$VERSION - transfer to DONE.md"
git push https://<PAT>@github.com/CCoupel/automation-factory.git main
```

---

## Règles absolues (projet)

- **JAMAIS** `kubectl set image` — casse la cohérence Helm (helm rollback uniquement)
- **JAMAIS** builder ou retagger des images localement pour la prod — images viennent du pipeline CI
- **JAMAIS** pousser de tag à 4 segments (`v2.4.4.1`, etc.) — uniquement `v2.4.4` (3 segments)
- **JAMAIS** éditer `backend/app/version.py`, `frontend/package.json`, `helm/automation-factory/Chart.yaml` manuellement — **toujours `scripts/version.py`**
- **TOUJOURS** écrire les 4 segments de version dans `backend/app/version.py` (ex. `2.4.4.3`) et `frontend/package.json`, jamais `echo >` qui écraserait `VERSION_FEATURES`
- **TOUJOURS** valider les 3 health checks + la suite `./e2e-tests.sh` après le déploiement QUALIF
- **TOUJOURS** obtenir une confirmation "go" explicite avant de passer QUALIF → PROD
- **TOUJOURS** monitorer 30 min après déploiement PROD
- **TOUJOURS** vérifier que ghcr.io ne contient que des tags 3-segments (`X.Y.Z`), jamais 4

---

## Configuration par environnement

| Élément | QUALIF (staging) | PROD |
|---------|-------------------|------|
| URL | http://192.168.1.217 | https://coupel.net/automation-factory |
| Versioning affiché | `X.Y.Z.a` (ex: `2.4.4.3`) | `X.Y.Z` (ex: `2.4.4`) |
| `is_rc` | `true` (candidat de build) | `false` (release) |
| `build` | `a` (int) | `null` |
| Registry | Daemon 192.168.1.217 (local) | ghcr.io/ccoupel (CI) |
| Publish mode | Promote (sans rebuild) | Rebuild-CI (depuis tag) |
| Deploy | Docker Compose | Helm upgrade |
| Secrets | `.env` | `.env` + `--set` |
| Kubeconfig | N/A | gitignoré, local |

---

*Mis à jour : 2026-09-18 (migration `X.Y.Z[-rc.n]` → `X.Y.Z.a`)*

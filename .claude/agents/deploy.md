---
effort: high
---
# Adaptations projet — Automation Factory

> Complète `deploy.template.md`. Le mapping QUALIF/PROD du template correspond aux
> environnements réels du projet : **QUALIF = staging (192.168.1.217)**, **PROD = Kubernetes/Helm**.

> **Procédures PUBLISH/DEPLOY** : les fichiers `environments/{publish,deploy}.{qualif,prod}.template.md` ont été
> réécrits le 2026-10-31 pour la réalité du projet (daemon Docker TCP 192.168.1.217 + `release.env` ; Helm
> `automation-factory` / namespace `automation-factory`, `--set *.image.tag`, version via `scripts/version.py`).
> Ils font foi à l'étape [2. MECANISME] ; les procédures ci-dessous en sont le résumé. Note : ces fichiers ne sont
> pas resynchronisés par `/init-project` (fichiers manquants seulement) — une régénération les écraserait.

## BORE — faits projet

- **QUALIF (staging)** : images `X.Y.Z.a` construites sur le daemon Docker 192.168.1.217, promues sans rebuild
- **PROD (Kubernetes)** : images `:X.Y.Z` reconstruites par la CI (`release.yml`) depuis le tag `vX.Y.Z`, publiées sur ghcr.io
- Aucune image à 4 segments ne sort sur ghcr.io ; prod affiche toujours `X.Y.Z` (le `a` retiré)
- Différences via variables d'environnement : `ENVIRONMENT=STAGING` vs `PROD`, détectables par smoke tests

## ⚠️ Outil unique de versioning : `scripts/version.py`

> Dérogation projet : remplace les snippets template `cat backend/app/version.py` / `cut` / « écrire $VERSION »
> (et ceux des fichiers `environments/*.template.md`). `echo … > backend/app/version.py` est interdit
> (écraserait `VERSION_FEATURES`).

| Commande | Effet |
|----------|-------|
| `python3 scripts/version.py get` | Imprime `X.Y.Z.a` brut |
| `python3 scripts/version.py get --base` | Imprime `X.Y.Z` |
| `python3 scripts/version.py get --build` | Imprime `a` (ou vide) |
| `python3 scripts/version.py start X.Y.Z` | Ouverture de cycle : `X.Y.Z.0` + Chart.yaml `X.Y.Z` |
| `python3 scripts/version.py bump-build` | Incrémente `a` (BUILD) |
| `python3 scripts/version.py release` | Retire `a` (PUBLISH PROD) |
| `python3 scripts/version.py check [--tag vX.Y.Z]` | Valide cohérence fichiers/format |

## Pipeline de release (`.github/workflows/release.yml`)

Déclenché uniquement par un tag `vX.Y.Z` à **exactement 3 segments** ; son job `validate` rejette tout
tag malformé (`v2.4.4.1`, `v2.4.4-rc.1`, etc.).

---

## Tâche BUILD (une seule fois par cycle ou rebuild, agnostique environnement)

### Étapes BUILD
```bash
# 1. Vérifier l'état du repo (aucun test ici — QA les a déjà joués sur ce même arbre git)
git status
git branch -v

# 2. Incrémenter et commiter
VERSION=$(python3 scripts/version.py bump-build)
DIR_VERSION=$(python3 scripts/version.py get --base)  # X.Y.Z sans a
git add backend/app/version.py frontend/package.json frontend/package-lock.json
git commit -m "chore(version): Bump to $VERSION (build)"
git push origin milestone/vX.Y.Z

# 3. Construire les images Docker sur le daemon 192.168.1.217
#    (Docker absent de WSL : tous les builds via le daemon distant)
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

> Dérogation projet (artefact) : l'artefact candidat n'est pas une archive `app-X.Y.Z.a.tar.gz` mais les
> images Docker présentes sur le daemon 192.168.1.217 + le manifeste `build/candidate_vX.Y.Z/manifest-X.Y.Z.a.json`.
> Dans les DONE, le champ `Binaire` = chemin du manifeste (BUILD) ou de `build/qualif_vX.Y.Z/release.env` (PUBLISH QUALIF).

### Gestion des erreurs BUILD
> Dérogation projet : le build tourne sur un daemon distant, la catégorie INFRA existe réellement.
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

echo "✅ DEPLOY QUALIF réussi — version $DEPLOYED_VERSION, is_rc=$IS_RC"
```

> La suite E2E (`./e2e-tests.sh`) et la NR complète ne sont **pas** jouées par deployer : elles relèvent
> de `qa` (`Scope : regression-full`, `testing.full_regression_at = qualif`), en parallèle.

---

## Tâche PUBLISH PROD (merge + tag → rebuild CI)

**Prérequis** : voir Checklist « Avant PUBLISH » du template (dont l'exception hotfix : un hotfix part
directement du BUILD, sans DEPLOY QUALIF préalable).

Authentification GitHub : ambiante (`gh auth login` / credential helper) — **jamais** de PAT dans une URL
ni de `GITHUB_TOKEN=<PAT>` en ligne de commande.

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
#    Dérogation projet : grep de X.Y.Z APRÈS `release` (le grep `$DEV_VERSION` = X.Y.Z.a du
#    publish.prod.template ne peut jamais matcher le CHANGELOG)
grep -q "$(python3 scripts/version.py get)" CHANGELOG.md || \
  { echo "❌ CHANGELOG.md ne contient pas la version — contactez doc-updater"; exit 1; }

# 4. Commiter sur milestone/vX.Y.Z et pousser
git add backend/app/version.py frontend/package.json frontend/package-lock.json
git commit -m "chore(version): Release v$NEW_VERSION"
git push origin milestone/vX.Y.Z

# 5. BARRIÈRE — pré-validation verte sur le SHA exact (`ci-branch.yml`, lance `commands.ci` = scripts/ci.sh)
SHA=$(git rev-parse milestone/vX.Y.Z)
gh run list --workflow ci-branch.yml --commit "$SHA" --json status,conclusion,databaseId --jq '.[0]'
# attendu : status=completed, conclusion=success — sinon STOP (pas de merge, pas de tag)

# 6. Merger sur main dans un worktree détaché (le HEAD du checkout principal appartient au teamleader)
REL=.claude/worktrees/release
git fetch origin main
git worktree add --detach "$REL" origin/main
git -C "$REL" merge --no-ff milestone/vX.Y.Z -m "Release v$NEW_VERSION"
git -C "$REL" push origin HEAD:main

# 7. Tagger et déclencher la CI (c'est LE point critique)
git -C "$REL" tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"
git worktree remove "$REL"

# 8. Surveiller le pipeline CI jusqu'à conclusion
sleep 5
RUN_ID=$(gh run list --repo CCoupel/automation-factory --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --repo CCoupel/automation-factory --exit-status
# Échec : `gh run view "$RUN_ID" --log-failed`, classification CODE/FLAKY/CONFIG/INFRA et PUBLISH FAILED
# (protocole du template). Correction sur la branche milestone + rollback — JAMAIS de nouveau tag
# ni de version++ pour « retester ».

# 9. Vérifier les images sur ghcr.io (quand CI verte)
gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$NEW_VERSION'") | .metadata.container.tags'
gh api /orgs/CCoupel/packages/container/automation-factory-frontend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$NEW_VERSION'") | .metadata.container.tags'

# ⚠️ Aucun tag à 4 segments (ex. X.Y.Z.1) ne doit apparaître
gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | .metadata.container.tags[] | select(test("^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$"))' | grep . && \
  { echo "❌ Tag à 4 segments détecté sur ghcr.io — abort"; exit 1; } || \
  echo "✅ Aucun tag 4 segments sur ghcr.io"

echo "✅ PUBLISH PROD réussi"
```

### Rollback PUBLISH PROD — ajout projet
Appliquer le Rollback du template (revert du merge dans un worktree détaché + suppression du tag), puis :
```bash
# La branche milestone/vX.Y.Z doit revenir à X.Y.Z.a via un revert du commit "Release"
# (le prochain BUILD doit faire bump-build sur une version avec .a, pas sans).
# Le HEAD du checkout principal est sur milestone/vX.Y.Z : revert = opération de branche réservée au
# teamleader → BRANCH REQUEST « revert <commit-sha-du-release> sur milestone/vX.Y.Z + push ».
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
gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[] | select(.metadata.container.tags[] == "'$VERSION'")' | grep -q . || \
  { echo "❌ Image backend:$VERSION non trouvée sur ghcr.io"; exit 1; }

# 2. Charger les secrets (mécanisme du template ; noms DEPLOY_* = projet)
#    .env (racine, gitignoré, voir .env.example) : DEPLOY_DB_PASSWORD, DEPLOY_JWT_SECRET_KEY
#    .claude/agents/environments/prod.env (copie locale non commitée de prod.env.example) : KUBECONFIG=kubeconfig.txt
set -a; source .env; source .claude/agents/environments/prod.env; set +a
: "${KUBECONFIG:=kubeconfig.txt}"; export KUBECONFIG

# 3. Déploiement via Helm — UNIQUEMENT (jamais kubectl set image)
#    Tag d'image passé par --set (custom-values.yaml n'est pas modifié ; clés backend.image.tag /
#    frontend.image.tag de helm/automation-factory)
helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --set backend.image.tag="$VERSION" \
  --set frontend.image.tag="$VERSION" \
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

# 6. Monitoring 30 minutes obligatoire
./monitor-production-30min.sh

echo "✅ DEPLOY PROD réussi — monitoring 30 min complet"
```

Après succès : étapes post-déploiement du template (notes de release, clôture milestone, nettoyage des
branches). Deployer **ne commite pas** la documentation (`WORK_IN_PROGRESS.md`, `DONE.md`) : c'est
`doc-updater`.

### Rollback DEPLOY PROD — précision projet
`helm rollback automation-factory -n automation-factory` **d'abord** ; fallback `kubectl rollout undo`
uniquement si helm rollback échoue, sur les deployments réels `automation-factory-backend` et
`automation-factory-frontend` (namespace `automation-factory`).

---

## Règles absolues (projet)

- **JAMAIS** `kubectl set image` — casse la cohérence Helm. Dérogation projet : l'alternative
  `kubectl set image` proposée par `environments/deploy.prod.template.md` est interdite ici.
- **JAMAIS** pousser de tag à 4 segments — le job `validate` de `release.yml` le rejette
- **JAMAIS** éditer `backend/app/version.py`, `frontend/package.json`, `helm/automation-factory/Chart.yaml` manuellement — **toujours `scripts/version.py`**
- En dev/staging, `backend/app/version.py` et `frontend/package.json` portent 4 segments (ex. `2.4.4.3`) ; 3 segments en prod (après `release`) — jamais `echo >` qui écraserait `VERSION_FEATURES`
- **TOUJOURS** valider les 3 health checks + version/`is_rc` après le déploiement QUALIF
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
| Secrets | `.env` | `.env` + `prod.env` + `--set` |
| Kubeconfig | N/A | gitignoré, local |

---

*Mis à jour : 2026-10-31 (alignement template v3.29.1 — audit companions-audit-20261031)*

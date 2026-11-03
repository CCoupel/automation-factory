#!/usr/bin/env bash
# scripts/ci.sh — CI_CMD unique (infra.md §3bis C11)
#
# Porte TOUTES les etapes bloquantes de la CI. Appele tel quel par :
#   - .github/workflows/ci-branch.yml (pre-validation, C10)
#   - .github/workflows/release.yml   (gate avant publication, C3)
#   - qa / deployer en local
# Aucune etape n'existe uniquement en CI ou uniquement en local.
#
# Provenance de chaque etape (aucune etape inventee) :
#   [R]  release.yml        [T] test.yml        [C] project-config.json .commands.*
#
# Prerequis outillage (installes par le workflow, ou presents en local) :
#   Python 3.11 (test.yml L23-26), Node 20 (test.yml L52-55), docker compose + jq (stage integration).
#
# Usage : scripts/ci.sh [--tag vX.Y.Z]
#   --tag : en release, verifie aussi la coherence avec le tag (release.yml L44).
# Variables :
#   CI_SKIP_INTEGRATION=1 : saute l'etape docker compose (poste sans daemon docker local).
#                           A n'utiliser qu'en local ; jamais positionne dans un workflow.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TAG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="${2:?--tag requiert vX.Y.Z}"; shift 2 ;;
    *) echo "Argument inconnu : $1" >&2; exit 2 ;;
  esac
done

step() { echo; echo "==== [ci] $* ===="; }

# --- 1. Coherence de version (lecture seule) -------------------------------- [R] L44
step "version check"
if [ -n "$TAG" ]; then
  python3 scripts/version.py check --tag "$TAG"
else
  python3 scripts/version.py check
fi

# --- 2. Backend ------------------------------------------------------------- 
step "backend: install"                                                     # [T] L30-31
( cd backend && pip install -r requirements.txt )

step "backend: lint (ruff)"                                                 # [C] commands.lint (part. backend)
( cd backend && ruff check . )

step "backend: tests + coverage"                                            # [T] L33-34 / [C] commands.test, commands.coverage
( cd backend && python -m pytest tests/ -v --cov=app --cov-report=xml --cov-report=term-missing )

# --- 3. Frontend ------------------------------------------------------------
step "frontend: install"                                                    # [T] L59-60
( cd frontend && npm ci )

step "frontend: lint (eslint)"                                              # [C] commands.lint (part. frontend)
( cd frontend && npm run lint )

step "frontend: typecheck"                                                  # [C] commands.typecheck
( cd frontend && npx tsc --noEmit )

step "frontend: tests + coverage"                                           # [T] L62-63 / [C] commands.coverage
( cd frontend && npm run test:coverage )

step "frontend: audit dependances"                                          # [C] commands.audit
# Seuil high : 11 moderate restantes (minimatch via eslint, dev only, sans correctif) — suivi en issue séparée
( cd frontend && npm audit --audit-level=high )

step "frontend: build"                                                      # [C] commands.build (= RUN npm run build, frontend/Dockerfile L17)
( cd frontend && npm run build )
test -f frontend/dist/index.html                                            # [C] commands.build_validate

# --- 4. Integration (docker compose + smoke) --------------------------------- [T] L72-115
if [ "${CI_SKIP_INTEGRATION:-0}" = "1" ]; then
  step "integration: SKIPPED (CI_SKIP_INTEGRATION=1)"
else
  step "integration: compose up + smoke"
  export IMAGE_TAG=ci ENVIRONMENT=STAGING NGINX_PORT=80                     # [T] L82-85
  cleanup() {
    docker compose ps || true                                               # [T] L105-107
    docker compose down -v || true                                          # [T] L113-115
  }
  trap 'rc=$?; [ $rc -ne 0 ] && docker compose logs --tail=50 || true; cleanup; exit $rc' EXIT  # [T] L109-111
  timeout 300 docker compose up -d --build --wait                           # [T] L79-81 (timeout-minutes: 5)
  sleep 10                                                                  # [T] L87-88
  curl -sf http://localhost/health                                          # [T] L90-91
  VERSION=$(curl -sf http://localhost/api/version | jq -r .version)         # [T] L93-97
  echo "Backend version: $VERSION"; test -n "$VERSION"
  curl -sf http://localhost/api/ping                                        # [T] L99-100
  curl -sf http://localhost/ | grep -q '</html>'                            # [T] L102-103
fi

step "OK — toutes les etapes CI sont vertes"

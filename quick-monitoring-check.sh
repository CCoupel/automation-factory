#!/bin/bash
# Quick production monitoring check
#
# Version attendue (base X.Y.Z, sans le 4e segment de build) : lue via `scripts/version.py get
# --base` (source unique, contrats/version-format.md), avec fallback lecture directe de
# backend/app/version.py si l'outil n'est pas disponible. Surchargeable via EXPECTED_VERSION.
# En PROD, l'API masque le build candidate (voir /api/version : is_rc=false, build=null).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$EXPECTED_VERSION" ] && command -v python3 >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/scripts/version.py" ]; then
    EXPECTED_VERSION=$(python3 "$SCRIPT_DIR/scripts/version.py" get --base 2>/dev/null)
fi
if [ -z "$EXPECTED_VERSION" ] && [ -f "$SCRIPT_DIR/backend/app/version.py" ]; then
    # Fallback : lecture directe (scripts/version.py absent/en echec)
    EXPECTED_VERSION=$(grep -oP '(?<=__version__ = ")[^"]+' "$SCRIPT_DIR/backend/app/version.py")
fi
EXPECTED_VERSION="${EXPECTED_VERSION:-2.4.4}"
# Normalisation vers X.Y.Z : retire le 4e segment de build (.a) et tout suffixe legacy (-rc.n, _n)
EXPECTED_VERSION=$(echo "$EXPECTED_VERSION" | sed -E 's/^([0-9]+\.[0-9]+\.[0-9]+).*/\1/')

PROD_URL="https://coupel.net/automation-factory"
FRONTEND_URL="$PROD_URL/"

echo "🔍 Quick production monitoring check for v$EXPECTED_VERSION..."
echo "📍 URL: $PROD_URL"
echo "⏰ Start time: $(date)"
echo ""

# Function to perform health check
perform_health_check() {
    local check_number=$1
    local timestamp=$(date)
    echo "[$timestamp] Health Check #$check_number"

    # Check 1: Frontend
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    echo "Frontend: $frontend_status $([ "$frontend_status" = "200" ] && echo "✅" || echo "❌")"

    # Check 2: Health endpoint
    health_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
    echo "Health: $health_status $([ "$health_status" = "200" ] && echo "✅" || echo "❌")"

    # Check 3: Version endpoint
    version_response=$(curl -s "$PROD_URL/api/version")
    if echo "$version_response" | grep -q "\"version\":\"$EXPECTED_VERSION\""; then
        echo "Version: $EXPECTED_VERSION ✅"
    else
        echo "Version: ERROR ❌"
    fi

    # Check 3bis: PROD guard — is_rc=false ET build=null (detecte une image QUALIF deployee
    # par erreur en PROD, contrats/http-endpoints.md)
    if echo "$version_response" | grep -q '"is_rc":false' && echo "$version_response" | grep -q '"build":null'; then
        echo "PROD guard (is_rc=false, build=null): ✅"
    else
        echo "PROD guard (is_rc=false, build=null): ❌"
    fi

    # Check 4: Galaxy roles namespaces endpoint
    galaxy_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/galaxy-roles/standalone/namespaces")
    echo "Galaxy: $galaxy_status $([ "$galaxy_status" = "200" ] && echo "✅" || echo "❌")"

    echo "---"
}

# Check Kubernetes status
echo "🔍 Kubernetes Status:"
kubectl --kubeconfig="$SCRIPT_DIR/kubeconfig.txt" get pods -n automation-factory --no-headers | while read line; do
    name=$(echo $line | awk '{print $1}')
    status=$(echo $line | awk '{print $3}')
    echo "$name: $status $([ "$status" = "Running" ] && echo "✅" || echo "❌")"
done
echo ""

# Perform 3 health checks with 30 second intervals
for i in {1..3}; do
    perform_health_check $i
    if [ $i -lt 3 ]; then
        echo "⏳ Waiting 30 seconds..."
        sleep 30
    fi
done

echo "🎯 Quick monitoring completed!"
echo "⏰ End time: $(date)"

#!/bin/bash
# Production monitoring script for 30 minutes post-deployment
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
MONITORING_DURATION=1800  # 30 minutes in seconds
CHECK_INTERVAL=300        # Check every 5 minutes

echo "🔍 Starting 30-minute production monitoring for v$EXPECTED_VERSION..."
echo "📍 URL: $PROD_URL"
echo "⏰ Start time: $(date)"
echo "🔄 Checking every $((CHECK_INTERVAL / 60)) minutes for $((MONITORING_DURATION / 60)) minutes"
echo ""

# Create monitoring log
LOG_FILE="monitoring-production-$(date +%Y%m%d-%H%M%S).log"

# Function to perform health checks
perform_health_check() {
    local timestamp=$(date)
    echo "[$timestamp] Starting health check..."

    # Check 1: Frontend
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    if [ "$frontend_status" = "200" ]; then
        echo "✅ Frontend: OK ($frontend_status)"
    else
        echo "❌ Frontend: FAIL ($frontend_status)"
    fi

    # Check 2: Health endpoint
    health_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
    if [ "$health_status" = "200" ]; then
        echo "✅ Health: OK ($health_status)"
    else
        echo "❌ Health: FAIL ($health_status)"
    fi

    # Check 3: Version endpoint (should return $EXPECTED_VERSION)
    version_response=$(curl -s "$PROD_URL/api/version")
    if echo "$version_response" | grep -q "\"version\":\"$EXPECTED_VERSION\""; then
        echo "✅ Version: OK ($EXPECTED_VERSION detected)"
    else
        echo "❌ Version: FAIL ($EXPECTED_VERSION not detected)"
    fi

    # Check 3bis: PROD guard — is_rc doit etre false ET build doit etre null (detecte une
    # image QUALIF/build candidate deployee par erreur en PROD, contrats/http-endpoints.md)
    if echo "$version_response" | grep -q '"is_rc":false' && echo "$version_response" | grep -q '"build":null'; then
        echo "✅ PROD guard: OK (is_rc=false, build=null)"
    else
        echo "❌ PROD guard: FAIL (image QUALIF suspectee en PROD)"
    fi

    # Check 4: API ping
    ping_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/ping")
    if [ "$ping_status" = "200" ]; then
        echo "✅ API Ping: OK ($ping_status)"
    else
        echo "❌ API Ping: FAIL ($ping_status)"
    fi

    # Check 5: Galaxy roles namespaces endpoint
    galaxy_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/galaxy-roles/standalone/namespaces")
    if [ "$galaxy_status" = "200" ]; then
        echo "✅ Galaxy API: OK ($galaxy_status)"
    else
        echo "❌ Galaxy API: FAIL ($galaxy_status)"
    fi

    echo "---"
}

# Function to check Kubernetes pods status
check_k8s_status() {
    echo "🔍 Kubernetes Status:"
    kubectl --kubeconfig="$SCRIPT_DIR/kubeconfig.txt" get pods -n automation-factory
    echo ""
    kubectl --kubeconfig="$SCRIPT_DIR/kubeconfig.txt" get deployments -n automation-factory -o wide
    echo "---"
}

# Initial check
perform_health_check | tee -a "$LOG_FILE"
check_k8s_status | tee -a "$LOG_FILE"

# Start monitoring loop
start_time=$(date +%s)
check_count=1

while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))

    if [ $elapsed -ge $MONITORING_DURATION ]; then
        echo "✅ 30-minute monitoring period completed!"
        break
    fi

    echo "⏳ Waiting for next check... ($(($((MONITORING_DURATION - elapsed)) / 60)) minutes remaining)"
    sleep $CHECK_INTERVAL

    check_count=$((check_count + 1))
    echo ""
    echo "📊 Health Check #$check_count"
    perform_health_check | tee -a "$LOG_FILE"
done

echo ""
echo "🎯 Monitoring completed successfully!"
echo "📄 Full log saved to: $LOG_FILE"
echo "⏰ End time: $(date)"

# Final summary
echo ""
echo "📋 Final Status Summary:"
perform_health_check

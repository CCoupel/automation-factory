#!/bin/bash
# Smoke tests for production
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
echo "🔍 Starting smoke tests for production deployment v$EXPECTED_VERSION..."
echo "📍 Testing URL: $PROD_URL"
echo ""

# Test 1: Frontend is accessible
echo "1️⃣ Testing frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo "✅ Frontend is accessible (200 OK)"
else
    echo "❌ Frontend is not accessible"
    curl -s -w "Status: %{http_code}\n" "$FRONTEND_URL"
fi
echo ""

# Test 2: API health endpoint
echo "2️⃣ Testing API health endpoint..."
API_HEALTH_URL="$PROD_URL/health"
if curl -s -o /dev/null -w "%{http_code}" "$API_HEALTH_URL" | grep -q "200"; then
    echo "✅ API health endpoint is accessible (200 OK)"
else
    echo "❌ API health endpoint is not accessible"
    curl -s -w "Status: %{http_code}\n" "$API_HEALTH_URL"
fi
echo ""

# Test 3: API version endpoint - Check expected version is returned
echo "3️⃣ Testing API version endpoint..."
VERSION_URL="$PROD_URL/api/version"
VERSION_RESPONSE=$(curl -s "$VERSION_URL")
if echo "$VERSION_RESPONSE" | grep -q "\"version\":\"$EXPECTED_VERSION\""; then
    echo "✅ API version endpoint returns v$EXPECTED_VERSION"
    echo "📄 Version response: $VERSION_RESPONSE"
else
    echo "❌ API version endpoint does not return v$EXPECTED_VERSION"
    echo "📄 Response: $VERSION_RESPONSE"
fi

# Test 3bis: PROD guard — detecte une image QUALIF (build candidate) deployee par erreur
# en PROD : is_rc doit etre false ET build doit etre null (contrats/http-endpoints.md).
echo "3️⃣.5 Testing PROD guard (is_rc=false, build=null)..."
if echo "$VERSION_RESPONSE" | grep -q '"is_rc":false' && echo "$VERSION_RESPONSE" | grep -q '"build":null'; then
    echo "✅ PROD guard OK (is_rc=false, build=null)"
else
    echo "❌ PROD guard FAILED — image QUALIF (build candidate) suspectee en PROD"
    echo "📄 Response: $VERSION_RESPONSE"
fi
echo ""

# Test 4: API ping endpoint
echo "4️⃣ Testing API ping endpoint..."
PING_URL="$PROD_URL/api/ping"
if curl -s -o /dev/null -w "%{http_code}" "$PING_URL" | grep -q "200"; then
    echo "✅ API ping endpoint is accessible (200 OK)"
else
    echo "❌ API ping endpoint is not accessible"
    curl -s -w "Status: %{http_code}\n" "$PING_URL"
fi
echo ""

# Test 5: Test Galaxy roles namespaces endpoint
echo "5️⃣ Testing Galaxy roles namespaces..."
NAMESPACE_URL="$PROD_URL/api/galaxy-roles/standalone/namespaces"
if curl -s -o /dev/null -w "%{http_code}" "$NAMESPACE_URL" | grep -q "200"; then
    echo "✅ Galaxy roles namespaces endpoint is accessible (200 OK)"
else
    echo "❌ Galaxy roles namespaces endpoint returned non-200 status"
    curl -s -w "Status: %{http_code}\n" "$NAMESPACE_URL"
fi
echo ""

echo "🎯 Smoke tests completed!"
echo "⏰ $(date)"

#!/bin/bash
# Smoke tests for production
#
# Version attendue lue dynamiquement depuis backend/app/version.py (repo checkout local),
# surchageable via la variable d'environnement EXPECTED_VERSION.
# En PROD, le suffixe -rc.n (staging) est masque par l'API (voir /api/version : is_rc=false).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$EXPECTED_VERSION" ]; then
    if [ -f "$SCRIPT_DIR/backend/app/version.py" ]; then
        EXPECTED_VERSION=$(grep -oP '(?<=__version__ = ")[^"]+' "$SCRIPT_DIR/backend/app/version.py")
    fi
fi
EXPECTED_VERSION="${EXPECTED_VERSION:-2.4.3}"
EXPECTED_VERSION="${EXPECTED_VERSION%-rc.*}"  # PROD masque le suffixe -rc.n

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
if echo "$VERSION_RESPONSE" | grep -q "\"$EXPECTED_VERSION\""; then
    echo "✅ API version endpoint returns v$EXPECTED_VERSION"
    echo "📄 Version response: $VERSION_RESPONSE"
else
    echo "❌ API version endpoint does not return v$EXPECTED_VERSION"
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

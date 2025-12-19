#!/bin/bash
# Smoke tests for production v1.9.0

PROD_URL="https://coupel.net/ansible-builder"
FRONTEND_URL="$PROD_URL/"
echo "🔍 Starting smoke tests for production deployment v1.9.0..."
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

# Test 3: API version endpoint - Check if 1.9.0 is returned
echo "3️⃣ Testing API version endpoint..."
VERSION_URL="$PROD_URL/api/version"
VERSION_RESPONSE=$(curl -s "$VERSION_URL")
if echo "$VERSION_RESPONSE" | grep -q "1.9.0"; then
    echo "✅ API version endpoint returns v1.9.0"
    echo "📄 Version response: $VERSION_RESPONSE"
else
    echo "❌ API version endpoint does not return v1.9.0"
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

# Test 5: Test Galaxy collections namespace endpoint
echo "5️⃣ Testing Galaxy namespace collections..."
NAMESPACE_URL="$PROD_URL/api/galaxy/namespaces/community/collections"
if curl -s -o /dev/null -w "%{http_code}" "$NAMESPACE_URL" | grep -q "200"; then
    echo "✅ Galaxy namespace collections endpoint is accessible (200 OK)"
else
    echo "❌ Galaxy namespace collections endpoint returned non-200 status"
    curl -s -w "Status: %{http_code}\n" "$NAMESPACE_URL"
fi
echo ""

echo "🎯 Smoke tests completed!"
echo "⏰ $(date)"
#!/bin/bash
# test-api-regression.sh
# Script de tests API non-régression pour Phase 1

echo "=== Test API Non-Régression Phase 1 ==="
BASE_URL="http://localhost:8000"
EXIT_CODE=0

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_pattern=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s "$BASE_URL$endpoint")
    http_code=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint")
    
    if [[ $http_code -eq 200 && $response =~ $expected_pattern ]]; then
        echo "✅ OK"
    else
        echo "❌ FAIL (HTTP: $http_code)"
        echo "   Response: $response"
        EXIT_CODE=1
    fi
}

# Test Health
test_endpoint "/api/health" "ok" "/api/health"

# Test Version (must contain _n suffix)
echo -n "Testing /api/version... "
VERSION=$(curl -s $BASE_URL/api/version | jq -r .version 2>/dev/null)
if [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+_[0-9]+$ ]]; then
    echo "✅ Version: $VERSION"
else
    echo "❌ FAIL - Wrong version format: $VERSION"
    EXIT_CODE=1
fi

# Test Auth Status
test_endpoint "/api/auth/status" "user" "/api/auth/status"

# Test Galaxy Namespaces
echo -n "Testing /api/galaxy/namespaces... "
NAMESPACES_RESPONSE=$(curl -s $BASE_URL/api/galaxy/namespaces)
if command -v jq > /dev/null; then
    COUNT=$(echo "$NAMESPACES_RESPONSE" | jq '. | length' 2>/dev/null)
    if [[ $COUNT && $COUNT -gt 0 ]]; then
        echo "✅ Found $COUNT namespaces"
    else
        echo "❌ FAIL - No namespaces or invalid response"
        EXIT_CODE=1
    fi
else
    # Fallback without jq
    if [[ $NAMESPACES_RESPONSE == *"community"* ]]; then
        echo "✅ OK (contains community)"
    else
        echo "❌ FAIL - Invalid response"
        EXIT_CODE=1
    fi
fi

# Test Playbooks
test_endpoint "/api/playbooks" "playbook" "/api/playbooks"

echo ""
echo "=== Test Nouvelles API (Module Schemas) ==="

# Test module with documentation
echo -n "Testing docker_container schema... "
DOCKER_RESPONSE=$(curl -s "$BASE_URL/api/galaxy/modules/community.docker.docker_container/schema")
if [[ $DOCKER_RESPONSE == *"parameters"* && $DOCKER_RESPONSE == *"docker_container"* ]]; then
    echo "✅ Schema loaded"
else
    echo "❌ FAIL - Schema not loaded"
    EXIT_CODE=1
fi

# Test module without documentation (should return 404)
echo -n "Testing api_gateway schema (404 expected)... "
HTTP_CODE=$(curl -s -w "%{http_code}" "$BASE_URL/api/galaxy/modules/community.aws.api_gateway/schema" -o /dev/null)
if [[ $HTTP_CODE == "404" ]]; then
    echo "✅ Correct 404 error"
else
    echo "❌ FAIL - Wrong HTTP code: $HTTP_CODE (expected 404)"
    EXIT_CODE=1
fi

# Test performance
echo -n "Testing response time... "
if command -v bc > /dev/null; then
    TIME=$(curl -w "%{time_total}" -s "$BASE_URL/api/galaxy/modules/community.docker.docker_container/schema" -o /dev/null)
    if [[ $(echo "$TIME < 2.0" | bc) -eq 1 ]]; then
        echo "✅ Response time: ${TIME}s"
    else
        echo "⚠️  SLOW: ${TIME}s (target: <2s)"
    fi
else
    echo "⚠️  SKIP (bc not available)"
fi

echo ""
echo "=== Test Summary ==="
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "🎉 All API tests PASSED"
    echo "✅ Non-regression validated"
    echo "✅ New APIs functional"
else
    echo "💥 API tests FAILED"
    echo "❌ Review errors above"
fi

exit $EXIT_CODE
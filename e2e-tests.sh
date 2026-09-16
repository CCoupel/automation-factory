#!/bin/bash
# e2e-tests.sh

echo "=== Tests End-to-End Phase 2 ==="
BASE_URL="http://192.168.1.217:8000"
FRONTEND_URL="http://192.168.1.217:80"
EXIT_CODE=0

# Test 1: Services Health
echo "🔍 Testing services health..."
if ! curl -s -f $BASE_URL/health > /dev/null; then
    echo "❌ Backend health check failed"
    EXIT_CODE=1
else
    echo "✅ Backend health OK"
fi

if ! curl -s -f $FRONTEND_URL > /dev/null; then
    echo "❌ Frontend not accessible"
    EXIT_CODE=1
else
    echo "✅ Frontend accessible"
fi

# Test 2: Authentication Flow
echo "🔍 Testing authentication flow..."
# TODO: Add auth tests when implemented

# Test 3: Galaxy API Integration
echo "🔍 Testing Galaxy API integration..."
NAMESPACES=$(curl -s $BASE_URL/api/galaxy/namespaces | jq '. | length')
if [[ $NAMESPACES -lt 5 ]]; then
    echo "❌ Too few namespaces: $NAMESPACES"
    EXIT_CODE=1
else
    echo "✅ Galaxy API functional: $NAMESPACES namespaces"
fi

# Test 4: Module Schema Retrieval
echo "🔍 Testing module schema retrieval..."
SCHEMA=$(curl -s $BASE_URL/api/galaxy/modules/community.docker.docker_container/schema)
PARAM_COUNT=$(echo $SCHEMA | jq '.parameter_count')
if [[ $PARAM_COUNT -lt 50 ]]; then
    echo "❌ Too few parameters: $PARAM_COUNT"
    EXIT_CODE=1
else
    echo "✅ Module schema functional: $PARAM_COUNT parameters"
fi

# Test 5: Error Handling
echo "🔍 Testing error handling..."
HTTP_CODE=$(curl -s -w "%{http_code}" $BASE_URL/api/galaxy/modules/community.aws.api_gateway/schema -o /dev/null)
if [[ $HTTP_CODE != "404" ]]; then
    echo "❌ Wrong error code: $HTTP_CODE (expected 404)"
    EXIT_CODE=1
else
    echo "✅ Error handling correct: $HTTP_CODE"
fi

# Test 6: Performance
echo "🔍 Testing performance..."
RESPONSE_TIME=$(curl -w "%{time_total}" -s $BASE_URL/api/galaxy/modules/community.docker.docker_container/schema -o /dev/null)
if [[ $(echo "$RESPONSE_TIME > 5.0" | bc) -eq 1 ]]; then
    echo "❌ Response too slow: ${RESPONSE_TIME}s"
    EXIT_CODE=1
else
    echo "✅ Performance OK: ${RESPONSE_TIME}s"
fi

# Test 7: Version Verification
echo "🔍 Testing RC version..."
VERSION=$(curl -s $BASE_URL/api/version | jq -r .version)
if [[ $VERSION == "1.9.0-rc.1" ]]; then
    echo "✅ RC Version deployed: $VERSION"
else
    echo "❌ Wrong version: $VERSION"
    EXIT_CODE=1
fi

echo "=== E2E Tests Complete ==="
exit $EXIT_CODE

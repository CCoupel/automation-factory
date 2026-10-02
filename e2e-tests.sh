#!/bin/bash
# e2e-tests.sh

echo "=== Tests End-to-End Phase 2 ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
# Clot l'echec permanent connu (cf. .claude/agents/qa.md) : la comparaison etait figee en dur
# a "1.9.0-rc.1". Desormais la version attendue est derivee dynamiquement de scripts/version.py
# get (4 segments exacts, X.Y.Z.a), avec verification croisee is_rc=true / build=<a> (le
# staging/QUALIF sert toujours un build candidate, jamais une version PROD sans 4e segment).
echo "🔍 Testing build candidate version..."
if ! command -v python3 >/dev/null 2>&1 || [[ ! -f "$SCRIPT_DIR/scripts/version.py" ]]; then
    echo "❌ scripts/version.py introuvable — impossible de determiner la version attendue"
    EXIT_CODE=1
else
    EXPECTED_VERSION=$(python3 "$SCRIPT_DIR/scripts/version.py" get 2>/dev/null)
    if [[ -z "$EXPECTED_VERSION" ]]; then
        echo "❌ scripts/version.py get n'a rien retourne"
        EXIT_CODE=1
    else
        VERSION_JSON=$(curl -s $BASE_URL/api/version)
        VERSION=$(echo "$VERSION_JSON" | jq -r .version)
        IS_RC=$(echo "$VERSION_JSON" | jq -r .is_rc)
        BUILD=$(echo "$VERSION_JSON" | jq -r .build)
        if [[ "$VERSION" == "$EXPECTED_VERSION" && "$IS_RC" == "true" && "$BUILD" != "null" ]]; then
            echo "✅ Build candidate deployed: $VERSION (is_rc=$IS_RC, build=$BUILD)"
        else
            echo "❌ Version mismatch — attendu $EXPECTED_VERSION (is_rc=true, build=<a>), obtenu $VERSION (is_rc=$IS_RC, build=$BUILD)"
            EXIT_CODE=1
        fi
    fi
fi

echo "=== E2E Tests Complete ==="
exit $EXIT_CODE

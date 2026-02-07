#!/bin/bash
# Quick production monitoring check for v1.9.0 deployment

PROD_URL="https://coupel.net/automation-factory"
FRONTEND_URL="$PROD_URL/"

echo "🔍 Quick production monitoring check for v1.9.0..."
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
    if echo "$version_response" | grep -q "1.9.0"; then
        echo "Version: 1.9.0 ✅"
    else
        echo "Version: ERROR ❌"
    fi
    
    # Check 4: Galaxy API
    galaxy_status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/galaxy/namespaces/community/collections")
    echo "Galaxy: $galaxy_status $([ "$galaxy_status" = "200" ] && echo "✅" || echo "❌")"
    
    echo "---"
}

# Check Kubernetes status
echo "🔍 Kubernetes Status:"
kubectl --kubeconfig=kubeconfig.txt get pods -n automation-factory --no-headers | while read line; do
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
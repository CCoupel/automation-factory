#!/bin/bash
# performance-tests.sh

echo "=== Performance Tests Phase 2 ==="

# Test charge API
echo "🚀 Load testing Galaxy API..."
for i in {1..10}; do
    TIME=$(curl -w "%{time_total}" -s http://192.168.1.217:8000/api/galaxy/namespaces -o /dev/null)
    echo "Request $i: ${TIME}s"
done

# Test parallèle
echo "🚀 Concurrent requests test..."
for i in {1..5}; do
    curl -s http://192.168.1.217:8000/api/galaxy/modules/community.docker.docker_container/schema > /dev/null &
done
wait

echo "✅ Performance tests complete"
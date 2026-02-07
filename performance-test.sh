#!/bin/bash
# Performance tests Phase 2

echo "=== Performance Tests Phase 2 ==="

# Test charge API (nouvelle API Ansible)
echo "🚀 Load testing Ansible API..."
for i in {1..10}; do
    TIME=$(curl -w "%{time_total}" -s http://192.168.1.217/api/ansible/versions -o /dev/null)
    echo "Request $i: ${TIME}s"
done

# Test parallèle
echo "🚀 Concurrent requests test..."
for i in {1..5}; do
    curl -s http://192.168.1.217/api/ansible/versions > /dev/null &
done
wait

echo "✅ Performance tests complete"
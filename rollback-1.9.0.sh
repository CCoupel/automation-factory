#!/bin/bash
# Rollback commands for 1.9.0 if needed

echo "🚨 Starting rollback from 1.9.0 to 1.8.1..."

# Rollback using Helm
echo "📌 Rolling back Helm release..."
helm rollback ansible-builder --namespace ansible-builder

# Alternative: Direct kubectl rollback
# kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.8.1 -n ansible-builder
# kubectl set image deployment/ansible-builder-frontend frontend=ghcr.io/ccoupel/ansible-builder-frontend:1.8.1 -n ansible-builder

# Wait for rollback
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder
kubectl rollout status deployment/ansible-builder-frontend -n ansible-builder

# Verify rollback
echo "✅ Verifying rollback..."
kubectl get deployment -n ansible-builder -o wide
echo ""
echo "🔍 Current versions after rollback:"
kubectl describe deployment ansible-builder-backend -n ansible-builder | grep Image:
kubectl describe deployment ansible-builder-frontend -n ansible-builder | grep Image:
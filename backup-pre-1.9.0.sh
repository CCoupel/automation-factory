#!/bin/bash
# Backup script before v1.9.0 deployment

echo "📦 Creating backup before v1.9.0 deployment..."
DATE=$(date +%Y%m%d_%H%M%S)

# Export current deployments state
echo "🔧 Backing up deployment configurations..."
kubectl get deployment -n ansible-builder -o yaml > backup-deployments-pre-1.9.0.yaml
kubectl get configmap -n ansible-builder -o yaml > backup-configmaps-pre-1.9.0.yaml 
kubectl get pvc -n ansible-builder -o yaml > backup-pvc-pre-1.9.0.yaml

# Get current version info
echo "📌 Current production versions:"
kubectl describe deployment ansible-builder-backend -n ansible-builder | grep Image:
kubectl describe deployment ansible-builder-frontend -n ansible-builder | grep Image:

echo "✅ Backup complete. Files created:"
echo "  - backup-deployments-pre-1.9.0.yaml"
echo "  - backup-configmaps-pre-1.9.0.yaml"
echo "  - backup-pvc-pre-1.9.0.yaml"
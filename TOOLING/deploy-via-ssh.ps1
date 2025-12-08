# Deploy via SSH to server with kubectl access

$sshHost = "192.168.1.217"
$namespace = "ansible-builder"

Write-Host "Deploying optimized images via SSH to $sshHost" -ForegroundColor Cyan

# Create deployment script
$deployScript = @'
#!/bin/bash
echo "Deploying optimized Ansible Builder images..."

# Update backend
echo "Updating backend to 1.5.0_1..."
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.0_1 -n ansible-builder

# Update frontend  
echo "Updating frontend to 1.8.0..."
kubectl set image deployment/ansible-builder-frontend frontend=ghcr.io/ccoupel/ansible-builder-frontend:1.8.0 -n ansible-builder

# Wait for rollouts
echo "Waiting for backend rollout..."
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=300s

echo "Waiting for frontend rollout..."
kubectl rollout status deployment/ansible-builder-frontend -n ansible-builder --timeout=300s

# Show status
echo "Current pod status:"
kubectl get pods -n ansible-builder

echo "Deployment completed!"
'@

# Save script
$deployScript | Out-File -FilePath "deploy-remote.sh" -Encoding UTF8

# Execute via SSH
Write-Host "`nExecuting deployment on remote server..." -ForegroundColor Yellow
ssh root@$sshHost 'bash -s' < deploy-remote.sh

# Cleanup
Remove-Item "deploy-remote.sh"

Write-Host "`nDeployment process completed!" -ForegroundColor Green
Write-Host "Application URL: https://coupel.net/ansible-builder" -ForegroundColor Cyan
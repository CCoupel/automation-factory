# Deploy using local kubeconfig
$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Deploying optimized Ansible Builder images" -ForegroundColor Cyan
Write-Host "Backend: 1.5.0_1 | Frontend: 1.8.0" -ForegroundColor Yellow

# Verify kubectl works with this config
Write-Host "`nVerifying kubectl connection..." -ForegroundColor Yellow
kubectl get nodes
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to cluster" -ForegroundColor Red
    exit 1
}

# Update backend deployment
Write-Host "`nUpdating backend deployment to 1.5.0_1..." -ForegroundColor Green
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.0_1 -n ansible-builder

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update backend deployment" -ForegroundColor Red
    exit 1
}

# Update frontend deployment
Write-Host "`nUpdating frontend deployment to 1.8.0..." -ForegroundColor Green
kubectl set image deployment/ansible-builder-frontend frontend=ghcr.io/ccoupel/ansible-builder-frontend:1.8.0 -n ansible-builder

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update frontend deployment" -ForegroundColor Red
    exit 1
}

# Wait for rollout
Write-Host "`nWaiting for backend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=300s

Write-Host "`nWaiting for frontend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-frontend -n ansible-builder --timeout=300s

# Check pod status
Write-Host "`nPod status after deployment:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder -o wide

# Get logs
Write-Host "`nBackend startup logs:" -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=30

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "`nApplication URL: https://coupel.net/ansible-builder" -ForegroundColor Cyan
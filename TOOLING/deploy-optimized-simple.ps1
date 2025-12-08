# Deploy optimized images to Kubernetes
# Backend v1.5.0_1 - Frontend v1.8.0

Write-Host "Deploying optimized Ansible Builder images" -ForegroundColor Cyan
Write-Host "Backend: 1.5.0_1 | Frontend: 1.8.0" -ForegroundColor Yellow

# Update backend deployment
Write-Host "`nUpdating backend deployment..." -ForegroundColor Green
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.0_1 -n ansible-builder

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update backend deployment" -ForegroundColor Red
    exit 1
}

# Update frontend deployment
Write-Host "`nUpdating frontend deployment..." -ForegroundColor Green
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
Write-Host "`nPod status:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "`nApplication URL: https://coupel.net/ansible-builder" -ForegroundColor Cyan
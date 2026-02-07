# Deploy optimized images to Kubernetes
# Backend v1.5.0_1 - Frontend v1.8.0

Write-Host "Deploying optimized Automation Factory images" -ForegroundColor Cyan
Write-Host "Backend: 1.5.0_1 | Frontend: 1.8.0" -ForegroundColor Yellow

# Update backend deployment
Write-Host "`nUpdating backend deployment..." -ForegroundColor Green
kubectl set image deployment/automation-factory-backend backend=ghcr.io/ccoupel/automation-factory-backend:1.5.0_1 -n automation-factory

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update backend deployment" -ForegroundColor Red
    exit 1
}

# Update frontend deployment
Write-Host "`nUpdating frontend deployment..." -ForegroundColor Green
kubectl set image deployment/automation-factory-frontend frontend=ghcr.io/ccoupel/automation-factory-frontend:1.8.0 -n automation-factory

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update frontend deployment" -ForegroundColor Red
    exit 1
}

# Wait for rollout
Write-Host "`nWaiting for backend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/automation-factory-backend -n automation-factory --timeout=300s

Write-Host "`nWaiting for frontend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/automation-factory-frontend -n automation-factory --timeout=300s

# Check pod status
Write-Host "`nPod status:" -ForegroundColor Yellow
kubectl get pods -n automation-factory

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "`nApplication URL: https://coupel.net/automation-factory" -ForegroundColor Cyan
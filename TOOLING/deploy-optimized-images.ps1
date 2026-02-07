# Deploy optimized images to Kubernetes
# Backend v1.5.0_1 - Frontend v1.8.0

Write-Host "🚀 Deploying optimized Automation Factory images" -ForegroundColor Cyan
Write-Host "Backend: 1.5.0_1 | Frontend: 1.8.0" -ForegroundColor Yellow

# Get current deployment status
Write-Host "`n📊 Current deployment status:" -ForegroundColor Yellow
$currentBackend = kubectl get deployment automation-factory-backend -n automation-factory -o jsonpath="{.spec.template.spec.containers[0].image}" 2>$null
$currentFrontend = kubectl get deployment automation-factory-frontend -n automation-factory -o jsonpath="{.spec.template.spec.containers[0].image}" 2>$null

if ($currentBackend) {
    Write-Host "Current backend: $currentBackend" -ForegroundColor Gray
}
if ($currentFrontend) {
    Write-Host "Current frontend: $currentFrontend" -ForegroundColor Gray
}

# Update backend deployment
Write-Host "`n🔄 Updating backend deployment..." -ForegroundColor Green
kubectl set image deployment/automation-factory-backend `
    backend=ghcr.io/ccoupel/automation-factory-backend:1.5.0_1 `
    -n automation-factory

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update backend deployment" -ForegroundColor Red
    exit 1
}

# Update frontend deployment
Write-Host "`n🔄 Updating frontend deployment..." -ForegroundColor Green
kubectl set image deployment/automation-factory-frontend `
    frontend=ghcr.io/ccoupel/automation-factory-frontend:1.8.0 `
    -n automation-factory

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update frontend deployment" -ForegroundColor Red
    exit 1
}

# Wait for rollout
Write-Host "`n⏳ Waiting for deployments to roll out..." -ForegroundColor Yellow

Write-Host "Backend rollout status:" -ForegroundColor Gray
kubectl rollout status deployment/automation-factory-backend -n automation-factory --timeout=300s

Write-Host "`nFrontend rollout status:" -ForegroundColor Gray
kubectl rollout status deployment/automation-factory-frontend -n automation-factory --timeout=300s

# Check pod status
Write-Host "`n📊 Pod status after deployment:" -ForegroundColor Yellow
kubectl get pods -n automation-factory -o wide

# Get new versions
Write-Host "`n✅ Deployment completed!" -ForegroundColor Green
Write-Host "`nVerifying new versions:" -ForegroundColor Yellow

$newBackend = kubectl get deployment automation-factory-backend -n automation-factory -o jsonpath="{.spec.template.spec.containers[0].image}"
$newFrontend = kubectl get deployment automation-factory-frontend -n automation-factory -o jsonpath="{.spec.template.spec.containers[0].image}"

Write-Host "New backend: $newBackend" -ForegroundColor Green
Write-Host "New frontend: $newFrontend" -ForegroundColor Green

# Show logs preview
Write-Host "`n📋 Recent backend logs:" -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=20

Write-Host "`n🌐 Application URL: https://coupel.net/automation-factory" -ForegroundColor Cyan
Write-Host "`n🎯 New optimized endpoints to test:" -ForegroundColor Yellow
Write-Host "- POST   https://coupel.net/automation-factory/api/galaxy/preload-cache" -ForegroundColor White
Write-Host "- GET    https://coupel.net/automation-factory/api/galaxy/cache/stats" -ForegroundColor White
Write-Host "- DELETE https://coupel.net/automation-factory/api/galaxy/cache" -ForegroundColor White
Write-Host "- GET    https://coupel.net/automation-factory/api/galaxy/namespaces (optimized)" -ForegroundColor White
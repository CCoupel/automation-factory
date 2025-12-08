# Push images to ghcr.io and deploy
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Pushing images to ghcr.io and deploying..." -ForegroundColor Cyan

# Push backend image
Write-Host "`nPushing backend image..." -ForegroundColor Green
docker push ghcr.io/ccoupel/ansible-builder-backend:1.5.0_1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push backend image" -ForegroundColor Red
    exit 1
}

# Push frontend image
Write-Host "`nPushing frontend image..." -ForegroundColor Green
docker push ghcr.io/ccoupel/ansible-builder-frontend:1.8.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push frontend image" -ForegroundColor Red
    exit 1
}

Write-Host "`nImages pushed successfully!" -ForegroundColor Green

# Set kubeconfig
$env:KUBECONFIG = "$PWD\kubeconfig.txt"

# Force restart deployments to pull new images
Write-Host "`nRestarting deployments..." -ForegroundColor Yellow
kubectl rollout restart deployment/ansible-builder-backend -n ansible-builder
kubectl rollout restart deployment/ansible-builder-frontend -n ansible-builder

# Wait for rollout
Write-Host "`nWaiting for backend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=300s

Write-Host "`nWaiting for frontend rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-frontend -n ansible-builder --timeout=300s

# Check status
Write-Host "`nDeployment status:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "Application URL: https://coupel.net/ansible-builder" -ForegroundColor Cyan
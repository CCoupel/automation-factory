# Fix namespace discovery and deploy
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Building and deploying fixed namespace discovery..." -ForegroundColor Cyan

# Build backend with fix
Write-Host "`nBuilding backend 1.5.0_2..." -ForegroundColor Green
Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/ansible-builder-backend:1.5.0_2 -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    
    # Push image
    Write-Host "Pushing backend image..." -ForegroundColor Yellow
    docker push ghcr.io/ccoupel/ansible-builder-backend:1.5.0_2
    if ($LASTEXITCODE -ne 0) { throw "Backend push failed" }
    
    Write-Host "Backend built and pushed successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Deploy with kubectl
$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "`nUpdating backend deployment..." -ForegroundColor Yellow
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.0_2 -n ansible-builder

# Wait for rollout
Write-Host "`nWaiting for rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=300s

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "Testing namespace discovery fix..." -ForegroundColor Cyan
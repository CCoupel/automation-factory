# Deploy hybrid solution with progressive streaming
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Deploying hybrid Galaxy service v1.6.0_1..." -ForegroundColor Cyan

# Build and push backend
Push-Location backend
try {
    Write-Host "Building backend..." -ForegroundColor Yellow
    docker build -t ghcr.io/ccoupel/ansible-builder-backend:1.6.0_1 -f Dockerfile .
    docker push ghcr.io/ccoupel/ansible-builder-backend:1.6.0_1
} finally {
    Pop-Location
}

# Build and push frontend
Push-Location frontend
try {
    Write-Host "Building frontend..." -ForegroundColor Yellow
    docker build -t ghcr.io/ccoupel/ansible-builder-frontend:1.9.0 -f Dockerfile .
    docker push ghcr.io/ccoupel/ansible-builder-frontend:1.9.0
} finally {
    Pop-Location
}

# Deploy to Kubernetes
$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Deploying to Kubernetes..." -ForegroundColor Green
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.6.0_1 -n ansible-builder
kubectl set image deployment/ansible-builder-frontend frontend=ghcr.io/ccoupel/ansible-builder-frontend:1.9.0 -n ansible-builder

Write-Host "Waiting for rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=180s
kubectl rollout status deployment/ansible-builder-frontend -n ansible-builder --timeout=180s

# Test the deployment
Write-Host "Testing deployment..." -ForegroundColor Green
Start-Sleep 10

# Test backend version
Write-Host "Backend version:" -ForegroundColor Cyan
curl -s "https://coupel.net/ansible-builder/api/version"
Write-Host ""

# Test hybrid namespaces endpoint 
Write-Host "Testing instant namespaces:" -ForegroundColor Cyan
curl -s "https://coupel.net/ansible-builder/api/galaxy/namespaces?limit=5"
Write-Host ""

# Test streaming endpoint
Write-Host "Testing streaming endpoint:" -ForegroundColor Cyan
curl -s "https://coupel.net/ansible-builder/api/galaxy/namespaces/stream" | head -20
Write-Host ""

Write-Host "Hybrid deployment completed! ✅" -ForegroundColor Green
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  - Instant popular namespaces (25+ hardcoded)" -ForegroundColor White
Write-Host "  - Progressive streaming discovery" -ForegroundColor White
Write-Host "  - Auto preload on authentication" -ForegroundColor White
Write-Host "  - UI streaming progress indicators" -ForegroundColor White
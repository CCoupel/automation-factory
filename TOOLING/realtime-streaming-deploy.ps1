# Deploy real-time progressive namespace discovery
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Deploying REAL-TIME namespace discovery v1.6.1_1..." -ForegroundColor Cyan

# Build and push backend
Push-Location backend
try {
    Write-Host "Building backend with real-time streaming..." -ForegroundColor Yellow
    docker build -t ghcr.io/ccoupel/automation-factory-backend:1.6.1_1 -f Dockerfile .
    docker push ghcr.io/ccoupel/automation-factory-backend:1.6.1_1
} finally {
    Pop-Location
}

# Build and push frontend
Push-Location frontend
try {
    Write-Host "Building frontend with enhanced streaming UI..." -ForegroundColor Yellow
    docker build -t ghcr.io/ccoupel/automation-factory-frontend:1.10.0 -f Dockerfile .
    docker push ghcr.io/ccoupel/automation-factory-frontend:1.10.0
} finally {
    Pop-Location
}

# Deploy to Kubernetes
$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Deploying to Kubernetes..." -ForegroundColor Green
kubectl set image deployment/automation-factory-backend backend=ghcr.io/ccoupel/automation-factory-backend:1.6.1_1 -n automation-factory
kubectl set image deployment/automation-factory-frontend frontend=ghcr.io/ccoupel/automation-factory-frontend:1.10.0 -n automation-factory

Write-Host "Waiting for rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/automation-factory-backend -n automation-factory --timeout=180s
kubectl rollout status deployment/automation-factory-frontend -n automation-factory --timeout=180s

# Test the deployment
Write-Host "Testing deployment..." -ForegroundColor Green
Start-Sleep 10

# Test backend version
Write-Host "Backend version:" -ForegroundColor Cyan
curl -s "https://coupel.net/automation-factory/api/version"
Write-Host ""

# Test streaming endpoint
Write-Host "Testing REAL-TIME streaming endpoint:" -ForegroundColor Cyan
Write-Host "Starting streaming test (first 10 messages)..." -ForegroundColor Yellow
curl -s "https://coupel.net/automation-factory/api/galaxy/namespaces/stream" | head -10
Write-Host ""

Write-Host "Real-time streaming deployment completed! ✅" -ForegroundColor Green
Write-Host "New Features:" -ForegroundColor Yellow
Write-Host "  - REAL-TIME discovery: Namespaces appear as they're found" -ForegroundColor White
Write-Host "  - Progress indicators: Shows discovery stats and counts" -ForegroundColor White  
Write-Host "  - Enhanced UI: Status messages + progress chips" -ForegroundColor White
Write-Host "  - 2200+ namespaces: Full discovery instead of 25 hardcoded" -ForegroundColor White
Write-Host ""
Write-Host "Open https://coupel.net/automation-factory and go to Modules tab!" -ForegroundColor Green
# Build and deploy optimized Galaxy API
# Backend v1.5.0_1 - Frontend v1.8.0

param(
    [string]$backendTag = "1.5.0_1",
    [string]$frontendTag = "1.8.0"
)

Write-Host "🚀 Building and deploying optimized Galaxy API" -ForegroundColor Cyan
Write-Host "Backend: $backendTag | Frontend: $frontendTag" -ForegroundColor Yellow

# Set Docker host
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

# Build Backend
Write-Host "`n📦 Building backend..." -ForegroundColor Green
Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-backend:$backendTag -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Build Frontend
Write-Host "`n📦 Building frontend..." -ForegroundColor Green
Push-Location frontend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-frontend:$frontendTag -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Update values file
Write-Host "`n📝 Updating custom-values.yaml..." -ForegroundColor Yellow
$valuesPath = "custom-values.yaml"
$values = Get-Content $valuesPath -Raw

# Update backend tag
$values = $values -replace 'backend:(.|\n)*?tag:\s*"[^"]*"', "backend:`$1tag: `"$backendTag`""

# Update frontend tag  
$values = $values -replace 'frontend:(.|\n)*?tag:\s*"[^"]*"', "frontend:`$1tag: `"$frontendTag`""

$values | Set-Content $valuesPath
Write-Host "✅ Values updated" -ForegroundColor Green

# Deploy with Helm
Write-Host "`n🚀 Deploying with Helm..." -ForegroundColor Cyan
helm upgrade automation-factory ./automation-factory-chart `
    -f custom-values.yaml `
    -n automation-factory `
    --wait `
    --timeout 5m

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    
    # Get pod status
    Write-Host "`n📊 Pod Status:" -ForegroundColor Yellow
    kubectl get pods -n automation-factory
    
    Write-Host "`n🔗 Application URL: https://coupel.net/automation-factory" -ForegroundColor Cyan
}
else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Show optimized endpoints
Write-Host "`n🎯 Optimized Galaxy API Endpoints:" -ForegroundColor Yellow
Write-Host "- GET  /api/galaxy/namespaces - All namespaces with parallel loading" -ForegroundColor White
Write-Host "- GET  /api/galaxy/namespaces/{namespace}/collections - All collections" -ForegroundColor White
Write-Host "- POST /api/galaxy/preload-cache - Preload top namespaces" -ForegroundColor White
Write-Host "- GET  /api/galaxy/cache/stats - Cache statistics" -ForegroundColor White
Write-Host "- DELETE /api/galaxy/cache - Clear cache" -ForegroundColor White
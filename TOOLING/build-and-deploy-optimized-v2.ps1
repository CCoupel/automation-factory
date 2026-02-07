# Build and deploy optimized Galaxy API
# Backend v1.5.0_1 - Frontend v1.8.0

param(
    [string]$backendTag = "1.5.0_1",
    [string]$frontendTag = "1.8.0"
)

Write-Host "Building and deploying optimized Galaxy API" -ForegroundColor Cyan
Write-Host "Backend: $backendTag | Frontend: $frontendTag" -ForegroundColor Yellow

# Set Docker host
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

# Build Backend
Write-Host "`nBuilding backend..." -ForegroundColor Green
Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-backend:$backendTag -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    Write-Host "Backend built successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Build Frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Green
Push-Location frontend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-frontend:$frontendTag -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Host "Frontend built successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Update values file
Write-Host "`nUpdating custom-values.yaml..." -ForegroundColor Yellow

# Read the current values
$valuesContent = Get-Content "custom-values.yaml" -Raw

# Update backend image tag
$valuesContent = $valuesContent -replace '(backend:[\s\S]*?tag:\s*")[^"]+(")', "`${1}$backendTag`${2}"

# Update frontend image tag
$valuesContent = $valuesContent -replace '(frontend:[\s\S]*?tag:\s*")[^"]+(")', "`${1}$frontendTag`${2}"

# Write back
$valuesContent | Set-Content "custom-values.yaml"

Write-Host "Values updated" -ForegroundColor Green

# Deploy with Helm
Write-Host "`nDeploying with Helm..." -ForegroundColor Cyan
helm upgrade automation-factory ./automation-factory-chart `
    -f custom-values.yaml `
    -n automation-factory `
    --wait `
    --timeout 5m

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successful!" -ForegroundColor Green
    
    # Get pod status
    Write-Host "`nPod Status:" -ForegroundColor Yellow
    kubectl get pods -n automation-factory
    
    Write-Host "`nApplication URL: https://coupel.net/automation-factory" -ForegroundColor Cyan
}
else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    exit 1
}

# Show optimized endpoints
Write-Host "`nOptimized Galaxy API Endpoints:" -ForegroundColor Yellow
Write-Host "- GET    /api/galaxy/namespaces - All namespaces with parallel loading" -ForegroundColor White
Write-Host "- GET    /api/galaxy/namespaces/{namespace}/collections - All collections" -ForegroundColor White
Write-Host "- POST   /api/galaxy/preload-cache - Preload top namespaces" -ForegroundColor White
Write-Host "- GET    /api/galaxy/cache/stats - Cache statistics" -ForegroundColor White
Write-Host "- DELETE /api/galaxy/cache - Clear cache" -ForegroundColor White
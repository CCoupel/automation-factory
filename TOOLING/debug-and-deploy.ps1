# Debug namespace issue and deploy
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Building debug version 1.5.0_3..." -ForegroundColor Cyan

# Build and push backend
Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-backend:1.5.0_3 -f Dockerfile .
    docker push ghcr.io/ccoupel/automation-factory-backend:1.5.0_3
    Write-Host "Backend 1.5.0_3 built and pushed" -ForegroundColor Green
}
finally {
    Pop-Location
}

# Deploy
$env:KUBECONFIG = "$PWD\kubeconfig.txt"
kubectl set image deployment/automation-factory-backend backend=ghcr.io/ccoupel/automation-factory-backend:1.5.0_3 -n automation-factory
kubectl rollout status deployment/automation-factory-backend -n automation-factory --timeout=300s

Write-Host "Debug version deployed!" -ForegroundColor Green
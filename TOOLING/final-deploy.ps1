# Final deployment with instant namespaces
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Deploying final fix 1.5.1 with instant namespaces..." -ForegroundColor Cyan

Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/automation-factory-backend:1.5.1 -f Dockerfile .
    docker push ghcr.io/ccoupel/automation-factory-backend:1.5.1
}
finally {
    Pop-Location
}

$env:KUBECONFIG = "$PWD\kubeconfig.txt"
kubectl set image deployment/automation-factory-backend backend=ghcr.io/ccoupel/automation-factory-backend:1.5.1 -n automation-factory
kubectl rollout status deployment/automation-factory-backend -n automation-factory --timeout=180s

Write-Host "Testing instant namespaces..." -ForegroundColor Green
Start-Sleep 5
curl -s "https://coupel.net/automation-factory/api/galaxy/namespaces?limit=25"
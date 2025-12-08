# Final deployment with instant namespaces
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Deploying final fix 1.5.1 with instant namespaces..." -ForegroundColor Cyan

Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/ansible-builder-backend:1.5.1 -f Dockerfile .
    docker push ghcr.io/ccoupel/ansible-builder-backend:1.5.1
}
finally {
    Pop-Location
}

$env:KUBECONFIG = "$PWD\kubeconfig.txt"
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.1 -n ansible-builder
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=180s

Write-Host "Testing instant namespaces..." -ForegroundColor Green
Start-Sleep 5
curl -s "https://coupel.net/ansible-builder/api/galaxy/namespaces?limit=25"
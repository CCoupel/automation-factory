# Quick deploy with original service
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Quick deploy 1.5.0_4 with original service..." -ForegroundColor Cyan

Push-Location backend
try {
    docker build -t ghcr.io/ccoupel/ansible-builder-backend:1.5.0_4 -f Dockerfile .
    docker push ghcr.io/ccoupel/ansible-builder-backend:1.5.0_4
}
finally {
    Pop-Location
}

$env:KUBECONFIG = "$PWD\kubeconfig.txt"
kubectl set image deployment/ansible-builder-backend backend=ghcr.io/ccoupel/ansible-builder-backend:1.5.0_4 -n ansible-builder
kubectl rollout status deployment/ansible-builder-backend -n ansible-builder --timeout=180s

Write-Host "Deployed! Testing..." -ForegroundColor Green
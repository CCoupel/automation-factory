$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking debug logs for namespace discovery..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=50 | Select-String -Pattern "Phase|namespaces:|Final"
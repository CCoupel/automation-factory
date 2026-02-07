$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking debug logs for namespace discovery..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=50 | Select-String -Pattern "Phase|namespaces:|Final"
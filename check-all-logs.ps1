$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "All recent backend logs..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=30
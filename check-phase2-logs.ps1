$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking Phase 2 errors in backend logs..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=100 | Select-String -Pattern "Phase|Error|WARNING|discovered"

Write-Host "`nChecking recent Galaxy API calls..." -ForegroundColor Yellow  
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=50 | Select-String -Pattern "galaxy"
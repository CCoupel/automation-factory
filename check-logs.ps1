$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking backend startup logs..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=20

Write-Host "`nChecking frontend logs..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-frontend -n automation-factory --tail=10

Write-Host "`nPod status:" -ForegroundColor Yellow
kubectl get pods -n automation-factory
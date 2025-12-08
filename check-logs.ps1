$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking backend startup logs..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=20

Write-Host "`nChecking frontend logs..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-frontend -n ansible-builder --tail=10

Write-Host "`nPod status:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder
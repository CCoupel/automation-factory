$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking namespace discovery logs..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=30 | Select-String -Pattern "Phase|discovered|namespaces"

Write-Host "`nPod status:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder
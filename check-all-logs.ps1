$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "All recent backend logs..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=30
# Script pour forcer le restart des deployments
$env:KUBECONFIG = (Get-Item "$PSScriptRoot/../kubeconfig.txt").FullName

Write-Host "=== Forcer le restart des deployments ===" -ForegroundColor Yellow

Write-Host "Restart backend deployment..." -ForegroundColor Cyan
kubectl rollout restart deployment ansible-builder-backend -n ansible-builder

Write-Host "Restart frontend deployment..." -ForegroundColor Cyan  
kubectl rollout restart deployment ansible-builder-frontend -n ansible-builder

Write-Host "`nAttente du rollout..." -ForegroundColor Yellow
kubectl rollout status deployment ansible-builder-backend -n ansible-builder
kubectl rollout status deployment ansible-builder-frontend -n ansible-builder

Write-Host "`n=== Statut après restart ===" -ForegroundColor Green
kubectl get pods -n ansible-builder
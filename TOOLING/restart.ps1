# Script pour forcer le restart des deployments
$env:KUBECONFIG = (Get-Item "$PSScriptRoot/../kubeconfig.txt").FullName

Write-Host "=== Forcer le restart des deployments ===" -ForegroundColor Yellow

Write-Host "Restart backend deployment..." -ForegroundColor Cyan
kubectl rollout restart deployment automation-factory-backend -n automation-factory

Write-Host "Restart frontend deployment..." -ForegroundColor Cyan  
kubectl rollout restart deployment automation-factory-frontend -n automation-factory

Write-Host "`nAttente du rollout..." -ForegroundColor Yellow
kubectl rollout status deployment automation-factory-backend -n automation-factory
kubectl rollout status deployment automation-factory-frontend -n automation-factory

Write-Host "`n=== Statut après restart ===" -ForegroundColor Green
kubectl get pods -n automation-factory
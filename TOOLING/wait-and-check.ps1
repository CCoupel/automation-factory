# Script d'attente et vérification
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "Attente de 30 secondes pour le démarrage des pods..." -ForegroundColor Yellow
Start-Sleep 30

Write-Host "=== Statut après attente ===" -ForegroundColor Green
kubectl get pods -n automation-factory

Write-Host "`n=== Logs du backend (pour diagnose) ===" -ForegroundColor Yellow
kubectl logs -l app.kubernetes.io/name=automation-factory-backend -n automation-factory --tail=30

Write-Host "`n=== Describe du backend (pour diagnose) ===" -ForegroundColor Yellow
kubectl describe pods -l app.kubernetes.io/name=automation-factory-backend -n automation-factory
# Script de vérification du statut
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== Pods ===" -ForegroundColor Yellow
kubectl get pods -n automation-factory

Write-Host "`n=== Services ===" -ForegroundColor Yellow  
kubectl get svc -n automation-factory

Write-Host "`n=== Ingress ===" -ForegroundColor Yellow
kubectl get ingress -n automation-factory

Write-Host "`n=== Frontend logs (dernières 20 lignes) ===" -ForegroundColor Yellow
kubectl logs -l app.kubernetes.io/name=automation-factory-frontend -n automation-factory --tail=20

Write-Host "`n=== Backend logs (dernières 20 lignes) ===" -ForegroundColor Yellow
kubectl logs -l app.kubernetes.io/name=automation-factory-backend -n automation-factory --tail=20
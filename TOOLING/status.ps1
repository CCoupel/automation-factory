# Script de vérification du statut
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== Pods ===" -ForegroundColor Yellow
kubectl get pods -n ansible-builder

Write-Host "`n=== Services ===" -ForegroundColor Yellow  
kubectl get svc -n ansible-builder

Write-Host "`n=== Ingress ===" -ForegroundColor Yellow
kubectl get ingress -n ansible-builder

Write-Host "`n=== Frontend logs (dernières 20 lignes) ===" -ForegroundColor Yellow
kubectl logs -l app.kubernetes.io/name=ansible-builder-frontend -n ansible-builder --tail=20

Write-Host "`n=== Backend logs (dernières 20 lignes) ===" -ForegroundColor Yellow
kubectl logs -l app.kubernetes.io/name=ansible-builder-backend -n ansible-builder --tail=20
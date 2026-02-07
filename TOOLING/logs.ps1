# Récupérer logs des pods backend
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== Logs du backend (pod 1) ===" -ForegroundColor Yellow
$pod1 = "automation-factory-backend-6c8fd85f45-mx2kp"
kubectl logs $pod1 -n automation-factory --tail=50

Write-Host "`n=== Logs du backend (pod 2) ===" -ForegroundColor Yellow  
$pod2 = "automation-factory-backend-6c8fd85f45-wd6l5"
kubectl logs $pod2 -n automation-factory --tail=50

Write-Host "`n=== Test de connectivité directe au backend ===" -ForegroundColor Yellow
try {
    kubectl exec -n automation-factory $pod1 -- curl -I http://localhost:8000/
} catch {
    Write-Host "Erreur curl: $($_.Exception.Message)"
}

Write-Host "`n=== Variables d'environnement du backend ===" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod1 -- env | Select-String -Pattern "(POSTGRES|REDIS|DATABASE)"
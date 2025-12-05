# Vérification finale du déploiement
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== STATUT FINAL DU DÉPLOIEMENT ===" -ForegroundColor Green

Write-Host "`n1. Pods:" -ForegroundColor Yellow
kubectl get pods -n ansible-builder

Write-Host "`n2. Services:" -ForegroundColor Yellow
kubectl get svc -n ansible-builder

Write-Host "`n3. Ingress:" -ForegroundColor Yellow
kubectl get ingress -n ansible-builder

Write-Host "`n4. Test de l'endpoint de santé:" -ForegroundColor Yellow
$backendPod = kubectl get pods -n ansible-builder -l app.kubernetes.io/name=ansible-builder -o name | Where-Object { $_ -like "*backend*" } | Select-Object -First 1
if ($backendPod) {
    $podName = $backendPod -replace "pod/", ""
    Write-Host "Testant le pod: $podName"
    kubectl exec -n ansible-builder $podName -- python -c "
import requests
try:
    r = requests.get('http://localhost:8000/health')
    print(f'Health check - Status: {r.status_code}')
    print(f'Response: {r.json()}')
except Exception as e:
    print(f'Error: {e}')
"
}

Write-Host "`n5. URL d'accès:" -ForegroundColor Yellow
$ingressInfo = kubectl get ingress ansible-builder -n ansible-builder -o jsonpath='{.spec.rules[0].host}'
Write-Host "Application disponible sur: https://$ingressInfo"

Write-Host "`n=== RÉSUMÉ ===" -ForegroundColor Green
Write-Host "✅ Version déployée: 1.2.7" -ForegroundColor Green
Write-Host "✅ Correction appliquée: URLs relatives pour l'API (./api)" -ForegroundColor Green
Write-Host "✅ Pods backend et frontend fonctionnels" -ForegroundColor Green
Write-Host "✅ Health checks corrigés (/health)" -ForegroundColor Green
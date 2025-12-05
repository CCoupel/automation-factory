# Test de l'import du module common
$env:KUBECONFIG = (Get-Item "$PSScriptRoot/../kubeconfig.txt").FullName

$backendPod = kubectl get pods -n ansible-builder -l app.kubernetes.io/name=ansible-builder -o name | Where-Object { $_ -like "*backend*" } | Select-Object -First 1
$podName = $backendPod -replace "pod/", ""

Write-Host "=== Test import module common ===" -ForegroundColor Yellow
kubectl exec -n ansible-builder $podName -- python -c "
try:
    from app.api.endpoints import common
    print('✅ Import common: OK')
    print(f'Router: {common.router}')
except Exception as e:
    print(f'❌ Import error: {e}')
"

Write-Host "`n=== Test liste des routes ===" -ForegroundColor Yellow
kubectl exec -n ansible-builder $podName -- python -c "
try:
    from app.main import app
    print('Routes disponibles:')
    for route in app.routes:
        print(f'  {route.path} - {getattr(route, \"methods\", \"N/A\")}')
except Exception as e:
    print(f'Error: {e}')
"
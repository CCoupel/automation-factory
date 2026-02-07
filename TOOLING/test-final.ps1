# Test final des endpoints
$env:KUBECONFIG = (Get-Item "$PSScriptRoot/../kubeconfig.txt").FullName

$pods = kubectl get pods -n automation-factory -l app.kubernetes.io/name=automation-factory --no-headers -o custom-columns=":metadata.name" | Where-Object { $_ -like "*backend*" }
$pod = $pods[0]

Write-Host "=== TEST FINAL VERSION 1.3.0 ===" -ForegroundColor Green
Write-Host "Pod testé: $pod" -ForegroundColor Cyan

Write-Host "`n1. Test endpoint racine /:" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
import urllib.request
try:
    with urllib.request.urlopen('http://localhost:8000/') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n2. Test endpoint /health:" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
import urllib.request
try:
    with urllib.request.urlopen('http://localhost:8000/health') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n3. Test endpoint /api/version (nouveau):" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
import urllib.request
try:
    with urllib.request.urlopen('http://localhost:8000/api/version') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n4. Test des routes disponibles:" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
try:
    from app.main import app
    from app.api.router import api_router
    print('Routes dans api_router:')
    for route in api_router.routes:
        if hasattr(route, 'path'):
            print(f'  /api{route.path}')
except Exception as e:
    print(f'Error: {e}')
"
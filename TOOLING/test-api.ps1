# Test des endpoints API après correction
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

$backendPod = kubectl get pods -n automation-factory -l app.kubernetes.io/name=automation-factory -o name | Where-Object { $_ -like "*backend*" } | Select-Object -First 1
$podName = $backendPod -replace "pod/", ""

Write-Host "=== Test des endpoints backend ===" -ForegroundColor Yellow
Write-Host "Pod testé: $podName"

Write-Host "`n1. Test /health:" -ForegroundColor Cyan
kubectl exec -n automation-factory $podName -- python -c "
import urllib.request, json
try:
    with urllib.request.urlopen('http://localhost:8000/health') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n2. Test /api/version:" -ForegroundColor Cyan
kubectl exec -n automation-factory $podName -- python -c "
import urllib.request, json
try:
    with urllib.request.urlopen('http://localhost:8000/api/version') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n3. Test racine /:" -ForegroundColor Cyan
kubectl exec -n automation-factory $podName -- python -c "
import urllib.request, json
try:
    with urllib.request.urlopen('http://localhost:8000/') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"
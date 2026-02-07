# Test rapide des endpoints
$env:KUBECONFIG = (Get-Item "$PSScriptRoot/../kubeconfig.txt").FullName

$pods = kubectl get pods -n automation-factory -l app.kubernetes.io/name=automation-factory --no-headers -o custom-columns=":metadata.name" | Where-Object { $_ -like "*backend*" }
$pod = $pods[0]

Write-Host "Pod testé: $pod" -ForegroundColor Cyan

Write-Host "`nTest /api/ping:" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
import urllib.request
try:
    with urllib.request.urlopen('http://localhost:8000/api/ping') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`nTest /api/version:" -ForegroundColor Yellow
kubectl exec -n automation-factory $pod -- python -c "
import urllib.request
try:
    with urllib.request.urlopen('http://localhost:8000/api/version') as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
"
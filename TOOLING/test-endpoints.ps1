# Test des endpoints disponibles
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

$pod = "ansible-builder-backend-6c8fd85f45-mx2kp"

Write-Host "=== Test endpoint racine ===" -ForegroundColor Yellow
kubectl exec -n ansible-builder $pod -- python -c "
import requests
try:
    r = requests.get('http://localhost:8000/')
    print(f'Status: {r.status_code}')
    print(f'Content: {r.text[:200]}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n=== Test endpoint /docs ===" -ForegroundColor Yellow
kubectl exec -n ansible-builder $pod -- python -c "
import requests
try:
    r = requests.get('http://localhost:8000/docs')
    print(f'Status: {r.status_code}')
except Exception as e:
    print(f'Error: {e}')
"

Write-Host "`n=== Liste des routes FastAPI ===" -ForegroundColor Yellow
kubectl exec -n ansible-builder $pod -- python -c "
from app.main import app
for route in app.routes:
    print(f'{route.path} - {getattr(route, \"methods\", \"N/A\")}')
"
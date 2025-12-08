$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking backend logs for errors..." -ForegroundColor Yellow
kubectl logs deployment/ansible-builder-backend -n ansible-builder --tail=50

Write-Host "`nChecking if the optimized service is loaded..." -ForegroundColor Yellow
kubectl exec deployment/ansible-builder-backend -n ansible-builder -- python -c "
try:
    from app.services.galaxy_service_optimized import optimized_galaxy_service
    print('✅ Optimized service loaded successfully')
except Exception as e:
    print(f'❌ Error loading optimized service: {e}')
"
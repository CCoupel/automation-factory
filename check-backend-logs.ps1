$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking backend logs for errors..." -ForegroundColor Yellow
kubectl logs deployment/automation-factory-backend -n automation-factory --tail=50

Write-Host "`nChecking if the optimized service is loaded..." -ForegroundColor Yellow
kubectl exec deployment/automation-factory-backend -n automation-factory -- python -c "
try:
    from app.services.galaxy_service_optimized import optimized_galaxy_service
    print('✅ Optimized service loaded successfully')
except Exception as e:
    print(f'❌ Error loading optimized service: {e}')
"
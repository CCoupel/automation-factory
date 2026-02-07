$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking deployment status..." -ForegroundColor Yellow
kubectl get pods -n automation-factory -o wide

Write-Host "`nChecking events..." -ForegroundColor Yellow  
kubectl get events -n automation-factory --sort-by='.lastTimestamp' | Select-Object -Last 10

Write-Host "`nChecking deployments..." -ForegroundColor Yellow
kubectl get deployments -n automation-factory

Write-Host "`nDescribing backend pod..." -ForegroundColor Yellow
$backendPod = kubectl get pods -n automation-factory -l app=automation-factory-backend -o name | Select-Object -First 1
if ($backendPod) {
    kubectl describe $backendPod -n automation-factory | Select-Object -Last 30
}

Write-Host "`nDescribing frontend pod..." -ForegroundColor Yellow
$frontendPod = kubectl get pods -n automation-factory -l app=automation-factory-frontend -o name | Select-Object -First 1
if ($frontendPod) {
    kubectl describe $frontendPod -n automation-factory | Select-Object -Last 30
}
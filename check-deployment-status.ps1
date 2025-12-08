$env:KUBECONFIG = "$PWD\kubeconfig.txt"

Write-Host "Checking deployment status..." -ForegroundColor Yellow
kubectl get pods -n ansible-builder -o wide

Write-Host "`nChecking events..." -ForegroundColor Yellow  
kubectl get events -n ansible-builder --sort-by='.lastTimestamp' | Select-Object -Last 10

Write-Host "`nChecking deployments..." -ForegroundColor Yellow
kubectl get deployments -n ansible-builder

Write-Host "`nDescribing backend pod..." -ForegroundColor Yellow
$backendPod = kubectl get pods -n ansible-builder -l app=ansible-builder-backend -o name | Select-Object -First 1
if ($backendPod) {
    kubectl describe $backendPod -n ansible-builder | Select-Object -Last 30
}

Write-Host "`nDescribing frontend pod..." -ForegroundColor Yellow
$frontendPod = kubectl get pods -n ansible-builder -l app=ansible-builder-frontend -o name | Select-Object -First 1
if ($frontendPod) {
    kubectl describe $frontendPod -n ansible-builder | Select-Object -Last 30
}
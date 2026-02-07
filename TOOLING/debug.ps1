# Debug complet
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== Pods détaillés ===" -ForegroundColor Yellow
kubectl get pods -n automation-factory -o wide

Write-Host "`n=== Describe des pods backend ===" -ForegroundColor Yellow
$backendPods = kubectl get pods -n automation-factory -o name | Where-Object { $_ -like "*backend*" }
foreach ($pod in $backendPods) {
    Write-Host "--- $pod ---" -ForegroundColor Cyan
    kubectl describe $pod -n automation-factory
}

Write-Host "`n=== Events du namespace ===" -ForegroundColor Yellow
kubectl get events -n automation-factory --sort-by=.metadata.creationTimestamp
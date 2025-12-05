# Debug complet
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "=== Pods détaillés ===" -ForegroundColor Yellow
kubectl get pods -n ansible-builder -o wide

Write-Host "`n=== Describe des pods backend ===" -ForegroundColor Yellow
$backendPods = kubectl get pods -n ansible-builder -o name | Where-Object { $_ -like "*backend*" }
foreach ($pod in $backendPods) {
    Write-Host "--- $pod ---" -ForegroundColor Cyan
    kubectl describe $pod -n ansible-builder
}

Write-Host "`n=== Events du namespace ===" -ForegroundColor Yellow
kubectl get events -n ansible-builder --sort-by=.metadata.creationTimestamp
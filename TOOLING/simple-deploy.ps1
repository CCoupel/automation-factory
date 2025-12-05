# Script simple de deploiement
param(
    [string]$BackendVersion = "1.3.8"
)

$ErrorActionPreference = "Stop"

try {
    Write-Host "Deploying Backend v$BackendVersion with SQLite support..." -ForegroundColor Green
    
    $rootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $rootPath

    # Mettre a jour custom-values.yaml
    Write-Host "Updating custom-values.yaml..." -ForegroundColor Yellow
    $content = Get-Content "custom-values.yaml"
    $newContent = @()
    
    foreach ($line in $content) {
        if ($line -match 'tag:\s*".*"') {
            $newLine = $line -replace '".*"', "`"$BackendVersion`""
            $newContent += $newLine
        } else {
            $newContent += $line
        }
    }
    
    Set-Content "custom-values.yaml" $newContent

    # Deployer avec Helm
    Write-Host "Deploying with Helm..." -ForegroundColor Yellow
    helm --kubeconfig=kubeconfig.txt upgrade ansible-builder ./helm/ansible-builder -f custom-values.yaml --namespace ansible-builder --force

    # Redemarrer les pods
    Write-Host "Restarting backend pods..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/ansible-builder-backend -n ansible-builder

    # Attendre
    Write-Host "Waiting for pods..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n ansible-builder --timeout=300s

    Write-Host "Deployment completed!" -ForegroundColor Green
    kubectl --kubeconfig=kubeconfig.txt get pods -n ansible-builder

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
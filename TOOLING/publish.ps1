# Script de publication Ansible Builder pour Windows
# Usage: .\publish.ps1 [version]

param(
    [string]$Version
)

# Configuration
$REGISTRY = "ghcr.io"
$NAMESPACE = "ccoupel"
$GITHUB_USER = "ccoupel"

# Configurer Docker distant
if (Test-Path "github_token.txt") {
    $dockerLine = Get-Content "github_token.txt" | Select-String "docker:"
    if ($dockerLine) {
        $DOCKER_HOST = $dockerLine -replace "docker:\s*", ""
        $env:DOCKER_HOST = "tcp://$DOCKER_HOST`:2375"
        Write-Host "Configuration Docker distant: $env:DOCKER_HOST"
    }
}

# Colors
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Host $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

# Get version
if (-not $Version) {
    Write-ColorOutput Yellow "Version actuelle dans Chart.yaml:"
    Get-Content helm/ansible-builder/Chart.yaml | Select-String "^version:"
    Write-Host ""
    $Version = Read-Host "Nouvelle version"
}

if (-not $Version) {
    Write-ColorOutput Red "Version requise!"
    exit 1
}

Write-ColorOutput Green "Publication de la version $Version"

# Read GitHub token
if (Test-Path "github_token.txt") {
    $tokenLine = Get-Content "github_token.txt" | Select-String "token:"
    $GITHUB_TOKEN = $tokenLine -replace "token:\s*", ""
} else {
    Write-ColorOutput Red "Fichier github_token.txt non trouvé!"
    exit 1
}

# Login to GitHub Container Registry
Write-ColorOutput Yellow "Connexion au registry GitHub..."
$GITHUB_TOKEN | docker login $REGISTRY -u $GITHUB_USER --password-stdin

# Build and push backend
Write-ColorOutput Yellow "Construction de l'image backend..."
docker build -t "$REGISTRY/$NAMESPACE/ansible-builder-backend:$Version" ./backend/
docker tag "$REGISTRY/$NAMESPACE/ansible-builder-backend:$Version" "$REGISTRY/$NAMESPACE/ansible-builder-backend:latest"

Write-ColorOutput Yellow "Push de l'image backend..."
docker push "$REGISTRY/$NAMESPACE/ansible-builder-backend:$Version"
docker push "$REGISTRY/$NAMESPACE/ansible-builder-backend:latest"

# Build and push frontend
Write-ColorOutput Yellow "Construction de l'image frontend..."
docker build -t "$REGISTRY/$NAMESPACE/ansible-builder-frontend:$Version" ./frontend/
docker tag "$REGISTRY/$NAMESPACE/ansible-builder-frontend:$Version" "$REGISTRY/$NAMESPACE/ansible-builder-frontend:latest"

Write-ColorOutput Yellow "Push de l'image frontend..."
docker push "$REGISTRY/$NAMESPACE/ansible-builder-frontend:$Version"
docker push "$REGISTRY/$NAMESPACE/ansible-builder-frontend:latest"

# Update Helm chart version
Write-ColorOutput Yellow "Mise à jour des versions Helm..."

# Update Chart.yaml
$chartContent = Get-Content helm/ansible-builder/Chart.yaml
$chartContent = $chartContent -replace "^version:.*", "version: $Version"
$chartContent = $chartContent -replace "^appVersion:.*", "appVersion: `"$Version`""
$chartContent | Set-Content helm/ansible-builder/Chart.yaml

# Update values.yaml
$valuesContent = Get-Content helm/ansible-builder/values.yaml
$valuesContent = $valuesContent -replace "repository: ansible-builder-backend", "repository: $REGISTRY/$NAMESPACE/ansible-builder-backend"
$valuesContent = $valuesContent -replace "repository: ansible-builder-frontend", "repository: $REGISTRY/$NAMESPACE/ansible-builder-frontend"
$valuesContent = $valuesContent -replace 'tag: ".*"', "tag: `"$Version`""
$valuesContent | Set-Content helm/ansible-builder/values.yaml

# Create packages directory if it doesn't exist
if (-not (Test-Path "helm/packages")) {
    New-Item -ItemType Directory -Path "helm/packages"
}

# Package Helm chart
Write-ColorOutput Yellow "Packaging du chart Helm..."
helm package helm/ansible-builder/ -d helm/packages/

Write-ColorOutput Green "✅ Publication terminée!"
Write-Host ""
Write-Host "Pour déployer:"
Write-Host "  helm upgrade --install ansible-builder ./helm/ansible-builder/ \"
Write-Host "    --namespace ansible-builder \"
Write-Host "    --create-namespace \"
Write-Host "    -f custom-values.yaml"
Write-Host ""
Write-Host "N'oubliez pas de:"
Write-Host "  1. Commiter les changements: git add -A && git commit -m `"chore: bump version to $Version`""
Write-Host "  2. Créer un tag: git tag v$Version"
Write-Host "  3. Pousser les changements: git push && git push --tags"
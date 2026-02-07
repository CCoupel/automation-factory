# Build dev images script
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Building backend image..."
docker build -t automation-factory-backend:dev -f backend/Dockerfile backend/

Write-Host "Building frontend image..."
docker build -t automation-factory-frontend:dev -f frontend/Dockerfile frontend/

Write-Host "Images built successfully!"
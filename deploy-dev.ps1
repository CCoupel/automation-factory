# Deploy dev environment script
$env:DOCKER_HOST = "tcp://192.168.1.217:2375"

Write-Host "Starting Docker Compose with dev images..."
docker-compose up -d

Write-Host "Checking container status..."
docker-compose ps
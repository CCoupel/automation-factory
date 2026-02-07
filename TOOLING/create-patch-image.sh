#!/bin/bash
# Script pour créer une image patch 1.3.8 en utilisant l'image 1.3.7 existante
# et y appliquant les modifications SQLite

echo "🔧 Creating patch image 1.3.8 with SQLite support..."

# Variables
IMAGE_REPO="ghcr.io/ccoupel/automation-factory-backend"
OLD_VERSION="1.3.7"
NEW_VERSION="1.3.8"

# Vérifier si Docker ou Podman est disponible
if command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
else
    echo "❌ Neither Docker nor Podman available"
    exit 1
fi

echo "✅ Using: $CONTAINER_CMD"

# Créer un Dockerfile patch temporaire
cat > Dockerfile.patch << 'EOF'
FROM ghcr.io/ccoupel/automation-factory-backend:1.3.7

# Copier les fichiers modifiés pour SQLite
COPY app/main.py /app/app/main.py
COPY app/api/router.py /app/app/api/router.py

# Assurer que les permissions sont correctes
RUN chmod 644 /app/app/main.py /app/app/api/router.py

EXPOSE 8000

# Command par défaut (pas de changement)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EOF

echo "📦 Building patch image..."
$CONTAINER_CMD build -f Dockerfile.patch -t $IMAGE_REPO:$NEW_VERSION .

if [ $? -eq 0 ]; then
    echo "✅ Image built successfully"
    echo "📤 Pushing image..."
    $CONTAINER_CMD push $IMAGE_REPO:$NEW_VERSION
    
    if [ $? -eq 0 ]; then
        echo "🎉 Image $IMAGE_REPO:$NEW_VERSION pushed successfully!"
        echo "Now you can deploy with: helm upgrade automation-factory ..."
    else
        echo "❌ Failed to push image"
        exit 1
    fi
else
    echo "❌ Failed to build image"
    exit 1
fi

# Nettoyer
rm -f Dockerfile.patch
echo "🧹 Cleanup completed"
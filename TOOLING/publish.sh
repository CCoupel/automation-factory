#!/bin/bash

# Script de publication Ansible Builder
# Usage: ./publish.sh [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="ghcr.io"
NAMESPACE="ccoupel"
GITHUB_USER="ccoupel"

# Get version from argument or prompt
if [ -z "$1" ]; then
    echo -e "${YELLOW}Version actuelle dans Chart.yaml:${NC}"
    grep "^version:" helm/ansible-builder/Chart.yaml
    echo ""
    read -p "Nouvelle version: " VERSION
else
    VERSION=$1
fi

if [ -z "$VERSION" ]; then
    echo -e "${RED}Version requise!${NC}"
    exit 1
fi

echo -e "${GREEN}Publication de la version $VERSION${NC}"

# Read GitHub token
if [ -f "github_token.txt" ]; then
    GITHUB_TOKEN=$(grep "token:" github_token.txt | cut -d' ' -f2)
else
    echo -e "${RED}Fichier github_token.txt non trouvé!${NC}"
    exit 1
fi

# Login to GitHub Container Registry
echo -e "${YELLOW}Connexion au registry GitHub...${NC}"
echo $GITHUB_TOKEN | docker login $REGISTRY -u $GITHUB_USER --password-stdin

# Build and push backend
echo -e "${YELLOW}Construction de l'image backend...${NC}"
docker build -t $REGISTRY/$NAMESPACE/ansible-builder-backend:$VERSION ./backend/
docker tag $REGISTRY/$NAMESPACE/ansible-builder-backend:$VERSION $REGISTRY/$NAMESPACE/ansible-builder-backend:latest

echo -e "${YELLOW}Push de l'image backend...${NC}"
docker push $REGISTRY/$NAMESPACE/ansible-builder-backend:$VERSION
docker push $REGISTRY/$NAMESPACE/ansible-builder-backend:latest

# Build and push frontend
echo -e "${YELLOW}Construction de l'image frontend...${NC}"
docker build -t $REGISTRY/$NAMESPACE/ansible-builder-frontend:$VERSION ./frontend/
docker tag $REGISTRY/$NAMESPACE/ansible-builder-frontend:$VERSION $REGISTRY/$NAMESPACE/ansible-builder-frontend:latest

echo -e "${YELLOW}Push de l'image frontend...${NC}"
docker push $REGISTRY/$NAMESPACE/ansible-builder-frontend:$VERSION
docker push $REGISTRY/$NAMESPACE/ansible-builder-frontend:latest

# Update Helm chart version
echo -e "${YELLOW}Mise à jour des versions Helm...${NC}"

# Update Chart.yaml
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^version:.*/version: $VERSION/" helm/ansible-builder/Chart.yaml
    sed -i '' "s/^appVersion:.*/appVersion: \"$VERSION\"/" helm/ansible-builder/Chart.yaml
else
    # Linux/Windows Git Bash
    sed -i "s/^version:.*/version: $VERSION/" helm/ansible-builder/Chart.yaml
    sed -i "s/^appVersion:.*/appVersion: \"$VERSION\"/" helm/ansible-builder/Chart.yaml
fi

# Update values.yaml
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|repository: ansible-builder-backend|repository: $REGISTRY/$NAMESPACE/ansible-builder-backend|" helm/ansible-builder/values.yaml
    sed -i '' "s|repository: ansible-builder-frontend|repository: $REGISTRY/$NAMESPACE/ansible-builder-frontend|" helm/ansible-builder/values.yaml
    sed -i '' "s/tag: \".*\"/tag: \"$VERSION\"/" helm/ansible-builder/values.yaml
else
    # Linux/Windows Git Bash
    sed -i "s|repository: ansible-builder-backend|repository: $REGISTRY/$NAMESPACE/ansible-builder-backend|" helm/ansible-builder/values.yaml
    sed -i "s|repository: ansible-builder-frontend|repository: $REGISTRY/$NAMESPACE/ansible-builder-frontend|" helm/ansible-builder/values.yaml
    sed -i "s/tag: \".*\"/tag: \"$VERSION\"/" helm/ansible-builder/values.yaml
fi

# Package Helm chart
echo -e "${YELLOW}Packaging du chart Helm...${NC}"
helm package helm/ansible-builder/ -d helm/packages/

echo -e "${GREEN}✅ Publication terminée!${NC}"
echo ""
echo "Pour déployer:"
echo "  helm upgrade --install ansible-builder ./helm/ansible-builder/ \\"
echo "    --namespace ansible-builder \\"
echo "    --create-namespace \\"
echo "    -f custom-values.yaml"
echo ""
echo "N'oubliez pas de:"
echo "  1. Commiter les changements: git add -A && git commit -m \"chore: bump version to $VERSION\""
echo "  2. Créer un tag: git tag v$VERSION"
echo "  3. Pousser les changements: git push && git push --tags"
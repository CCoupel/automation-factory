#!/bin/bash

# Script to package and push Automation Factory Helm Chart to OCI Registry
# Usage: ./package-oci.sh <registry> [version]
#
# Examples:
#   ./package-oci.sh ghcr.io/ccoupel
#   ./package-oci.sh docker.io/myusername 1.1.0
#   ./package-oci.sh registry.gitlab.com/mygroup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CHART_DIR="$REPO_ROOT/helm/automation-factory"

# Check registry argument
if [ -z "$1" ]; then
    echo "Error: Registry URL required"
    echo ""
    echo "Usage: $0 <registry> [version]"
    echo ""
    echo "Examples:"
    echo "  $0 ghcr.io/ccoupel"
    echo "  $0 docker.io/myusername"
    echo "  $0 registry.gitlab.com/mygroup"
    echo ""
    exit 1
fi

REGISTRY="$1"

# Get version from Chart.yaml or command line
if [ -n "$2" ]; then
    VERSION="$2"
else
    VERSION=$(grep '^version:' "$CHART_DIR/Chart.yaml" | awk '{print $2}')
fi

echo "==================================="
echo "Packaging Automation Factory Chart"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "==================================="

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo "Error: helm is not installed"
    echo "Please install helm: https://helm.sh/docs/intro/install/"
    exit 1
fi

# Update dependencies
echo ""
echo "📦 Updating dependencies..."
cd "$CHART_DIR"
helm dependency update

# Package the chart
echo ""
echo "📦 Packaging chart..."
PACKAGE_FILE="automation-factory-${VERSION}.tgz"
helm package . --destination "$SCRIPT_DIR"

# Check if package was created
if [ ! -f "$SCRIPT_DIR/$PACKAGE_FILE" ]; then
    echo "Error: Package file not created"
    exit 1
fi

# Push to OCI registry
echo ""
echo "🚀 Pushing to OCI registry..."
echo "Note: You must be logged in to the registry (helm registry login $REGISTRY)"
echo ""

helm push "$SCRIPT_DIR/$PACKAGE_FILE" "oci://$REGISTRY"

# Display results
echo ""
echo "✅ Chart pushed successfully to OCI registry!"
echo ""
echo "📦 Package: $PACKAGE_FILE"
echo "📍 Location: oci://$REGISTRY/automation-factory:$VERSION"
echo ""
echo "Users can now install with:"
echo "  helm install automation-factory oci://$REGISTRY/automation-factory --version $VERSION"
echo ""
echo "Or to always get the latest:"
echo "  helm install automation-factory oci://$REGISTRY/automation-factory"
echo ""
echo "To update:"
echo "  helm upgrade automation-factory oci://$REGISTRY/automation-factory --version $VERSION"
echo ""

#!/bin/bash

# Script to package Ansible Builder Helm Chart
# Usage: ./package.sh [version]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CHART_DIR="$REPO_ROOT/helm/ansible-builder"
CHARTS_OUTPUT="$SCRIPT_DIR"

# Get version from Chart.yaml or command line
if [ -n "$1" ]; then
    VERSION="$1"
else
    VERSION=$(grep '^version:' "$CHART_DIR/Chart.yaml" | awk '{print $2}')
fi

echo "==================================="
echo "Packaging Ansible Builder Chart"
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
helm package . --destination "$CHARTS_OUTPUT"

# Generate/update repository index
echo ""
echo "📝 Updating repository index..."
helm repo index "$CHARTS_OUTPUT" \
    --url https://bitbucket.org/ccoupel/ansible_builder/raw/master/charts/

# Display results
echo ""
echo "✅ Chart packaged successfully!"
echo ""
echo "Files created:"
ls -lh "$CHARTS_OUTPUT"/*.tgz 2>/dev/null || echo "No .tgz files found"
echo ""
echo "Next steps:"
echo "1. Review the changes:"
echo "   git status"
echo ""
echo "2. Commit and push:"
echo "   git add charts/"
echo "   git commit -m 'chore: update helm chart package to v$VERSION'"
echo "   git push"
echo ""
echo "3. Users can now install with:"
echo "   helm repo add ansible-builder https://bitbucket.org/ccoupel/ansible_builder/raw/master/charts/"
echo "   helm install my-release ansible-builder/ansible-builder"

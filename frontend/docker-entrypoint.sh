#!/bin/sh
set -e

# Restructure filesystem and rewrite paths for custom base path
# This allows the basePath to be configured via Helm values without rebuilding the image

HTML_ROOT="/usr/share/nginx/html"
INDEX_FILE="$HTML_ROOT/index.html"

# Get BASE_PATH from environment variable (default to empty/root path)
BASE_PATH="${BASE_PATH:-}"

echo "🔧 Configuring frontend with BASE_PATH='${BASE_PATH}'"

# If BASE_PATH is set, restructure the filesystem to match the expected URL structure
if [ -n "$BASE_PATH" ]; then
  # Remove leading slash from BASE_PATH if present
  BASE_PATH="${BASE_PATH#/}"
  # Remove trailing slash
  BASE_PATH="${BASE_PATH%/}"

  echo "📁 Restructuring filesystem for base path: /${BASE_PATH}"

  # Create a temporary directory for the restructured content
  TEMP_DIR="/tmp/html_restructured"
  mkdir -p "$TEMP_DIR/$BASE_PATH"

  # Copy all files to the new structure
  echo "   Copying files to /$BASE_PATH/..."
  cp -r "$HTML_ROOT"/* "$TEMP_DIR/$BASE_PATH/"

  # Move the restructured content back
  echo "   Replacing root content..."
  rm -rf "$HTML_ROOT"/*
  mv "$TEMP_DIR"/* "$HTML_ROOT/"
  rm -rf "$TEMP_DIR"

  # Update the INDEX_FILE path
  INDEX_FILE="$HTML_ROOT/$BASE_PATH/index.html"

  echo "✅ Filesystem restructured: files now served from /$BASE_PATH/"
  echo "   • HTML: /$BASE_PATH/index.html"
  echo "   • Assets: /$BASE_PATH/assets/"
  echo "   • Vite: /$BASE_PATH/vite.svg"

  # Update nginx config to use the correct index.html for SPA routing
  echo "⚙️  Updating nginx configuration for SPA routing..."
  NGINX_CONF="/etc/nginx/conf.d/default.conf"
  sed -i "s|try_files \$uri \$uri/ /index.html;|try_files \$uri \$uri/ /${BASE_PATH}/index.html;|g" "$NGINX_CONF"
  echo "   • Fallback: /$BASE_PATH/index.html"
else
  echo "📝 No BASE_PATH configured, using root path /"
fi

echo "🚀 Starting nginx..."

# Start nginx
exec "$@"

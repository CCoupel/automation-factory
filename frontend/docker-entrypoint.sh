#!/bin/sh
set -e

# Create base path directory structure at runtime
# This allows the basePath to be configured via Helm values without rebuilding the image

HTML_ROOT="/usr/share/nginx/html"

# Get BASE_PATH from environment variable (default to empty/root path)
BASE_PATH="${BASE_PATH:-}"

echo "🔧 Configuring frontend with BASE_PATH='${BASE_PATH}'"

# If BASE_PATH is set, copy files to the base path subdirectory
if [ -n "$BASE_PATH" ]; then
  # Remove leading and trailing slashes
  BASE_PATH="${BASE_PATH#/}"
  BASE_PATH="${BASE_PATH%/}"

  echo "📁 Creating base path directory: /${BASE_PATH}"

  # Create the base path directory and copy all files there
  # Don't delete originals - avoids all permission issues
  mkdir -p "$HTML_ROOT/$BASE_PATH"

  echo "   Copying files to /$BASE_PATH/..."
  cp -r "$HTML_ROOT/assets" "$HTML_ROOT/$BASE_PATH/" 2>/dev/null || true
  cp "$HTML_ROOT/index.html" "$HTML_ROOT/$BASE_PATH/" 2>/dev/null || true
  cp "$HTML_ROOT/vite.svg" "$HTML_ROOT/$BASE_PATH/" 2>/dev/null || true
  cp "$HTML_ROOT"/*.html "$HTML_ROOT/$BASE_PATH/" 2>/dev/null || true

  echo "✅ Files copied to /$BASE_PATH/"
  echo "   • HTML: /$BASE_PATH/index.html"
  echo "   • Assets: /$BASE_PATH/assets/"
  echo "   • Vite: /$BASE_PATH/vite.svg"
  echo "   • Using relative paths (no rewriting needed)"

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

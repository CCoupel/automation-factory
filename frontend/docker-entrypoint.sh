#!/bin/sh
set -e

# Create base path directory structure at runtime
# This allows the basePath to be configured via Helm values without rebuilding the image

HTML_ROOT="/usr/share/nginx/html"
NGINX_CONF="/etc/nginx/conf.d/default.conf"

# Get environment variables
BASE_PATH="${BASE_PATH:-}"
ENVIRONMENT="${ENVIRONMENT:-PROD}"

echo "🔧 Configuring frontend with BASE_PATH='${BASE_PATH}' ENVIRONMENT='${ENVIRONMENT}'"

# Adjust version display based on environment (hide RC in PROD)
if [ "$ENVIRONMENT" = "PROD" ]; then
  echo "📦 Production mode: masking RC suffix in version"
  # Remove -rc.X suffix from version in nginx config
  sed -i 's/-rc\.[0-9]*//g' "$NGINX_CONF"
  # Update environment in version endpoint
  sed -i 's/"environment":"development"/"environment":"production"/g' "$NGINX_CONF"
elif [ "$ENVIRONMENT" = "STAGING" ]; then
  sed -i 's/"environment":"development"/"environment":"staging"/g' "$NGINX_CONF"
fi

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
  # Copy all files and directories recursively (assets, html files, svg, etc.)
  cp -r "$HTML_ROOT"/* "$HTML_ROOT/$BASE_PATH/" 2>/dev/null || true

  echo "✅ Files copied to /$BASE_PATH/"
  echo "   • HTML: /$BASE_PATH/index.html"
  echo "   • Assets: /$BASE_PATH/assets/"
  echo "   • Vite: /$BASE_PATH/vite.svg"
  echo "   • Using relative paths (no rewriting needed)"

  # Inject BASE_PATH and API_URL into index.html
  echo "🔧 Injecting BASE_PATH and API_URL into index.html for React Router..."
  sed -i "s|<head>|<head><base href=\"/${BASE_PATH}/\"><script>window.__BASE_PATH__ = '/${BASE_PATH}'; window.__API_URL__ = '/${BASE_PATH}/api';</script>|g" "$HTML_ROOT/$BASE_PATH/index.html"
  # Fix vite.svg path to work with BASE_PATH
  sed -i "s|href=\"./vite.svg\"|href=\"/${BASE_PATH}/vite.svg\"|g" "$HTML_ROOT/$BASE_PATH/index.html"
  echo "   • window.__BASE_PATH__ = '/${BASE_PATH}'"
  echo "   • window.__API_URL__ = '/${BASE_PATH}/api'"
  echo "   • Fixed vite.svg path to /${BASE_PATH}/vite.svg"

  # Update nginx config to use the correct index.html for SPA routing and endpoints
  echo "⚙️  Updating nginx configuration for SPA routing and endpoints..."
  NGINX_CONF="/etc/nginx/conf.d/default.conf"
  sed -i "s|try_files \$uri \$uri/ /index.html;|try_files \$uri \$uri/ /${BASE_PATH}/index.html;|g" "$NGINX_CONF"
  # Also update static assets to look in BASE_PATH
  sed -i "s|try_files \$uri =404;|try_files \$uri /${BASE_PATH}\$uri =404;|g" "$NGINX_CONF"
  
  # Update endpoints to be relative to BASE_PATH
  sed -i "s|location = /health|location = /${BASE_PATH}/health|g" "$NGINX_CONF"
  sed -i "s|location = /version|location = /${BASE_PATH}/version|g" "$NGINX_CONF"
  sed -i "s|location /api|location /${BASE_PATH}/api|g" "$NGINX_CONF"
  sed -i "s|location /ws|location /${BASE_PATH}/ws|g" "$NGINX_CONF"
  # Add rewrite rules to strip BASE_PATH before proxying to backend
  sed -i "s|# __API_REWRITE__ placeholder for BASE_PATH rewrite rule|rewrite ^/${BASE_PATH}/api/(.*) /api/\$1 break;|g" "$NGINX_CONF"
  sed -i "s|# __WS_REWRITE__ placeholder for BASE_PATH rewrite rule|rewrite ^/${BASE_PATH}/ws/(.*) /ws/\$1 break;|g" "$NGINX_CONF"
  
  echo "   • Fallback: /$BASE_PATH/index.html"
  echo "   • Static assets: tries /$BASE_PATH/\$uri fallback"
  echo "   • Health endpoint: /$BASE_PATH/health"
  echo "   • Version endpoint: /$BASE_PATH/version"
  echo "   • API proxy: /$BASE_PATH/api"
  echo "   • WebSocket proxy: /$BASE_PATH/ws"
else
  echo "📝 No BASE_PATH configured, using root path /"
  # Inject empty BASE_PATH and root API_URL into index.html
  echo "🔧 Injecting empty BASE_PATH and API_URL into index.html..."
  sed -i "s|<head>|<head><base href=\"/\"><script>window.__BASE_PATH__ = ''; window.__API_URL__ = '/api';</script>|g" "$HTML_ROOT/index.html"
  echo "   • window.__BASE_PATH__ = ''"
  echo "   • window.__API_URL__ = '/api'"
fi

echo "🚀 Starting nginx..."

# Start nginx
exec "$@"

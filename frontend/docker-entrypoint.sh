#!/bin/sh
set -e

# Inject base path into index.html at runtime
# This allows the basePath to be configured via Helm values without rebuilding the image

INDEX_FILE="/usr/share/nginx/html/index.html"

# Get BASE_PATH from environment variable (default to empty/root path)
BASE_PATH="${BASE_PATH:-}"

echo "🔧 Configuring frontend with BASE_PATH='${BASE_PATH}'"

# If BASE_PATH is set, inject <base href> tag into index.html
if [ -n "$BASE_PATH" ]; then
  # Ensure BASE_PATH ends with /
  case "$BASE_PATH" in
    */) ;;
    *) BASE_PATH="${BASE_PATH}/" ;;
  esac

  echo "📝 Injecting <base href=\"${BASE_PATH}\"> into index.html"

  # Use sed to inject <base> tag after <head>
  sed -i "s|<head>|<head>\n    <base href=\"${BASE_PATH}\">|" "$INDEX_FILE"
else
  echo "📝 No BASE_PATH configured, using root path /"
fi

echo "✅ Configuration complete, starting nginx..."

# Start nginx
exec "$@"

#!/bin/sh
set -e

# Rewrite asset paths in index.html at runtime
# This allows the basePath to be configured via Helm values without rebuilding the image

INDEX_FILE="/usr/share/nginx/html/index.html"

# Get BASE_PATH from environment variable (default to empty/root path)
BASE_PATH="${BASE_PATH:-}"

echo "🔧 Configuring frontend with BASE_PATH='${BASE_PATH}'"

# If BASE_PATH is set, rewrite all absolute paths in index.html
if [ -n "$BASE_PATH" ]; then
  # Remove trailing slash from BASE_PATH if present (we'll add it back in patterns)
  BASE_PATH="${BASE_PATH%/}"

  echo "📝 Rewriting asset paths in index.html:"
  echo "   /assets/ → ${BASE_PATH}/assets/"
  echo "   /vite.svg → ${BASE_PATH}/vite.svg"

  # Rewrite all absolute paths to include BASE_PATH
  # 1. Rewrite /assets/ paths (JS and CSS)
  sed -i "s|src=\"/assets/|src=\"${BASE_PATH}/assets/|g" "$INDEX_FILE"
  sed -i "s|href=\"/assets/|href=\"${BASE_PATH}/assets/|g" "$INDEX_FILE"

  # 2. Rewrite /vite.svg and other root-level assets
  sed -i "s|href=\"/vite.svg\"|href=\"${BASE_PATH}/vite.svg\"|g" "$INDEX_FILE"

  # 3. Inject <base> tag for good measure (helps with other relative paths)
  sed -i "s|<head>|<head>\n    <base href=\"${BASE_PATH}/\">|" "$INDEX_FILE"

  echo "✅ Path rewriting complete"
else
  echo "📝 No BASE_PATH configured, using root path /"
fi

echo "🚀 Starting nginx..."

# Start nginx
exec "$@"

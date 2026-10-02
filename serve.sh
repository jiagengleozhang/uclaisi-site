#!/bin/sh
# Serve the site locally at http://localhost:${1:-8000}
cd "$(dirname "$0")"
echo "Serving at http://localhost:${1:-8000}  (Ctrl+C to stop)"
python3 -m http.server "${1:-8000}"

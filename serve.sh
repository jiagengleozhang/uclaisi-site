#!/bin/sh
# Serve the site locally at http://localhost:${1:-8000}
# Caching is turned off so a normal refresh always shows your latest edits.
cd "$(dirname "$0")"
python3 sync_luma.py || true  # refresh events from Luma; keeps the last snapshot if offline
echo "Serving at http://localhost:${1:-8000}  (Ctrl+C to stop)"
python3 - "${1:-8000}" <<'EOF'
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

ThreadingHTTPServer(("", int(sys.argv[1])), NoCache).serve_forever()
EOF

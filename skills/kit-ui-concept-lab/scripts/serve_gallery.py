#!/usr/bin/env python3
"""
Static file server for the wireframe gallery, plus one write endpoint.

Serves <screens-dir> like `python3 -m http.server` would, and additionally accepts
    POST /__customizations__
with a JSON body, which it writes atomically to <screens-dir>/customizations.json.

That file is how the gallery's Customization Panel persists the user's live tweaks
(per variant file), and how Claude reads them back: when the user asks for a change
to a variant ("now apply my customizations to 1b"), Claude reads customizations.json,
folds the recorded values into the variant's HTML, and clears that variant's entry.

Usage:
    python3 serve_gallery.py <path-to-screens-dir> [port]     # default port 4321
"""
import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from build_gallery import validate_gallery


def main():
    if len(sys.argv) < 2:
        print("Usage: serve_gallery.py <path-to-screens-dir> [port]", file=sys.stderr)
        sys.exit(1)
    screens_dir = Path(sys.argv[1]).resolve()
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 4321
    customizations_path = screens_dir / "customizations.json"
    gallery_json = screens_dir / "gallery.json"

    if gallery_json.exists():
        try:
            data = json.loads(gallery_json.read_text())
        except json.JSONDecodeError as e:
            print(f"Invalid gallery.json: {e}", file=sys.stderr)
            sys.exit(1)
        errors = validate_gallery(data, screens_dir)
        if errors:
            print(f"Invalid {gallery_json}; refusing to serve gallery:", file=sys.stderr)
            for error in errors:
                print(f"  - {error}", file=sys.stderr)
            sys.exit(1)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(screens_dir), **kwargs)

        def do_POST(self):
            if self.path != "/__customizations__":
                self.send_error(404)
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(length))
                tmp = customizations_path.with_suffix(".tmp")
                tmp.write_text(json.dumps(data, indent=2))
                tmp.replace(customizations_path)
                self.send_response(204)
                self.end_headers()
            except Exception as e:  # malformed body → client error, keep serving
                self.send_error(400, str(e))

        def log_message(self, *args):
            pass  # quiet

    server = ThreadingHTTPServer(("", port), Handler)
    print(f"Serving {screens_dir} on http://localhost:{port}/ (POST /__customizations__ -> customizations.json)")
    server.serve_forever()


if __name__ == "__main__":
    main()

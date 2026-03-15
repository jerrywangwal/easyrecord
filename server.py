#!/usr/bin/env python3
"""
Local dev server with COOP/COEP headers required by ffmpeg.wasm (SharedArrayBuffer).
Usage: python3 server.py [port]
"""
import sys
import http.server
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

class COEPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # suppress noisy logs

os.chdir(os.path.dirname(os.path.abspath(__file__)))
httpd = http.server.HTTPServer(('localhost', PORT), COEPHandler)
print(f'Server running at http://localhost:{PORT}/')
httpd.serve_forever()

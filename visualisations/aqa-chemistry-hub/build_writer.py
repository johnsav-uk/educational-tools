"""Build-time helper: receives compiled JS from build.html and writes app.js.

There is no node on this machine, so Babel runs in the browser instead. This
tiny server is the missing half of that: it accepts the compiled output over
POST and saves it next to build.py. Run it only while rebuilding app.js.

    python build_writer.py      # listens on 127.0.0.1:8766
"""
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'app.js')


class Writer(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(OUT, 'wb') as fh:
            fh.write(body)
        print(f'wrote {OUT} ({len(body):,} bytes)')
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print('build writer on http://127.0.0.1:8766 — POST compiled JS to save app.js')
    HTTPServer(('127.0.0.1', 8766), Writer).serve_forever()

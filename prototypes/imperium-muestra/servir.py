"""Servidor local sin caché para el visor: http://localhost:4410"""
import http.server, socketserver, os, sys

import json


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/manifiesto.json"):
            datos = {f: int(os.path.getmtime(f) * 1000) for f in os.listdir(".") if f.lower().endswith((".png", ".gif", ".html"))}
            cuerpo = json.dumps(datos).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()
    def log_message(self, *a):
        pass

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "vista"))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 4410), H) as srv:
    srv.serve_forever()

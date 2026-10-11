import http.server
import socketserver
import os
import json
import socket
import urllib.request
import time

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
API_KEY = "aQyU5wcxIqqcBmavCzw-1CAy3fwDaXAa"
FILE_URL = "https://1fichier.com/?33roqchktzbadvihymsv"

cached_token_url = "https://a-1.1fichier.com/p2214933824"
last_token_fetch = time.time()

def refresh_1fichier_token():
    global cached_token_url, last_token_fetch
    try:
        data = json.dumps({"url": FILE_URL}).encode('utf-8')
        req = urllib.request.Request(
            "https://api.1fichier.com/v1/download/get_token.cgi",
            data=data,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            if res_json.get("status") == "OK" and "url" in res_json:
                cached_token_url = res_json["url"]
                last_token_fetch = time.time()
                print(f"[1fichier] Link direto renovado com sucesso: {cached_token_url}")
                # Atualiza os arquivos manifest.json fisicos
                update_manifest_files(cached_token_url)
    except Exception as e:
        print(f"[1fichier] Aviso ao renovar token (mantendo cache): {e}")

def update_manifest_files(url):
    manifest_data = {
        "originalFileSize": 15739387904,
        "packageDigest": "3B878F5A856F4F5CAFE1D91C557F282E14766368B336C68F9B697F402F48D08F",
        "numberOfSplitFiles": 1,
        "pieces": [
            {
                "url": url,
                "fileOffset": 0,
                "fileSize": 15739387904,
                "hashValue": "0000000000000000000000000000000000000000"
            }
        ]
    }
    for target in [os.path.join(DIRECTORY, "manifest.json"), os.path.join(DIRECTORY, "instalar", "manifest.json")]:
        try:
            with open(target, "w", encoding="utf-8") as f:
                json.dump(manifest_data, f, indent=2)
        except Exception:
            pass

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        global last_token_fetch, cached_token_url
        clean_path = self.path.split('?')[0]
        if clean_path in ['/manifest.json', '/instalar/manifest.json']:
            if time.time() - last_token_fetch > 3600:
                refresh_1fichier_token()
            manifest_data = {
                "originalFileSize": 15739387904,
                "packageDigest": "3B878F5A856F4F5CAFE1D91C557F282E14766368B336C68F9B697F402F48D08F",
                "numberOfSplitFiles": 1,
                "pieces": [
                    {
                        "url": cached_token_url,
                        "fileOffset": 0,
                        "fileSize": 15739387904,
                        "hashValue": "0000000000000000000000000000000000000000"
                    }
                ]
            }
            body = json.dumps(manifest_data, indent=2).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

def get_local_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if ':' not in ip and not ip.startswith('127.'):
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass
    return ips

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("====================================================")
        print(f" Servidor do Instalador PS4 ativo na porta {PORT}")
        print("====================================================")
        print("Para instalar no PS4, abra o Navegador do console e digite:")
        ips = get_local_ips()
        if ips:
            for ip in ips:
                print(f"  -> http://{ip}:{PORT}/")
        else:
            print(f"  -> http://localhost:{PORT}/")
        print(f"\nLink direto 1fichier: {cached_token_url}")
        print("Pressione Ctrl+C para encerrar.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

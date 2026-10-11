const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const DIRECTORY = __dirname;
const API_KEY = "aQyU5wcxIqqcBmavCzw-1CAy3fwDaXAa";
const FILE_URL = "https://1fichier.com/?33roqchktzbadvihymsv";

let cachedTokenUrl = "https://a-1.1fichier.com/p2214933824";
let lastTokenFetch = Date.now();

// Renova o link direto do 1fichier usando a API oficial
function refreshToken() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ url: FILE_URL });
    const req = https.request('https://api.1fichier.com/v1/download/get_token.cgi', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.url) {
            cachedTokenUrl = json.url;
            lastTokenFetch = Date.now();
            console.log(`[1fichier] Link direto atualizado via API: ${cachedTokenUrl}`);
            updateLocalManifestFile(cachedTokenUrl);
          }
        } catch (e) {}
        resolve(cachedTokenUrl);
      });
    });
    req.on('error', () => resolve(cachedTokenUrl));
    req.on('timeout', () => { req.destroy(); resolve(cachedTokenUrl); });
    req.write(postData);
    req.end();
  });
}

function updateLocalManifestFile(url) {
  const manifestData = {
    originalFileSize: 15739387904,
    packageDigest: "3B878F5A856F4F5CAFE1D91C557F282E14766368B336C68F9B697F402F48D08F",
    numberOfSplitFiles: 1,
    pieces: [
      {
        url: url,
        fileOffset: 0,
        fileSize: 15739387904,
        hashValue: "0000000000000000000000000000000000000000"
      }
    ]
  };
  try {
    fs.writeFileSync(path.join(DIRECTORY, 'manifest.json'), JSON.stringify(manifestData, null, 2));
    const sub = path.join(DIRECTORY, 'instalar');
    if (fs.existsSync(sub)) {
      fs.writeFileSync(path.join(sub, 'manifest.json'), JSON.stringify(manifestData, null, 2));
    }
  } catch (e) {}
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/instalar' || reqPath === '/instalar/') reqPath = '/instalar/index.html';

  // Endpoint do Manifesto com auto-renovação de token se tiver mais de 1h
  if (reqPath.endsWith('manifest.json')) {
    if (Date.now() - lastTokenFetch > 3600000) {
      await refreshToken();
    }
    const manifestJson = {
      originalFileSize: 15739387904,
      packageDigest: "3B878F5A856F4F5CAFE1D91C557F282E14766368B336C68F9B697F402F48D08F",
      numberOfSplitFiles: 1,
      pieces: [
        {
          url: cachedTokenUrl,
          fileOffset: 0,
          fileSize: 15739387904,
          hashValue: "0000000000000000000000000000000000000000"
        }
      ]
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(manifestJson, null, 2));
    return;
  }

  const filePath = path.join(DIRECTORY, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Servidor do Instalador PS4 ativo na porta ${PORT}`);
  console.log(`====================================================`);
  console.log(`Para instalar no PS4, abra o Navegador do console e digite:`);
  
  const ifaces = os.networkInterfaces();
  let found = false;
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  -> http://${net.address}:${PORT}/`);
        found = true;
      }
    }
  }
  if (!found) {
    console.log(`  -> http://localhost:${PORT}/`);
  }
  console.log(`\nLink direto 1fichier atual: ${cachedTokenUrl}`);
  console.log(`Pressione Ctrl+C para encerrar.`);
});

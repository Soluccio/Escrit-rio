#!/usr/bin/env node
/**
 * server.mjs — servidor de preview ZERO dependencia (node:http).
 * Serve o repo com o MIME correto para ES Modules (senao o navegador recusa
 * importar .js) e faz o fallback para o index.html.
 *
 *   node tools/server.mjs [porta] [--host 0.0.0.0]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const PORT = Number(args.find(a => /^\d+$/.test(a)) || process.env.PORT || 5173);
const HOST = (() => {
  const i = args.indexOf('--host');
  return i >= 0 ? args[i + 1] : '0.0.0.0';
})();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  // impede sair da raiz do repo
  const full = path.normalize(path.join(ROOT, pathname));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end('403');
    return;
  }
  fs.stat(full, (err, stat) => {
    if (err || stat.isDirectory()) {
      // fallback: index.html (SPA de 1 pagina)
      const index = path.join(ROOT, 'index.html');
      fs.readFile(index, (e2, data) => {
        if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
        res.writeHead(200, {
          'Content-Type': MIME['.html'],
          'Cache-Control': 'no-store',
        }).end(data);
      });
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      // libera o preview em iframe de outros hosts
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(full).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Pilha de Papel — preview em http://localhost:${PORT}`);
  console.log(`servindo ${ROOT}`);
  console.log('ctrl+c para parar');
});

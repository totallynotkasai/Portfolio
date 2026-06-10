// Zero-dependency static file server for local preview of the portfolio.
// Serves the Portfolio root (the parent of this .claude/ folder) regardless of CWD.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // .claude/ -> Portfolio/
const PORT = Number(process.env.PORT) || 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    // Prevent path traversal: normalize and keep inside ROOT.
    const safe = normalize(rel).replace(/^([/\\])+/, '');
    let filePath = join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let info;
    try {
      info = await stat(filePath);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
        .end('<h1>404</h1>');
      return;
    }
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }).end(body);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(PORT, () => {
  console.log(`Portfolio dev server running at http://localhost:${PORT}/  (root: ${ROOT})`);
});

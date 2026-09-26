// Zero-config local preview of the portfolio that routes URLs the way Vercel
// does (see vercel.json), so what works here works live:
//   /                       -> about.html
//   /about                  -> about.html        (cleanUrls)
//   /about.html, /about/    -> 308 to /about     (cleanUrls, trailingSlash: false)
//   anything missing        -> 404.html with a 404 status
// /generated/* (WebP copies + the art list) is built on the fly by the same
// code Vercel runs, into dist/generated/.
//
//   node .claude/devserver.mjs          serve the source files (normal use)
//   node .claude/devserver.mjs --dist   serve dist/ exactly as deployed
//                                        (run `npm run build` first)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, sep } from 'node:path';

const PROJECT = dirname(dirname(fileURLToPath(import.meta.url))); // .claude/ -> Portfolio/
const SERVE_DIST = process.argv.includes('--dist');
const ROOT = SERVE_DIST ? join(PROJECT, 'dist') : PROJECT;
const GEN_DIR = join(PROJECT, 'dist', 'generated');
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

// Rebuild the art list / WebP copies when a page asks for them, so a file
// dropped into assets/art shows up on the next refresh. Only new or changed
// images are converted, so this is quick after the first run.
let build = null;
let generating = null;
async function regenerate() {
  if (SERVE_DIST) return;
  try {
    build = build || (await import('../build/build.mjs'));
  } catch (err) {
    console.warn('Could not load the build step (run `npm install`?) — serving without WebP copies.\n ', err.message);
    return;
  }
  generating = generating || (async () => {
    const { errors, warnings } = await build.checkContent(PROJECT);
    [...errors, ...warnings].forEach((m) => console.warn('  ⚠ ' + m));
    await build.generate({ root: PROJECT, outDir: GEN_DIR, log: () => {} });
  })().finally(() => { generating = null; });
  await generating;
}

// Send the same headers vercel.json does (security headers, so a Content
// Security Policy problem shows up here first). Caching stays off locally.
let headerRules = [];
try {
  headerRules = JSON.parse(await readFile(join(PROJECT, 'vercel.json'), 'utf8')).headers || [];
} catch { /* no vercel.json — no extra headers */ }
const vercelHeaders = (path) => {
  const out = {};
  for (const rule of headerRules) {
    if (!new RegExp('^' + rule.source + '$').test(path)) continue;
    for (const h of rule.headers) if (h.key.toLowerCase() !== 'cache-control') out[h.key] = h.value;
  }
  return out;
};

const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

// Resolve a URL path inside `base`, refusing anything that escapes it.
const inside = (base, rel) => {
  const p = join(base, normalize(rel).replace(/^([/\\])+/, ''));
  return p === base || p.startsWith(base + sep) ? p : null;
};

async function send(res, status, filePath, urlPath) {
  const body = await readFile(filePath);
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(status, { ...vercelHeaders(urlPath), 'content-type': type, 'cache-control': 'no-store' }).end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);

    // cleanUrls + trailingSlash:false redirects
    let clean = null;
    if (/\.html$/i.test(path)) clean = path.replace(/\.html$/i, '') || '/';
    else if (path.length > 1 && path.endsWith('/')) clean = path.replace(/\/+$/, '');
    if (clean !== null) {
      res.writeHead(308, { location: encodeURI(clean) + url.search }).end();
      return;
    }

    if (path.startsWith('/generated/') && !SERVE_DIST) {
      if (path === '/generated/manifest.js') await regenerate();
      const file = inside(GEN_DIR, path.slice('/generated/'.length));
      if (file && (await isFile(file))) return send(res, 200, file, path);
    } else {
      const rel = path === '/' ? '/about' : path;
      const file = inside(ROOT, rel);
      if (file && (await isFile(file))) return send(res, 200, file, path);
      if (file && !extname(rel) && (await isFile(file + '.html'))) return send(res, 200, file + '.html', path);
    }

    const notFound = join(ROOT, '404.html');
    if (await isFile(notFound)) return send(res, 404, notFound, path);
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(String(err));
  }
});

server.listen(PORT, () => {
  console.log(`Portfolio preview at http://localhost:${PORT}/  (serving ${SERVE_DIST ? 'dist/' : 'source files'})`);
});

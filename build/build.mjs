/* ════════════════════════════════════════════════════════════════════════
   BUILD STEP — Vercel runs this (`npm run build`) on every push to main.
   ════════════════════════════════════════════════════════════════════════
   The site itself stays hand-written vanilla HTML/CSS/JS. This only:
     1. Checks content.js and script.js. A typo fails the build, and Vercel
        then keeps the previous version of the site live.
     2. Makes small WebP copies of every image in IMAGE_SETS (plus a large
        one for the lightbox) and records their sizes, so pages download
        only what they show and don't jump about while images load.
     3. Lists every artwork in assets/art, so dropping a file in there puts
        it on the site. A subfolder name becomes its tag (assets/art/Poster/).
   Output: dist/ — the deployed site — with everything new in dist/generated/.
   The local preview server (.claude/devserver.mjs) reuses generate() below.
   ════════════════════════════════════════════════════════════════════════ */

import { readFile, writeFile, mkdir, readdir, stat, rm, cp, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const DIST = join(ROOT, 'dist');
const GEN_URL = '/generated/';

// Which folders get WebP copies. `web` is the max width shown on the page
// (about 2x its on-screen size); `large` is the longest edge in the lightbox.
const IMAGE_SETS = [
  { dir: 'assets/art', web: 800, large: 2000 },
  { dir: 'assets/certs', web: 480, large: 2000 },
  { dir: 'assets/photos', web: 800 },
  { dir: 'assets/Wizard Sprite', web: 240 },
];
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const WEBP = { quality: 82, effort: 5 };
// Bump when the settings above change, so every copy is remade.
const VERSION = 'v1';

// What gets deployed (everything else — build/, node_modules, .claude — doesn't).
const SITE_DIRS = ['assets', 'fonts'];
const SITE_FILE = /\.(html|css|js|txt|xml)$/i;   // pages, code, robots.txt, sitemap.xml

const exists = (p) => stat(p).then(() => true, () => false);
const toPosix = (p) => p.split('\\').join('/');

async function listImages(root, dir) {
  const out = [];
  const walk = async (rel) => {
    let entries;
    try { entries = await readdir(join(root, rel), { withFileTypes: true }); }
    catch { return; } // folder doesn't exist (e.g. no certs yet)
    for (const e of entries) {
      const child = rel + '/' + e.name;
      if (e.isDirectory()) await walk(child);
      else if (IMAGE_EXT.test(e.name)) out.push(child);
    }
  };
  await walk(dir);
  return out.sort();
}

// "assets/art/Poster/Too Bad.png" -> "art-poster-too-bad"
const slug = (rel) =>
  rel.replace(/^assets\//, '').replace(IMAGE_EXT, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "Too_Bad-final.png" -> "Too Bad final"
const titleFrom = (file) =>
  file.replace(IMAGE_EXT, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

// When each artwork was first committed, newest first on the site. Files
// that aren't committed yet count as brand new (their modified time).
// Renames count as new adds, so moving a piece between folders re-dates it.
// Without git (or with a shallow clone) older files simply tie, and ties
// fall back to alphabetical order.
function commitDates(root) {
  const dates = {};
  try {
    const log = execFileSync('git',
      ['log', '--no-renames', '--diff-filter=A', '--format=%x00%ct', '--name-only', '--', 'assets/art'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const chunk of log.split('\0').slice(1)) {
      const [time, ...files] = chunk.trim().split('\n');
      // git log runs newest -> oldest, so the last write is the first add.
      for (const f of files) if (f) dates[f.trim()] = Number(time);
    }
  } catch { /* no git — every file falls back to its modified time */ }
  return dates;
}

/* ---------- 1. Check content.js / script.js ---------- */
export async function checkContent(root = ROOT) {
  const errors = [];
  const warnings = [];
  const firstLines = (e) => String(e && e.stack || e).split('\n').slice(0, 5).join('\n    ');

  for (const file of ['content.js', 'script.js']) {
    try { new vm.Script(await readFile(join(root, file), 'utf8'), { filename: file }); }
    catch (e) { errors.push(`${file} has a syntax error:\n    ${firstLines(e)}`); }
  }
  if (errors.length) return { errors, warnings };

  // Run content.js the way a browser would and check it made window.CONTENT.
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(await readFile(join(root, 'content.js'), 'utf8'), sandbox, { filename: 'content.js' });
  } catch (e) {
    errors.push(`content.js failed to run:\n    ${firstLines(e)}`);
    return { errors, warnings };
  }
  const C = sandbox.window.CONTENT;
  if (!C || typeof C !== 'object') {
    errors.push('content.js ran but did not set window.CONTENT');
    return { errors, warnings };
  }

  // Every "assets/..." path mentioned in content.js should exist. Missing
  // ones only warn: the site shows a placeholder graphic in their place.
  const paths = [];
  const collect = (v) => {
    if (typeof v === 'string') { if (/^\/?assets\//.test(v)) paths.push(v.replace(/^\/+/, '')); }
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(C);
  for (const p of paths) {
    if (!(await exists(join(root, p)))) warnings.push(`content.js mentions a file that doesn't exist: ${p}`);
  }
  return { errors, warnings };
}

/* ---------- 2 + 3. WebP copies and the art list ---------- */
let sharpLib;
export async function generate({ root = ROOT, outDir = join(DIST, 'generated'), log = console.log } = {}) {
  sharpLib = sharpLib || (await import('sharp')).default;
  const sharp = sharpLib;
  await mkdir(outDir, { recursive: true });

  const keep = new Set(['manifest.js']);
  let made = 0;
  const makeWebp = async (input, name, resize) => {
    keep.add(name);
    const out = join(outDir, name);
    if (!(await exists(out))) {
      await sharp(input).rotate().resize(resize).webp(WEBP).toFile(out);
      made++;
    }
    const { width, height } = await sharp(out).metadata();
    return { url: GEN_URL + name, width, height };
  };

  const images = {};
  for (const set of IMAGE_SETS) {
    for (const rel of await listImages(root, set.dir)) {
      const buf = await readFile(join(root, rel));
      // The content hash in the name means a changed image gets a new URL,
      // so browsers can cache these forever.
      const hash = createHash('sha1').update(buf).update(VERSION).digest('hex').slice(0, 8);
      const base = `${slug(rel)}-${hash}`;
      const web = await makeWebp(buf, `${base}-w${set.web}.webp`,
        { width: set.web, withoutEnlargement: true });
      const info = { web: web.url, w: web.width, h: web.height };
      if (set.large) {
        const large = await makeWebp(buf, `${base}-l${set.large}.webp`,
          { width: set.large, height: set.large, fit: 'inside', withoutEnlargement: true });
        info.large = large.url;
      }
      images[rel] = info;
    }
  }

  const dates = commitDates(root);
  const art = [];
  for (const rel of await listImages(root, 'assets/art')) {
    const parts = rel.split('/');                 // assets / art / [Tag /] file
    const added = dates[rel] || Math.floor((await stat(join(root, rel))).mtimeMs / 1000);
    art.push({ img: rel, title: titleFrom(parts[parts.length - 1]), tag: parts.length > 3 ? parts[2] : '', added });
  }
  art.sort((a, b) => b.added - a.added || a.title.localeCompare(b.title));

  await writeFile(join(outDir, 'manifest.js'),
    '/* Made by build/build.mjs on every deploy. Do not edit: change content.js\n' +
    '   or the files in assets/ instead. */\n' +
    'window.GENERATED = ' + JSON.stringify({ images, art }, null, 1) + ';\n');

  // Tidy up copies of images that were changed or removed.
  for (const f of await readdir(outDir)) {
    if (!keep.has(f)) await unlink(join(outDir, f));
  }
  log(`  images: ${Object.keys(images).length} (${made} new WebP files), artworks: ${art.length}`);
  return { images, art };
}

/* ---------- Full build (what Vercel runs) ---------- */
async function build() {
  const t0 = Date.now();
  console.log('Checking content.js…');
  const { errors, warnings } = await checkContent(ROOT);
  warnings.forEach((w) => console.warn('  ⚠ ' + w));
  if (errors.length) {
    errors.forEach((e) => console.error('  ✖ ' + e));
    console.error('\nBuild stopped, so the live site is unchanged. Fix the problem above and push again.');
    process.exit(1);
  }

  console.log('Copying site files…');
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  for (const f of await readdir(ROOT)) {
    if (SITE_FILE.test(f)) await cp(join(ROOT, f), join(DIST, f));
  }
  for (const d of SITE_DIRS) await cp(join(ROOT, d), join(DIST, d), { recursive: true });

  console.log('Making WebP copies and the art list…');
  await generate({ root: ROOT, outDir: join(DIST, 'generated') });
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s → dist/`);
}

if (toPosix(process.argv[1] || '') === toPosix(fileURLToPath(import.meta.url))) {
  build().catch((e) => { console.error(e); process.exit(1); });
}

/* ════════════════════════════════════════════════════════════════════════
   BUILD STEP - Vercel runs this (`npm run build`) on every push to main.
   ════════════════════════════════════════════════════════════════════════
   The site itself stays hand-written vanilla HTML/CSS/JS. This only:
     1. Checks content.js and every script file. A typo fails the build, and
        Vercel then keeps the previous version of the site live.
     2. Makes small WebP copies of every image in IMAGE_SETS (plus a large
        one for the image viewer and big windows) and records their sizes,
        so the page downloads only what it shows and doesn't jump about
        while loading.
     3. Lists every artwork in assets/art, so dropping a file in there puts
        it on the site. A subfolder name becomes its tag (assets/art/Poster/).
        It also picks each artwork's two most visible colours for its frame.
     4. Stamps a version onto the page's CSS and JS links (and onto the
        game's script, which loads later), so a returning visitor never
        gets new HTML with yesterday's cached code.
   Output: dist/ - the deployed site - with everything new in dist/generated/.
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
// (about 2x its on-screen size); `large` is the longest edge of the big copy,
// or the original's own size if that's smaller. The page offers both, and
// the browser fetches the big one only when a picture is drawn too wide for
// the small one (a big window, the image viewer, a high-density screen).
const IMAGE_SETS = [
  { dir: 'assets/art', web: 800, large: 4000, thumb: 400, card: 200 }, // every artwork whole (the biggest is 3200x4000); thumb: a card in the binder; card: a playing card in Spell Solitaire
  { dir: 'assets/art-process', web: 800, large: 4000, thumb: 400 }, // reverse-side thumbnails and viewer copies; never gallery/card art
  { dir: 'assets/certs', web: 480, large: 2000 },
  { dir: 'assets/photos', web: 480 },                 // About's me.png (about 220px wide) and the Start menu's circle
  { dir: 'assets/projects', web: 640, large: 2560 },   // a maximised project window
  { dir: 'assets/Wizard Sprite', web: 240 },
  { dir: 'assets/Games', web: 240 },                   // the games' drawings (Not Rubbish's gremlins)
  { dir: 'assets/recycle', web: 480, large: 2880 },   // retired designs in the Trash
];
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const WEBP = { quality: 82, effort: 5 };
// Bump when the settings above change, so every copy is remade.
const VERSION = 'v1';

// What gets deployed (everything else - build/, node_modules, .claude - doesn't).
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
  } catch { /* no git - every file falls back to its modified time */ }
  return dates;
}

// An artwork's two most visible colours: its spell card in the Art window
// takes its frame from the first and its category strip from the second
// (the image viewer shows both too). The pixels of a small copy are
// grouped into colour clusters (k-means, seeded from the busiest colour
// bins so it gives the same answer every build). Each cluster scores by how
// much of the picture it covers, nudged towards vivid colours so a plain
// white or grey background doesn't always win. The chip takes the best
// cluster that differs clearly from the frame.
const colourCache = new Map();
async function artColours(sharp, file) {
  const { data } = await sharp(file).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) px.push([data[i], data[i + 1], data[i + 2]]);   // skip see-through pixels
  }
  if (!px.length) return null;

  const bins = new Map();
  for (const p of px) {
    const k = (p[0] >> 6) * 16 + (p[1] >> 6) * 4 + (p[2] >> 6);
    const b = bins.get(k) || { n: 0, sum: [0, 0, 0] };
    b.n++; p.forEach((v, i) => { b.sum[i] += v; });
    bins.set(k, b);
  }
  let centres = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 8)
    .map((b) => b.sum.map((v) => v / b.n));
  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let counts = [];
  for (let round = 0; round < 8; round++) {
    const sums = centres.map(() => [0, 0, 0]);
    counts = centres.map(() => 0);
    for (const p of px) {
      let best = 0;
      centres.forEach((c, i) => { if (dist2(p, c) < dist2(p, centres[best])) best = i; });
      counts[best]++; p.forEach((v, i) => { sums[best][i] += v; });
    }
    centres = centres.map((c, i) => (counts[i] ? sums[i].map((v) => v / counts[i]) : c));
  }

  const vivid = (c) => (Math.max(...c) - Math.min(...c)) / 255;
  const ranked = centres
    .map((c, i) => ({ c, score: (counts[i] / px.length) * (0.5 + vivid(c)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  const frame = ranked[0].c;
  const chip = (ranked.find((r) => dist2(r.c, frame) > 90 ** 2) || ranked[1] || ranked[0]).c;
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  return [hex(frame), hex(chip)];
}

/* ---------- 1. Check content.js and the scripts ---------- */
export async function checkContent(root = ROOT) {
  const errors = [];
  const warnings = [];
  const firstLines = (e) => String(e && e.stack || e).split('\n').slice(0, 5).join('\n    ');

  // Every .js file at the top level is deployed, so every one is checked.
  const scripts = (await readdir(root)).filter((f) => /\.js$/i.test(f)).sort();
  for (const file of scripts) {
    try { new vm.Script(await readFile(join(root, file), 'utf8'), { filename: file }); }
    catch (e) { errors.push(`${file} has a syntax error:\n    ${firstLines(e)}`); }
  }
  if (errors.length) return { errors, warnings };

  // House style: no long dashes in the site's words.
  (await readFile(join(root, 'content.js'), 'utf8')).split('\n').forEach((line, i) => {
    if (line.includes('\u2014')) warnings.push(`content.js line ${i + 1} has a long dash; use " - " or reword`);
  });

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

  // Authored art backs are optional, but a typo here should name the exact
  // piece and field rather than silently dropping a note or broken image.
  errors.push(...await checkArtDetails(C.art, root));

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

export async function checkArtDetails(art, root = ROOT) {
  const errors = [];
  const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (art == null) return errors;
  if (!Array.isArray(art)) return ['content.js art must be an array'];
  const filePath = async (value, prefix, field) => {
    if (typeof value !== 'string' || !value.startsWith(prefix) ||
        value.split('/').some((p) => !p || p === '.' || p === '..') ||
        /[\\?#%]/.test(value) || !IMAGE_EXT.test(value)) {
      errors.push(`${field} must be a forward-slash PNG, JPG or WebP path inside ${prefix}`);
    } else if (!(await stat(join(root, value)).catch(() => null))?.isFile()) {
      errors.push(`${field} file does not exist (check spelling and case): ${value}`);
    } else {
      // Windows can resolve the wrong case locally; Linux deployments cannot.
      let folder = root;
      for (const part of value.split('/')) {
        if (!(await readdir(folder)).includes(part)) {
          errors.push(`${field} path case must match the file exactly: ${value}`);
          break;
        }
        folder = join(folder, part);
      }
    }
  };
  for (const [i, piece] of art.entries()) {
    const label = `content.js art[${i}] (${piece?.title || piece?.img || 'untitled'})`;
    if (!object(piece)) { errors.push(`${label} must be an object`); continue; }
    if (piece.details === undefined) continue;
    if (!object(piece.details)) { errors.push(`${label}.details must be an object (or omit it)`); continue; }
    await filePath(piece.img, 'assets/art/', `${label}.img`);
    const d = piece.details;
    for (const key of Object.keys(d)) {
      if (!['year', 'medium', 'paragraphs', 'process'].includes(key)) errors.push(`${label}.details.${key} is not a supported field`);
    }
    for (const key of ['year', 'medium']) {
      if (d[key] !== undefined && typeof d[key] !== 'string') errors.push(`${label}.details.${key} must be a string`);
    }
    if (d.paragraphs !== undefined && (!Array.isArray(d.paragraphs) || d.paragraphs.some((p) => typeof p !== 'string'))) {
      errors.push(`${label}.details.paragraphs must be an array of strings (one per paragraph)`);
    }
    if (d.process === undefined) continue;
    if (!Array.isArray(d.process)) { errors.push(`${label}.details.process must be an array`); continue; }
    for (const [j, image] of d.process.entries()) {
      const field = `${label}.details.process[${j}]`;
      if (!object(image)) { errors.push(`${field} must be an object`); continue; }
      for (const key of Object.keys(image)) {
        if (!['img', 'alt', 'caption'].includes(key)) errors.push(`${field}.${key} is not a supported field`);
      }
      for (const key of ['img', 'alt', 'caption']) {
        if (image[key] !== undefined && typeof image[key] !== 'string') errors.push(`${field}.${key} must be a string`);
      }
      const hasText = [image.img, image.alt, image.caption].some((s) => typeof s === 'string' && s.trim());
      if (!hasText) continue; // an empty drafting slot produces no thumbnail
      await filePath(image.img, 'assets/art-process/', `${field}.img`);
      if (typeof image.alt !== 'string' || !image.alt.trim()) errors.push(`${field}.alt needs a useful image description`);
    }
  }
  return errors;
}

/* ---------- 2 + 3. WebP copies and the art list ---------- */
let sharpLib;
export async function generate({ root = ROOT, outDir = join(DIST, 'generated'), log = console.log } = {}) {
  sharpLib = sharpLib || (await import('sharp')).default;
  const sharp = sharpLib;
  // Let go of each file once it's read. sharp keeps some open by default,
  // and on Windows an open file can't be deleted, so another dev server
  // (or `npm run build`) couldn't tidy up the copies this one had read.
  sharp.cache({ files: 0 });
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
        Object.assign(info, { large: large.url, lw: large.width, lh: large.height });
      }
      // A smaller copy still, for pictures drawn small on standard screens.
      if (set.thumb && web.width > set.thumb) {
        const thumb = await makeWebp(buf, `${base}-t${set.thumb}.webp`,
          { width: set.thumb, withoutEnlargement: true });
        Object.assign(info, { thumb: thumb.url, tw: thumb.width });
      }
      // And the smallest, for a playing card's face, so a whole deck of
      // art stays light.
      if (set.card && web.width > set.card) {
        const card = await makeWebp(buf, `${base}-c${set.card}.webp`,
          { width: set.card, withoutEnlargement: true });
        Object.assign(info, { card: card.url, cw: card.width });
      }
      if (set.dir === 'assets/art') {
        // Worked out from the small copy, once per version of the file.
        if (!colourCache.has(base)) colourCache.set(base, await artColours(sharp, join(outDir, `${base}-w${set.web}.webp`)));
        if (colourCache.get(base)) info.colors = colourCache.get(base);
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

  // A version for each nav icon. Their addresses are put together in the
  // code (K.navIcon), so they can't be stamped like the others: K.navIcon
  // adds ?v= from here, and a changed drawing gets a new address.
  const versions = {};
  const iconDir = 'assets/ui/nav-icons';
  for (const f of (await readdir(join(root, iconDir)).catch(() => [])).filter((n) => /\.svg$/i.test(n))) {
    versions[`${iconDir}/${f}`] = createHash('sha1').update(await readFile(join(root, iconDir, f))).digest('hex').slice(0, 8);
  }

  await writeFile(join(outDir, 'manifest.js'),
    '/* Made by build/build.mjs on every deploy. Do not edit: change content.js\n' +
    '   or the files in assets/ instead. */\n' +
    'window.GENERATED = ' + JSON.stringify({ images, art, versions }, null, 1) + ';\n');

  // Tidy up copies of images that were changed or removed. One that another
  // process still has open (a second dev server on Windows) waits for the
  // next run rather than failing this one.
  for (const f of await readdir(outDir)) {
    if (!keep.has(f)) await unlink(join(outDir, f)).catch(() => {});
  }
  log(`  images: ${Object.keys(images).length} (${made} new WebP files), artworks: ${art.length}`);
  return { images, art };
}

/* ---------- 4. Version the links in the built pages ---------- */
// Adding ?v=<hash of the file> to each address makes every change a fresh
// URL, so vercel.json can let browsers keep a stamped file for a year (an
// address without a stamp is still checked again after a minute or a day).
// The pictures go first (the cursors in the stylesheet, the favicon in the
// scripts), then the script addresses written inside scripts (apps.js
// fetches sweeper.js when the game opens), then the pages' own links, so
// each file's stamp changes whenever anything it points at does. Only
// dist/ is touched; the source files stay clean.
export async function stampAssetUrls(dist = DIST) {
  const hashOf = async (url) => {
    try { return createHash('sha1').update(await readFile(join(dist, decodeURIComponent(url)))).digest('hex').slice(0, 8); }
    catch { return ''; } // not in dist (shouldn't happen): leave the link alone
  };
  const hashes = new Map();
  const version = async (url) => {
    if (!hashes.has(url)) hashes.set(url, await hashOf(url));
    return hashes.get(url);
  };
  // Every match of `re` in `text`, stamped (group 1 is the address).
  const stamp = async (text, re, swap) => {
    for (const url of new Set([...text.matchAll(re)].map((m) => m[1]))) await version(url);
    return text.replace(re, (...m) => (hashes.get(m[1]) ? swap(hashes.get(m[1]), m[1]) : m[0]));
  };
  const rewrite = async (test, fn) => {
    for (const f of await readdir(dist)) {
      if (!test.test(f)) continue;
      const file = join(dist, f);
      const text = await readFile(file, 'utf8');
      const out = await fn(text);
      if (out !== text) await writeFile(file, out);
    }
  };

  // Pictures in the stylesheets: url('/assets/ui/Pet Wizard Cursor OwO.png').
  await rewrite(/\.css$/i, (css) => stamp(css, /(?<=url\(['"]?)(\/assets\/[^'")?#]+)(?=['"]?\))/g,
    (v, url) => `${url}?v=${v}`));
  // Fixed picture addresses inside the scripts, like "/assets/ui/favicon.png"
  // (the nav icons' are put together in the code: see K.navIcon).
  await rewrite(/\.js$/i, (code) => stamp(code, /(\/assets\/[\w ./-]+?\.(?:png|svg|webp|jpe?g|gif))(?=['"`])/g,
    (v, url) => `${url}?v=${v}`));
  hashes.clear(); // the scripts below are hashed as they are now

  // Script addresses written inside the scripts, like '/sweeper.js'.
  const files = await readdir(dist);
  for (const f of files) {
    if (!/\.js$/i.test(f)) continue;
    const file = join(dist, f);
    const code = await readFile(file, 'utf8');
    let out = code;
    for (const url of new Set([...code.matchAll(/['"](\/[\w.-]+\.js)['"]/g)].map((m) => m[1]))) {
      const v = await hashOf(url);
      if (v) out = out.split(`'${url}'`).join(`'${url}?v=${v}'`).split(`"${url}"`).join(`"${url}?v=${v}"`);
    }
    if (out !== code) await writeFile(file, out);
  }

  // Then the pages' own links, hashed after the steps above so they cover
  // them: the stylesheet and scripts, and the pictures (the taskbar's
  // icons, the desktop's <use href=".../about.svg#icon">).
  await rewrite(/\.html$/i, async (html) => {
    const linked = await stamp(html, /(?<=(?:src|href)=")(\/[^"?#]+\.(?:css|js))(?=")/g, (v, url) => `${url}?v=${v}`);
    return stamp(linked, /(?<=(?:src|href)=")(\/assets\/[^"?#]+)(?=["#])/g, (v, url) => `${url}?v=${v}`);
  });
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
  console.log('Versioning CSS and JS links…');
  await stampAssetUrls(DIST);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s → dist/`);
}

if (toPosix(process.argv[1] || '') === toPosix(fileURLToPath(import.meta.url))) {
  build().catch((e) => { console.error(e); process.exit(1); });
}

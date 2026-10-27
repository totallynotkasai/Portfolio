import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { checkArtDetails, checkContent, generate } from '../build/build.mjs';

const core = await readFile(new URL('../kasai-core.js', import.meta.url), 'utf8');
const apps = await readFile(new URL('../apps.js', import.meta.url), 'utf8');
const final = 'assets/art/Test/Piece.png';
const processImage = 'assets/art-process/piece/Sketch.png';

function runtime(art = [], generated = {}) {
  const window = { CONTENT: { art }, GENERATED: generated, addEventListener() {} };
  const document = { addEventListener() {}, documentElement: { setAttribute() {} } };
  const context = { window, document, console, setTimeout, clearTimeout };
  vm.runInNewContext(core, context);
  vm.runInNewContext(apps.replace('K.apps = {', 'K.artTest = { artCard, artDetails, flipArtCard, setOf, viewerOpener }; K.apps = {'), context);
  return window.Kasai;
}

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'kasai-art-test-'));
  try {
    await mkdir(join(root, 'assets/art/Test'), { recursive: true });
    await mkdir(join(root, 'assets/art-process/piece'), { recursive: true });
    const png = await sharp({ create: { width: 900, height: 1000, channels: 3, background: '#7453a1' } }).png().toBuffer();
    await writeFile(join(root, final), png);
    await writeFile(join(root, processImage), png);
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('art metadata keeps discovered defaults, authored overrides and the complete optional back', () => {
  const details = { medium: 'Test medium', paragraphs: ['<literal> & text'], process: [{ img: processImage, alt: 'Test sketch' }] };
  const K = runtime([{ img: final, details }], { art: [{ img: final, title: 'Discovered', tag: 'Test', added: 1 }, { img: 'assets/art/Other.png', title: 'Other' }] });
  assert.equal(K.ART.length, 2);
  assert.equal(K.ART[1].title, 'Discovered');
  assert.equal(K.ART[1].tag, 'Test');
  assert.equal(K.ART[1].details, details);
  const override = runtime([{ img: final, title: 'Authored', tag: '', pin: true, details }], { art: [{ img: final, title: 'Discovered', tag: 'Test' }] });
  assert.equal(override.ART[0].title, 'Authored');
  assert.equal(override.ART[0].tag, '');
});

test('ordinary and empty art backs have no placeholder or flip; partial backs escape every authored field', () => {
  const K = runtime();
  for (const details of [undefined, {}, { year: ' ', medium: '', paragraphs: ['', '  '], process: [{ img: '' }] }]) {
    const html = K.artTest.artCard({ img: final, title: 'Existing', details }, 0, 1);
    assert.doesNotMatch(html, /data-art-flip|data-art-back|art-card-notes/);
    assert.match(html, /<figure[^>]*>\s*<div/);
    assert.doesNotMatch(html, /role="button"|tabindex="0"/);
  }
  for (const details of [{ year: '2026' }, { medium: 'Test' }, { paragraphs: ['A'.repeat(8000)] }, { process: [{ img: processImage, alt: 'Sketch' }] }]) {
    assert.match(K.artTest.artCard({ img: final, details }, 0, 1), /data-art-flip/);
  }
  const html = K.artTest.artCard({ img: final, title: '"<&', details: {
    year: '<2026>', medium: '& ink', paragraphs: ['<script>alert("x")</script>', '', 'Long '.repeat(1000)],
    process: [{ img: processImage, alt: '"<&', caption: '<caption>' }, { img: processImage, alt: 'Second', caption: ' ' }],
  } }, 0, 1);
  assert.doesNotMatch(html, /<script>|<caption>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /data-art-back hidden inert/);
  assert.equal((html.match(/<figcaption>/g) || []).length, 1);
  assert.match(html, /loading="lazy"/);
});

test('flipping removes the hidden face from navigation and moves focus to the matching control', () => {
  const K = runtime();
  const focus = [];
  const faces = [0, 1].map((id) => ({ querySelector: () => ({ focus: () => focus.push(id) }) }));
  const card = { querySelector: (s) => faces[s === '[data-art-front]' ? 0 : 1], classList: { toggle(_name, value) { card.back = value; } } };
  K.artTest.flipArtCard(card, true, true);
  assert.deepEqual(faces.map((f) => [f.hidden, f.inert]), [[true, true], [false, false]]);
  assert.deepEqual(focus, [1]);
  K.artTest.flipArtCard(card, false, true);
  assert.deepEqual(faces.map((f) => [f.hidden, f.inert]), [[false, false], [true, true]]);
  assert.deepEqual(focus, [1, 0]);
});

test('reduced-motion rendering omits pointer tilt while retaining the same flip controls', () => {
  const K = runtime([{ img: final, title: 'Test', details: { year: '2026' } }]);
  const handlers = [];
  const card = { addEventListener: (name) => handlers.push(name) };
  const grid = { querySelectorAll: () => [card], addEventListener() {} };
  const body = { classList: { add() {} }, querySelector: () => grid };
  const win = { body, setStatus() {} };
  K.openable = () => {};
  K.REDUCE_MOTION = true;
  K.apps.art.render(win);
  assert.deepEqual(handlers, []);
  assert.match(body.innerHTML, /About this piece/);
  K.REDUCE_MOTION = false;
  K.apps.art.render(win);
  assert.deepEqual(handlers, ['pointermove', 'pointerleave']);
});

test('viewer navigation honours nested process sets, filters and current DOM order without duplicate final entries', () => {
  const K = runtime();
  const main = {}, processSet = {};
  const item = (set, filtered = false) => ({ closest: (s) => s === '[data-viewer-set]' ? set : filtered ? {} : null });
  const a = item(main), b = item(main), hidden = item(main, true), sketch = item(processSet);
  main.querySelectorAll = () => [b, sketch, hidden, a]; // shuffled, nested and filtered
  processSet.querySelectorAll = () => [sketch];
  assert.deepEqual(Array.from(K.artTest.setOf(a)), [b, a]);
  assert.deepEqual(Array.from(K.artTest.setOf(sketch)), [sketch]);
  const backView = {};
  const front = { matches: () => true, closest: () => ({ querySelector: () => backView }) };
  assert.equal(K.artTest.viewerOpener(front), backView);
  const processOpener = { matches: () => false };
  assert.equal(K.artTest.viewerOpener(processOpener), processOpener);
});

test('viewer keyboard and touch swipes navigate while vertical, slow, cancelled and mouse drags do not', () => {
  const steps = [];
  const keys = {}, swipe = {}, buttons = [{}, {}];
  const canvas = { addEventListener: (name, fn) => { swipe[name] = fn; } };
  const win = {
    el: { addEventListener: (name, fn) => { keys[name] = fn; } },
    body: { querySelector: (s) => s === '.viewer-canvas' ? canvas : { addEventListener: (name, fn) => { buttons[s === '.is-prev' ? 0 : 1][name] = fn; } } },
  };
  // Run the actual event adapter with a navigation spy; gallery membership
  // and focus resolution are tested separately above.
  const adapter = apps.slice(apps.indexOf('const STEP_KEYS ='), apps.indexOf('  K.openViewer ='));
  vm.runInNewContext(adapter + '\nwireSteps(win);', { win, stepViewer: (_win, by) => steps.push(by) });
  const key = (key, extra = {}) => keys.keydown({ key, preventDefault() {}, ...extra });
  key('ArrowLeft'); key('ArrowRight'); key('Home'); key('End');
  key('ArrowRight', { defaultPrevented: true }); key('ArrowRight', { ctrlKey: true });
  buttons[0].click(); buttons[1].click();
  assert.deepEqual(steps, [-1, 1, 'first', 'last', -1, 1]);
  const gesture = (end, start = {}) => {
    swipe.pointerdown({ pointerType: 'touch', isPrimary: true, pointerId: 1, clientX: 200, clientY: 200, timeStamp: 0, ...start });
    swipe.pointerup({ pointerId: 1, clientX: 100, clientY: 201, timeStamp: 200, ...end });
  };
  gesture({}); gesture({ clientX: 280 });
  gesture({ clientX: 180 }); gesture({ clientY: 400 }); gesture({ timeStamp: 800 });
  gesture({}, { pointerType: 'mouse' }); gesture({}, { isPrimary: false });
  swipe.pointerdown({ pointerType: 'touch', isPrimary: true }); swipe.pointercancel(); swipe.pointerup({});
  assert.deepEqual(steps.slice(6), [1, -1]);
});

test('art details validation accepts optional blanks and reports exact shape, image, alt and case errors', async () => fixture(async (root) => {
  const valid = { img: final, title: 'Test piece', details: { year: '', medium: '', paragraphs: [''], process: [{}, { img: processImage, alt: 'Test sketch', caption: '' }] } };
  assert.deepEqual(await checkArtDetails([valid], root), []);
  for (const [details, message] of [
    [null, /details must be an object/],
    [{ year: 2026 }, /details.year must be a string/],
    [{ paragraphs: ['ok', {}] }, /details.paragraphs/],
    [{ process: {} }, /details.process must be an array/],
    [{ process: [null] }, /process\[0\] must be an object/],
    [{ paragraphs: [], typo: true }, /details.typo/],
    [{ process: [{ img: processImage, alt: '' }] }, /process\[0\].alt/],
    [{ process: [{ img: 'assets/art-process/piece/Missing.png', alt: 'Test' }] }, /process\[0\].img file does not exist/],
    [{ process: [{ img: processImage.toLowerCase(), alt: 'Test' }] }, /process\[0\].img (path case|file does not exist)/],
    [{ process: [{ caption: 'No image' }] }, /process\[0\].img/],
  ]) {
    const errors = await checkArtDetails([{ ...valid, details }], root);
    assert.ok(errors.some((e) => message.test(e)), errors.join('\n'));
    assert.ok(errors.every((e) => e.includes('art[0] (Test piece)')));
  }
  for (const img of ['assets/art/Test/Piece.png', '../secret.png', 'assets/art-process/../art/Test/Piece.png', '/assets/art-process/a.png', 'https://test/a.png', 'assets/art-process/a.png?x', 'assets/art-process/a.svg', 'assets/art-process\\a.png']) {
    const errors = await checkArtDetails([{ ...valid, details: { process: [{ img, alt: 'Test' }] } }], root);
    assert.ok(errors.some((e) => /process\[0\].img must be/.test(e)), img);
  }
  await writeFile(join(root, 'content.js'), `window.CONTENT = ${JSON.stringify({ art: [{ ...valid, details: { paragraphs: 'wrong' } }] })};`);
  assert.ok((await checkContent(root)).errors.some((e) => /Test piece.*paragraphs/.test(e)));
}));

test('process images get thumbnail/page/viewer variants but never enter discovered gallery or Solitaire art', async () => fixture(async (root) => {
  const output = await generate({ root, outDir: join(root, 'generated'), log() {} });
  assert.equal(output.art.length, 1);
  assert.equal(output.art[0].img, final);
  const image = output.images[processImage];
  assert.equal(image.tw, 400);
  assert.equal(image.w, 800);
  assert.equal(image.lw, 900);
  assert.equal(image.lh, 1000);
  assert.ok(image.large && image.thumb);
  assert.equal(image.card, undefined);
  assert.equal(image.colors, undefined);
}));

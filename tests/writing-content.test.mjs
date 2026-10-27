import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { checkWriting, checkContent, generate } from '../build/build.mjs';

const core = await readFile(new URL('../kasai-core.js', import.meta.url), 'utf8');
const apps = await readFile(new URL('../apps.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../content.js', import.meta.url), 'utf8');
const cover = 'assets/writing/test/Cover.png';
const art = 'assets/art/Test/Piece.png';
function runtime(reduce = false) {
  const window = { CONTENT: {}, addEventListener() {}, matchMedia: () => ({ matches: reduce }) };
  const document = { addEventListener() {}, documentElement: { setAttribute() {} } };
  vm.runInNewContext(core, { window, document, console });
  vm.runInNewContext(apps.replace('K.apps = {', 'K.writingTest = { writingOverview, openDoc }; K.apps = {'), { window, document, console });
  const K = window.Kasai;
  K.wm = { open(spec) {
    const handlers = {}, classes = [];
    const win = { headingId: 'test-heading', body: { classList: { add: (c) => classes.push(c) } }, menu: { innerHTML: '', addEventListener: (type, fn) => { handlers[type] = fn; } }, setStatus(html) { this.status = html; } };
    spec.render(win);
    return { spec, win, handlers, classes };
  } };
  // openDoc delegates to the real window manager; capture the rendered spec.
  const open = K.wm.open;
  K.wm.open = (spec) => { K.last = open(spec); };
  return { K, render(w) { K.writingTest.openDoc(w); return K.last; } };
}
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'kasai-writing-test-'));
  try {
    for (const path of ['assets/writing/test', 'assets/art/Test']) await mkdir(join(root, path), { recursive: true });
    const image = await sharp({ create: { width: 1000, height: 1400, channels: 3, background: '#7453a1' } }).png().toBuffer();
    await writeFile(join(root, cover), image);
    await writeFile(join(root, art), image);
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('summary-only and premise-only overviews omit empty sections and sample controls', () => {
  const { render } = runtime();
  const w = { title: 'Test', excerpt: 'Existing summary', status: 'Re-write in progress', overview: {} };
  for (const overview of [{}, { premise: ['', ' '], characters: [{}, { name: ' ', paragraphs: [''] }], setting: [''], sampleLabel: 'Current rewrite sample' }]) {
    const { win } = render({ ...w, overview, chapters: [{ title: 'Empty', paragraphs: [' '] }] });
    assert.match(win.body.innerHTML, /Existing summary/);
    assert.match(win.body.innerHTML, /Re-write in progress/);
    assert.doesNotMatch(win.body.innerHTML, /<h3|<h4|<img|Current sample|Empty/);
    assert.equal(win.menu.innerHTML, '');
    assert.doesNotMatch(win.status, /href=/);
  }
  const { win } = render({ ...w, overview: { premise: ['Premise only', ''] } });
  assert.match(win.body.innerHTML, /<h3>Premise<\/h3><p>Premise only<\/p>/);
  assert.doesNotMatch(win.body.innerHTML, /Characters|Setting|Current sample/);
});

test('cover and partial character introductions work without sample text; authored strings stay literal', () => {
  const { render } = runtime();
  const { win } = render({ title: '<Title>', excerpt: 'A & B', overview: {
    cover, coverAlt: 'Cover "<&', characters: [{}, { name: '<Name>', role: '& role', img: art, imageAlt: 'Image "<&', paragraphs: ['<script>alert("x")</script>', ''] }],
    setting: ['<em>Literal</em> & already &lt;escaped&gt;'], sampleLabel: 'No sample supplied',
  } });
  assert.match(win.menu.innerHTML, />Overview<.*>Characters<.*>Setting</);
  assert.doesNotMatch(win.menu.innerHTML, /Read a sample/);
  assert.doesNotMatch(win.body.innerHTML, /<script>|<em>|Current sample|No sample supplied/);
  assert.match(win.body.innerHTML, /&lt;script&gt;/);
  assert.match(win.body.innerHTML, /&amp;lt;escaped&amp;gt;/);
  assert.match(win.body.innerHTML, /alt="Cover &quot;&lt;&amp;" loading="lazy"/);
  assert.equal((win.body.innerHTML.match(/<h4>/g) || []).length, 1);
});

test('long current samples render every paragraph and section navigation moves reading focus without animation', () => {
  for (const reduced of [false, true]) {
    const { render } = runtime(reduced);
    const paragraphs = Array.from({ length: 150 }, (_, i) => `Paragraph ${i}: ` + 'Long sample text. '.repeat(30));
    const { win, handlers } = render({ title: 'Test', overview: { setting: ['Setting'], sampleLabel: '<Current rewrite>' }, chapters: [{ title: 'Empty only' }, { title: 'Sample <1>', paragraphs }, {}] });
    assert.match(win.menu.innerHTML, /Read a sample/);
    assert.match(win.body.innerHTML, /Current sample/);
    assert.match(win.body.innerHTML, /&lt;Current rewrite&gt;/);
    assert.match(win.body.innerHTML, /Paragraph 149/);
    assert.doesNotMatch(win.body.innerHTML, /Empty only/);
    const actions = [];
    win.body.querySelector = (selector) => {
      assert.equal(selector, '[id="test-heading-sample"]');
      return { scrollIntoView: (o) => actions.push(['scroll', o]), focus: (o) => actions.push(['focus', o]) };
    };
    handlers.click({ target: { closest: () => ({ dataset: { docSection: 'test-heading-sample' } }) } });
    assert.equal(actions[0][1].behavior, 'instant');
    assert.equal(actions[1][1].preventScroll, true);
    handlers.click({ target: { closest: () => null } });
    assert.equal(actions.length, 2);
  }
});

test('plain documents, archived chapters, chapter focus and real external links retain their behavior', () => {
  const { render } = runtime();
  const plain = render({ title: 'Plain', excerpt: 'Summary', url: 'https://example.org/story', status: 'Finished' });
  assert.doesNotMatch(plain.win.body.innerHTML, /writing-overview|Current sample/);
  assert.match(plain.win.status, /href="https:\/\/example.org\/story" target="_blank" rel="noopener">Read it/);
  const archived = render({ title: 'Archive', stamp: 'Old writing', status: 'Archived draft', chapters: [{ title: '<Chapter 1>', paragraphs: ['Archived text'] }] });
  assert.match(archived.win.menu.innerHTML, /aria-label="Chapters"/);
  assert.match(archived.win.body.innerHTML, /story-chapter/);
  assert.doesNotMatch(archived.win.body.innerHTML, /Current sample/);
  let focused = false;
  archived.win.body.querySelector = () => ({ scrollIntoView() {}, focus() { focused = true; } });
  archived.handlers.click({ target: { closest: () => ({ dataset: { docSection: 'test-heading-chapter-0' } }) } });
  assert.ok(focused);
  for (const url of ['', ' ', '#']) assert.doesNotMatch(render({ title: 'Test', url }).win.status, /href=/);
});

test('real rewrite keeps only the existing description/status; archived text stays in its own document', () => {
  const window = {};
  vm.runInNewContext(source, { window });
  const [archive, current] = window.CONTENT.writing;
  assert.equal(current.title, "Dilettante's in the Interim");
  assert.equal(current.excerpt, 'My web novel, currently being re-written. A character-driven story I keep coming back to.');
  assert.equal(current.status, 'Re-write in progress');
  assert.equal(Object.keys(current.overview).length, 0);
  assert.equal(current.chapters, undefined);
  assert.equal(archive.status, 'Archived draft');
  assert.equal(archive.chapters.length, 2);
  const { win } = runtime().render(current);
  assert.doesNotMatch(win.body.innerHTML + win.menu.innerHTML, /Current sample|Read a sample|Chapter 1/);
});

test('writing validation allows empty drafts and real art reuse, with entry and nested field errors', async () => fixture(async (root) => {
  const valid = { title: 'Test overview', overview: { cover, coverAlt: 'Test cover', premise: [''], characters: [{}, { name: 'Name', img: art, imageAlt: 'Test image', paragraphs: [] }], setting: [], sampleLabel: '' }, chapters: [{}] };
  assert.deepEqual(await checkWriting([valid, { overview: {} }, { chapters: [{ title: 'Legacy', paragraphs: ['Text'] }] }], root), []);
  const bad = [
    [{ overview: null }, /overview must be an object/],
    [{ overview: { typo: [] } }, /overview.typo/],
    [{ overview: { premise: 'wrong' } }, /overview.premise/],
    [{ overview: { setting: [3] } }, /overview.setting/],
    [{ overview: { cover: 5 } }, /overview.cover must be a string/],
    [{ overview: { cover, coverAlt: '' } }, /overview.coverAlt needs/],
    [{ overview: { coverAlt: 'Orphaned alt' } }, /overview.cover must be/],
    [{ overview: { characters: {} } }, /overview.characters must be an array/],
    [{ overview: { characters: [null] } }, /characters\[0\] must be an object/],
    [{ overview: { characters: [{ role: 'Role only' }] } }, /characters\[0\].name/],
    [{ overview: { characters: [{ name: 'Name', paragraphs: [false] }] } }, /characters\[0\].paragraphs/],
    [{ overview: { characters: [{ name: 'Name', img: cover }] } }, /characters\[0\].imageAlt/],
    [{ chapters: {} }, /chapters must be an array/],
    [{ chapters: [null] }, /chapters\[0\] must be an object/],
    [{ chapters: [{ title: 3, paragraphs: 'Wrong' }] }, /chapters\[0\].paragraphs/],
    [{ url: 'javascript:alert(1)' }, /url must be/],
  ];
  for (const [entry, message] of bad) {
    const errors = await checkWriting([{ title: 'Test overview', ...entry }], root);
    assert.ok(errors.some((e) => message.test(e)), errors.join('\n'));
    assert.ok(errors.every((e) => e.includes('writing[0] (Test overview)')));
  }
  for (const path of ['assets/writing/test/Missing.png', cover.toLowerCase(), '../Cover.png', 'assets/writing/../art/Test/Piece.png', 'assets/writing/test/Cover.png?x', '/assets/writing/test/Cover.png', 'https://example.org/a.png', 'assets/art-process/a.png', 'assets/writing/a.svg', 'assets/writing/a%20b.png', 'assets\\writing\\a.png']) {
    assert.ok((await checkWriting([{ title: 'Test', overview: { cover: path, coverAlt: 'Test' } }], root)).some((e) => /overview.cover/.test(e)), path);
  }
  await writeFile(join(root, 'content.js'), 'window.CONTENT = ' + JSON.stringify({ writing: [{ title: 'Bad entry', overview: { premise: 2 } }] }));
  assert.ok((await checkContent(root)).errors.some((e) => /Bad entry.*overview.premise/.test(e)));
}));

test('writing assets get optimized dimensions and variants without adding gallery or Solitaire entries', async () => fixture(async (root) => {
  const result = await generate({ root, outDir: join(root, 'generated'), log() {} });
  assert.equal(result.images[cover].w, 800);
  assert.equal(result.images[cover].tw, 400);
  assert.equal(result.images[cover].lw, 1000);
  assert.equal(result.images[cover].lh, 1400);
  assert.equal(result.images[cover].card, undefined);
  assert.equal(result.images[cover].colors, undefined);
  assert.equal(result.art.length, 1);
  assert.equal(result.art[0].img, art);
}));

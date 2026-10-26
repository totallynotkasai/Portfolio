import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../kasai-core.js', import.meta.url), 'utf8');

function desktop(saved = new Map(), blocked = false) {
  const attributes = {};
  const storage = {
    getItem(key) { if (blocked) throw new Error('Storage blocked'); return saved.get(key) || null; },
    setItem(key, value) { if (blocked) throw new Error('Storage blocked'); saved.set(key, value); },
    removeItem(key) { saved.delete(key); },
  };
  const window = { localStorage: storage, sessionStorage: storage };
  const document = {
    addEventListener() {},
    documentElement: { setAttribute(key, value) { attributes[key] = value; } },
  };
  vm.runInNewContext(source, { window, document, console });
  const K = window.Kasai;
  const listeners = {};
  let opens = 0;
  let selected = false;
  const file = { dataset: {}, classList: { toggle(_name, on) { selected = on; } } };
  const box = {
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelectorAll() { return [file]; },
    contains(element) { return element === file; },
  };
  K.openable(box, '.file', () => { opens++; });
  function event(name, detail = 1, pointerType = 'mouse') {
    listeners[name]({ target: { closest: () => file }, detail, pointerType, preventDefault() {} });
  }
  return { K, saved, attributes, file, event, get opens() { return opens; }, get selected() { return selected; } };
}

test('desktop defaults to selecting with one click and opening with a double-click', () => {
  const d = desktop();
  d.event('pointerdown');
  d.event('click');
  assert.equal(d.opens, 0);
  assert.equal(d.selected, true);
  d.event('dblclick', 2);
  assert.equal(d.opens, 1);
  assert.equal(d.attributes['data-open-mode'], 'double');
});

test('single-click preference applies to existing files and survives a fresh page', () => {
  const d = desktop();
  d.K.setSingleClick(true);
  d.event('click');
  assert.equal(d.opens, 1);
  const reloaded = desktop(d.saved);
  reloaded.event('click');
  assert.equal(reloaded.opens, 1);
  reloaded.K.setSingleClick(false);
  reloaded.event('click');
  assert.equal(reloaded.opens, 1);
  assert.equal(desktop(d.saved).K.singleClick, false);
});

test('double-clicking in single-click mode does not open a file three times', () => {
  const d = desktop();
  d.K.setSingleClick(true);
  d.event('click', 1);
  d.event('click', 2);
  d.event('dblclick', 2);
  assert.equal(d.opens, 1);
});

test('touch and keyboard opening work with either mouse preference', () => {
  for (const singleClick of [false, true]) {
    const d = desktop();
    d.K.setSingleClick(singleClick);
    d.event('pointerdown', 1, 'touch');
    d.event('click');
    assert.equal(d.opens, 1);
    assert.equal(d.selected, false);
    d.event('click', 0);
    assert.equal(d.opens, 2);
  }
});

test('dragging an icon does not open it in single-click mode', () => {
  const d = desktop();
  d.K.setSingleClick(true);
  d.file.dataset.dragged = 'true';
  d.event('click');
  assert.equal(d.opens, 0);
  d.event('click');
  assert.equal(d.opens, 1);
});

test('blocked storage keeps the default and allows a temporary click preference', () => {
  const d = desktop(new Map(), true);
  assert.equal(d.K.singleClick, false);
  d.K.setSingleClick(true);
  d.event('click');
  assert.equal(d.opens, 1);
});

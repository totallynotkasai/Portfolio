import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../solitaire.js', import.meta.url), 'utf8');
const exposed = source.replace('K.solitaire = { mount, unmount };', `K.test = {
  newRun, endDeal, endRun, keepDealing, choose, planOf, startDeal, scored,
  play, cast, draw, reorder, free, sealed, open, opens, movesOf, fits, pileFace, hopeless,
  removeCard, validateLayout, layoutDiagram, nextWords, nextDiagram, drawLayoutNote, focusSlot,
  LAYOUTS, SPELLS, CHARMS, get run() { return run; }
};`);
export function game(seed = 123) {
  const saved = {};
  const K = { C: {}, DOODLE_ICONS: {}, esc: (s) => String(s), plural: (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`,
    store: { get: (key, fallback) => saved[key] || fallback, merge: (key, fields) => { saved[key] = { ...saved[key], ...fields }; } } };
  vm.runInNewContext(exposed, { window: { Kasai: K }, console, setTimeout, clearTimeout });
  K.test.newRun(seed);
  return { ...K.test, get run() { return K.test.run; }, saved };
}

export function deal(g, layout, curses = [], n = 4) {
  g.run.next = { n, target: 1050, curses, hex: curses.includes('hex') ? 1 : -1, layout };
  g.startDeal();
  return g.run.deal;
}

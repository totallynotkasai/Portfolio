import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../solitaire.js', import.meta.url), 'utf8');
const exposed = source.replace('K.solitaire = { mount, unmount };', `K.test = {
  newRun, endDeal, endRun, keepDealing, choose, skipReward, commitDeal, prepareDeal, planOf, startDeal, scored,
  startPlannedDeal() { run.next = prepareDeal(run.next); return startDeal(); },
  play, cast, draw, reorder, free, sealed, open, opens, movesOf, fits, pileFace, hopeless,
  removeCard, validateLayout, layoutDiagram, nextWords, nextDiagram, drawLayoutNote, focusSlot,
  LAYOUTS, SPELLS, CHARMS, get run() { return run; }, get seed() { return run.seed; },
  rewardHtml() { view = { help: false, scry: null }; try { return cardHtml(); } finally { view = null; } },
  rejectedClick(dataset, detail = 1) {
    view = {}; try { onCard({ detail, target: { closest: () => ({ dataset }) } }); } finally { view = null; }
  }, repeatedKey(key) {
    let prevented = false; view = {};
    try { cardKey({ key, repeat: true, preventDefault() { prevented = true; } }); return prevented; } finally { view = null; }
  }, closeWindow() {
    let replayed = false;
    view = { moving: new Set(), timers: new Set(), table: { querySelectorAll: () => [] },
      win: { el: { removeEventListener() {} } }, after() { replayed = true; } };
    unmount(); return replayed;
  }
};`);
export function game(seed = 123) {
  const saved = {};
  const K = { C: {}, DOODLE_ICONS: {}, doodleIcon: () => '<svg></svg>', esc: (s) => String(s), plural: (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`,
    store: { get: (key, fallback) => saved[key] || fallback, merge: (key, fields) => { saved[key] = { ...saved[key], ...fields }; } } };
  vm.runInNewContext(exposed, { window: { Kasai: K }, console, setTimeout, clearTimeout });
  K.test.newRun(seed);
  return { ...K.test, get run() { return K.test.run; }, saved };
}

export function pick(g, id = g.run.reward.offer[0]) {
  return g.choose(id, g.run.reward.id, g.run.reward.remaining);
}

export function resolveRewards(g) {
  const b = g.run.reward;
  while (b.remaining) {
    if (b.offer.length) pick(g);
    else g.skipReward(b.id, b.remaining);
  }
  return g.commitDeal(b.id);
}

export function deal(g, layout, curses = [], n = 4) {
  g.run.next = { n, target: 1050, curses, hex: curses.includes('hex') ? 1 : -1, layout };
  g.startPlannedDeal();
  return g.run.deal;
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the real rules without adding a debug API to the shipped game.
const source = readFileSync(new URL('../solitaire.js', import.meta.url), 'utf8');
function game(seed = 123) {
  const saved = {};
  const K = {
    C: {}, DOODLE_ICONS: {},
    store: { get: (key, fallback) => saved[key] || fallback, merge: (key, fields) => { saved[key] = { ...saved[key], ...fields }; } },
  };
  const exposed = source.replace('K.solitaire = { mount, unmount };', `K.test = {
    newRun, endDeal, endRun, keepDealing, choose, planOf, startDeal, scored,
    play, cast, draw, free, open, opens, movesOf, fits, pileFace, hopeless,
    LAYOUTS, SPELLS, CHARMS, get run() { return run; }
  };`);
  vm.runInNewContext(exposed, { window: { Kasai: K }, console, setTimeout, clearTimeout });
  K.test.newRun(seed);
  return { ...K.test, get run() { return K.test.run; }, saved };
}

test('an under-target clean sweep loses exactly half a heart at full or partial health', () => {
  for (const hearts of [3, 2, 1, 0.5]) {
    const g = game();
    g.run.hearts = hearts;
    Object.assign(g.run.deal, { score: 100, stock: [], target: 9000 });
    const events = g.endDeal(true);
    assert.equal(g.run.hearts, hearts - 0.5);
    assert.equal(events.find((e) => e.t === 'hurt').amount, 0.5);
    assert.ok(!events.some((e) => e.t === 'heal'));
    assert.equal(g.run.step, hearts === 0.5 ? 'over' : 'pick');
  }
});

test('an uncleared missed target still loses a full heart', () => {
  const g = game();
  g.run.hearts = 1.5;
  g.endDeal(false);
  assert.equal(g.run.hearts, 0.5);
});

test('sweep stock bonus can reach the target and heal without exceeding maximum', () => {
  for (const [hearth, hearts, expected] of [[0, 2.5, 3], [1, 1, 2.5], [1, 2.5, 3]]) {
    const g = game();
    g.run.have.hearth = hearth;
    g.run.hearts = hearts;
    Object.assign(g.run.deal, { score: 680, stock: [1], target: 700 });
    const events = g.endDeal(true);
    assert.equal(g.run.hearts, expected);
    assert.ok(!events.some((e) => e.t === 'hurt'));
    assert.equal(events.find((e) => e.t === 'heal').amount, expected - hearts);
  }
});

test('missing a Final Deal still ends the run, including an under-target sweep', () => {
  const g = game();
  Object.assign(g.run.deal, { n: 7, target: 9000, stock: [] });
  g.endDeal(true);
  assert.equal(g.run.step, 'over');
  assert.equal(g.run.hearts, 2.5);
});

test('Kindred never resets a streak for any suit, rank or suit change', () => {
  const g = game();
  g.run.have.kindred = 1;
  for (let card = 0; card < 52; card++) {
    for (let under = 0; under < 52; under++) {
      const scored = g.scored(g.run.deal, card, under, 12);
      assert.equal(scored.streak, 13);
      assert.equal(scored.pts, Math.floor(card / 13) === Math.floor(under / 13) ? 260 : 130);
    }
  }
});

test('only an active Hex can restart the streak, and Dispel removes its effect', () => {
  const g = game();
  const d = g.run.deal;
  g.run.have.kindred = 1;
  d.hex = 0; // stale suit must not behave as an active curse
  assert.equal(g.scored(d, 1, 2, 9).streak, 10);
  d.curses = ['hex', 'toll'];
  d.charges.dispel = 1;
  assert.equal(g.scored(d, 1, 2, 9).streak, 1);
  assert.equal(g.scored(d, 1, 2, 9).pts, 20);
  g.cast('dispel', 'hex');
  assert.equal(d.hex, -1);
  assert.equal(d.curses.join(','), 'toll');
  assert.equal(g.scored(d, 1, 2, 9).streak, 10);
});

test('Lucky Clover pays at every fifth consecutive play, after the Kindred multiplier', () => {
  const g = game();
  Object.assign(g.run.have, { clover: 1, kindred: 1 });
  assert.equal(g.scored(g.run.deal, 1, 2, 3).pts, 80);
  assert.equal(g.scored(g.run.deal, 1, 2, 4).pts, 150);
  assert.equal(g.scored(g.run.deal, 1, 2, 9).pts, 250);
  Object.assign(g.run.deal, { curses: ['hex'], hex: 0 });
  assert.equal(g.scored(g.run.deal, 1, 2, 4).pts, 20);
});

test('Dispel returns the Moths’ eaten cards without duplicating the deck', () => {
  const g = game();
  g.run.next = { n: 4, target: 1050, curses: ['moths'], hex: -1, layout: 1 };
  g.startDeal();
  const d = g.run.deal;
  assert.equal(d.stock.length, 12);
  d.charges.dispel = 1;
  const events = g.cast('dispel', 'moths');
  assert.equal(events.find((e) => e.t === 'dispel').restored, 11);
  assert.equal(d.stock.length, 23);
  assert.equal(d.eaten.length, 0);
  assert.equal(new Set([...d.slots, ...d.pile, ...d.stock]).size, 52);
});

test('layouts have 28 connected cards, three tips, legal seal coverage and can all clear', () => {
  const g = game();
  g.LAYOUTS.forEach((layout, id) => {
    assert.equal(layout.slots.length, 28);
    assert.equal(layout.slots.filter((s) => !s.under.length).length, 3);
    assert.equal(layout.sealed.length, 3);
    layout.slots.forEach((slot, i) => {
      if (slot.y < 3) assert.ok(slot.over.length > 0, `${layout.name}: covered slot ${i}`);
      slot.over.forEach((j) => assert.ok(layout.slots[j].under.includes(i)));
    });
    g.run.next = { n: 2, target: 800, curses: [], hex: -1, layout: id };
    g.startDeal();
    const d = g.run.deal;
    assert.equal(d.slots.length + d.pile.length + d.stock.length, 52);
    assert.equal(new Set([...d.slots, ...d.pile, ...d.stock]).size, 52);
    assert.ok(d.up.every((up, i) => up === g.free(d, i)));
    let cleared = 0;
    while (d.slots.some((c) => c >= 0)) {
      const available = g.opens(d);
      assert.ok(available.length, layout.name);
      available.forEach((i) => { d.slots[i] = -1; cleared++; });
    }
    assert.equal(cleared, 28);
  });
});

test('seeded layout selection is reproducible and never repeats immediately', () => {
  const a = game(321);
  const b = game(321);
  for (let n = 2; n < 40; n++) {
    const pa = a.planOf(n);
    const pb = b.planOf(n);
    assert.equal(pa.layout, pb.layout);
    assert.notEqual(pa.layout, a.run.deal.layout);
    a.run.next = pa; a.startDeal();
    b.run.next = pb; b.startDeal();
    assert.equal(a.run.deal.slots.join(','), b.run.deal.slots.join(','));
  }
});

test('Nudge changes only the effective rank, keeps suit/streak, and wraps', () => {
  const g = game();
  const d = g.run.deal;
  Object.assign(d, { pile: [25], streak: 9 }); // King of Stars
  d.charges.nudge = 2;
  g.cast('nudge', 1);
  assert.equal(g.pileFace(d), 13); // Ace of Stars
  assert.equal(d.pile[0], 25);
  assert.equal(d.streak, 9);
  g.cast('nudge', -1);
  assert.equal(g.pileFace(d), 25);
  assert.equal(d.charges.nudge, 0);
});

test('playing after Nudge and Rewind restores the enchanted pile and streak', () => {
  const g = game();
  const d = g.run.deal;
  Object.assign(d, { pile: [4], nudge: 6, streak: 4 });
  const i = g.opens(d)[0];
  d.slots[i] = 6; // 7, fits the enchanted 6 rather than the physical 5
  d.charges.rewind = 1;
  assert.equal(g.fits(d, 6), true);
  g.play(i);
  assert.equal(d.nudge, null);
  assert.equal(d.streak, 5);
  g.cast('rewind');
  assert.equal(d.nudge, 6);
  assert.equal(d.streak, 4);
  assert.equal(d.slots[i], 6);
});

test('Undraw restores the rank enchantment after drawing clears it', () => {
  const g = game();
  const d = g.run.deal;
  Object.assign(d, { nudge: 8, streak: 12 });
  d.charges.undraw = 1;
  g.draw(false);
  assert.equal(d.nudge, null);
  assert.equal(d.streak, 0);
  g.cast('undraw');
  assert.equal(d.nudge, 8);
  assert.equal(d.streak, 12);
});

test('cancelled or invalid spell choices spend no charges', () => {
  const g = game();
  const d = g.run.deal;
  Object.assign(d.charges, { nudge: 1, dispel: 1 });
  d.curses = ['toll'];
  assert.equal(g.cast('nudge', 0).length, 0);
  assert.equal(g.cast('dispel', 'hex').length, 0);
  assert.equal(d.charges.nudge, 1);
  assert.equal(d.charges.dispel, 1);
});

test('Nudge and Dispel prevent automatic ending while a rescue is available', () => {
  const g = game();
  const d = g.run.deal;
  d.stock = [];
  d.pile = [0];
  d.slots.fill(6);
  assert.equal(g.hopeless(), true);
  d.charges.nudge = 1;
  assert.equal(g.hopeless(), false);
  d.charges.nudge = 0;
  d.charges.dispel = 1;
  d.curses = ['circle'];
  assert.equal(g.hopeless(), false);
});

test('End Run banks current or completed deal once and persists the endless best', () => {
  for (const completed of [false, true]) {
    const g = game();
    Object.assign(g.run, { mode: 'endless', score: 5000, step: completed ? 'pick' : 'play' });
    Object.assign(g.run.deal, { n: 8, score: 123, over: completed });
    g.endRun();
    const expected = completed ? 5000 : 5123;
    assert.equal(g.run.score, expected);
    assert.equal(g.run.step, 'over');
    assert.equal(g.run.hearts, 3);
    assert.equal(g.run.ended, true);
    assert.equal(g.saved['kasai:solitaire'].endless.score, expected);
    assert.equal(g.endRun().length, 0);
    assert.equal(g.run.score, expected);
    g.newRun(999);
    assert.equal(g.saved['kasai:solitaire'].endless.score, expected);
  }
});

test('End Run is unavailable during the seven-deal run', () => {
  const g = game();
  assert.equal(g.endRun().length, 0);
  assert.equal(g.run.step, 'play');
});

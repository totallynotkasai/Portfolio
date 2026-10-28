import assert from 'node:assert/strict';
import test from 'node:test';
import { game, deal, pick, resolveRewards } from './helpers/solitaire.mjs';

test('legacy coordinates and overlap graphs remain exact; all five families have distinct stable IDs', () => {
  const g = game();
  assert.equal(new Set(g.LAYOUTS.map((l) => l.id)).size, 7);
  assert.deepEqual([...new Set(g.LAYOUTS.map((l) => l.tips.length))].sort(), [1, 2, 3, 4, 5]);
  for (const l of g.LAYOUTS.slice(0, 3)) {
    assert.equal(l.depth, 4);
    assert.equal(l.rowScale, .7);
    l.slots.forEach((s) => assert.deepEqual(Array.from(s.over), Array.from(l.slots.flatMap((t, j) => t.y === s.y + 1 && Math.abs(t.x - s.x) < 1 ? [j] : []))));
    assert.deepEqual(Array.from(l.sealGroups[0].cards), [1, 5, 6]);
  }
});

test('validation rejects duplicate slots, wrong tips, cycles, orphans and unsafe explicit Seal dependencies', () => {
  const g = game();
  const check = (change, message) => {
    const l = structuredClone(g.LAYOUTS[0]); change(l);
    assert.throws(() => g.validateLayout(l), message);
  };
  check((l) => { l.slots[1].x = l.slots[0].x; }, /unique slots/);
  check((l) => { l.tips.pop(); }, /named tips/);
  check((l) => { l.slots[3].over.push(0); l.slots[0].under.push(3); }, /named tips|cycle/);
  check((l) => { l.slots[27].over.push(27); l.slots[27].under.push(27); }, /cycle/);
  check((l) => { l.sealGroups[0].guards = [0, 0]; }, /unsafe Seal/);
  check((l) => { l.sealGroups[0].cards.push(3); }, /depends on a lock/);
  check((l) => { l.sealGroups[0].cards.push(0); }, /unsafe Seal/);
  check((l) => { l.slots[27].under.forEach((i) => { l.slots[i].over = l.slots[i].over.filter((j) => j !== 27); }); l.slots[27].under = []; }, /named tips|orphan/);
});

test('tip IDs may occur anywhere in the slot array; explicit metadata governs awards, locks and reachability', () => {
  const g = game(), l = structuredClone(g.LAYOUTS[6]);
  const remap = (i) => 27 - i;
  l.id = 'permuted-towers';
  l.slots.reverse();
  l.slots.forEach((s) => { s.over = s.over.map(remap); s.under = s.under.map(remap); });
  l.tips.forEach((t) => { t.slot = remap(t.slot); });
  l.sealGroups.forEach((group) => { group.cards = group.cards.map(remap); group.guards = group.guards.map(remap); });
  assert.ok(g.validateLayout(l));
  g.LAYOUTS.push(l);
  const d = deal(g, g.LAYOUTS.length - 1, ['seal']); d.target = 99999;
  while (g.opens(d).length) g.removeCard(d, g.opens(d)[0], { twin: 1 }, 'fireball');
  assert.ok(d.slots.every((c) => c < 0)); assert.equal(d.peaks, 5); assert.equal(d.score, 1300);
});

test('Dispel removes guard instructions from card descriptions', () => {
  const g = game(), d = deal(g, 6, ['seal']);
  const slot = g.LAYOUTS[6].sealGroups[0].cards[0];
  assert.match(g.inspectWords(d, slot), /Lock: clear West Tower and East Tower/);
  d.charges.dispel = 1; g.cast('dispel', 'seal');
  assert.doesNotMatch(g.inspectWords(d, slot), /Lock:|Seal guard/);
});

test('all graphs structurally sweep with Seal active; each peak award and Twin Peaks are generic', () => {
  const g = game();
  g.LAYOUTS.forEach((l, id) => {
    for (const twin of [0, 1]) {
      const d = deal(g, id, l.sealGroups.length ? ['seal'] : []);
      d.target = 99999;
      const events = [];
      while (d.slots.some((c) => c >= 0)) {
        const available = g.opens(d);
        assert.ok(available.length, `${l.name}: no deadlock`);
        events.push(...g.removeCard(d, available[0], { twin }, 'fireball'));
      }
      const peaks = events.filter((e) => e.t === 'peak');
      assert.equal(d.peaks, l.tips.length);
      assert.equal(peaks.length, l.tips.length);
      assert.deepEqual(peaks.map((e) => e.pts), Array.from({ length: l.tips.length }, (_, i) => (i === l.tips.length - 1 ? 250 : 100) * (twin ? 2 : 1)));
      assert.equal(d.score, (l.tips.length * 100 + 150) * (twin ? 2 : 1));
      assert.equal(events.filter((e) => e.t === 'unseal').length, l.sealGroups.length);
      assert.equal(d.stock.length, 23);
    }
  });
});

test('real seeded planning introduces all counts, excludes incompatible Seal and preserves final/endless curse constraints', () => {
  const counts = new Set();
  for (const seed of [1, 415, 321, 999, 20261027]) {
    const a = game(seed), b = game(seed);
    assert.equal(a.run.deal.layout, 0);
    assert.equal(a.run.deal.stock.length, 23);
    for (let n = 2; n < 80; n++) {
      const pa = a.planOf(n), pb = b.planOf(n);
      assert.equal(JSON.stringify(pa), JSON.stringify(pb));
      assert.notEqual(pa.layout, a.run.deal.layout);
      const l = a.LAYOUTS[pa.layout]; counts.add(l.tips.length);
      assert.ok(!pa.curses.includes('seal') || l.sealGroups.length);
      assert.equal(pa.curses.length, n < 4 ? 0 : n % 7 === 0 ? 2 : 1);
      assert.ok(!(pa.curses.includes('circle') && pa.curses.includes('moths')));
      if (n > 7 && n % 7 !== 0 && a.run.deal.curses.length === 1) assert.notEqual(pa.curses[0], a.run.deal.curses[0]);
      a.run.next = pa; b.run.next = pb; a.startPlannedDeal(); b.startPlannedDeal();
      assert.equal(a.run.deal.slots.join(), b.run.deal.slots.join());
      assert.equal(new Set([...a.run.deal.slots, ...a.run.deal.pile, ...a.run.deal.stock, ...a.run.deal.eaten]).size, 52);
    }
    assert.equal(new Set(a.run.earlyCurses).size, 3);
  }
  assert.deepEqual([...counts].sort(), [1, 2, 3, 4, 5]);
});

test('isolated removal transitions replay live plays with all scoring charms and never mutate the source state', () => {
  const g = game(415);
  g.LAYOUTS.forEach((_, id) => {
    const d = deal(g, id, ['hex']);
    Object.assign(g.run.have, { ember: 1, kindred: 1, clover: 1, twin: 1 });
    d.streak = 4;
    const clone = structuredClone(d), i = g.opens(d)[0];
    const before = JSON.stringify(d);
    assert.equal(g.removeCard(clone, -1, {}, 'wild').length, 0);
    const ev = g.removeCard(clone, i, g.run.have, 'wild');
    assert.equal(JSON.stringify(d), before);
    d.charges.wild = 1;
    const live = g.cast('wild', i).filter((e) => e.t !== 'cast');
    assert.equal(JSON.stringify(ev), JSON.stringify(live));
    for (const key of ['slots', 'pile', 'score', 'streak', 'peaks', 'up', 'undo']) assert.equal(JSON.stringify(clone[key]), JSON.stringify(d[key]));
  });
});

test('every spell works on every family; undo retains faces and restores peak/Seal/score while spent resources stay spent', () => {
  const g = game(415);
  g.LAYOUTS.forEach((l, id) => {
    const d = deal(g, id, l.sealGroups.length ? ['seal', 'hex'] : ['hex', 'toll']);
    for (const spell of Object.keys(g.SPELLS)) d.charges[spell] = 3;
    const cards = [...d.slots];
    g.cast('moonlight'); assert.ok(d.up.every(Boolean));
    g.cast('scry'); const order = Array.from(d.seen).reverse(); g.reorder(order);
    assert.equal(d.stock.at(-1), order[0]);
    d.streak = 7; g.cast('echo'); assert.equal(d.streak, 7);
    g.cast('undraw'); assert.equal(d.streak, 7);
    const top = d.pile.at(-1); g.cast('nudge', 1); assert.equal(d.pile.at(-1), top);
    const i = g.opens(d)[0], score = d.score;
    g.cast('wild', i); assert.equal(d.slots[i], -1);
    g.cast('rewind'); assert.equal(d.slots[i], cards[i]); assert.equal(d.score, score); assert.equal(d.streak, 7); assert.ok(d.up.every(Boolean));
    g.cast('fireball', i); assert.equal(d.burnt.at(-1), cards[i]);
    g.cast('rewind'); assert.equal(d.burnt.length, 0);
    assert.equal(d.charges.rewind, 1); assert.equal(d.charges.fireball, 2);
    if (l.sealGroups.length) {
      d.charges.fireball = 40;
      const group = l.sealGroups[0];
      while (group.guards.some((j) => d.slots[j] >= 0)) g.cast('fireball', g.opens(d).filter((j) => !group.cards.includes(j))[0]);
      assert.ok(!g.sealed(d, group.cards[0]));
      g.cast('rewind'); assert.ok(g.sealed(d, group.cards[0]));
      g.cast('dispel', 'seal'); assert.ok(!d.curses.includes('seal'));
    } else { g.cast('dispel', 'hex'); assert.equal(d.hex, -1); }
  });
});

test('navigation follows the current graph and depth; preview diagrams contain every covering edge and spatial tip name', () => {
  const g = game();
  g.LAYOUTS.forEach((l, id) => {
    const d = deal(g, id);
    const sorted = Array.from(g.opens(d)).sort((a, b) => l.slots[a].x - l.slots[b].x);
    let at = g.focusSlot(d, -1, 'Home'); assert.equal(at, sorted[0]);
    for (const i of sorted.slice(1)) { at = g.focusSlot(d, at, 'ArrowRight'); assert.equal(at, i); }
    assert.equal(g.focusSlot(d, at, 'End'), sorted.at(-1));
    assert.equal(g.focusSlot(d, at, 'ArrowRight'), sorted.at(-1));
    const deepest = sorted.find((i) => l.slots[i].y === l.depth - 1);
    if (l.connected && l.depth === 5) {
      const above = g.focusSlot(d, deepest, 'ArrowUp');
      assert.equal(l.slots[above].y, l.depth - 2);
      assert.equal(g.focusSlot(d, above, 'ArrowDown'), deepest);
    }
    const last = sorted.at(-1); g.removeCard(d, last, {}, 'fireball');
    const up = g.focusSlot(d, sorted.at(-2), 'ArrowUp');
    assert.ok(g.free(d, up));
    const svg = g.layoutDiagram(l);
    assert.equal((svg.match(/<rect /g) || []).length, 28);
    assert.equal((svg.match(/<line /g) || []).length, l.slots.reduce((n, s) => n + s.over.length, 0));
    assert.ok(g.nextWords(d).includes(`${l.tips.length} peak`));
    l.tips.forEach((t) => assert.ok(g.nextDiagram(d).includes(t.name)));
  });
});

test('Second Deck, Spellbook, Hearthstone and Healing Potion retain their resource behavior on variable families', () => {
  const g = game();
  for (const id of [3, 4, 5, 6]) {
    g.newRun(123); g.run.have.deck = 1;
    let d = deal(g, id);
    // Actual stock draws enter the pile; refill must not create cards.
    d.charges.wild = 1; // keep a rescue available while exhausting stock
    while (d.stock.length) g.draw(false);
    const before = [...d.slots, ...d.pile].sort((a, b) => a - b).join();
    const ev = g.draw(false);
    assert.equal(ev.find((e) => e.t === 'refill').n, 12);
    assert.equal(d.stock.length, 11); assert.equal(d.refills, 0);
    assert.equal([...d.slots, ...d.pile, ...d.stock].sort((a, b) => a - b).join(), before);
    Object.assign(g.run.have, { hearth: 1, spellbook: 1 }); g.run.hearts = 1;
    Object.assign(d, { score: 1030, target: 1050, stock: [2] }); d.slots.fill(-1);
    g.endDeal(true);
    assert.equal(g.run.hearts, 2.5); assert.equal(Object.values(g.run.extra).reduce((a, b) => a + b, 0), 1);
    const extra = Object.keys(g.run.extra)[0];
    g.run.reward.offer = ['potion']; pick(g, 'potion'); resolveRewards(g); d = g.run.deal;
    assert.equal(g.run.max, 4); assert.equal(g.run.hearts, 4);
    assert.equal(d.charges[extra], g.run.spells[extra] + 1);
    assert.equal(Object.keys(g.run.extra).length, 0);
  }
});

test('variable peaks preserve settlement, stock-bonus double rewards and final-to-endless behavior', () => {
  const g = game();
  g.LAYOUTS.forEach((_, id) => {
    g.newRun(415); const d = deal(g, id, [], 7);
    Object.assign(d, { score: 680, target: 700, stock: [10] }); d.slots.fill(-1);
    g.endDeal(true);
    assert.equal(g.run.step, 'won'); assert.ok(d.reached); assert.equal(d.score, 700);
    g.keepDealing(g.run.reward.id); assert.equal(g.run.step, 'pick'); assert.equal(g.run.reward.nextDeal, 8);
    assert.equal(g.run.reward.total, 2);
    const choice = g.run.reward.offer[0]; pick(g, choice);
    assert.equal(g.run.step, 'pick'); resolveRewards(g);
    assert.equal(g.run.step, 'play'); assert.equal(g.run.deal.n, 8);
    assert.equal(g.choose(choice).length, 0);
    g.run.deal.score = 9000; g.endDeal(false);
    assert.equal(g.run.step, 'pick');
    assert.equal(g.run.reward.total, 1); resolveRewards(g); assert.equal(g.run.deal.n, 9);
  });
});

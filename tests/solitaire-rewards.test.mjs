import assert from 'node:assert/strict';
import test from 'node:test';
import { game, deal, pick, resolveRewards } from './helpers/solitaire.mjs';

const json = (value) => JSON.stringify(value);
function settle(g, { swept = true, score = 680, target = 700, stock = [10], n = 2 } = {}) {
  const d = deal(g, 3, [], n);
  Object.assign(d, { score, target, stock });
  if (swept) d.slots.fill(-1);
  g.endDeal(swept);
  return g.run.reward;
}
function maxOut(g) {
  for (const [id, spell] of Object.entries(g.SPELLS)) g.run.spells[id] = spell.most || 3;
  for (const [id, charm] of Object.entries(g.CHARMS)) g.run.have[id] = charm.most || 1;
  g.run.max = g.run.hearts = 5;
}

test('settled stock-bonus success earns two; sticky Toll success, under-target and unswept outcomes keep their conventions', () => {
  for (const [swept, score, stock, expected, hearts] of [
    [true, 680, [1], 2, 3], [true, 679, [1], 1, 2.5],
    [false, 700, [], 1, 3], [false, 100, [], 1, 2],
  ]) {
    const g = game(); const b = settle(g, { swept, score, stock });
    assert.equal(b.total, expected); assert.equal(b.remaining, expected); assert.equal(g.run.hearts, hearts);
  }
  const g = game(); g.run.deal.reached = true; g.run.deal.score = 0; g.run.deal.slots.fill(-1);
  g.run.deal.stock = []; g.endDeal(true);
  assert.equal(g.run.reward.total, 2); // target stays made after Toll
  for (const [n, swept, hearts] of [[2, true, .5], [2, false, 1], [7, true, 3], [14, false, 3]]) {
    const h = game(); h.run.hearts = hearts;
    assert.equal(settle(h, { n, swept, target: 99999 }), null);
    assert.equal(h.run.step, 'over'); assert.equal(h.keepDealing().length, 0);
  }
});

test('fresh second offers reflect prospective ownership and never repeat the chosen exact ID', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const g = game(seed), b = settle(g), original = g.run.deal;
    const first = b.offer[0], before = json(g.run.spells);
    assert.equal(b.offer.length, 3); pick(g, first);
    assert.equal(g.run.deal, original); assert.equal(g.run.step, 'pick'); assert.equal(g.run.next, null);
    assert.equal(json(g.run.spells), before); assert.equal(b.resources.spells[first], 1);
    assert.ok(!b.offer.includes(first)); assert.equal(b.offer.length, 3);
    pick(g); assert.equal(new Set(b.chosen).size, 2); assert.equal(b.status, 'ready');
  }
  const g = game(); maxOut(g); g.run.have.ember = 0; g.run.have.potion = 0; g.run.max = 4;
  const b = settle(g); assert.ok(b.offer.includes('potion'));
  pick(g, 'potion'); assert.equal(b.resources.max, 5); assert.equal(b.resources.hearts, 5);
  assert.ok(!b.offer.includes('potion')); pick(g, 'ember');
  assert.equal(b.resources.have.ember, 1); assert.equal(b.resources.max, 5);
});

test('real final-card play settles the stock bonus before awarding double rewards exactly once', () => {
  const g = game(), d = deal(g, 0, [], 2), tip = g.LAYOUTS[0].tips[0].slot;
  d.slots.fill(-1); d.slots[tip] = 1; d.up.fill(true);
  Object.assign(d, { pile: [0], stock: [20], score: 430, target: 700, peaks: 2 });
  const ev = g.play(tip);
  assert.equal(d.score, 710); assert.ok(d.reached); assert.equal(g.run.reward.total, 2);
  assert.ok(ev.findIndex((e) => e.t === 'sweep') < ev.findIndex((e) => e.t === 'target'));
  const before = json(g.run.reward), score = g.run.score;
  assert.equal(g.play(tip).length, 0); assert.equal(g.cast('rewind').length, 0); assert.equal(g.endDeal(true).length, 0);
  assert.equal(json(g.run.reward), before); assert.equal(g.run.score, score);
});

test('caps and exhausted remaining selections have explicit skip with no automatic deal or duplicate skip', () => {
  for (const onlyOne of [false, true]) {
    const g = game(); maxOut(g);
    // Spellbook reserves one of the two free Wild charges; only one
    // permanent upgrade remains, then the second selection is exhausted.
    if (onlyOne) g.run.spells.wild = 1;
    const b = settle(g);
    assert.equal(g.commitDeal(b.id).length, 0);
    if (onlyOne) { assert.equal(b.offer.join(), 'wild'); assert.equal(g.skipReward(b.id, 2).length, 0); pick(g); }
    assert.equal(b.offer.length, 0); assert.equal(g.run.step, 'pick');
    assert.match(g.rewardHtml(), /Nothing eligible remains/);
    while (b.remaining) {
      const old = b.remaining; g.skipReward(b.id, old);
      assert.equal(g.skipReward(b.id, old).length, 0);
    }
    assert.equal(b.status, 'ready'); assert.equal(g.run.step, 'pick');
    g.commitDeal(b.id);
    for (const [id, n] of Object.entries(g.run.deal.charges)) assert.ok(n <= (g.SPELLS[id].most || 3));
    assert.equal(g.run.max, 5);
  }
});

test('Spellbook is one temporary capped charge independent of both selections and expires on the following deal', () => {
  const g = game(); maxOut(g); g.run.spells.wild = 1; g.run.spells.fireball = 2; g.run.have.ember = 0;
  const b = settle(g), extra = Object.keys(b.resources.extra)[0];
  assert.equal(Object.values(b.resources.extra).reduce((a, v) => a + v, 0), 1);
  assert.equal(b.total, 2); assert.equal(b.chosen.length, 0);
  const original = b.resources.spells[extra]; resolveRewards(g);
  const d = g.run.deal;
  assert.equal(d.charges[extra], g.run.spells[extra] + 1); assert.ok(d.charges[extra] <= 3);
  assert.equal(g.run.spells[extra], original + (b.chosen.includes(extra) ? 1 : 0));
  assert.equal(Object.keys(g.run.extra).length, 0);
  settle(g, { swept: false, score: 700, n: 3 }); resolveRewards(g);
  assert.equal(Object.keys(g.run.deal.definition.resources.extra).length, 0);
  const h = game(); maxOut(h); const full = settle(h);
  assert.equal(Object.keys(full.resources.extra).length, 0); assert.equal(full.offer.length, 0);
});

test('selection and Deal require current break tokens; stale callbacks and repeated settlement cannot spend or reroll', () => {
  const g = game(), b = settle(g), d = g.run.deal, id = b.offer[0];
  const settled = json({ score: g.run.score, hearts: g.run.hearts, sweeps: g.run.sweeps, made: g.run.made });
  assert.equal(g.endDeal(true).length, 0); assert.equal(g.startDeal().length, 0);
  assert.equal(g.choose(id, 'old', 2).length, 0); assert.equal(g.choose(id, b.id, 1).length, 0);
  pick(g, id); const afterFirst = json(b), seed = g.run.seed;
  assert.equal(g.choose(id, b.id, 2).length, 0);
  assert.equal(g.choose(b.offer[0], b.id, 2).length, 0);
  assert.equal(g.commitDeal(b.id).length, 0); assert.equal(json(b), afterFirst); assert.equal(g.run.seed, seed);
  assert.equal(g.run.deal, d); pick(g); const definition = b.prepared;
  assert.equal(g.choose(id, b.id, 1).length, 0); assert.equal(b.prepared, definition);
  assert.equal(json({ score: g.run.score, hearts: g.run.hearts, sweeps: g.run.sweeps, made: g.run.made }), settled);
  g.commitDeal(b.id); const started = json(g.run.deal), finalSeed = g.run.seed;
  assert.equal(g.commitDeal(b.id).length, 0); assert.equal(g.startDeal().length, 0); assert.equal(g.keepDealing().length, 0);
  assert.equal(json(g.run.deal), started); assert.equal(g.run.seed, finalSeed);
  settle(g, { n: 3 }); assert.notEqual(g.run.reward.id, b.id);
  assert.equal(g.choose(g.run.reward.offer[0], b.id, 2).length, 0);
});

test('won Final entitlement is recorded once and carried exactly once into endless, including later Finals', () => {
  for (const swept of [false, true]) {
    const g = game(), b = settle(g, { n: 7, swept, score: 700 });
    assert.equal(g.run.step, 'won'); assert.equal(b.status, 'waiting'); assert.equal(b.total, swept ? 2 : 1);
    const seed = g.run.seed, score = g.run.score;
    assert.equal(g.endDeal(swept).length, 0); assert.equal(g.run.seed, seed); assert.equal(g.run.score, score);
    assert.equal(g.keepDealing('stale-break').length, 0); assert.equal(b.status, 'waiting');
    g.keepDealing(b.id); const first = json(b), continuedSeed = g.run.seed;
    assert.equal(g.run.reward, b); assert.equal(g.keepDealing(b.id).length, 0);
    assert.equal(json(b), first); assert.equal(g.run.seed, continuedSeed);
    resolveRewards(g); assert.equal(g.run.deal.n, 8);
    for (const n of [14, 21]) {
      const later = settle(g, { n, swept, score: 700 });
      assert.equal(g.run.step, 'pick'); assert.equal(later.total, swept ? 2 : 1);
      const bonusScore = g.run.score; assert.equal(g.endDeal(swept).length, 0); assert.equal(g.run.score, bonusScore);
      resolveRewards(g); assert.equal(g.run.deal.n, n + 1);
    }
  }
});

test('banking or replacing a run abandons unspent entitlement without applying prospective resources or adding settled score', () => {
  for (const ready of [false, true]) {
    const g = game(), b = settle(g, { n: 7 }); g.keepDealing(b.id);
    if (ready) while (b.remaining) pick(g);
    const score = g.run.score, spells = json(g.run.spells); g.endRun();
    assert.equal(g.run.score, score); assert.equal(json(g.run.spells), spells); assert.equal(b.status, 'abandoned');
    assert.equal(g.commitDeal(b.id).length, 0); assert.equal(g.keepDealing().length, 0);
    g.newRun(123); assert.equal(g.run.reward, null); assert.equal(g.run.n, 1); assert.ok(Object.values(g.run.spells).every((v) => v === 0));
  }
  const g = game(), b = settle(g, { n: 7 }); g.newRun(123);
  assert.equal(b.remaining, 2); assert.equal(g.keepDealing().length, 0); assert.equal(g.run.reward, null);
});

test('prepared definition deeply freezes exact deck, graph, curses and final resources; rendering and commit consume no randomness', () => {
  for (let seed = 1; seed <= 35; seed++) {
    const g = game(seed); Object.assign(g.run.have, { deck: 1, spellbook: 1 });
    const b = settle(g, { n: 6 }); while (b.remaining) pick(g);
    const p = b.prepared, before = json(p), rng = g.run.seed;
    assert.equal(p.randomState, rng);
    function frozen(value) { if (value && typeof value === 'object') { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); } }
    frozen(p); assert.match(p.rulesVersion, /rewards/); assert.equal(p.deck.length, 52); assert.equal(new Set(p.deck).size, 52);
    assert.equal(p.table.length, 28); assert.equal(p.pile.length, 1); assert.equal(p.stock.length + p.eaten.length, 23);
    assert.equal(p.layoutDefinition.id, g.LAYOUTS[p.layout].id); assert.equal(g.validateLayout(p.layoutDefinition), true);
    if (p.curses.includes('seal')) assert.ok(p.layoutDefinition.sealGroups.length);
    assert.equal(p.hex >= 0, p.curses.includes('hex'));
    assert.throws(() => { p.stock.reverse(); }, { name: 'TypeError' });
    const a = g.rewardHtml(), c = g.rewardHtml(); assert.equal(a, c); assert.match(a, /Ready for the next deal/);
    assert.equal(json(p), before); assert.equal(g.run.seed, rng);
    g.commitDeal(b.id); const d = g.run.deal;
    assert.equal(d.definition, p); assert.equal(json(d.slots), json(p.table)); assert.equal(json(d.pile), json(p.pile));
    assert.equal(json(d.stock), json(p.stock)); assert.equal(json(d.eaten), json(p.eaten)); assert.equal(json(d.charges), json(p.charges));
    assert.equal(json(g.run.have), json(p.resources.have)); assert.equal(json(g.run.spells), json(p.resources.spells));
    assert.equal(g.run.seed, rng); assert.equal(d.refills, p.refills);
    d.stock.pop(); d.charges.wild = 0; assert.equal(json(p), before);
  }
});

test('reward screen presents sequential progress, locked choices, temporary charges, exhaustion and explicit Deal gating', () => {
  const g = game(); g.run.have.spellbook = 1; const b = settle(g);
  let html = g.rewardHtml(); assert.match(html, /Reward 1 of 2/); assert.match(html, /data-act="deal"[^>]* disabled/);
  assert.match(html, /Separate from your reward selections/);
  const first = b.offer[0]; pick(g, first); html = g.rewardHtml();
  assert.match(html, /Reward 2 of 2/); assert.match(html, /Locked for the next deal/); assert.ok(!html.includes(`data-up="${first}"`));
  pick(g); html = g.rewardHtml(); assert.match(html, /data-act="deal"[^>]* data-first/); assert.ok(!html.includes('data-up='));
  b.prepared.layoutDefinition.tips.forEach((tip) => assert.ok(html.includes(tip.name)));
  assert.match(html, /Next-deal charges/);
});

test('interaction handlers reject double-click continuations, stale buttons and held keyboard activation', () => {
  const g = game(), b = settle(g);
  const state = json(b), seed = g.run.seed;
  g.rejectedClick({ up: b.offer[0], break: b.id, remaining: '2' }, 2);
  g.rejectedClick({ up: b.offer[0], break: 'old', remaining: '2' });
  g.rejectedClick({ act: 'deal', break: b.id });
  assert.equal(g.repeatedKey('Enter'), true); assert.equal(g.repeatedKey(' '), true);
  assert.equal(json(b), state); assert.equal(g.run.seed, seed);
  pick(g); const after = json(b);
  g.rejectedClick({ up: b.offer[0], break: b.id, remaining: '2' });
  g.rejectedClick({ act: 'skip-reward', break: b.id, remaining: '1' });
  assert.equal(json(b), after);
});

test('window cleanup cancels pending presentation without dropping waiting, choosing or prepared reward state', () => {
  const g = game(), b = settle(g, { n: 7 });
  const checkCloseAndRedraw = () => {
    const state = json(b), rng = g.run.seed, score = g.run.score, prepared = b.prepared;
    assert.equal(g.closeWindow(), false); // interrupted after-move presentation must not replay
    assert.equal(g.run.reward, b); assert.equal(json(b), state); assert.equal(g.run.score, score);
    if (g.run.step === 'pick') g.rewardHtml();
    assert.equal(json(b), state); assert.equal(g.run.seed, rng); assert.equal(b.prepared, prepared);
  };
  checkCloseAndRedraw();
  g.keepDealing(b.id); checkCloseAndRedraw();
  pick(g); checkCloseAndRedraw();
  pick(g); checkCloseAndRedraw();
  g.commitDeal(b.id); assert.equal(g.run.deal.definition, b.prepared);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { game, pick } from './helpers/solitaire.mjs';

const json = (v) => JSON.stringify(v);
const freeze = (v) => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
// Explicit synthetic rule fixture: a unique 52-card deck whose table has
// a known structural route. Production never rerolls/arranges a deal.
function arranged(g, layout = 0, options = {}) {
  const p = JSON.parse(json(g.prepareDeal({ n: 4, target: 1050, curses: [], hex: -1, layout, ...options })));
  const board = g.dealState(p), route = [];
  while (route.length < 28) { const i = g.opens(board)[0]; assert.notEqual(i, undefined); route.push(i); board.slots[i] = -1; }
  const used = [0], table = Array(28);
  route.forEach((i, k) => { const rank = (k + 1) % 13; const card = Array.from({ length: 52 }, (_, i) => i).find((c) => c % 13 === rank && !used.includes(c)); used.push(card); table[i] = card; });
  Object.assign(p, { table, pile: [0], stock: Array.from({ length: 52 }, (_, i) => i).filter((c) => !used.includes(c)), eaten: [], enchantments: Array(28).fill(null) });
  p.deck = p.table.concat(p.pile, p.stock);
  return { p: freeze(p), route };
}
function scoring(type, { hex = false, streak = 4 } = {}) {
  const g = game(), d = g.run.deal;
  const i = g.opens(d)[0];
  Object.assign(g.run.have, { ember: 1, kindred: 1, clover: 1 });
  Object.assign(d, { pile: [0], streak, curses: hex ? ['hex'] : [], hex: hex ? 0 : -1 });
  d.slots[i] = 1; d.enchantments[i] = type;
  return { g, d, i };
}

test('exact multiplier order: Ember/Kindred card points, Clover and Treasure stay separate; delayed streak has no milestone payout', () => {
  for (const [type, points, carried] of [['treasure', 210, 5], ['points', 290, 5], ['streak', 170, 10]]) {
    const { g, d, i } = scoring(type);
    const e = g.play(i).find((e) => e.t === 'play');
    assert.equal(e.normal, 120); assert.equal(e.pts, points); assert.equal(d.score, points); assert.equal(d.streak, carried);
    assert.equal(e.clover, true); assert.equal(d.enchantments[i], null); assert.equal(d.best, carried);
    assert.match(d.lastScore, /Clover/);
    if (type === 'streak') {
      const j = g.opens(d)[0]; d.slots[j] = 2; d.enchantments[j] = null;
      assert.equal(g.play(j).find((e) => e.t === 'play').pts, 240); // n=11, Ember 1, Kindred 2; no Clover
    }
  }
  const { g, d, i } = scoring('streak', { streak: 2 });
  const e = g.play(i).find((e) => e.t === 'play');
  assert.equal(e.pts, 80); assert.equal(e.clover, false); assert.equal(d.streak, 6);
});

test('Hex resets before either multiplier and Kindred remains active; Wild triggers; Fireball destroys without scoring', () => {
  for (const type of ['treasure', 'points', 'streak']) {
    const { g, d, i } = scoring(type, { hex: true, streak: 14 }); d.charges.wild = 1;
    const e = g.cast('wild', i).find((e) => e.t === 'play');
    assert.equal(e.streak, 1); assert.equal(e.pts, type === 'points' ? 80 : 40); assert.equal(d.streak, type === 'streak' ? 2 : 1);
    assert.equal(e.clover, false);
    const fire = scoring(type); fire.d.charges.fireball = 1;
    const b = fire.g.cast('fireball', fire.i).find((e) => e.t === 'burn');
    assert.equal(b.enchantment, type); assert.equal(fire.d.score, 0); assert.equal(fire.d.streak, 4); assert.equal(fire.d.enchantments[fire.i], null);
  }
});

test('Rewind restores enchantment, best/progress, score and seen faces; casts/charges stay spent and replay cannot farm points', () => {
  const { g, d, i } = scoring('streak'); d.charges.rewind = 2;
  const before = d.score;
  g.play(i); d.up[0] = true; assert.equal(d.best, 10);
  g.cast('rewind'); assert.equal(d.best, 0); assert.equal(d.score, before); assert.equal(d.streak, 4); assert.equal(d.enchantments[i], 'streak');
  assert.equal(d.up[0], true); assert.equal(d.casts, 1); assert.equal(d.charges.rewind, 1);
  g.play(i); assert.equal(d.score, 170); assert.equal(d.streak, 10);
});

test('normal draw drops a boost, Echo carries it, and Undraw restores it with Toll and undo conventions', () => {
  for (const echo of [false, true]) {
    const { g, d, i } = scoring('streak');
    d.curses = ['toll']; d.charges.echo = 1; d.charges.undraw = 1;
    g.play(i); const score = d.score;
    if (echo) g.cast('echo'); else g.draw();
    assert.equal(d.streak, echo ? 10 : 0); assert.equal(d.score, score - 15);
    g.cast('undraw'); assert.equal(d.streak, 10); assert.equal(d.score, score); assert.equal(d.enchantments[i], null);
    assert.equal(d.casts, echo ? 2 : 1);
  }
});

test('last-card boost updates longest without inventing card/peak/stock/Clover awards; target qualification stays ordinary', () => {
  const g = game(), d = g.run.deal;
  d.slots.fill(-1); d.slots[0] = 1; d.up.fill(true); d.enchantments.fill(null); d.enchantments[0] = 'streak';
  Object.assign(d, { pile: [0], streak: 4, score: 0, target: 400, stock: [3], peaks: 2 });
  const ev = g.play(0);
  assert.equal(d.score, 320); assert.equal(d.streak, 10); assert.equal(g.run.longest, 10);
  assert.equal(ev.filter((e) => e.t === 'peak').length, 1); assert.equal(g.run.hearts, 2.5); assert.equal(g.run.reward.total, 1);
});

test('introductions, occurrence cap, graph spacing and immutable consumption hold through endless; Second Deck contains ordinary cards', () => {
  const g = game();
  for (let n = 1; n <= 30; n++) {
    const p = g.prepareDeal({ n, target: 700, curses: [], hex: -1, layout: n % 7 });
    const types = p.enchantments.filter(Boolean);
    assert.equal(types.length, n === 1 ? 0 : n <= 4 ? 1 : 2); assert.ok(types.filter((x) => x === 'streak').length <= 1);
    if (n === 2) assert.equal(types[0], 'treasure'); if (n === 3) assert.equal(types[0], 'points'); if (n === 4) assert.equal(types[0], 'streak');
    const positions = p.enchantments.flatMap((v, i) => v ? [i] : []);
    const path = (a, b) => a === b || p.layoutDefinition.slots[a].over.some((i) => path(i, b));
    if (positions.length === 2) assert.ok(!path(...positions) && !path(...positions.slice().reverse()));
    assert.ok(Object.isFrozen(p.enchantments));
  }
  const { g: a, d, i } = scoring('treasure'); a.run.have.deck = 1; d.refills = 1;
  a.play(i); d.stock = []; a.draw();
  assert.equal(d.enchantments[i], null); assert.ok(d.stock.every(Number.isInteger));
});

test('Inspect shares combined beneficial/harmful explanations and never leaks covered badges; Moonlight reveals without unlocking', () => {
  const g = game(); g.run.next = g.prepareDeal({ n: 4, target: 1050, curses: ['seal', 'hex'], hex: 0, layout: 0 }); g.startDeal();
  const d = g.run.deal; d.slots[1] = 1; d.enchantments[1] = 'streak';
  assert.ok(!g.inspectWords(d, 1).includes('Double Streak'));
  d.charges.moonlight = 1; g.cast('moonlight');
  const before = json(d), text = g.inspectWords(d, 1);
  assert.match(text, /Double Streak/); assert.match(text, /Hex/); assert.match(text, /Lock/); assert.match(text, /West Peak and East Peak/);
  assert.equal(g.sealed(d, 1), true); assert.equal(json(d), before);
  const source = readFileSync(new URL('../solitaire.js', import.meta.url), 'utf8');
  assert.match(source, /Inspect cards \(no play\)/); assert.match(source, /\.ss-inspect, input, textarea, select/);
});

test('contract structural filters: deal four/endless, owned charges including Spellbook, single-tip/Seal and Moths/Second Deck exclusions', () => {
  const g = game();
  const prep = (n, layout = 0, curses = []) => g.prepareDeal({ n, layout, curses, target: 1050, hex: -1 });
  for (const n of [1, 2, 3]) assert.equal(g.contractPool(prep(n)).length, 0);
  for (const n of [4, 8, 14, 21]) assert.ok(g.contractPool(prep(n)).some((c) => c.id === 'thread'));
  assert.ok(!g.contractPool(prep(4)).some((c) => ['touch', 'spark'].includes(c.id)));
  assert.ok(!g.contractPool(prep(4, 3)).some((c) => c.id === 'peak'));
  assert.ok(!g.contractPool(prep(4, 0, ['seal'])).some((c) => c.id === 'peak'));
  assert.ok(!g.contractPool(prep(4, 0, ['moths'])).some((c) => c.id === 'reserve'));
  g.run.have.deck = 1; assert.ok(!g.contractPool(prep(4)).some((c) => c.id === 'reserve'));
  g.run.extra.dispel = 1; assert.ok(g.contractPool(prep(4)).some((c) => c.id === 'spark' && c.spell === 'dispel'));
});

test('real deterministic search proves and replays an actual immutable seeded deal without touching live state/RNG', async () => {
  const g = game(415), p = g.prepareDeal({ n: 4, target: 1050, curses: ['hex'], hex: 1, layout: 0 });
  const before = json(g.run), definition = json(p);
  const opts = { timeoutMs: 10000, yield: async () => {} };
  const a = await g.searchContracts(p, opts), b = await g.searchContracts(p, opts);
  assert.equal(a.reason, 'proven'); assert.equal(json(a), json(b)); assert.ok(g.replayWitness(p, a.proof));
  assert.equal(json(p), definition); assert.equal(json(g.run), before); assert.ok(Object.isFrozen(a.proof.actions));
  const forged = JSON.parse(json(a.proof)); forged.actions[0] = { type: 'cast', id: 'wild', i: 0 }; assert.equal(g.replayWitness(p, forged), null);
  forged.rulesVersion = 'old'; assert.equal(g.replayWitness(p, forged), null);
});

test('search yields and safely suppresses timeout, cancellation, budget exhaustion and unsupported mechanics', async () => {
  const g = game(415), { p } = arranged(g); const before = json(g.run); let yields = 0;
  for (const [options, reason] of [[{ nodeBudget: 0 }, 'budget'], [{ cancelled: () => true }, 'cancelled'], [{ timeoutMs: 0 }, 'timeout']]) {
    const r = await g.searchContracts(p, options); assert.equal(r.proof, null); assert.equal(r.reason, reason);
  }
  const r = await g.searchContracts(p, { yield: async () => { yields++; }, cancelled: () => yields >= 2 });
  assert.equal(r.reason, 'cancelled'); assert.ok(yields >= 2);
  const unknown = JSON.parse(json(p)); unknown.enchantments[0] = 'lantern';
  assert.equal((await g.searchContracts(unknown)).reason, 'unsupported');
  assert.equal(json(g.run), before);
});

test('ownership alone cannot prove Light Touch/Keep a Spark: an unusable Dispel is rejected even on a sweep witness', () => {
  const g = game(); g.run.spells.dispel = 1;
  const { p, route } = arranged(g);
  for (const id of ['touch', 'spark']) {
    const candidate = g.contractPool(p).find((c) => c.id === id);
    const proof = { definitionId: p.id, rulesVersion: g.RULES_VERSION, candidate, actions: route.map((i) => ({ type: 'play', i })) };
    assert.equal(g.replayWitness(p, proof), null);
  }
});

test('witness and live transitions agree for all nine spells, reorder, all multipliers, Hex, Toll, safe Seal, stock refill and every layout', () => {
  for (let layout = 0; layout < 7; layout++) {
    const g = game(415); Object.keys(g.SPELLS).forEach((id) => { g.run.spells[id] = id === 'moonlight' ? 1 : 3; });
    Object.assign(g.run.have, { deck: 1, ember: 1, kindred: 1, clover: 1, twin: 1, crystal: 2 });
    const { p: original, route } = arranged(g, layout, { curses: g.LAYOUTS[layout].sealGroups.length ? ['seal', 'hex', 'toll'] : ['hex', 'toll'], hex: 1 });
    const fixture = JSON.parse(json(original)); ['treasure', 'points', 'streak'].forEach((v, k) => { fixture.enchantments[route[k + 3]] = v; });
    const p = freeze(fixture); g.run.next = p; g.startDeal(); const sim = g.simulationOf(p);
    const actions = [{ type: 'cast', id: 'moonlight' }, { type: 'cast', id: 'scry' }, { type: 'reorder', cards: p.stock.slice(-3) },
      { type: 'cast', id: 'nudge', i: 1 }, { type: 'cast', id: 'dispel', i: 'hex' },
      { type: 'cast', id: 'wild', i: route[0] }, { type: 'cast', id: 'rewind' },
      { type: 'cast', id: 'fireball', i: route[0] }, { type: 'cast', id: 'rewind' },
      { type: 'cast', id: 'echo' }, { type: 'cast', id: 'undraw' }];
    const witnessActions = [];
    const check = (action) => {
      const liveEvents = g.transition(g.run, action), simEvents = g.transition(sim, action);
      assert.ok(liveEvents.length && !liveEvents.some((e) => e.t === 'deny'), json(action));
      const omit = (d) => { const { definition, contractPaid, ...rest } = d; return rest; };
      assert.equal(json(omit(g.run.deal)), json(omit(sim.deal)), json(action));
      if (!sim.deal.over) assert.equal(g.run.seed, sim.seed); // live settlement alone rolls the subsequent reward offer
      assert.ok(simEvents.length);
      witnessActions.push(action);
      if (action.id === 'scry') {
        const before = json(sim); assert.equal(g.transition(sim, { type: 'draw' }).length, 0); assert.equal(json(sim), before);
      }
    };
    actions.forEach(check);
    // Refill path, including deterministic shuffle: the preceding casts
    // have left all table cards in place, so stock exhaustion is safe.
    while (g.run.deal.stock.length) check({ type: 'draw' });
    check({ type: 'draw' }); assert.equal(sim.deal.refills, 0);
    check({ type: 'cast', id: 'wild', i: route[0] });
    route.slice(1).forEach((i) => check({ type: 'play', i }));
    const candidate = g.contractPool(p).find((c) => c.id === 'thread');
    const proof = { definitionId: p.id, rulesVersion: g.RULES_VERSION, candidate, actions: witnessActions };
    const replay = g.replayWitness(p, proof);
    assert.ok(replay); assert.equal(json(replay.deal), json(sim.deal));
  }
});

test('all contract objectives replay full sweep witnesses through exact pinned definitions and live play', () => {
  for (const id of ['thread', 'peak', 'reserve', 'touch', 'spark']) {
    const g = game(); g.run.spells.nudge = 1;
    const { p, route } = arranged(g); const candidate = g.contractPool(p).find((c) => c.id === id && (c.id !== 'peak' || c.tip === route.find((i) => p.layoutDefinition.tips.some((t) => t.slot === i))));
    const proof = { definitionId: p.id, rulesVersion: g.RULES_VERSION, candidate, actions: route.map((i) => ({ type: 'play', i })) };
    const replay = g.replayWitness(p, proof); assert.ok(replay, id);
    g.run.next = p; g.startDeal(); g.run.deal.contract = candidate;
    proof.actions.forEach((action) => g.transition(g.run, action));
    assert.equal(g.run.deal.score, replay.deal.score); assert.equal(g.run.deal.contractPaid, candidate.bonus); assert.equal(g.run.deal.stock.length, 23);
    const score = g.run.score; g.endDeal(true); assert.equal(g.run.score, score);
  }
});

test('first-peak failure and boosted progress rewind; every charge spent including Fireball/Rewind/information remains counted', () => {
  const g = game(); const d = g.run.deal; d.slots.fill(-1); d.slots[0] = 1; d.slots[1] = 2; d.slots[2] = 4; d.up.fill(true);
  Object.assign(d, { pile: [0], charges: { ...d.charges, fireball: 2, rewind: 2, scry: 1 } });
  const c = { id: 'peak', tip: 1, bonus: 75 }; d.contract = c;
  g.cast('fireball', 0); assert.equal(g.contractMet(d, c), false); assert.equal(d.firstPeak, 0);
  g.cast('rewind'); assert.equal(d.firstPeak, null); assert.equal(d.casts, 2);
  g.cast('fireball', 1); assert.equal(g.contractMet(d, c), true); g.cast('scry'); assert.equal(d.casts, 4);
  g.cast('rewind'); assert.equal(d.firstPeak, null); assert.equal(d.casts, 5);
});

test('completed losing deals can pay Thread/Peak once without rescuing target/hearts; unfinished banking never pays', () => {
  for (const id of ['thread', 'peak']) {
    const g = game(); Object.assign(g.run.deal, { target: 9999, score: 100, best: 8, firstPeak: 0, contract: { id, tip: 0, bonus: 75 } });
    g.endDeal(false); assert.equal(g.run.score, 175); assert.equal(g.run.hearts, 2); assert.equal(g.run.deal.reached, false);
    g.endDeal(false); assert.equal(g.run.score, 175);
  }
  const g = game(); g.run.mode = 'endless'; Object.assign(g.run.deal, { score: 100, best: 8, contract: { id: 'thread', bonus: 75 } });
  g.endRun(); assert.equal(g.run.score, 100); assert.ok(!g.run.deal.contractPaid);
});

test('combined reward flow retains proof and immutable resources through decisions/reopen; stale actions cannot reroll or duplicate', async () => {
  const g = game(415); g.run.deal.n = 3; g.run.deal.score = 9999; g.endDeal(true); const b = g.run.reward;
  pick(g); assert.equal(b.remaining, 1); assert.equal(b.prepared, null); pick(g);
  assert.equal(b.contractDecision, 'searching'); const definition = json(b.prepared), seed = g.run.seed;
  for (let i = 0; b.contractDecision === 'searching' && i < 500; i++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.notEqual(b.contractDecision, 'searching'); assert.equal(json(b.prepared), definition); assert.equal(g.run.seed, seed);
  const before = json(b); g.closeWindow(); assert.equal(json(b), before);
  if (b.contractOffer) {
    assert.equal(g.commitDeal(b.id).length, 0); assert.equal(g.startDeal().length, 0);
    assert.equal(g.decideContract('stale', true).length, 0); assert.ok(g.decideContract(b.id, true).length);
    assert.equal(g.decideContract(b.id, false).length, 0);
  } else assert.match(g.rewardHtml(), /No contract for this deal/);
  assert.ok(g.commitDeal(b.id).length); assert.equal(json(g.run.deal.definition), definition); assert.equal(g.commitDeal(b.id).length, 0);
  assert.equal(g.run.seed, seed);
});

test('starting during search cancels it; missing proof has immediate Deal fallback and preserves completed resources', async () => {
  const g = game(); g.run.deal.n = 3; g.endDeal(false); const b = g.run.reward; pick(g);
  const p = b.prepared; assert.equal(b.contractDecision, 'searching'); assert.ok(g.commitDeal(b.id).length);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(b.status, 'started'); assert.equal(g.run.deal.contract, null); assert.equal(g.run.deal.definition, p); assert.equal(b.contractDecision, 'none');
});

test('new score identity retains old bests/longest/trophy byte-for-byte and stores versioned records separately', () => {
  const legacy = { best: { score: 8888, won: true }, endless: { score: 9999 }, longest: 88, won: { at: 1, times: 4 } };
  const g = game(1, { 'kasai:solitaire': legacy }); g.run.score = 123; g.run.longest = 10; g.finishRun(true);
  assert.equal(json(g.saved['kasai:solitaire']), json(legacy)); assert.equal(g.bestRun('run').score, 123);
  assert.equal(g.saved[g.STORE_KEY].best.rulesVersion, g.RULES_VERSION); assert.equal(g.saved[g.STORE_KEY].longest, 10);
});

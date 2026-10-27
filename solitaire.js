/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - SPELL SOLITAIRE  (a game in the Games window)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. What the wizard says, the words on
   the spell, charm and curse cards, which artwork each rank wears and
   the drawings for the cards live in content.js under "solitaire"; the
   wizard wears his own drawings (wizard.frames), stand-ins and all.
   apps.js fetches this file the first time the game opens.

   TriPeaks with spells. One to five named peaks, uncovered cards face up:
   play any uncovered card one rank above or below the top of the pile
   (Kings and Aces go round), or draw from the stock. Every card in an
   unbroken streak is worth more than the last, a draw ends the streak,
   and clearing a peak pays a bonus. A run is seven deals, each with a
   target: a deal under its target costs a heart (half for a sweep), and the Final Deal
   must be beaten. Between deals you pick a spell (Wild, Fireball, Echo,
   Rewind, Moonlight, Scry, Undraw, Nudge or Dispel) or a charm, and from the fourth
   deal on curses join in. Beat the Final Deal to complete the run, then
   keep dealing for as long as your hearts last. Nothing is ever timed.
   Each visitor's best is kept.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  if (!K || K.solitaire) return;
  const C = K.C || {};
  const { esc, doodleIcon, plural } = K;
  const S = C.solitaire || {};
  const RM = K.REDUCE_MOTION;

  /* ---------- the rules, in numbers ---------- */
  const STORE_KEY = 'kasai:solitaire'; // { best: { score, deal, won, streak, at }, endless: { score, deal, at }, longest, won: { at, times } }
  const DEALS = 7;               // a run: six deals, then the Final Deal
  const TARGETS = [700, 850, 1000, 1050, 1150, 1250, 1600]; // the points each deal must reach (deals 4 to 7 are cursed too)
  const GROW = 1.08;             // endless: every deal's target this much higher than the last
  const HEARTS = 3;              // at the start of a run
  const MOST_HEARTS = 5;         // the Healing Potion stops offering itself here
  const CARD = 10;               // a card scores this times its place in the streak (10, 20, 30...)
  const peakPoints = (cleared, count, twin) => (cleared === count - 1 ? 250 : 100) * (twin ? 2 : 1);
  const LEFT_OVER = 20;          // each card still in the stock after a clean sweep
  const WIN = 500;               // beating the Final Deal...
  const PER_HEART = 100;         // ...and each heart left then
  const CHARGES = 3;             // the most charges a spell can have each deal (Moonlight: one)
  const START = {};              // the spells a run starts with (charges a deal): none, so the first deal is plain TriPeaks
  const TOLL = 15;               // the Toll: what every draw costs
  const MOTHS = 11;              // the Moths: how many of the stock's 23 cards they eat
  const REFILL = 12;             // the Second Deck: how many cards from the pile it shuffles back

  /* ---------- the cards ----------
     52, numbered 0 to 51: four suits of thirteen, Ace (1) to King (13).
     There's no Hearts suit, because hearts are lives. Every suit has its
     own colour and a filled doodle, so colour is never the only clue. */
  const SUITS = [
    { id: 'flames', name: 'Flames', colour: 'coral' },
    { id: 'stars', name: 'Stars', colour: 'yellow' },
    { id: 'moons', name: 'Moons', colour: 'blue' },
    { id: 'leaves', name: 'Leaves', colour: 'teal' },
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_NAMES = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const suitOf = (c) => Math.floor(c / 13);
  const rankOf = (c) => (c % 13) + 1;

  /* ---------- the layouts ----------
     over is the explicit list of cards that must leave before this slot.
     under is its inverse, never a second source of rules. Legacy layouts
     retain their overlap graph. New layouts separate rows and draw every
     dependency, so a broad fan need not pretend to physically overlap. */
  const PLACES = 28;
  function makeLayout(id, name, rows, tips, coverage, sealGroups = [], connected = false) {
    const slots = [];
    rows.forEach((xs, y) => xs.forEach((x) => slots.push({ x, y, over: [], under: [] })));
    slots.forEach((s, i) => {
      s.over = coverage ? coverage[i].slice() : slots.flatMap((t, j) => t.y === s.y + 1 && Math.abs(t.x - s.x) < 1 ? [j] : []);
      s.over.forEach((j) => slots[j].under.push(i));
    });
    const layout = { id, name, slots, tips: tips.map((name, slot) => ({ slot, name })), sealGroups,
      width: Math.max(...slots.map((s) => s.x)) + 1, depth: rows.length, rowScale: connected ? 1.65 : 0.7, connected };
    validateLayout(layout);
    return layout;
  }

  // Reject orphan cards and circular locks before dealing. Simulating
  // structural removals with all locks active proves the combined locks
  // can release; individual guard paths must also avoid every sealed slot.
  function validateLayout(l) {
    const fail = (why) => { throw new Error(`${l.name}: ${why}`); };
    const valid = (i) => Number.isInteger(i) && i >= 0 && i < PLACES;
    if (l.slots.length !== PLACES || new Set(l.slots.map((s) => `${s.x},${s.y}`)).size !== PLACES) fail('28 unique slots required');
    if (l.slots.some((s) => !Number.isFinite(s.x) || s.x < 0 || !Number.isInteger(s.y) || s.y < 0)) fail('invalid coordinates');
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(l.id) || l.width !== Math.max(...l.slots.map((s) => s.x)) + 1 || l.depth !== Math.max(...l.slots.map((s) => s.y)) + 1 || !Number.isFinite(l.rowScale) || l.rowScale <= 0) fail('invalid layout dimensions or ID');
    const roots = l.slots.flatMap((s, i) => !s.under.length ? [i] : []);
    if (l.tips.length < 1 || l.tips.length > 5 || new Set(l.tips.map((t) => t.slot)).size !== l.tips.length || new Set(l.tips.map((t) => t.name)).size !== l.tips.length || l.tips.some((t) => !valid(t.slot) || !t.name.trim()) || roots.length !== l.tips.length || roots.some((i) => !l.tips.some((t) => t.slot === i))) fail('incorrect named tips');
    const visited = new Set(), active = new Set();
    function visit(i) {
      if (active.has(i)) fail('coverage cycle');
      if (visited.has(i)) return;
      active.add(i);
      const s = l.slots[i];
      if (new Set(s.over).size !== s.over.length) fail('duplicate coverage');
      s.over.forEach((j) => {
        if (!valid(j) || !l.slots[j].under.includes(i)) fail('invalid coverage inverse');
        visit(j);
      });
      if (s.under.some((j) => !valid(j) || !l.slots[j].over.includes(i))) fail('invalid coverage inverse');
      active.delete(i); visited.add(i);
    }
    l.tips.forEach((t) => visit(t.slot));
    if (visited.size !== PLACES) fail('orphan card');
    const locked = new Set(l.sealGroups.flatMap((g) => g.cards));
    l.sealGroups.forEach((g) => {
      if (!g.cards.length || !g.cards.some((i) => l.tips.some((t) => t.slot === i)) || new Set(g.cards).size !== g.cards.length || g.cards.some((i) => !valid(i)) || g.guards.length !== 2 || new Set(g.guards).size !== 2 || g.guards.some((i) => !l.tips.some((t) => t.slot === i) || locked.has(i))) fail('unsafe Seal group');
      const path = (i) => { if (locked.has(i)) fail('Seal guard depends on a lock'); l.slots[i].over.forEach(path); };
      g.guards.forEach(path);
    });
    const left = new Set(l.slots.map((_, i) => i));
    while (left.size) {
      const available = [...left].filter((i) => l.slots[i].over.every((j) => !left.has(j)) && !l.sealGroups.some((g) => g.cards.includes(i) && g.guards.some((j) => left.has(j))));
      if (!available.length) fail('Seal deadlock');
      available.forEach((i) => left.delete(i));
    }
    return true;
  }

  const threeNames = ['West Peak', 'Central Peak', 'East Peak'];
  const classicSeal = [{ cards: [1, 5, 6], guards: [0, 2] }];
  // Explicit, balanced fans: each lower card belongs to at least one
  // upper route. At wing boundaries a shared card is a genuine junction.
  function fanLayout(id, name, counts, names, seal = false) {
    const width = Math.max(...counts);
    const rows = counts.map((n) => Array.from({ length: n }, (_, i) => (width - n) / 2 + i));
    const coverage = Array.from({ length: PLACES }, () => []);
    let offset = 0;
    counts.slice(0, -1).forEach((n, r) => {
      const next = counts[r + 1], start = offset + n;
      for (let j = 0; j < next; j++) {
        const owner = Math.min(n - 1, Math.floor(j * n / next));
        coverage[offset + owner].push(start + j);
        if (j > 0 && owner > Math.floor((j - 1) * n / next)) coverage[offset + owner - 1].push(start + j);
      }
      offset = start;
    });
    return makeLayout(id, name, rows, names, coverage, seal ? [{ cards: [1], guards: [0, names.length - 1] }] : [], true);
  }
  const LAYOUTS = [
    makeLayout('three-peaks', 'Three Peaks', [[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], threeNames, null, classicSeal),
    makeLayout('starlit-gate', 'Starlit Gate', [[1.5, 5, 8.5], [1, 2, 4.5, 5.5, 8, 9], [0.5, 1.5, 2.5, 4.5, 5.5, 7.5, 8.5, 9.5], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], threeNames, null, classicSeal),
    makeLayout('terraces', 'Terraces', [[1.5, 4.5, 7.5], [0.6, 2.4, 4, 5, 6.6, 8.4], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5]], threeNames, null, classicSeal),
    fanLayout('crown', 'Crown', [1, 9, 9, 9], ['Crown']),
    fanLayout('crescent', 'Crescent', [2, 8, 9, 9], ['West Wing', 'East Wing']),
    fanLayout('forked-paths', 'Forked Paths', [4, 6, 9, 9], ['West Summit', 'West Central Summit', 'East Central Summit', 'East Summit'], true),
    fanLayout('five-towers', 'Five Towers', [5, 6, 8, 8, 1], ['West Tower', 'West Central Tower', 'Central Tower', 'East Central Tower', 'East Tower'], true),
  ];
  const layoutOf = (d) => LAYOUTS[d.layout || 0];
  const slotsOf = (d) => layoutOf(d).slots;
  const tipOf = (d, i) => layoutOf(d).tips.find((t) => t.slot === i);
  const sealWords = (d) => layoutOf(d).sealGroups.map((g) => g.guards.map((i) => tipOf(d, i).name).join(' and ')).join('; ');

  /* ---------- spells ----------
     Each pick of a spell is one more charge of it in every deal (up to
     CHARGES); they're all back at the start of the next deal. Wild and
     Fireball are cast on a card. step: where its cast sound starts. */
  const SPELLS = {
    wild: { key: 'w', icon: 'wild', colour: 'pink', step: 0, name: 'Wild', blurb: 'Play any uncovered card, whatever its rank. The streak carries on.', aim: true },
    fireball: { key: 'f', icon: 'fireball', colour: 'coral', step: 2, name: 'Fireball', blurb: 'Burn an uncovered card away. The streak carries on, and a peak still pays.', aim: true },
    echo: { key: 'e', icon: 'echo', colour: 'blue', step: 4, name: 'Echo', blurb: 'Draw a card without breaking your streak.' },
    rewind: { key: 'r', icon: 'rewind', colour: 'teal', step: 6, name: 'Rewind', blurb: 'Take back your last play.' },
    moonlight: { key: 'm', icon: 'moonlight', colour: 'lavender', step: 8, name: 'Moonlight', blurb: 'Every face-down card turns face up for this deal.', most: 1 },
    scry: { key: 's', icon: 'scry', colour: 'yellow', step: 5, name: 'Scry', blurb: 'See the next three cards of the stock, and put them back in any order.' },
    undraw: { key: 'u', icon: 'undraw', colour: 'grey', step: 3, name: 'Undraw', blurb: 'Take back your last draw: the streak comes back, and the card goes under the stock.' },
    nudge: { key: 'n', icon: 'nudge', colour: 'teal', step: 5, name: 'Nudge', blurb: 'Shift the pile’s top rank up or down by one. Its suit and your streak stay the same.' },
    dispel: { key: 'x', icon: 'dispel', colour: 'lavender', step: 7, name: 'Dispel', blurb: 'Remove one chosen curse for this deal.' },
  };
  const SPELL_IDS = Object.keys(SPELLS);

  /* ---------- charms (pick one instead of a spell; they last the run) ---------- */
  const CHARMS = {
    ember: { icon: 'ember', colour: 'coral', name: 'Ember', blurb: 'Streaks start a step higher: 20, 30, 40...', most: 1 },
    twin: { icon: 'peaks', colour: 'lavender', name: 'Twin Peaks', blurb: 'Peak bonuses are doubled.', most: 1 },
    kindred: { icon: 'kindred', colour: 'pink', name: 'Kindred', blurb: 'A card played on its own suit scores double. Changing suit keeps your streak; the Hex curse still applies.', most: 1 },
    crystal: { icon: 'crystal', colour: 'blue', name: 'Crystal Ball', blurb: 'See the top card of the stock (two with a second ball).', most: 2 },
    deck: { icon: 'deck', colour: 'teal', name: 'Second Deck', blurb: `Once a deal, an empty stock gets ${REFILL} cards back from the pile.`, most: 1 },
    potion: { icon: 'potion', colour: 'pink', name: 'Healing Potion', blurb: 'One more heart, and all your hearts back.' },
    spellbook: { icon: 'book', colour: 'yellow', name: 'Spellbook', blurb: 'Each clean sweep gives a free spell charge for the next deal.', most: 1 },
    clover: { icon: 'clover', colour: 'teal', name: 'Lucky Clover', blurb: 'Every fifth consecutive play scores 50 extra points.', most: 1 },
    hearth: { icon: 'hearth', colour: 'coral', name: 'Hearthstone', blurb: 'A clean sweep that reaches its target restores an extra half-heart.', most: 1 },
  };
  const CHARM_IDS = Object.keys(CHARMS);

  /* ---------- curses (one on each of deals 4 to 6, two on the Final Deal) ---------- */
  const CURSES = {
    circle: { icon: 'circle', name: 'Broken Circle', blurb: "Kings and Aces don't connect." },
    seal: { icon: 'seal', name: 'Seal', blurb: 'Locked cards open after the two named guard peaks are cleared.' },
    moths: { icon: 'moth', name: 'Moths', blurb: `${MOTHS} fewer cards in the stock.` },
    hex: { icon: 'hex', name: 'Hex', blurb: 'One suit still scores, but starts the streak again.' },
    toll: { icon: 'coin', name: 'Toll', blurb: `Every draw costs ${TOLL} points.` },
  };
  const CURSE_IDS = Object.keys(CURSES);

  // The names and blurbs can be reworded in content.js.
  const words = (id) => {
    const base = SPELLS[id] || CHARMS[id] || CURSES[id];
    const mine = ((SPELLS[id] ? S.spells : CHARMS[id] ? S.charms : S.curses) || {})[id] || {};
    const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
    return { name: text(mine.name, base.name), blurb: text(mine.blurb, base.blurb) };
  };

  /* ══════════════════════════════════════════════════════════════════════
     THE RULES
     ══════════════════════════════════════════════════════════════════════
     Everything below works out what happens and hands back a list of it
     (the events), and never touches the page, so it also runs on its own
     (the balance bots play it thousands of times). The window further
     down draws what each event says. */
  let run = null;   // the run being played (it waits while the window is shut)
  let view = null;  // the window it's drawn in, while that's open

  // A seeded random number generator (mulberry32): the same seed deals the
  // same run. Its state lives in the run. (What the wizard says, and which
  // artwork each rank wears, are left to Math.random: they change nothing.)
  function random() {
    let t = (run.seed = (run.seed + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rand = (n) => Math.floor(random() * n);
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const range = (n) => Array.from({ length: n }, (_, i) => i);

  const playing = () => !!(run && run.step === 'play' && run.deal && !run.deal.over);
  const cursed = (d, id) => d.curses.indexOf(id) !== -1;
  const topOf = (d) => d.pile[d.pile.length - 1];
  const pileFace = (d) => d.nudge == null ? topOf(d) : suitOf(topOf(d)) * 13 + d.nudge - 1;
  const free = (d, i) => Number.isInteger(i) && !!slotsOf(d)[i] && d.slots[i] >= 0 && slotsOf(d)[i].over.every((j) => d.slots[j] < 0);
  const sealed = (d, i) => cursed(d, 'seal') && layoutOf(d).sealGroups.some((g) => g.cards.includes(i) && g.guards.some((j) => d.slots[j] >= 0));
  const open = (d, i) => free(d, i) && !sealed(d, i);
  const opens = (d) => range(PLACES).filter((i) => open(d, i));
  // One rank either side of the pile's top card. Kings and Aces go round,
  // unless the Broken Circle is on the deal.
  const fits = (d, c) => {
    const gap = Math.abs(rankOf(c) - rankOf(pileFace(d)));
    return gap === 1 || (gap === 12 && !cursed(d, 'circle'));
  };
  const canDraw = (d) => d.stock.length > 0 || (d.refills > 0 && d.pile.length > 1);
  const finalDeal = (n) => n % DEALS === 0;
  const mostOf = (id) => SPELLS[id].most || CHARGES;
  const endless = () => !!(run && run.mode === 'endless');
  const targetOf = (n) => (n <= DEALS ? TARGETS[n - 1] : Math.round((TARGETS[DEALS - 1] * Math.pow(GROW, n - DEALS)) / 10) * 10);

  // The cards you can play right now (their places).
  function movesOf() {
    if (!playing()) return [];
    const d = run.deal;
    return opens(d).filter((i) => fits(d, d.slots[i]));
  }
  const stuck = () => !movesOf().length && !canDraw(run.deal);

  // Why a spell can't be cast now ('' when it can): on place i, for Wild
  // and Fireball (without one, whether any card would do).
  function why(id, i) {
    if (!playing()) return 'later';
    const d = run.deal;
    if (!(d.charges[id] > 0)) return 'none';
    if (SPELLS[id].aim) {
      if (i == null) return opens(d).length ? '' : 'nothing';
      return open(d, i) ? '' : free(d, i) ? 'sealed' : 'covered';
    }
    if (id === 'echo') return canDraw(d) ? '' : 'empty';
    if (id === 'rewind') return d.undo.length ? '' : 'nothing';
    if (id === 'scry') return d.stock.length ? '' : 'empty';
    if (id === 'undraw') return d.drawn ? '' : 'nothing';
    if (id === 'moonlight') return d.slots.some((c, k) => c >= 0 && !d.up[k]) ? '' : 'nothing';
    if (id === 'nudge') return d.pile.length ? '' : 'nothing';
    if (id === 'dispel') return d.curses.length ? '' : 'nothing';
    return 'later';
  }
  const usable = (id, i) => !why(id, i);
  // A deal that reached its target keeps it, whatever the Toll takes after.
  const madeIt = (d) => !!d.reached || d.score >= d.target;
  // Nothing left to try: no play, nothing to draw, and no spell that could
  // change that. The deal ends by itself then.
  const hopeless = () => stuck() && !usable('wild') && !usable('fireball') && !usable('rewind') && !usable('undraw') && !usable('nudge') && !usable('dispel');

  // A new run, from the first deal. seed: which run (the same one deals
  // the same cards), or none for a fresh one. Anything still being drawn
  // from the old run is stopped first, so none of it lands in the new one.
  function newRun(seed) {
    if (run && !run.recorded) quitRun(); // a run left halfway still counts
    hush();
    run = {
      mode: 'run',
      seed: (seed == null ? Math.floor(Math.random() * 4294967296) : Number(seed)) | 0,
      n: 1,
      score: 0,      // the deals before this one (and the bonus for a won run)
      hearts: HEARTS,
      max: HEARTS,
      spells: {},    // each spell's charges a deal
      extra: {},     // charges for the next deal only (the Spellbook's)
      have: {},      // charms
      // step: 'play' (a deal), 'pick' (a spell or a charm), 'over' or 'won'.
      step: 'play',
      deal: null,
      offer: null,
      next: null,    // the deal to come: its target and curses
      bag: [],       // the curses on deals 4 to 6, in order
      longest: 0,    // the longest streak
      sweeps: 0,
      made: 0,       // deals that reached their target
      faces: facesFor(),
    };
    SPELL_IDS.forEach((id) => { run.spells[id] = START[id] || 0; });
    CHARM_IDS.forEach((id) => { run.have[id] = 0; });
    run.bag = shuffle(CURSE_IDS.slice());
    run.next = planOf(1);
    return startDeal();
  }

  // What deal n will be: its target, and its curses (shown on the pick
  // card before it). Deals 4 to 6 take one each, all different; the Final
  // Deal takes two, never the Broken Circle with the Moths. Endless deals
  // take one (never the last deal's), and every seventh is a Final Deal.
  // The Hex picks its suit here too.
  function planOf(n) {
    const layouts = range(LAYOUTS.length).filter((id) => !run.deal || id !== run.deal.layout);
    const layout = n === 1 ? 0 : layouts[rand(layouts.length)];
    const compatible = CURSE_IDS.filter((id) => id !== 'seal' || LAYOUTS[layout].sealGroups.length);
    let curses = [];
    if (n > 3 && n < DEALS) {
      const used = run.earlyCurses || [];
      const preferred = run.bag[n - 4];
      const pool = compatible.filter((id) => !used.includes(id));
      curses = [pool.includes(preferred) ? preferred : pool[rand(pool.length)]];
      run.earlyCurses = used.concat(curses);
    }
    else if (finalDeal(n)) {
      const pairs = [];
      compatible.forEach((a, i) => compatible.slice(i + 1).forEach((b) => {
        if (!(a === 'circle' && b === 'moths')) pairs.push([a, b]);
      }));
      curses = pairs[rand(pairs.length)];
    } else if (n > DEALS) {
      const last = run.deal ? run.deal.curses : [];
      const pool = compatible.filter((id) => !(last.length === 1 && last[0] === id));
      curses = [pool[rand(pool.length)]];
    }
    return { n, target: targetOf(n), curses, hex: curses.indexOf('hex') !== -1 ? rand(SUITS.length) : -1, layout };
  }

  // Deal the cards: 28 into the peaks (the bottom row face up), one onto
  // the pile and the rest into the stock, less any the Moths eat.
  function startDeal() {
    const p = run.next;
    const cards = shuffle(range(52));
    const d = {
      n: p.n,
      target: p.target,
      curses: p.curses.slice(),
      hex: p.hex,
      layout: p.layout,
      slots: cards.slice(0, PLACES),       // the card at each place (-1 once it's gone)
      up: LAYOUTS[p.layout].slots.map((s) => !s.over.length), // uncovered cards face up
      pile: [cards[PLACES]],               // its top card last
      stock: cards.slice(PLACES + 1),      // its top card last
      charges: {},   // spells left to cast this deal
      eaten: [],
      burnt: [],
      undo: [],      // what Rewind can take back (since the last draw)
      drawn: null,   // what Undraw can take back: the last draw, until the next play, burn or cast
      nudge: null,   // enchanted pile rank; the actual deck remains unchanged
      seen: null,    // the cards Scry is showing, waiting to be put back in order
      score: 0,
      streak: 0,
      best: 0,       // the longest streak this deal
      peaks: 0,      // peaks cleared
      reached: false,
      refills: run.have.deck,
      over: false,
      swept: false,
    };
    if (cursed(d, 'moths')) d.eaten = d.stock.splice(0, MOTHS);
    SPELL_IDS.forEach((id) => { d.charges[id] = run.spells[id] + (run.extra[id] || 0); });
    run.extra = {};
    run.deal = d;
    run.next = null;
    run.offer = null;
    run.step = 'play';
    return [{ t: 'deal', n: d.n }];
  }

  // Play the card at place i onto the pile.
  function play(i) {
    if (!playing()) return [];
    const d = run.deal;
    if (!open(d, i)) return [{ t: 'deny', i, why: d.slots[i] >= 0 && free(d, i) ? 'sealed' : 'covered' }];
    if (!fits(d, d.slots[i])) return [{ t: 'deny', i, why: 'rank' }];
    return put(i, false);
  }

  // What a card scores as the next card of a streak, landing on `under`:
  // its place in the streak (a step higher for each Ember), double with
  // Kindred when it's the same suit. A card of the Hex's suit scores, but
  // starts the streak again. Also the streak after it.
  function scored(d, card, under, streak, have = run.have) {
    const hexed = cursed(d, 'hex') && d.hex >= 0 && suitOf(card) === d.hex;
    const s = hexed ? 1 : streak + 1;
    const kin = !!have.kindred && suitOf(card) === suitOf(under);
    const clover = !!have.clover && s % 5 === 0;
    return { pts: CARD * (s + (have.ember || 0)) * (kin ? 2 : 1) + (clover ? 50 : 0), streak: s, hexed, kin, clover };
  }

  // A card onto the pile, by a play or by Wild.
  function put(i, wild) {
    const d = run.deal;
    const ev = removeCard(d, i, run.have, wild ? 'wild' : 'play');
    run.longest = Math.max(run.longest, d.streak);
    return settle(ev);
  }

  // Isolated deterministic transition shared by live play, rule tests and
  // future search. Mutates only the supplied deal; callers own settlement,
  // resources, RNG and run records. Invalid actions never change the state.
  function removeCard(d, i, have, action = 'play') {
    if (!['play', 'wild', 'fireball'].includes(action) || d.over || !open(d, i) || (action === 'play' && !fits(d, d.slots[i]))) return [];
    keep(d, i);
    const card = d.slots[i];
    const sc = action === 'fireball' ? null : scored(d, card, topOf(d), d.streak, have);
    d.slots[i] = -1;
    let ev;
    if (sc) {
      d.pile.push(card); d.nudge = null; d.streak = sc.streak;
      d.best = Math.max(d.best, d.streak); d.score += sc.pts;
      ev = [{ t: 'play', i, card, ...sc, wild: action === 'wild' }];
    } else { d.burnt.push(card); ev = [{ t: 'burn', i, card }]; }
    gone(d, i, ev, have);
    if (!d.reached && d.score >= d.target) { d.reached = true; ev.push({ t: 'target' }); }
    return ev;
  }

  // Fireball: the card at place i burns away. It scores nothing and the
  // streak carries on; it uncovers cards, and a tip pays, as a play would.
  function burn(i) {
    const d = run.deal;
    return settle(removeCard(d, i, run.have, 'fireball'));
  }

  // Kept before every move on the peaks, for Rewind (and from then on the
  // last draw can't be taken back, nor Scry's cards put back).
  function keep(d, i) {
    d.drawn = null;
    d.seen = null;
    d.undo.push({ i, card: d.slots[i], slots: d.slots.slice(), pile: d.pile.slice(), nudge: d.nudge, burnt: d.burnt.slice(), score: d.score, streak: d.streak, peaks: d.peaks, reached: d.reached });
  }

  // A card has left place i: the cards it lay over may be uncovered (they
  // turn face up), a tip pays its peak's bonus, and the Seal may break.
  function gone(d, i, ev, have) {
    slotsOf(d)[i].under.forEach((j) => {
      if (d.slots[j] >= 0 && !d.up[j] && free(d, j)) {
        d.up[j] = true;
        ev.push({ t: 'flip', i: j, card: d.slots[j] });
      }
    });
    if (!tipOf(d, i)) return;
    const pts = peakPoints(d.peaks, layoutOf(d).tips.length, have.twin);
    d.peaks++;
    d.score += pts;
    ev.push({ t: 'peak', i, n: d.peaks, pts });
    if (cursed(d, 'seal') && layoutOf(d).sealGroups.some((g) => g.guards.includes(i) && g.guards.every((j) => d.slots[j] < 0) && g.cards.some((k) => d.slots[k] >= 0))) ev.push({ t: 'unseal' });
  }

  // After every move: the target, a clean sweep, or a deal with nothing
  // left to try (it ends by itself).
  function settle(ev) {
    const d = run.deal;
    if (!d.reached && d.score >= d.target) { d.reached = true; ev.push({ t: 'target' }); }
    if (d.slots.every((c) => c < 0)) return ev.concat(endDeal(true));
    if (hopeless()) return ev.concat(endDeal(false));
    return ev;
  }

  // A card from the stock onto the pile, which ends the streak (Echo's
  // draw keeps it). An empty stock is filled again from the pile once a
  // deal with the Second Deck (some of the pile, shuffled). With nothing
  // at all left to draw and no play, `end` (End deal) ends the deal; the
  // stock itself refuses while a spell could still play.
  function draw(echo, end) {
    if (!playing()) return [];
    const d = run.deal;
    const ev = [];
    if (!d.stock.length) {
      if (!(d.refills > 0 && d.pile.length > 1)) return (end && stuck()) || hopeless() ? endDeal(false) : [{ t: 'deny', why: 'empty' }];
      d.refills--;
      const top = d.pile.pop();
      d.stock = shuffle(d.pile).splice(0, REFILL);
      d.pile.push(top);
      ev.push({ t: 'refill', n: d.stock.length });
    }
    const card = d.stock.pop();
    d.pile.push(card);
    const broke = echo ? 0 : d.streak;
    const toll = cursed(d, 'toll') ? Math.min(TOLL, d.score) : 0;
    d.drawn = { card, streak: d.streak, toll, undo: d.undo, nudge: d.nudge }; // (for Undraw)
    d.nudge = null;
    d.seen = null;
    d.undo = [];
    if (!echo) d.streak = 0;
    d.score -= toll;
    ev.push({ t: 'draw', card, broke, echo: !!echo, toll, left: d.stock.length });
    return settle(ev);
  }

  // Undraw: the last draw taken back. The card goes under the stock (so
  // the next draw is a new one), the streak it broke and the Toll it took
  // come back, and so does what Rewind could take back before it. A
  // Second Deck refill stays shuffled.
  function undraw() {
    const d = run.deal;
    const s = d.drawn;
    d.drawn = null;
    d.pile.pop();
    d.stock.unshift(s.card); // (on top again instead: d.stock.push(s.card))
    d.streak = s.streak;
    d.nudge = s.nudge;
    d.score += s.toll;
    d.undo = s.undo;
    return settle([{ t: 'undraw', card: s.card, streak: d.streak, toll: s.toll, left: d.stock.length }]);
  }

  // Scry: the next three cards of the stock (fewer if that's all there
  // is), in draw order, next first. They wait in d.seen for reorder().
  function scry() {
    const d = run.deal;
    d.seen = d.stock.slice(-3).reverse();
    return [{ t: 'scry', cards: d.seen.slice() }];
  }
  // Scry's cards put back, `cards` in the order they'll be drawn (the
  // same cards Scry showed; anything else is refused).
  function reorder(cards) {
    if (!playing()) return [];
    const d = run.deal;
    const seen = d.seen;
    if (!seen || !Array.isArray(cards) || cards.length !== seen.length || seen.some((c) => cards.indexOf(c) === -1)) return [];
    d.seen = null;
    d.stock.splice(d.stock.length - cards.length, cards.length, ...cards.slice().reverse());
    return [{ t: 'reorder', cards: cards.slice(), moved: cards.some((c, k) => c !== seen[k]) }];
  }

  // Cast a spell (on place i, for Wild and Fireball).
  function cast(id, i) {
    if (!playing() || !SPELLS[id]) return [];
    const no = why(id, i);
    if (no) return [{ t: 'deny', spell: id, i, why: no }];
    const d = run.deal;
    if (id === 'nudge' && i !== -1 && i !== 1) return [];
    if (id === 'dispel' && !d.curses.includes(i)) return [];
    d.charges[id]--;
    const ev = [{ t: 'cast', spell: id, i }];
    if (id === 'undraw') return ev.concat(undraw());
    // Any other spell: the last draw can't be taken back from here on.
    d.drawn = null;
    d.seen = null;
    if (id === 'nudge') {
      d.nudge = ((rankOf(pileFace(d)) - 1 + i + 13) % 13) + 1;
      return ev.concat(settle([{ t: 'nudge', card: pileFace(d) }]));
    }
    if (id === 'dispel') {
      d.curses = d.curses.filter((curse) => curse !== i);
      if (i === 'hex') d.hex = -1;
      const restored = i === 'moths' ? d.eaten.length : 0;
      if (restored) { d.stock.unshift(...d.eaten); d.eaten = []; }
      return ev.concat(settle([{ t: 'dispel', curse: i, restored }]));
    }
    if (id === 'wild') return ev.concat(put(i, true));
    if (id === 'fireball') return ev.concat(burn(i));
    if (id === 'echo') return ev.concat(draw(true));
    if (id === 'rewind') return ev.concat(rewind());
    if (id === 'scry') return ev.concat(scry());
    // Moonlight: every card still face down turns up.
    const flipped = range(PLACES).filter((k) => d.slots[k] >= 0 && !d.up[k]);
    flipped.forEach((k) => { d.up[k] = true; });
    ev.push({ t: 'moonlight', flipped });
    return settle(ev);
  }

  // Rewind: the last move on the peaks since the last draw, taken back:
  // its card goes back where it was, and the points and the streak are as
  // they were. Cards it uncovered stay face up (they've been seen).
  function rewind() {
    const d = run.deal;
    const s = d.undo.pop();
    Object.assign(d, { slots: s.slots, pile: s.pile, nudge: s.nudge, burnt: s.burnt, score: s.score, streak: s.streak, peaks: s.peaks, reached: s.reached });
    return settle([{ t: 'rewind', i: s.i, card: s.card }]);
  }

  // The deal's over: a clean sweep (every card gone from the peaks), or
  // nothing left to try. A clean sweep pays for each card left in the
  // stock and, if it reaches the target, heals (plus a Spellbook charge).
  // A missed target costs half a heart for a sweep, otherwise a heart.
  // With none left, or on a Final
  // Deal, the run is over. A Final Deal beaten completes the run.
  function endDeal(swept) {
    const d = run.deal;
    if (!d || d.over) return [];
    d.over = true;
    d.swept = !!swept;
    const ev = [];
    if (swept) {
      const pts = d.stock.length * LEFT_OVER;
      d.score += pts;
      ev.push({ t: 'sweep', left: d.stock.length, pts });
      if (!d.reached && d.score >= d.target) { d.reached = true; ev.push({ t: 'target' }); }
      run.sweeps++;
      if (madeIt(d) && run.hearts < run.max) {
        const before = run.hearts;
        run.hearts = Math.min(run.max, run.hearts + 1 + (run.have.hearth ? 0.5 : 0));
        d.healed = run.hearts - before;
        ev.push({ t: 'heal', hearts: run.hearts, amount: d.healed });
      }
      if (run.have.spellbook) {
        const id = SPELL_IDS[rand(SPELL_IDS.length)];
        run.extra[id] = (run.extra[id] || 0) + 1;
        ev.push({ t: 'book', spell: id });
      }
    }
    run.score += d.score;
    const made = madeIt(d);
    const final = finalDeal(d.n);
    if (made) run.made++;
    ev.push({ t: 'end', n: d.n, made, swept: !!swept, score: d.score, target: d.target, final });
    if (!made) {
      d.lost = swept ? 0.5 : 1;
      run.hearts = Math.max(0, run.hearts - d.lost);
      ev.push({ t: 'hurt', hearts: run.hearts, amount: d.lost });
      if (final || !run.hearts) {
        run.step = 'over';
        ev.push({ t: 'over', final });
        return ev;
      }
    } else if (final) {
      const bonus = WIN + PER_HEART * run.hearts;
      run.score += bonus;
      if (!endless()) {
        run.step = 'won';
        ev.push({ t: 'won', bonus });
        return ev;
      }
      ev.push({ t: 'finale', bonus }); // an endless Final Deal beaten: the run completed again
    }
    run.next = planOf(d.n + 1);
    run.offer = offer();
    run.step = 'pick';
    ev.push({ t: 'pick', none: !run.offer.length });
    return ev;
  }

  // Two spells (new ones, or another charge of ones you have) and a
  // charm; more of one when the other runs short.
  function offer() {
    const spells = shuffle(SPELL_IDS.filter((id) => run.spells[id] < mostOf(id)));
    const charms = shuffle(CHARM_IDS.filter((id) => (id === 'potion' ? run.max < MOST_HEARTS : run.have[id] < (CHARMS[id].most || 1))));
    const out = spells.splice(0, 2).concat(charms.splice(0, 1));
    while (out.length < 3 && spells.length + charms.length) out.push((spells.length ? spells : charms).shift());
    return out;
  }

  // A pick between deals, then the next deal. With every pick taken
  // already there's nothing on offer: choose() with no pick deals on.
  function choose(id) {
    if (!run || run.step !== 'pick') return [];
    if (!run.offer.length) { run.n = run.next.n; return startDeal(); }
    if (run.offer.indexOf(id) === -1) return [];
    if (SPELLS[id]) run.spells[id] = Math.min(mostOf(id), run.spells[id] + 1);
    else {
      run.have[id]++;
      if (id === 'potion') { run.max = Math.min(MOST_HEARTS, run.max + 1); run.hearts = run.max; }
    }
    run.n = run.next.n;
    return [{ t: 'chose', id }].concat(startDeal());
  }

  // After a won run: endless deals, from a pick. The run's best is kept
  // already; from here on the run counts as endless.
  function keepDealing() {
    if (!run || run.step !== 'won') return [];
    run.mode = 'endless';
    run.recorded = false;
    run.newBest = false;
    run.next = planOf(run.deal.n + 1);
    run.offer = offer();
    run.step = 'pick';
    return [{ t: 'pick', onwards: true, none: !run.offer.length }];
  }

  // Bank the current score exactly once, including a partially played deal.
  function endRun() {
    if (!endless() || run.step === 'over') return [];
    hush();
    if (!run.deal.over) run.score += run.deal.score;
    run.deal.over = true;
    run.ended = true;
    run.step = 'over';
    run.next = null;
    run.offer = [];
    finishRun(false);
    return [{ t: 'banked', score: run.score }];
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE WINDOW
     ══════════════════════════════════════════════════════════════════════
     apps.js opens the window and hands it over here. Closing it keeps the
     run until it opens again. */

  /* ---------- the game's own doodles (they join the shared set) ----------
     Stand-ins until there are drawings (content.js solitaire.drawings).
     The suits are filled in their colours (style.css). */
  const ICONS = {
    flames: '<path d="M12 21.5c-4 0-6.6-2.7-6.6-6.3 0-3.2 2.2-5.1 3.5-7.6.7 1.5 1.6 2.4 2.7 2.9-.1-3 1.3-5.9 3.6-8 0 3.2 1.4 4.9 2.7 6.7 1.1 1.5 1.9 3.2 1.9 5.6 0 4-3 6.7-7.8 6.7z"/>',
    stars: K.DOODLE_ICONS.star,
    moons: '<path d="M14.8 3.3A9 9 0 1 0 20.7 15a7.3 7.3 0 0 1-5.9-11.7z"/>',
    leaves: '<path d="M4.5 19.5C4.5 10.5 10 4.5 20 4.5c0 9.5-5.5 15-15.5 15z"/><path d="M4.5 19.5 13 11" fill="none"/>',
    wild: '<path d="M12 2.5c.8 4.6 4.4 8.2 9 9-4.6.8-8.2 4.4-9 9-.8-4.6-4.4-8.2-9-9 4.6-.8 8.2-4.4 9-9z"/>',
    fireball: '<circle cx="9" cy="15" r="5.5"/><path d="M13 10.5 20 3.5M14.8 14.5l6-3M9.2 9.5l3.3-6"/>',
    echo: '<path d="M4 12h2.5"/><path d="M9.5 8.5a5 5 0 0 1 0 7M13 5.5a9.5 9.5 0 0 1 0 13M16.5 3a13 13 0 0 1 0 18"/>',
    rewind: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M5.4 3.2v4.3h4.3"/>',
    moonlight: '<path d="M15.5 5a6.8 6.8 0 1 0 4.5 11.4A5.6 5.6 0 0 1 15.5 5z"/><path d="M4 3.5l1.5 1.5M3 8.5h2M8.5 2.5v2"/>',
    scry: '<path d="M2.5 14S6 8 12 8s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="14" r="2.8"/><path d="M12 2.5v2.5M5.5 4.2l1.3 2M18.5 4.2l-1.3 2"/>',
    undraw: '<rect x="10" y="2.5" width="10.5" height="14.5" rx="2"/><path d="M7 6.5c-3.6 2.6-3.6 9.6 1 13h7.5"/><path d="M12.5 16.5l3 3-3 3"/>',
    nudge: '<path d="M5 8h14M8 5 5 8l3 3M16 13l3 3-3 3M5 16h14"/>',
    dispel: '<path d="m4 20 12-12M13 5l6 6M17 2v3M20 6h3M5 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
    clover: '<path d="M12 12C3 13 2 5 7 4c3-1 5 3 5 8C11 3 19 2 20 7c1 3-3 5-8 5 9-1 10 7 5 8-3 1-5-3-5-8 1 9-7 10-8 5-1-3 3-5 8-5zM12 12l8 9"/>',
    hearth: '<path d="M3 11 12 3l9 8v10H3z"/><path d="M12 18c-6-3-3-8 0-5 3-3 6 2 0 5z"/>',
    ember: '<path d="M12 20.5c-3 0-5-2-5-4.8 0-2.4 1.7-3.9 2.7-5.8.5 1.1 1.2 1.8 2 2.2-.1-2.3 1-4.5 2.8-6.1 0 2.4 1 3.7 2 5.1.9 1.2 1.5 2.4 1.5 4.3 0 3-2.3 5.1-6 5.1z"/><path d="M5 5.5h.01M19 4h.01M18.5 9.5h.01"/>',
    peaks: '<path d="M2.5 19.5 8.5 8.5l3.6 6.3 3-4.8 6.4 9.5z"/>',
    kindred: '<rect x="3.5" y="5" width="10" height="14" rx="2"/><rect x="10.5" y="5" width="10" height="14" rx="2"/>',
    crystal: '<circle cx="12" cy="10" r="6.5"/><path d="M7 20.5h10M8.5 20.5l1-3.4h5l1 3.4M9.3 8.3a3.2 3.2 0 0 1 2.4-2"/>',
    deck: '<rect x="7" y="3.5" width="12" height="16" rx="2"/><path d="M4 7v11.5a2 2 0 0 0 2 2h9"/>',
    potion: '<path d="M9.5 3h5M10.5 3v4.6L6 14.5a4.6 4.6 0 0 0 4 6.5h4a4.6 4.6 0 0 0 4-6.5l-4.5-6.9V3M7.6 13.2h8.8"/>',
    circle: '<path d="M17 5.6A8 8 0 1 0 20 12"/><path d="M20.5 7.5l-1.5 1.5M17.5 3l.5 2"/>',
    seal: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.2"/>',
    moth: '<path d="M12 8v11"/><path d="M12 10C9.3 5 3.5 5.5 3.5 10s5 5 8.5 2.5M12 10c2.7-5 8.5-4.5 8.5 0s-5 5-8.5 2.5"/><path d="M11 6 9.5 3.8M13 6l1.5-2.2"/>',
    hex: '<path d="M11 12A1 1 0 0 1 13 12A2 2 0 0 1 9 12A3 3 0 0 1 15 12A4 4 0 0 1 7 12A5 5 0 0 1 17 12"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.6 9.2c-.5-.8-1.4-1.2-2.6-1.2-1.5 0-2.6.8-2.6 1.9 0 2.6 5.4 1.5 5.4 4.2 0 1.2-1.2 2-2.8 2-1.2 0-2.3-.5-2.8-1.3"/>',
    draw: '<rect x="6.5" y="3.5" width="11" height="17" rx="2"/><path d="M12 8v7.5M9 12.5l3 3 3-3"/>',
    end: '<path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!K.DOODLE_ICONS[k]) K.DOODLE_ICONS[k] = ICONS[k]; });

  /* ---------- the wizard, the artwork and the drawings ---------- */
  const frame = (name) => (K.pet && K.pet.frame ? K.pet.frame(name) : '');
  const wizardPic = (name, cls) => {
    if (cls === 'ss-wiz-pic' && K.WIZARD_RIG) {
      const rig = K.WIZARD_RIG.svg.replace(/\bid="([^"]+)"/g, 'id="ss-$1"').replace(/#(wz-[\w-]+)/g, '#ss-$1');
      return `<span class="ss-wiz-pic">${rig.replace('<svg ', `<svg data-frame="${name}" `)}</span>`;
    }
    const src = frame(name);
    return src
      ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}" alt="" draggable="false" decoding="async" />`
      : doodleIcon('hat', cls);
  };
  // Andrew's drawing for a slot (content.js solitaire.drawings), if there is one.
  const drawing = (key) => {
    const p = (S.drawings || {})[key];
    return typeof p === 'string' && p.trim() ? K.webSrc(p.trim()) : '';
  };
  // The small "card" copy of an artwork the build makes (about 200px wide).
  const cardArt = (p) => {
    const i = K.imgInfo && K.imgInfo(p);
    return i ? i.card || i.thumb || i.web : K.webSrc(p);
  };
  // ...and that copy beside the binder's (about 400px), for an <img srcset>:
  // big cards and high-density screens get the sharper one.
  const cardArtSet = (p) => {
    const i = K.imgInfo && K.imgInfo(p);
    return i && i.card && i.thumb && i.tw > i.cw ? `${i.card} ${i.cw}w, ${i.thumb} ${i.tw}w` : '';
  };
  const iconOf = (id, cls) => {
    const src = drawing(id);
    return src ? `<img class="ss-pic${cls ? ' ' + cls : ''}" src="${esc(src)}" alt="" draggable="false" decoding="async" />` : doodleIcon(id, cls);
  };

  // Each rank wears one of Andrew's artworks for the whole run, the same
  // for all four suits: the ones content.js fixes (solitaire.faces, Ace
  // first), and a fresh pick of the rest for any it leaves out.
  function facesFor() {
    const key = (p) => String(p || '').trim().replace(/^\/+/, '');
    const art = (K.ART || []).filter((it) => it && it.img);
    const fixed = Array.isArray(S.faces) ? S.faces : [];
    const used = {};
    const out = RANKS.map((_, r) => {
      const want = key(fixed[r]);
      if (!want) return null;
      const it = art.find((a) => key(a.img) === want) || { img: want, title: '' };
      used[key(it.img)] = true;
      return { img: it.img, title: it.title || '' };
    });
    const rest = art.filter((a) => !used[key(a.img)]);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    let k = 0;
    return out.map((f) => {
      if (f || !rest.length) return f;
      const it = rest[k++ % rest.length]; // (fewer than 13 artworks: some repeat)
      return { img: it.img, title: it.title || '' };
    });
  }
  const faceOf = (c) => (run && run.faces ? run.faces[rankOf(c) - 1] : null);
  const cardName = (c) => `${RANK_NAMES[rankOf(c) - 1]} of ${SUITS[suitOf(c)].name}`;
  // "7 of Flames: Mountain"
  const caption = (c) => {
    const f = faceOf(c);
    return `${cardName(c)}${f && f.title ? `: ${f.title}` : ''}`;
  };

  /* ---------- what's said (content.js, under "solitaire") ---------- */
  const DEFAULT_LINES = {
    dealLines: ['shuffle up and deal!', 'i can feel a long streak coming.', 'cards on the table.'],
    finalLines: ['the Final Deal. no pressure.', 'this is it. the Final Deal!'],
    streakLines: ['on a roll!', 'keep it going!', 'look at that streak!'],
    targetLines: ['target reached! keep going.', "that's the target. now show off."],
    sweepLines: ['clean sweep!', 'not a card left!', 'peaks? what peaks?'],
    hurtLines: ['ouch. under target.', 'that one got away.'],
    madeLines: ['deal done!', 'another one for the pile.'],
    loseLines: ["that's the deck done.", 'the cards were against us.'],
    winLines: ['every deal beaten!', 'we did it! all seven!'],
    bestLines: ['a new best! frame those cards.'],
  };
  const DESK_LINES = {
    lose: ['i made it to deal {deal} in Spell Solitaire!'],
    win: ['i beat all seven deals of Spell Solitaire!'],
    endless: ['i dealt my way to deal {deal} of Spell Solitaire!'],
  };
  const anyOf = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : '');
  // A missing list uses the lines above; an empty one (or '') keeps him quiet.
  const linesOf = (v, fallback) => (Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x)
    : typeof v === 'string' ? (v ? [v] : []) : fallback);
  const lineOf = (key) => anyOf(linesOf(S[key], DEFAULT_LINES[key]));

  /* ---------- the best runs (kept per visitor: one for a run, one endless) ---------- */
  const BESTS = { run: 'best', endless: 'endless' };
  const bestRun = (mode) => {
    const b = (K.store.get(STORE_KEY, null) || {})[BESTS[mode] || 'best'];
    return b && Number.isFinite(b.score) && b.score > 0 ? b : null;
  };

  // A run left halfway (for a new one): its deal in progress counts, as
  // the New run dialog says.
  function quitRun() {
    if (run.deal && !run.deal.over) run.score += run.deal.score;
    finishRun(false);
  }

  // A finished run (lost, won, or left for a new one): kept if it's the
  // best of its kind, along with the longest streak ever. (best.won only
  // says whether the best run was won; every win is kept for the trophy.)
  function finishRun(won) {
    if (!run || run.recorded) return;
    run.recorded = true;
    const prev = bestRun(run.mode);
    run.newBest = run.score > 0 && (!prev || run.score > prev.score);
    run.bestLine = run.newBest ? lineOf('bestLines') : '';
    const fields = {};
    if (run.longest > ((K.store.get(STORE_KEY, null) || {}).longest || 0)) fields.longest = run.longest;
    const n = run.deal ? run.deal.n : run.n;
    if (run.newBest) {
      fields[BESTS[run.mode]] = endless()
        ? { score: run.score, deal: n, at: Date.now() }
        : { score: run.score, deal: n, won: !!won, streak: run.longest, at: Date.now() };
    }
    if (Object.keys(fields).length) K.store.merge(STORE_KEY, fields);
  }

  // The pet wizard on the desktop tells everyone how it went (and throws
  // himself a party for a won run or a new best).
  function tellDesktop(won) {
    if (!K.pet || !K.pet.say) return;
    const key = endless() ? 'endless' : won ? 'win' : 'lose';
    const text = anyOf(linesOf((S.deskLines || {})[key], DESK_LINES[key])).replace(/\{deal\}/g, String(run.deal ? run.deal.n : run.n));
    const party = won || run.newBest;
    setTimeout(() => {
      if (party && K.pet.party) {
        K.pet.party();
        if (text) setTimeout(() => K.pet.say(text, 3600), 3800);
      } else if (text) K.pet.say(text, 3600);
    }, 1400);
  }

  // Sounds (sound.js; silent while sound is off) only while the game is on
  // screen, and only for what's drawn, so the bots and anything skipped
  // stay quiet. A card's sound comes from its side of the table.
  const sound = (name, o) => !!view && !view.win.minimised && !!K.sound && K.sound.play(name, o);
  const panAt = (i) => {
    const d = dealShown();
    const slot = slotsOf(d)[i];
    return slot ? (slot.x / (layoutOf(d).width - 1) - 0.5) * 0.8 : 0;
  };

  /* ---------- the window: setting up and tidying away ---------- */
  function mount(win) {
    if (view) unmount(view.win);
    const root = document.createElement('div');
    root.className = 'gm ss';
    root.innerHTML = `
      <div class="gm-hud">
        <span class="gm-stat gm-level"><b data-deal>Deal 1</b><span class="ss-wide" data-of> of ${DEALS}</span></span>
        <span class="gm-stat ss-hearts" data-hearts></span>
        <span class="gm-stat ss-goal" data-goal><span><b data-score>0</b><span data-target> / ${TARGETS[0]}</span></span><i class="ss-bar" aria-hidden="true"><i data-bar></i></i></span>
        <span class="gm-stat ss-streak" data-streak>Streak <b data-streak-n>0</b></span>
        <ul class="gm-owned" aria-label="Curses and charms" data-owned hidden></ul>
      </div>
      <div class="gm-play">
        <div class="ss-stage" data-stage>
          <div class="ss-table" data-table>
            <div class="ss-board"><div class="ss-peaks" role="group" aria-label="The peaks" data-peaks></div></div>
            <div class="ss-layout-note" data-layout-note></div>
            <div class="ss-low">
              <div class="ss-stock" data-stock></div>
              <div class="ss-pile" data-pile></div>
              <div class="ss-wiz">${wizardPic('idle', 'ss-wiz-pic')}<p class="ss-said" aria-hidden="true" data-said hidden></p></div>
            </div>
            <p class="ss-toast" aria-hidden="true" data-toast hidden></p>
            <p class="ss-banner" aria-hidden="true" data-banner hidden></p>
          </div>
          <canvas class="ss-bounce" aria-hidden="true" data-bounce hidden></canvas>
        </div>
        <div class="gm-overlay" data-overlay hidden></div>
      </div>
      <div class="ss-dock" role="group" aria-label="Drawing and spells" data-dock>
        <button class="ss-act ss-draw" type="button" data-act="draw" aria-keyshortcuts="D">${doodleIcon('draw')}<span data-draw-text>Draw</span><b data-left>0</b><kbd class="hint-mouse">D</kbd></button>
        <div class="ss-spells" data-spells></div>
      </div>
      <p class="vh" role="status" data-live></p>`;
    const old = win.body.querySelector('.gm-loading, .gm');
    if (old) old.replaceWith(root);
    else win.body.appendChild(root);
    win.menu.innerHTML = `
      <div class="gm-menu" role="group" aria-label="Game">
        <button type="button" data-act="new">${doodleIcon('controller')}New run</button>
        <button type="button" data-act="end-run" hidden>${doodleIcon('end')}End Run</button>
        <button type="button" data-act="help">Help</button>
      </div>`;
    win.menu.hidden = false;
    const q = (s) => root.querySelector(s);
    view = {
      win,
      root,
      menu: win.menu,
      stage: q('[data-stage]'),
      table: q('[data-table]'),
      peaks: q('[data-peaks]'),
      stock: q('[data-stock]'),
      pile: q('[data-pile]'),
      wiz: q('.ss-wiz-pic'),
      said: q('[data-said]'),
      toast: q('[data-toast]'),
      banner: q('[data-banner]'),
      bounce: q('[data-bounce]'),
      overlay: q('[data-overlay]'),
      dock: q('[data-dock]'),
      drawBtn: q('[data-act="draw"]'),
      drawText: q('[data-draw-text]'),
      left: q('[data-left]'),
      spellBox: q('[data-spells]'),
      live: q('[data-live]'),
      dealNo: q('[data-deal]'),
      dealOf: q('[data-of]'),
      hearts: q('[data-hearts]'),
      score: q('[data-score]'),
      target: q('[data-target]'),
      bar: q('[data-bar]'),
      goal: q('[data-goal]'),
      streak: q('[data-streak]'),
      streakN: q('[data-streak-n]'),
      owned: q('[data-owned]'),
      els: [],         // the cards in the 28 places
      shown: null,     // the deal drawn
      pileCard: -1,    // the card on top of the pile as drawn (it waits for one in flight)
      focus: -1,       // the place the arrow keys are on (the one card in the tab order)
      armed: '',       // Wild or Fireball, waiting to be cast on a card
      card: false,     // a card is over the table
      cardClosedAt: -Infinity, // when the last one went (see wire)
      help: false,     // ...and it's the help card
      scry: null,      // Scry's cards over the table: { cards (as dealt), order (as you've put them), sel (one picked to swap) }
      peek: false,     // the run's over and you're looking at the table
      moving: new Set(), // cards in flight, and anything else that can skip to its end
      timers: new Set(),
      after: null,     // what happens once everything has landed (a card over the table)
      count: null,     // a clean sweep's stock bonus, counting up
      heldScore: null, // the score the HUD shows while that counts up
      lastStreak: 0,
    };
    wire(view);
    if (window.ResizeObserver) {
      view.sizer = new ResizeObserver(fitArt);
      view.sizer.observe(view.peaks);
    }
    primeFaces();
    // Fetch his poses now, so none of them flickers in mid-game.
    ['idle', 'happy', 'party', 'startled', 'cards'].forEach((k) => {
      const s = frame(k);
      if (s) { const pre = new Image(); pre.src = s; }
    });
    show([]);
    syncCard(false);
  }

  function unmount(win) {
    if (!view || (win && view.win !== win)) return;
    hush();
    if (view.sizer) view.sizer.disconnect();
    view.win.el.removeEventListener('keydown', view.keys, true);
    view.win.el.removeEventListener('keydown', view.onKey);
    clearTimeout(view.toastTimer);
    clearTimeout(view.liveTimer);
    clearTimeout(view.poseTimer);
    clearTimeout(view.saidTimer);
    clearTimeout(view.bannerTimer);
    view = null;
  }

  // A timer that goes away with the window (and with a new run).
  const later = (fn, ms) => {
    if (!view) return;
    const v = view;
    const t = setTimeout(() => { v.timers.delete(t); if (view === v) fn(); }, ms);
    v.timers.add(t);
  };

  // Everything still moving or waiting is stopped (a new run, the window
  // closing): cards in flight, timers, the stock bonus counting up and the
  // bouncing cards. Nothing from an old run may land in a new one.
  function hush() {
    if (!view) return;
    view.moving.forEach((m) => m.cancel());
    view.moving.clear();
    view.timers.forEach(clearTimeout);
    view.timers.clear();
    view.after = null;
    if (view.count) { clearInterval(view.count.timer); view.count = null; }
    view.heldScore = null;
    stopBounce();
    view.table.querySelectorAll('.ss-pop, .ss-flyer, .ss-ash').forEach((el) => el.remove());
    view.armed = '';
  }

  // Any press skips whatever is moving to its end (and shows what's
  // next). True if there was anything to skip.
  function skip() {
    if (!view) return false;
    if (view.bouncing) { stopBounce(); finishWin(); return true; }
    const any = view.moving.size > 0 || !!view.count || !!view.after;
    view.moving.forEach((m) => m.end());
    view.moving.clear();
    if (view.count) view.count.end();
    const next = view.after;
    view.after = null;
    if (next) next();
    return any;
  }

  // Once nothing is moving (a moment after), do this; a press does it at once.
  function whenStill(fn, ms) {
    if (!view) return;
    view.after = fn;
    later(() => {
      if (view.after !== fn) return;
      if (view.moving.size || view.count) { whenStill(fn, 120); return; }
      view.after = null;
      fn();
    }, ms);
  }

  /* ---------- the table ---------- */
  // The deal drawn: the run's, or before the first run a face-down one
  // behind the title card.
  const dealShown = () => (run && run.deal ? run.deal : view.idle || (view.idle = {
    n: 1, target: TARGETS[0], curses: [], hex: -1, layout: 0, slots: range(PLACES), up: range(PLACES).map(() => false), pile: [], stock: range(23),
    charges: {}, undo: [], score: 0, streak: 0, peaks: 0, refills: 0, idle: true,
  }));
  const live = (d) => !!(run && run.deal === d && playing());

  const suitPic = (id) => iconOf(id, 'ss-suit');
  const PILE = 1.35; // the pile's card is this many card widths wide (style.css .ss-pile)
  // A card's width in pixels, `scale` card widths wide (view.cw follows the window, see fitArt).
  const cardPx = (scale) => (view && view.cw ? view.cw : 60) * (scale || 1);
  // The window changed size: the art's `sizes` follow, so bigger cards
  // fetch the sharper copy.
  function fitArt() {
    if (!view) return;
    const w = view.peaks.offsetWidth;
    if (!w) return;
    view.cw = w / (layoutOf(dealShown()).width * 1.065 - 0.065);
    // (Layout widths: a window gliding or growing is scaled for a moment.)
    view.root.querySelectorAll('.ss-art img[sizes]').forEach((img) => {
      if (img.offsetWidth) img.sizes = `${img.offsetWidth}px`;
    });
  }
  // A card's face. `px`: how wide it's drawn (a card on the peaks unless
  // said), so its art is fetched at the size it shows.
  const faceHtml = (c, px) => {
    const s = SUITS[suitOf(c)];
    const r = rankOf(c) - 1;
    const f = faceOf(c);
    const art = f ? cardArt(f.img) : '';
    const set = f ? cardArtSet(f.img) : '';
    const sizes = set ? ` srcset="${esc(set)}" sizes="${Math.max(20, Math.round((px || cardPx()) * 0.86))}px"` : '';
    return `<span class="ss-face ${s.colour}${r === 9 ? ' is-10' : ''}"><span class="ss-corner"><b>${RANKS[r]}</b>${suitPic(s.id)}</span>` +
      `<span class="ss-art">${art ? `<img src="${esc(art)}"${sizes} alt="" draggable="false" decoding="async" />` : suitPic(s.id)}</span>` +
      `<span class="ss-big"><b>${RANKS[r]}</b>${suitPic(s.id)}</span></span>`;
  };
  // The back: Andrew's drawing (a Final Deal can have its own), or a
  // stand-in: periwinkle, the card stars, the flame logo and KASAI (ink,
  // with a yellow flame, on a Final Deal).
  const backHtml = (final) => {
    const art = (final && drawing('backFinal')) || drawing('back');
    if (art) return `<span class="ss-back has-art${final ? ' is-final' : ''}"><img src="${esc(art)}" alt="" draggable="false" /></span>`;
    return `<span class="ss-back${final ? ' is-final' : ''}"><span class="ss-back-logo">${final ? doodleIcon('flames') : '<img src="/assets/ui/favicon.png" alt="" draggable="false" />'}</span><span class="ss-back-strip">KASAI</span></span>`;
  };
  // A card's insides, face up or down (only rewritten when that changes).
  const paint = (el, c, up, final) => {
    const want = up ? String(c) : final ? 'back-final' : 'back';
    if (el.dataset.show === want) return;
    el.innerHTML = up ? faceHtml(c) : backHtml(final);
    el.dataset.show = want;
  };

  function drawTable(cascade) {
    const d = dealShown();
    const l = layoutOf(d);
    view.shown = d;
    view.frontierPending = true;
    view.table.style.setProperty('--columns', l.width);
    view.table.style.setProperty('--depth', l.depth - 1);
    view.table.style.setProperty('--row-scale', l.rowScale);
    view.table.style.setProperty('--table-height', 3.9 + (l.depth - 1) * l.rowScale);
    view.peaks.innerHTML = (l.connected ? layoutDiagram(l, true) : '') + slotsOf(d).map((s, i) => `<div class="ss-card" data-slot="${i}" style="--x:${s.x};--y:${s.y}"></div>`).join('');
    view.els = Array.from(view.peaks.querySelectorAll('.ss-card'));
    view.pileCard = d.pile.length ? topOf(d) : -1;
    view.focus = -1;
    view.armed = '';
    view.lastStreak = d.streak || 0;
    syncCards();
    if (cascade) dealIn();
  }

  // The deal cascading out of the stock, card by card.
  function dealIn() {
    const from = view.stock.getBoundingClientRect();
    if (!from.width || !view.els[0].animate) return;
    view.els.forEach((el, k) => {
      const to = el.getBoundingClientRect();
      const a = el.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${(from.width / to.width).toFixed(3)})`, opacity: 0.4 },
        { transform: 'none', opacity: 1 },
      ], { duration: 260, delay: k * 18, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'backwards' });
      track(a);
    });
  }
  // An animation that a press can skip to its end.
  function track(a, done) {
    const m = {
      end() { if (m.over) return; m.over = true; try { a.finish(); } catch (e) { /* gone */ } view && view.moving.delete(m); if (done) done(); },
      cancel() { if (m.over) return; m.over = true; try { a.cancel(); } catch (e) { /* gone */ } },
    };
    a.onfinish = () => m.end();
    view.moving.add(m);
    return m;
  }

  // The cards in their places: face up or down, which can be played (only
  // uncovered cards are buttons, one of them in the tab order), sealed or
  // ringed by an armed spell.
  function syncCards() {
    const d = dealShown();
    drawLayoutNote(d);
    const on = live(d) && !view.card;
    const fitsNow = on ? movesOf() : [];
    const ringed = on && view.armed ? opens(d) : [];
    const frees = on ? range(PLACES).filter((i) => free(d, i)) : [];
    if (frees.indexOf(view.focus) === -1) view.focus = nearest(frees, view.focus);
    const final = finalDeal(d.n);
    view.els.forEach((el, i) => {
      const c = d.slots[i];
      if (c < 0 || c == null) {
        el.hidden = true;
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-label');
        return;
      }
      el.hidden = false;
      const up = !!d.up[i];
      paint(el, c, up, final);
      const isFree = frees.indexOf(i) !== -1;
      const held = !d.idle && sealed(d, i);
      const tip = tipOf(d, i);
      const guard = cursed(d, 'seal') && layoutOf(d).sealGroups.some((g) => g.guards.includes(i));
      const place = `${tip ? `, ${tip.name}${guard ? ', Seal guard' : ''}` : ''}`;
      if (tip && !el.querySelector('.ss-tip')) el.insertAdjacentHTML('beforeend', `<span class="ss-tip" aria-hidden="true">${layoutOf(d).tips.indexOf(tip) + 1}${guard ? ' G' : ''}</span>`);
      if (tip) el.querySelector('.ss-tip').textContent = `${layoutOf(d).tips.indexOf(tip) + 1}${guard ? ' G' : ''}`;
      el.classList.toggle('is-down', !up);
      el.classList.toggle('is-free', isFree);
      el.classList.toggle('is-sealed', held);
      const hexed = !d.idle && cursed(d, 'hex') && suitOf(c) === d.hex;
      el.classList.toggle('is-hexed', up && hexed);
      el.classList.toggle('is-ringed', ringed.indexOf(i) !== -1);
      el.title = `${up ? caption(c) : 'Covered card'}${place}${held ? `. Sealed: clear ${sealWords(d)}` : ''}${up && hexed ? '. Hex: playing this suit restarts the streak.' : ''}`;
      if (isFree) {
        el.setAttribute('role', 'button');
        el.tabIndex = i === view.focus ? 0 : -1;
        el.removeAttribute('aria-hidden');
        el.setAttribute('aria-label', `${caption(c)}${place}${held ? `, sealed until ${sealWords(d)} are clear` : fitsNow.indexOf(i) !== -1 ? ', goes on the pile' : ''}${hexed ? ', Hex: restarts the streak' : ''}`);
      } else if (up && !d.idle) {
        // Face up but covered (Moonlight): named, though it can't be played yet.
        el.setAttribute('role', 'img');
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-hidden');
        el.setAttribute('aria-label', `${caption(c)}${place}, covered${held ? `, sealed until ${sealWords(d)} are clear` : ''}`);
      } else {
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-label');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    view.peaks.querySelectorAll('[data-link-from]').forEach((el) => { el.style.display = d.slots[+el.dataset.linkFrom] < 0 || d.slots[+el.dataset.linkTo] < 0 ? 'none' : ''; });
    view.peaks.setAttribute('aria-label', d.idle ? 'The peaks' : `${layoutOf(d).name}, ${plural(layoutOf(d).tips.length - d.peaks, 'peak')} remaining: ${plural(d.slots.filter((c) => c >= 0).length, 'card')}, ${frees.length} uncovered`);
  }

  function drawLayoutNote(d, note = view.root.querySelector('[data-layout-note]')) {
    const l = layoutOf(d);
    const key = `${l.id}|${cursed(d, 'seal')}`;
    if (note.dataset.layout === key) return;
    const expanded = note.querySelector('details')?.open;
    note.dataset.layout = key;
    note.innerHTML = `<details${expanded ? ' open' : ''}><summary>${esc(l.name)} · ${plural(l.tips.length, 'peak')} · Tip names${cursed(d, 'seal') ? ' / Seal' : ''}</summary><p>${esc(l.tips.map((t, i) => `${i + 1}: ${t.name}`).join(' · '))}.${cursed(d, 'seal') ? ` G = guard: clear ${esc(sealWords(d))} to unlock.` : ''}</p></details><span>${l.connected ? 'Lines join blockers; clear lower cards first. ' : ''}Scroll the board if needed.</span>`;
  }

  // Same geometry for the preview and the board's exact dependency cues.
  function layoutDiagram(l, connectionsOnly = false) {
    const height = (l.depth - 1) * l.rowScale + 1.4;
    const links = l.slots.flatMap((s, i) => s.over.map((j) => {
      const t = l.slots[j];
      return `<line data-link-from="${i}" data-link-to="${j}" x1="${s.x * 1.065 + 0.5}" y1="${s.y * l.rowScale + (l.connected ? 1.4 : 0.5)}" x2="${t.x * 1.065 + 0.5}" y2="${t.y * l.rowScale}" />`;
    })).join('');
    const cards = connectionsOnly ? '' : l.slots.map((s, i) => `<rect x="${s.x * 1.065}" y="${s.y * l.rowScale}" width="1" height="1.4" rx=".1" class="${l.tips.some((t) => t.slot === i) ? 'is-tip' : ''}" />`).join('');
    return `<svg class="${connectionsOnly ? 'ss-connections' : 'ss-layout-diagram'}" viewBox="${connectionsOnly ? `0 0 ${l.width * 1.065 - .065} ${height}` : `-.08 -.08 ${l.width * 1.065 + .095} ${height + .16}`}" aria-hidden="true" focusable="false">${links}${cards}</svg>`;
  }

  const nextDiagram = (p) => `<figure class="ss-layout-preview">${layoutDiagram(layoutOf(p))}<figcaption>${esc(layoutOf(p).tips.map((t, i) => `${i + 1}: ${t.name}`).join(' · '))}</figcaption></figure>`;

  // Of the cards in `list`, the one nearest place `from` (left to right).
  function nearest(list, from) {
    if (!list.length) return -1;
    const SLOTS = slotsOf(dealShown());
    if (from < 0 || !SLOTS[from]) return list.slice().sort(byPlace)[0];
    const s = SLOTS[from];
    return list.slice().sort((a, b) => Math.abs(SLOTS[a].x - s.x) + Math.abs(SLOTS[a].y - s.y) * 0.6 - (Math.abs(SLOTS[b].x - s.x) + Math.abs(SLOTS[b].y - s.y) * 0.6))[0];
  }
  const byPlace = (a, b) => {
    const slots = slotsOf(dealShown());
    return slots[a].x - slots[b].x || slots[a].y - slots[b].y;
  };

  // The pile: its top card, big enough to show off the art.
  function syncPile() {
    const d = dealShown();
    const c = d.nudge == null ? view.pileCard : pileFace(d);
    const f = c >= 0 ? faceOf(c) : null;
    const want = c >= 0 ? `${c}|${f ? f.img : ''}` : ''; // a new run can deal the same card in other art
    if (view.pile.dataset.show !== want) {
      view.pile.innerHTML = c >= 0 ? `<div class="ss-card is-pile">${faceHtml(c, cardPx(PILE))}</div>` : '<span class="ss-empty"></span>';
      view.pile.dataset.show = want;
    }
    view.pile.title = c >= 0 ? `The pile: ${caption(c)}${d.nudge == null ? '' : ' (Nudge)'}` : 'The pile';
    view.pile.classList.toggle('is-kin', !!(run && run.have.kindred && c >= 0 && !d.idle));
  }

  // The stock: a stack of backs and how many are left (and, with the
  // Crystal Ball, the next card or two face up beside it).
  function syncStock() {
    const d = dealShown();
    const n = d.stock.length;
    const peek = !d.idle && run && run.have.crystal && live(d) ? d.stock.slice(-run.have.crystal).reverse() : [];
    const refill = !n && d.refills > 0 && d.pile.length > 1;
    const want = `${n}|${finalDeal(d.n)}|${peek.join(',')}|${refill}`;
    if (view.stock.dataset.show === want) return;
    view.stock.dataset.show = want;
    const backs = Math.min(3, n);
    view.stock.innerHTML = (backs
      ? range(backs).map((k) => `<div class="ss-card is-stock" style="--k:${k}">${backHtml(finalDeal(d.n))}</div>`).join('')
      : `<span class="ss-empty">${refill ? doodleIcon('deck') : ''}</span>`) +
      `<b class="ss-count">${n}</b>` +
      (peek.length ? `<span class="ss-peek">${peek.map((c) => `<span class="ss-card is-peek">${faceHtml(c, cardPx(0.72))}</span>`).join('')}</span>` : '');
    view.stock.title = n ? `The stock: ${plural(n, 'card')} left${peek.length ? `. Next: ${peek.map(cardName).join(', then ')}` : ''}` : refill ? 'The stock is empty: the Second Deck fills it again when you draw' : 'The stock is empty';
  }

  /* ---------- a move, drawn ---------- */
  // Bring the drawing up to date with the run; `ev` (what just happened)
  // picks the animations and the sounds.
  function show(ev) {
    if (!view) return;
    ev = ev || [];
    const d = dealShown();
    const dealt = ev.some((e) => e.t === 'deal');
    const rebuilt = view.shown !== d || dealt;
    if (rebuilt) drawTable(dealt && !RM);
    const flips = [];
    let rewound = -1;
    ev.forEach((e) => {
      if (e.t === 'play') flyToPile(e.card, view.els[e.i], e.i);
      else if (e.t === 'draw') flyToPile(e.card, view.stock, -1);
      else if (e.t === 'burn') burnAway(e.i);
      else if (e.t === 'flip') flips.push(e.i);
      else if (e.t === 'moonlight') flips.push(...e.flipped);
      else if (e.t === 'rewind') { rewound = e.i; view.pileCard = topOf(d); }
      else if (e.t === 'undraw') { view.pileCard = topOf(d); flyToStock(e.card); }
    });
    syncCards();
    syncPile();
    syncStock();
    flips.forEach((i) => restart(view.els[i], 'is-flipping'));
    if (rewound >= 0) restart(view.els[rewound], 'is-back');
    ev.forEach((e) => {
      if (e.t === 'play') popAt(e.i, `+${e.pts}`, e.streak);
      else if (e.t === 'deny' && e.i != null && view.els[e.i]) restart(view.els[e.i], 'is-nope');
      else if (e.t === 'peak') banner(`Peak! +${e.pts}`);
      else if (e.t === 'sweep') sweptAway(e);
      else if (e.t === 'hurt') {
        // A heart lost: an "ow", and the whole table jolts.
        K.shake(view.stage);
        sound('hurt');
        pose('startled', 1300);
      }
    });
    drawHud(ev);
    drawDock();
    drawStatus();
    positionFrontier();
    syncWizard();
    hear(ev);
  }

  function positionFrontier() {
    if (!view.frontierPending || view.card || view.dock.hidden) return;
    // Measure after the overlay has released the dock's space. Short
    // screens start at the frontier; scroll/arrow focus shows the graph.
    const board = view.peaks.parentElement;
    board.scrollTop = board.scrollHeight;
    board.scrollLeft = 0;
    view.frontierPending = false;
  }

  // What a move sounds like (a heart lost is heard where it's drawn).
  function hear(ev) {
    if (ev.some((e) => e.t === 'deal')) sound('deal');
    const play = ev.find((e) => e.t === 'play');
    if (play) sound('card', { step: play.streak, pan: panAt(play.i) });
    if (ev.some((e) => e.t === 'draw' || e.t === 'undraw' || e.t === 'flip' || e.t === 'moonlight')) sound('flip');
    if (ev.some((e) => e.t === 'burn')) sound('hit', { step: 3 });
    if (ev.some((e) => e.t === 'deny')) sound('deny');
    const cast = ev.find((e) => e.t === 'cast');
    if (cast) sound('cast', { step: SPELLS[cast.spell].step });
    if (ev.some((e) => e.t === 'peak')) sound('gold');
    if (ev.some((e) => e.t === 'target')) sound('tally');
    if (ev.some((e) => e.t === 'sweep')) sound('clear');
    else if (ev.some((e) => e.t === 'end' && e.made && !e.final)) later(() => sound('clear'), 200);
    if (ev.some((e) => e.t === 'heal')) later(() => sound('heal'), 450);
  }

  // A card flies onto the pile, from its place (or the stock), and the
  // pile shows it once it lands.
  function flyToPile(c, fromEl, i) {
    const land = () => { if (view) { view.pileCard = c; syncPile(); } };
    if (RM || !fromEl || !fromEl.animate) { land(); return; }
    const from = fromEl.getBoundingClientRect();
    const to = view.pile.getBoundingClientRect();
    const box = view.table.getBoundingClientRect();
    if (!from.width || !to.width) { land(); return; }
    const el = document.createElement('div');
    el.className = 'ss-card ss-flyer';
    el.innerHTML = faceHtml(c);
    const w = i >= 0 ? from.width : to.width / PILE;
    el.style.cssText = `left:${from.left - box.left + (from.width - w) / 2}px;top:${from.top - box.top}px;width:${w}px`;
    view.table.appendChild(el);
    const k = to.width / w;
    const a = el.animate([
      { transform: 'none' },
      { transform: `translate(${to.left - from.left - (from.width - w) / 2}px, ${to.top - from.top}px) scale(${k.toFixed(3)})` },
    ], { duration: i >= 0 ? 280 : 240, easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)', fill: 'forwards' });
    track(a, () => { el.remove(); land(); });
  }

  // Undraw: the card flies off the pile and under the stock.
  function flyToStock(c) {
    if (RM || !view.pile.animate) return;
    const from = view.pile.getBoundingClientRect();
    const to = view.stock.getBoundingClientRect();
    const box = view.table.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const el = document.createElement('div');
    el.className = 'ss-card ss-flyer';
    el.innerHTML = faceHtml(c, from.width);
    el.style.cssText = `left:${from.left - box.left}px;top:${from.top - box.top}px;width:${from.width}px;transform-origin:0 0`;
    view.table.appendChild(el);
    const k = 1 / PILE;
    const a = el.animate([
      { transform: 'none' },
      { transform: `translate(${to.left - from.left}px, ${to.bottom - from.height * k - from.top}px) scale(${k.toFixed(3)})`, opacity: 0.5 },
    ], { duration: 260, easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)', fill: 'forwards' });
    track(a, () => el.remove());
  }

  // Fireball: the card at place i goes up in flames.
  function burnAway(i) {
    const at = view.els[i];
    if (RM || !at) return;
    const r = at.getBoundingClientRect();
    const box = view.table.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'ss-card ss-ash';
    el.innerHTML = at.innerHTML;
    el.style.cssText = `left:${r.left - box.left}px;top:${r.top - box.top}px;width:${r.width}px`;
    view.table.appendChild(el);
    setTimeout(() => el.remove(), 520);
  }

  // "+70" floats off a card: bigger with the streak, white, then yellow
  // from 5, pink from 10 and coral from 15.
  function popAt(i, text, streak) {
    const at = view.els[i];
    if (!at) return;
    const r = at.getBoundingClientRect();
    const box = view.table.getBoundingClientRect();
    const el = document.createElement('span');
    const tier = streak >= 15 ? 'is-coral' : streak >= 10 ? 'is-pink' : streak >= 5 ? 'is-yellow' : '';
    el.className = `ss-pop ${tier}`;
    el.textContent = text;
    el.style.cssText = `left:${r.left - box.left + r.width / 2}px;top:${r.top - box.top + r.height * 0.3}px;--grow:${Math.min(1.7, 1 + Math.min(streak, 20) * 0.035).toFixed(2)}`;
    view.table.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // A big word over the peaks for a moment ("Peak!", "Clean sweep!").
  function banner(text) {
    const b = view.banner;
    b.textContent = text;
    b.hidden = false;
    restart(b, 'is-in');
    clearTimeout(view.bannerTimer);
    view.bannerTimer = setTimeout(() => { b.hidden = true; }, RM ? 1400 : 1100);
  }

  // A clean sweep: the banner, his party hat, and the cards left in the
  // stock counted up into the score one by one (+20 each, a tick apiece).
  function sweptAway(e) {
    banner('Clean sweep!');
    pose('party', 2200);
    wizardSays(lineOf('sweepLines'), 2400);
    if (!e.left) return;
    const d = dealShown();
    const end = d.score;
    if (RM) return;
    let k = 0;
    view.heldScore = end - e.pts;
    const step = () => {
      k++;
      view.heldScore = Math.min(end, end - e.pts + k * LEFT_OVER);
      sound('tick', { step: k });
      drawHud([]);
      if (k >= e.left) count.end();
    };
    const count = {
      timer: setInterval(step, 70),
      end() {
        if (!view || view.count !== count) return;
        clearInterval(count.timer);
        view.count = null;
        view.heldScore = null;
        drawHud([]);
      },
    };
    view.count = count;
  }

  // Restart a one-off animation class.
  const restart = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  /* ---------- the wizard beside the pile ---------- */
  // He's happy on a streak of 5 or more, has a party on a clean sweep and
  // is startled when a heart is lost.
  function pose(name, ms) {
    if (!view) return;
    view.posed = name;
    clearTimeout(view.poseTimer);
    view.poseTimer = setTimeout(() => { if (view) { view.posed = ''; syncWizard(); } }, ms);
    syncWizard();
  }
  function syncWizard() {
    if (!view || !view.wiz) return;
    const d = dealShown();
    const name = view.posed || (run && run.step === 'over' ? 'startled' : run && run.step === 'won' ? 'party' : live(d) && d.streak >= 5 ? 'happy' : 'idle');
    const tier = live(d) ? Math.min(3, Math.floor(d.streak / 5)) : 0;
    view.wiz.parentElement.dataset.glow = tier;
    const rig = view.wiz.querySelector('.wz');
    if (rig) { rig.setAttribute('data-frame', name); return; }
    const s = frame(name);
    if (s && view.wiz.getAttribute('src') !== s) view.wiz.setAttribute('src', s);
  }
  // His words in a speech bubble beside him (screen readers hear them in
  // the move's summary instead).
  function wizardSays(text, ms) {
    if (!view || !text) return;
    const el = view.said;
    el.textContent = text;
    el.hidden = false;
    restart(el, 'is-in');
    clearTimeout(view.saidTimer);
    const v = view;
    view.saidTimer = setTimeout(() => { v.said.hidden = true; }, ms || 2600);
  }

  /* ---------- the bar along the top, and the dock ---------- */
  const num = (n) => Number(n || 0).toLocaleString('en-GB');
  function drawHud(ev) {
    if (!view) return;
    const d = dealShown();
    const n = d.n;
    const final = finalDeal(n);
    view.dealNo.textContent = final && !endless() ? 'Final Deal' : `Deal ${n}`;
    view.dealOf.textContent = endless() ? (final ? ' · Final' : '') : final ? '' : ` of ${DEALS}`;
    const hearts = run ? run.hearts : HEARTS;
    const max = run ? run.max : HEARTS;
    view.hearts.innerHTML = range(max).map((k) => `<span class="${k + 1 <= hearts ? 'is-full' : k < hearts ? 'is-half' : 'is-empty'}" aria-hidden="true">${doodleIcon('heart')}${k < hearts && k + 1 > hearts ? `<i>${doodleIcon('heart')}</i>` : ''}</span>`).join('') +
      `<span class="vh">${plural(hearts, 'heart')} out of ${max}</span>`;
    view.menu.querySelector('[data-act="end-run"]').hidden = !endless() || run.step === 'over';
    const score = view.heldScore != null ? view.heldScore : d.score;
    view.score.textContent = num(score);
    view.target.textContent = ` / ${num(d.target)}`;
    view.bar.style.width = `${Math.min(100, (100 * Math.max(0, score)) / d.target).toFixed(1)}%`;
    const made = !d.idle && (score >= d.target || !!d.reached);
    view.goal.classList.toggle('is-made', made);
    view.goal.title = d.idle ? '' : `This deal: ${num(score)} of ${num(d.target)} points${made ? ' (target reached)' : ''}. Score so far: ${num(run.score + (d.over ? 0 : score))}`;
    // The streak: a bump as it grows, a drop when it breaks.
    const st = live(d) || (run && run.deal === d) ? d.streak : 0;
    view.streakN.textContent = st;
    if (st > view.lastStreak) restart(view.streak, 'is-bump');
    else if (st < view.lastStreak) restart(view.streak, 'is-drop');
    view.lastStreak = st;
    view.streak.classList.toggle('is-hot', st >= 5);
    // The deal's curses (ink), then your charms (their colours).
    const chips = run && !d.idle ? d.curses.map(curseChip).join('') + CHARM_IDS.filter((id) => run.have[id] > 0).map(charmChip).join('') : '';
    if (view.chips !== chips) { view.owned.innerHTML = chips; view.chips = chips; }
    view.owned.hidden = !chips;
  }
  const curseChip = (id) => {
    const w = words(id);
    const d = dealShown();
    const label = `Curse: ${w.name}. ${id === 'seal' ? `Clear ${sealWords(d)} to release the locked cards. G marks a guard.` : id === 'hex' && d.hex >= 0 ? `${SUITS[d.hex].name} still score, but start the streak again.` : w.blurb}`;
    return `<li class="ss-owned-item"><button type="button" class="gm-chip ink ss-curse" aria-label="${esc(label)}" aria-describedby="ss-tip-${id}">${iconOf(CURSES[id].icon)}${id === 'hex' && d.hex >= 0 ? `<span class="ss-hex ${SUITS[d.hex].colour}">${suitPic(SUITS[d.hex].id)}</span>` : ''}</button><span class="ss-tooltip" role="tooltip" id="ss-tip-${id}">${esc(label)}</span></li>`;
  };
  const charmChip = (id) => {
    const n = run.have[id];
    const w = words(id);
    const left = id === 'deck' ? dealShown().refills : null;
    const label = `${w.name}${n > 1 ? ` x${n}` : ''}${left != null ? `: ${left ? 'ready' : 'used'} this deal` : ''}. ${w.blurb}`;
    return `<li class="ss-owned-item"><button type="button" class="gm-chip ${CHARMS[id].colour}${left === 0 ? ' is-spent' : ''}" aria-label="${esc(label)}" aria-describedby="ss-tip-${id}">${iconOf(CHARMS[id].icon)}${n > 1 ? `<b aria-hidden="true">${n}</b>` : ''}</button><span class="ss-tooltip" role="tooltip" id="ss-tip-${id}">${esc(label)}</span></li>`;
  };

  function drawDock() {
    if (!view) return;
    const d = dealShown();
    const on = live(d) && !view.card;
    const n = d.stock.length;
    const end = on && !movesOf().length && !canDraw(d);
    const refill = on && !n && d.refills > 0 && d.pile.length > 1;
    const b = view.drawBtn;
    const icon = end ? 'end' : 'draw';
    if (b.dataset.icon !== icon) { b.querySelector('svg').outerHTML = doodleIcon(icon); b.dataset.icon = icon; }
    view.drawText.textContent = end ? 'End deal' : refill ? 'Reshuffle' : 'Draw';
    view.left.textContent = n;
    view.left.hidden = end;
    b.disabled = !on || (!n && !end && !refill);
    b.classList.toggle('is-end', end);
    b.setAttribute('aria-label', end ? 'End the deal' : refill ? `Shuffle ${REFILL} cards from the pile back into the stock and draw` : `Draw a card, ${plural(n, 'card')} left`);
    // A button for each spell you have: its charges left this deal and its key.
    const have = run && !d.idle ? SPELL_IDS.filter((id) => run.spells[id] > 0 || d.charges[id] > 0) : [];
    const html = have.length
      ? have.map((id) => `<button class="ss-act ss-spell ${SPELLS[id].colour}" type="button" data-spell="${id}" aria-keyshortcuts="${SPELLS[id].key.toUpperCase()}">` +
        `${iconOf(SPELLS[id].icon)}<span class="ss-spell-name">${esc(words(id).name)}</span><b></b><kbd class="hint-mouse">${SPELLS[id].key.toUpperCase()}</kbd></button>`).join('')
      : `<p class="ss-nospells">${run && !d.idle ? 'Spells you pick between deals show up here.' : ''}</p>`;
    if (view.spellHtml !== html) { view.spellBox.innerHTML = html; view.spellHtml = html; }
    view.spellBox.dataset.n = have.length; // (style.css: how crowded the dock is)
    view.spellBox.querySelectorAll('[data-spell]').forEach((btn) => {
      const id = btn.dataset.spell;
      const left = d.charges[id] || 0;
      btn.querySelector('b').textContent = left;
      btn.disabled = !on || !usable(id);
      btn.setAttribute('aria-pressed', String(view.armed === id));
      btn.setAttribute('aria-label', `${words(id).name}, ${plural(left, 'charge')} left this deal. ${words(id).blurb}`);
      btn.title = `${words(id).name}: ${words(id).blurb}`;
    });
  }

  function drawStatus() {
    if (!view) return;
    const d = dealShown();
    const step = run ? run.step : '';
    const where = !run ? 'Spell Solitaire' : `${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}`}${endless() || finalDeal(d.n) ? '' : ` of ${DEALS}`}`;
    let hint;
    if (!run) hint = '<span class="status-hint">TriPeaks with spells</span>';
    else if (view.armed) hint = `<span class="status-hint">${esc(words(view.armed).name)}: pick an uncovered card${SPELLS[view.armed].aim ? ' (Esc cancels)' : ''}</span>`;
    else if (step === 'pick') hint = '<span class="status-hint">Pick a spell or a charm</span>';
    else if (step === 'over' || step === 'won') hint = '<span class="status-hint">New run deals again</span>';
    else if (live(d) && !movesOf().length) hint = K.hint(canDraw(d) ? 'No plays: click the stock or press D to draw' : 'No plays left: cast a spell or end the deal', canDraw(d) ? 'No plays: tap the stock to draw' : 'No plays left: cast a spell or end the deal');
    else hint = K.hint('Click a card one higher or lower than the pile', 'Tap a card one higher or lower than the pile');
    view.win.setStatus(`<span class="ss-where">${esc(where)}</span>${hint}`);
  }

  /* ---------- the cards over the game (the title, a pick, the end) ---------- */
  function syncCard(focus) {
    if (!view) return;
    const up = view.help || !run || !!view.scry || run.step === 'pick' || ((run.step === 'over' || run.step === 'won') && !view.peek);
    if (view.card && !up) view.cardClosedAt = performance.now();
    view.card = up;
    view.stage.inert = up;
    view.dock.inert = up;
    view.dock.hidden = up; // (it can't be used then: the card gets its room)
    if (up) { view.toast.hidden = true; view.armed = ''; }
    view.overlay.hidden = !up;
    view.overlay.innerHTML = up ? cardHtml() : '';
    if (up && focus && !view.win.minimised) { // (a card shown while minimised leaves focus alone)
      const go = view.overlay.querySelector('[data-first]') || view.overlay.querySelector('button');
      if (go) go.focus({ preventScroll: true });
    }
    syncCards();
    drawDock();
    drawStatus();
    syncWizard();
    positionFrontier();
  }

  // The best runs, in words.
  const bestWords = (mode) => {
    const b = bestRun(mode);
    if (!b) return '';
    return mode === 'endless'
      ? `Best endless run: ${num(b.score)} points, deal ${b.deal}.`
      : `Best run: ${num(b.score)} points, ${b.won ? 'every deal beaten' : `deal ${b.deal} of ${DEALS}`}.`;
  };
  const longestWords = () => {
    const n = (K.store.get(STORE_KEY, null) || {}).longest;
    return n ? `Longest streak: ${n}.` : '';
  };
  // A deal's curses, in words: "Moths (11 fewer cards in the stock)".
  const cursesWords = (p) => p.curses.map((id) => `${words(id).name} (${id === 'seal' ? `clear ${sealWords(p)} to release the locked cards` : id === 'hex' && p.hex >= 0 ? `${SUITS[p.hex].name} still score, but start the streak again` : words(id).blurb.replace(/\.$/, '').replace(/^./, (ch) => ch.toLowerCase())})`).join(' and ');
  const nextWords = (p) => `Next: ${finalDeal(p.n) ? `deal ${p.n}, ${endless() ? 'a Final Deal' : 'the Final Deal'}` : `deal ${p.n}${endless() ? '' : ` of ${DEALS}`}`}, ${layoutOf(p).name}, ${plural(layoutOf(p).tips.length, 'peak')}, target ${num(p.target)}.${p.curses.length ? ` ${p.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(p)}.` : ''}`;

  function cardHtml() {
    if (view.help || !run) {
      const bests = ['run', 'endless'].map(bestWords).concat(longestWords()).filter(Boolean);
      return `
        <section class="gm-card" aria-labelledby="ss-card-h">
          <span class="gm-card-art">${wizardPic('cards')}</span>
          <h3 class="gm-card-h" id="ss-card-h">Spell Solitaire</h3>
          <ul class="gm-rules">
            <li>Play an uncovered card one higher or lower than the pile. Kings and Aces go round.</li>
            <li>A streak scores more with every card: 10, 20, 30... A draw ends it.</li>
            <li>Layouts have one to five named peaks: 100 points for each, 250 for the last remaining peak. Twin Peaks doubles those awards. A clean sweep clears all 28 cards.</li>
            <li>Seven deals with changing layouts. Miss a target and lose a heart, or only half a heart if you clear the table. A clean sweep that reaches its target heals a heart.</li>
            <li>Pick spells and charms between deals; curses join from deal 4. Hex restarts streaks for its marked suit, even with Kindred. Hover, focus or tap a charm or curse to read it.</li>
            <li>The wizard’s star glows at streaks of 5, 10 and 15. After the Final Deal, keep dealing or bank your score with End Run.</li>
          </ul>
          <p class="gm-keys"><span class="hint-mouse">Keys: arrows, Enter to play, D to draw, ${SPELL_IDS.map((id) => SPELLS[id].key.toUpperCase()).join(' ')} to cast, L to look.</span><span class="hint-touch">Tap a card to play it, or the stock to draw.</span></p>
          ${bests.map((t) => `<p class="gm-best">${esc(t)}</p>`).join('')}
          <p class="gm-actions">${run
            ? '<button class="os-button" type="button" data-act="back" data-first>Back to the game</button>'
            : '<button class="os-button gm-go" type="button" data-act="start" data-first>Deal me in</button>'}</p>
        </section>`;
    }
    if (view.scry) {
      const s = view.scry;
      const many = s.order.length > 1;
      return `
        <section class="gm-card ss-scry-card" aria-labelledby="ss-card-h">
          <p class="gm-kicker">Scry</p>
          <h3 class="gm-card-h" id="ss-card-h">${many ? `The next ${s.order.length} cards` : 'The last card in the stock'}</h3>
          <p>${many ? K.hint('Click one, then another, to swap them. The first is drawn first.', 'Tap one, then another, to swap them. The first is drawn first.') : 'There is only this one left to draw.'}</p>
          <ol class="ss-scry">${s.order.map((c, k) => `<li>${scryButton(c, k, many)}</li>`).join('')}</ol>
          ${many ? '<p class="gm-keys"><span class="hint-mouse">Keys: arrows, Space to pick and swap, Enter when done, Esc to leave them as they were.</span></p>' : ''}
          <p class="gm-actions"><button class="os-button gm-go" type="button" data-act="scry-done"${many ? '' : ' data-first'}>Done</button></p>
        </section>`;
    }
    const d = run.deal;
    if (run.step === 'pick') {
      const onwards = !!run.onwards;
      const kicker = onwards ? 'Endless deals' : `${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}${endless() ? '' : ` of ${DEALS}`}`}: ${d.swept ? 'clean sweep!' : madeIt(d) ? 'target made' : 'under target'}`;
      const notes = [];
      if (!onwards) {
        if (d.healed) notes.push(`${plural(d.healed, 'heart')} back for the clean sweep`);
        if (!madeIt(d)) notes.push(d.lost === 0.5 ? 'half a heart lost' : 'a heart lost');
      }
      const tally = onwards
        ? `A curse on every deal from here on. Score: ${num(run.score)}`
        : `${num(d.score)} of ${num(d.target)} points${notes.length ? `, ${notes.join(' and ')}` : ''}. Score: ${num(run.score)}`;
      return `
        <section class="gm-card" aria-labelledby="ss-card-h">
          ${run.last && !onwards ? `<p class="gm-said">${esc(run.last)}</p>` : ''}
          <p class="gm-kicker">${esc(kicker)}</p>
          <p class="gm-tally">${esc(tally)}</p>
          <h3 class="gm-card-h" id="ss-card-h">Pick a spell or a charm</h3>
          <div class="gm-ups">${run.offer.map((id, k) => upCard(id, k === 0)).join('')}</div>
          <p class="ss-next">${esc(nextWords(run.next))}</p>${nextDiagram(run.next)}
        </section>`;
    }
    const won = run.step === 'won';
    const bestText = bestWords(run.mode);
    return `
      <section class="gm-card" aria-labelledby="ss-card-h">
        ${run.line ? `<p class="gm-said">${esc(run.line)}</p>` : ''}
        <span class="gm-card-art">${wizardPic(won ? 'party' : 'startled')}</span>
        ${won ? '<p class="gm-kicker">The Final Deal is beaten</p>' : ''}
        <h3 class="gm-card-h" id="ss-card-h">${won ? 'Run complete!' : run.ended ? 'Run ended — score saved' : run.hearts ? 'Under the Final Deal’s target' : 'Out of hearts'}</h3>
        <p class="gm-tally">${won
          ? `${plural(run.hearts, 'heart')} to spare: +${WIN}, and +${PER_HEART} a heart.<br />Score: ${num(run.score)}`
          : `${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}`}${endless() || finalDeal(d.n) ? '' : ` of ${DEALS}`}: ${num(d.score)} of ${num(d.target)} points.<br />Score: ${num(run.score)}`}</p>
        ${run.newBest
          ? `<p class="gm-best is-new">${endless() ? 'New best endless run!' : 'New best run!'}${run.bestLine ? ` <span>${esc(run.bestLine)}</span>` : ''}</p>`
          : bestText ? `<p class="gm-best">${esc(bestText)}</p>` : ''}
        <p class="gm-actions">${won
          ? '<button class="os-button gm-go" type="button" data-act="onwards" data-first>Keep dealing</button>' +
            '<button class="os-button" type="button" data-act="again">New run</button>'
          : '<button class="os-button gm-go" type="button" data-act="again" data-first>New run</button>' +
            '<button class="os-button" type="button" data-act="peek">See the table</button>'}</p>
      </section>`;
  }

  // A spell (new, or another charge of one you have) or a charm.
  const upCard = (id, first) => {
    const spell = !!SPELLS[id];
    const w = words(id);
    let kind;
    let blurb = w.blurb;
    if (spell) {
      const n = run.spells[id];
      kind = n ? `Spell, ${n + 1} a deal` : 'New spell';
      if (n) blurb = `One more charge every deal: ${n + 1} in all.`;
    } else kind = `Charm${run.have[id] ? `, you have ${run.have[id]}` : ''}`;
    if (id === 'potion') blurb = `${blurb} (${run.max + 1} hearts.)`;
    const colour = spell ? SPELLS[id].colour : CHARMS[id].colour;
    const key = spell ? `<kbd class="hint-mouse">${SPELLS[id].key.toUpperCase()}</kbd>` : '';
    return `<button class="gm-up ${colour}" type="button" data-up="${id}"${first ? ' data-first' : ''}>
        <span class="gm-up-icon">${iconOf(spell ? SPELLS[id].icon : CHARMS[id].icon)}</span>
        <span class="gm-up-name">${esc(w.name)}</span>
        <span class="gm-up-blurb">${esc(blurb)}</span>
        <span class="gm-up-have">${esc(kind)}${key}</span>
      </button>`;
  };

  // One of Scry's cards on its card: a button to pick and swap (just a
  // picture when it's the only one), with where it is in the draw.
  const SCRY_PX = 96; // (style.css .ss-scry)
  const scryPlace = (k, n) => (k === 0 ? 'Next' : k === n - 1 ? 'Last' : 'Then');
  const scryButton = (c, k, many) => {
    const s = view.scry;
    const place = scryPlace(k, s.order.length);
    const inner = `<span class="ss-card">${faceHtml(c, SCRY_PX)}</span><span class="ss-scry-n">${place}</span>`;
    const label = esc(`${place}: ${caption(c)}`);
    return many
      ? `<button class="ss-scry-pick${s.sel === k ? ' is-picked' : ''}" type="button" data-scry="${k}"${k === 0 ? ' data-first' : ''} aria-pressed="${s.sel === k}" aria-label="${label}">${inner}</button>`
      : `<span class="ss-scry-pick" role="img" aria-label="${label}">${inner}</span>`;
  };

  // Scry has been cast: its cards come up over the table.
  function openScry(cards) {
    view.scry = { cards: cards.slice(), order: cards.slice(), sel: -1 };
    syncCard(true);
  }
  // A click (or Space) on one of them: pick it, then another to swap them.
  function scryPick(k) {
    const s = view.scry;
    if (!s || s.order.length < 2 || !(k >= 0 && k < s.order.length)) return;
    if (s.sel < 0) {
      s.sel = k;
      announce(`${cardName(s.order[k])} picked: now the card to swap it with.`);
    } else if (s.sel === k) {
      s.sel = -1;
      announce(`${cardName(s.order[k])} put down.`);
    } else {
      [s.order[s.sel], s.order[k]] = [s.order[k], s.order[s.sel]];
      s.sel = -1;
      sound('flip');
      announce(`Swapped. Now ${s.order.map(cardName).join(', then ')}.`);
    }
    // (Redrawn in place, so the card doesn't bounce in again.)
    view.overlay.querySelectorAll('[data-scry]').forEach((b) => {
      const i = Number(b.dataset.scry);
      b.outerHTML = scryButton(s.order[i], i, true);
    });
    const at = view.overlay.querySelector(`[data-scry="${k}"]`);
    if (at) at.focus({ preventScroll: true });
  }
  // Done (Enter): the cards go back in the order shown; Esc leaves them
  // as they were dealt.
  function scryDone(keep) {
    const s = view.scry;
    if (!s) return;
    view.scry = null;
    syncCard(false);
    act(reorder(keep ? s.order : s.cards));
    focusTable();
  }
  // Arrows along Scry's cards.
  function scryMove(key) {
    const btns = Array.prototype.slice.call(view.overlay.querySelectorAll('[data-scry]'));
    if (!btns.length) return;
    const at = btns.indexOf(document.activeElement);
    const to = key === 'Home' ? 0 : key === 'End' ? btns.length - 1
      : Math.max(0, Math.min(btns.length - 1, (at < 0 ? 0 : at) + (key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1)));
    btns[to].focus({ preventScroll: true });
  }

  /* ---------- telling you things ---------- */
  // A note over the table, read out by screen readers too (unless `quiet`:
  // the move's own summary is about to say it).
  function say(text, ms, quiet) {
    if (!view || !text) return;
    const t = view.toast;
    t.textContent = text;
    t.hidden = false;
    restart(t, 'is-in');
    clearTimeout(view.toastTimer);
    view.toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2400);
    if (!quiet) announce(text);
  }
  function announce(text) {
    if (!view || !text) return;
    const liveEl = view.live;
    liveEl.textContent = '';
    clearTimeout(view.liveTimer);
    view.liveTimer = setTimeout(() => { liveEl.textContent = text; }, 40);
  }

  // The ranks that go on a card, in words: "a 6 or an 8", "a King or a 2".
  const anA = (r) => (/^(8|Ace)$/.test(RANK_NAMES[r - 1]) ? 'an ' : 'a ') + RANK_NAMES[r - 1];
  function fitWords(d) {
    const r = rankOf(pileFace(d));
    const wrap = !cursed(d, 'circle');
    const out = [];
    if (r > 1) out.push(r - 1); else if (wrap) out.push(13);
    if (r < 13) out.push(r + 1); else if (wrap) out.push(1);
    return out.map(anA).join(' or ');
  }

  // What a move did, in words (and the notes and lines that go with it).
  function tell(ev) {
    const d = run.deal;
    const out = [];
    let note = '';
    ev.forEach((e) => {
      if (e.t === 'cast' && e.spell === 'moonlight') out.push('Moonlight!');
      else if (e.t === 'play') {
        out.push(`${e.wild ? 'Wild: ' : ''}${caption(e.card)} on the pile. ${e.hexed ? `Hexed: the streak starts again, plus ${e.pts}.` : `Streak ${e.streak}, plus ${e.pts}${e.kin ? ' (Kindred: double)' : ''}.`}`);
        if (e.clover) out.push('Lucky Clover: 50 bonus points included.');
        if (e.hexed) {
          note = `Hex: ${SUITS[suitOf(e.card)].name} restart the streak${e.kin ? ' (Kindred still doubles the score)' : ''}.`;
          wizardSays(note, 3200);
        }
        if (e.streak >= 5 && e.streak % 5 === 0 && !e.hexed) {
          note = `Streak ${e.streak}!`;
          if (e.streak >= 10) wizardSays(lineOf('streakLines'), 2200);
        }
      } else if (e.t === 'draw') {
        out.push(`${e.echo ? 'Echo: drew' : 'Drew'} the ${cardName(e.card)}${e.echo ? `, streak kept at ${d.streak}` : e.broke ? `. Streak over at ${e.broke}` : ''}.${e.toll ? ` Toll: minus ${e.toll}.` : ''}`);
      } else if (e.t === 'refill') out.push(`The Second Deck shuffles ${plural(e.n, 'card')} back into the stock.`);
      else if (e.t === 'burn') out.push(`Fireball: the ${cardName(e.card)} burns away. The streak carries on at ${d.streak}.`);
      else if (e.t === 'rewind') out.push(`Rewind: the ${cardName(e.card)} goes back. Streak ${d.streak}.`);
      else if (e.t === 'undraw') out.push(`Undraw: the ${cardName(e.card)} goes under the stock. Streak ${e.streak}${e.toll ? `, and the Toll's ${e.toll} comes back` : ''}.`);
      else if (e.t === 'scry') out.push(`Scry: the next ${e.cards.length > 1 ? `${e.cards.length} cards are` : 'card is'} ${e.cards.map(cardName).join(', then ')}.${e.cards.length > 1 ? ' Swap them round, then Done.' : ''}`);
      else if (e.t === 'reorder') out.push(e.moved ? `Back on the stock: ${e.cards.map(cardName).join(', then ')}.` : 'Back on the stock as they were.');
      else if (e.t === 'moonlight') out.push(e.flipped.length ? `${plural(e.flipped.length, 'card')} turn face up.` : 'Every card was face up already.');
      else if (e.t === 'nudge') out.push(`Nudge: the pile is now ${cardName(e.card)}. Streak ${d.streak} kept.`);
      else if (e.t === 'dispel') out.push(`Dispel: ${words(e.curse).name} removed for this deal.${e.restored ? ` ${plural(e.restored, 'card')} returned under the stock.` : ''}`);
      else if (e.t === 'flip') out.push(`Turned over: ${caption(e.card)}.`);
      else if (e.t === 'peak') out.push(`Peak! Plus ${e.pts}.`);
      else if (e.t === 'unseal') out.push('The named guard peaks are clear: the Seal breaks.');
      else if (e.t === 'target') { out.push('Target reached!'); note = note || 'Target reached!'; wizardSays(lineOf('targetLines'), 2400); }
      else if (e.t === 'sweep') out.push(`Clean sweep!${e.left ? ` Plus ${e.pts} for the ${plural(e.left, 'card')} left in the stock.` : ''}`);
      else if (e.t === 'heal') out.push(`${plural(e.amount, 'heart')} back.`);
      else if (e.t === 'book') out.push(`The Spellbook gives a free ${words(e.spell).name} for the next deal.`);
      else if (e.t === 'end') out.push(`${e.final ? 'Final Deal' : `Deal ${e.n}`} over: ${num(e.score)} of ${num(e.target)} points${e.made ? ', target made' : ', under target'}.`);
      else if (e.t === 'hurt') out.push(`${e.amount === 0.5 ? 'Half a heart' : 'A heart'} lost: ${plural(e.hearts, 'heart')} left.`);
      else if (e.t === 'finale') out.push(`Another Final Deal beaten: plus ${e.bonus}.`);
      else if (e.t === 'deny') out.push(denyWords(e));
    });
    if (note) say(note, 1800, true);
    if (playing() && !ev.some((e) => e.t === 'deny')) {
      if (!movesOf().length) out.push(canDraw(d) ? `No plays: draw, ${plural(d.stock.length, 'card')} left.` : 'No plays, and the stock is empty: cast a spell or end the deal.');
    }
    announce(out.join(' '));
  }
  function denyWords(e) {
    const d = run.deal;
    if (e.spell) {
      return {
        none: `No ${words(e.spell).name} left this deal.`,
        empty: e.spell === 'scry' ? 'The stock is empty: there is nothing to see.' : 'The stock is empty: there is nothing to draw.',
        nothing: {
          rewind: 'Nothing to take back since the last draw.',
          moonlight: 'Every card is face up already.',
          undraw: 'No draw to take back: a play or a spell since the last one keeps it.',
          dispel: 'There are no curses left to remove this deal.',
        }[e.spell] || 'No uncovered card to cast it on.',
        sealed: `That card is sealed until ${sealWords(run.deal)} are clear.`,
        covered: 'That card is covered.',
      }[e.why] || 'Not now.';
    }
    if (e.why === 'sealed') return `Sealed until ${sealWords(run.deal)} are clear.`;
    if (e.why === 'covered') return 'That card is covered.';
    if (e.why === 'empty') return playing() && stuck() ? 'The stock is empty: cast a spell, or press End deal.' : 'The stock is empty.';
    return `The ${cardName(d.slots[e.i])} doesn't go on the ${cardName(pileFace(d))}: play ${fitWords(d)}.`;
  }

  // L: the whole table, said aloud.
  function look() {
    if (!run || !run.deal) return;
    const d = run.deal;
    const parts = [`${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}${endless() ? '' : ` of ${DEALS}`}`}, ${layoutOf(d).name}: ${num(d.score)} of ${num(d.target)} points, streak ${d.streak}, ${plural(run.hearts, 'heart')}.`];
    if (d.curses.length) parts.push(`${d.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(d)}.`);
    parts.push(`The pile: ${caption(pileFace(d))}. ${playing() ? `It takes ${fitWords(d)}.` : ''}`);
    const fits = movesOf();
    const frees = range(PLACES).filter((i) => free(d, i)).sort(byPlace);
    parts.push(fits.length ? `You can play: ${fits.sort(byPlace).map((i) => caption(d.slots[i])).join(', ')}.` : 'Nothing uncovered goes on the pile.');
    const others = frees.filter((i) => fits.indexOf(i) === -1);
    if (others.length) parts.push(`Also uncovered: ${others.map((i) => `${cardName(d.slots[i])}${sealed(d, i) ? ' (sealed)' : ''}`).join(', ')}.`);
    const down = d.slots.filter((c, i) => c >= 0 && !d.up[i]).length;
    const left = d.slots.filter((c) => c >= 0).length;
    const shown = range(PLACES).filter((i) => d.slots[i] >= 0 && d.up[i] && !free(d, i)).sort(byPlace);
    parts.push(`${plural(left, 'card')} left in the peaks, ${down} face down${shown.length ? `, ${shown.length} face up but covered: ${shown.map((i) => cardName(d.slots[i])).join(', ')}` : ''}.`);
    const peek = run.have.crystal ? d.stock.slice(-run.have.crystal).reverse() : [];
    parts.push(`Stock: ${plural(d.stock.length, 'card')}${peek.length ? `, next ${peek.map(cardName).join(', then ')}` : ''}.`);
    const spells = SPELL_IDS.filter((id) => d.charges[id] > 0).map((id) => `${words(id).name} ${d.charges[id]}`);
    if (spells.length) parts.push(`Spells: ${spells.join(', ')}.`);
    if (usable('undraw')) parts.push(`Undraw would put the ${cardName(d.drawn.card)} under the stock and bring back a streak of ${d.drawn.streak}.`);
    announce(parts.join(' '));
  }

  /* ---------- playing ----------
     Mouse and touch: a card plays it, the stock draws, a spell in the dock
     casts it (Wild and Fireball then want a card). Keys: the arrows move
     between the uncovered cards (only they are in the tab order), Enter or
     Space plays one, D draws (or ends the deal), W, F, E, R, M, S and U cast,
     Escape cancels a spell, L looks. Any press first skips whatever is
     moving to its end. */
  let lastInput = 'pointer';

  // Do a move: draw it, say it, and see what comes next.
  function act(ev) {
    if (!view || !ev || !ev.length) return;
    // (A card with the focus may be about to go: the focus goes on to the nearest.)
    const held = view.peaks.contains(document.activeElement);
    if (!ev.every((e) => e.t === 'deny')) view.armed = '';
    show(ev);
    tell(ev);
    if (held && !(document.activeElement && document.activeElement.classList.contains('is-free'))) focusCard();
    afterMove(ev);
    const seen = ev.find((e) => e.t === 'scry');
    if (seen) openScry(seen.cards);
  }

  // After a deal ends: the trophy, saving, the desktop, and (once
  // everything has landed) the card for what's next.
  function afterMove(ev) {
    const end = ev.find((e) => e.t === 'end');
    if (!end) return;
    const d = run.deal;
    if (ev.some((e) => e.t === 'won' || e.t === 'finale')) K.trophy.award('solitaire');
    if (run.step === 'over') {
      run.line = lineOf('loseLines');
      finishRun(false);
      tellDesktop(false);
    } else if (run.step === 'won') {
      run.line = lineOf('winLines');
      finishRun(true);
      tellDesktop(true);
    } else run.last = lineOf(madeIt(d) ? (d.swept ? 'sweepLines' : 'madeLines') : 'hurtLines');
    const wait = RM ? 300 : end.swept ? 1700 : 1000;
    whenStill(() => {
      if (run.step === 'won') {
        sound('win');
        bounceFinish(finishWin);
        return;
      }
      if (run.step === 'over') later(() => sound(run.newBest ? 'best' : 'lose'), 200);
      if (run.step === 'pick' && !run.offer.length) { dealOn(); return; }
      syncCard(true);
      announce(run.step === 'pick' ? `Pick a spell or a charm. ${nextWords(run.next)}` : `The run is over. Score ${num(run.score)}.`);
    }, wait);
  }
  // Every spell charge and charm is taken: there's nothing to pick, so
  // the next deal comes straight away.
  function dealOn() {
    const ev = choose(null);
    if (!view || !ev.length) return;
    run.onwards = false;
    view.peek = false;
    syncCard(false);
    show(ev);
    view.focus = -1;
    syncCards();
    focusCard();
    const line = `Nothing left to learn. On to deal ${run.deal.n}!`;
    wizardSays(line, 2600);
    announce(`${line} ${dealText()}`);
  }
  function finishWin() {
    if (!view) return;
    syncCard(true);
    announce(`Run complete! Score ${num(run.score)}. Keep dealing to carry on, or start a new run.`);
  }

  // A card's been pressed: play it, or cast the armed spell on it.
  function tap(i) {
    if (!playing() || view.card) return;
    view.focus = i;
    if (view.armed) act(cast(view.armed, i));
    else act(play(i));
  }

  function spell(id) {
    if (!playing() || view.card || !SPELLS[id]) return;
    if (view.armed === id) { disarm(); return; }
    const no = why(id);
    if (no) { act([{ t: 'deny', spell: id, why: no }]); return; }
    if (id === 'nudge' || id === 'dispel') {
      const current = run.deal;
      const choices = id === 'nudge' ? [-1, 1] : current.curses.slice();
      const labels = id === 'nudge'
        ? choices.map((delta) => `${delta < 0 ? 'Down' : 'Up'} to ${RANK_NAMES[(rankOf(pileFace(current)) - 1 + delta + 13) % 13]}`)
        : choices.map((curse) => words(curse).name);
      K.dialog({
        title: words(id).name,
        icon: SPELLS[id].icon,
        message: id === 'nudge' ? 'Choose the pile’s new rank. Its suit and your streak stay the same.' : 'Choose one curse to remove for this deal.',
        buttons: ['Cancel'].concat(labels),
      }).then((answer) => {
        const choice = Number(answer) - 1;
        if (view && playing() && run.deal === current && choices[choice] != null) act(cast(id, choices[choice]));
      });
      return;
    }
    if (SPELLS[id].aim) {
      // Wild and Fireball ring the cards they could go on first.
      view.armed = id;
      syncCards();
      drawDock();
      drawStatus();
      say(`${words(id).name}: pick an uncovered card.${lastInput === 'key' ? ' Esc cancels.' : ''}`, 2600);
      // From the keyboard, straight onto a ringed card.
      if (lastInput === 'key' && !(document.activeElement && document.activeElement.classList.contains('is-free'))) focusCard();
      return;
    }
    act(cast(id));
  }
  function disarm() {
    if (!view.armed) return;
    view.armed = '';
    syncCards();
    drawDock();
    drawStatus();
    say('Spell put away.', 1400);
  }

  // With a deal on, the card the arrow keys are on; otherwise the table
  // itself, so the keys (and L) still work.
  function focusTable() {
    if (playing()) { focusCard(); return; }
    view.stage.tabIndex = -1;
    view.stage.focus({ preventScroll: true });
  }
  // The card the arrow keys are on (or Draw, with none uncovered).
  function focusCard() {
    const el = view.els[view.focus];
    if (el && !el.hidden && el.classList.contains('is-free')) el.focus({ preventScroll: true });
    else view.root.querySelector('[data-act="draw"]').focus({ preventScroll: true });
  }
  // The arrow keys: along the uncovered cards, left to right (Up and Down
  // to the nearest one a row up or down; Home and End to either end).
  function moveFocus(key) {
    const d = run.deal;
    const to = focusSlot(d, view.focus, key);
    if (to < 0) return;
    view.focus = to;
    syncCards();
    focusCard();
    view.els[to].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  function focusSlot(d, from, key) {
    const SLOTS = slotsOf(d);
    const frees = range(PLACES).filter((i) => free(d, i)).sort((a, b) => SLOTS[a].x - SLOTS[b].x || SLOTS[a].y - SLOTS[b].y);
    if (!frees.length) return -1;
    const at = frees.indexOf(from);
    let to = from;
    if (key === 'ArrowRight') to = frees[Math.min(frees.length - 1, at + 1)];
    else if (key === 'ArrowLeft') to = frees[Math.max(0, at - 1)];
    else if (key === 'Home') to = frees[0];
    else if (key === 'End') to = frees[frees.length - 1];
    else {
      const y = SLOTS[from] ? SLOTS[from].y : layoutOf(d).depth - 1;
      const rows = frees.filter((i) => (key === 'ArrowUp' ? SLOTS[i].y < y : SLOTS[i].y > y));
      if (rows.length) {
        const near = key === 'ArrowUp' ? Math.max(...rows.map((i) => SLOTS[i].y)) : Math.min(...rows.map((i) => SLOTS[i].y));
        to = rows.filter((i) => SLOTS[i].y === near).sort((a, b) => Math.abs(SLOTS[a].x - (SLOTS[from]?.x || 0)) - Math.abs(SLOTS[b].x - (SLOTS[from]?.x || 0)))[0];
      }
    }
    if (to == null || to < 0) to = frees[0];
    return to;
  }

  function wire(v) {
    v.owned.addEventListener('click', (e) => {
      const chip = e.target.closest('button');
      if (chip) chip.focus({ preventScroll: true });
    });
    // The second click of a double-click lands on whatever is under it: never
    // on a card's button, and never on the game just after a card goes.
    v.win.body.addEventListener('click', (e) => {
      if (e.detail > 1 && (v.overlay.contains(e.target) || performance.now() - v.cardClosedAt < 500)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    // Any press skips what's moving first (then does its own thing).
    v.root.addEventListener('pointerdown', () => { lastInput = 'pointer'; skip(); }, true);
    // Keys anywhere in the window (a click on a card leaves the window
    // itself with the focus).
    v.keys = (e) => {
      lastInput = 'key';
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.key === 'Tab' || e.key === 'Shift') return;
      // Escape that skipped something doesn't also tuck the window away.
      if (skip() && e.key === 'Escape') e.preventDefault();
    };
    v.win.el.addEventListener('keydown', v.keys, true);
    v.peaks.addEventListener('click', (e) => {
      const el = e.target.closest('.ss-card.is-free');
      if (el) tap(Number(el.dataset.slot));
    });
    v.stock.addEventListener('click', () => { if (playing() && !view.card) act(draw()); });
    v.pile.addEventListener('click', () => {
      if (!playing()) return;
      const d = run.deal;
      say(`The pile: ${caption(pileFace(d))}. It takes ${fitWords(d)}.`, 2600);
    });
    v.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !run) return;
      if (b.dataset.act === 'draw') act(draw(false, true)); // (End deal, once that's what it says)
      else if (b.dataset.spell) spell(b.dataset.spell);
    });
    v.onKey = onKey;
    v.win.el.addEventListener('keydown', onKey);
    v.menu.addEventListener('click', onMenu);
    v.overlay.addEventListener('click', onCard);
    const FX = { 'ss-flip': 'is-flipping', 'ss-back': 'is-back', 'ss-nope': 'is-nope' };
    v.peaks.addEventListener('animationend', (e) => {
      const el = e.target.closest('.ss-card');
      if (el && FX[e.animationName]) el.classList.remove(FX[e.animationName]);
    });
  }

  function onKey(e) {
    if (e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented || !view || !run) return;
    if (e.target.closest && e.target.closest('.win-bar, .gm-menu, .gm-owned, input, textarea')) return;
    if (view.card) { cardKey(e); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const onCardEl = e.target.closest && e.target.closest('.ss-card.is-free');
    if (k === 'Escape') {
      if (view.armed) { e.preventDefault(); disarm(); }
      return;
    }
    if (!playing()) {
      if (k === 'l') { e.preventDefault(); look(); }
      return;
    }
    if (/^Arrow|^Home$|^End$/.test(k) && !(e.target.closest && e.target.closest('.ss-dock'))) {
      e.preventDefault();
      moveFocus(k);
      return;
    }
    if ((k === 'Enter' || k === ' ') && onCardEl) {
      e.preventDefault();
      if (!e.repeat) tap(Number(onCardEl.dataset.slot));
      return;
    }
    const id = SPELL_IDS.find((s) => SPELLS[s].key === k);
    if (k === 'd' || id || k === 'l') {
      e.preventDefault();
      if (e.repeat) return;
      if (k === 'd') act(draw(false, true));
      else if (k === 'l') look();
      else spell(id);
    }
  }

  // Keys while a card is over the table: Esc on Help goes back to the game
  // (and never tucks the window away); Scry's card has keys of its own.
  function cardKey(e) {
    const k = e.key;
    if (view.help) {
      if (k === 'Escape') { e.preventDefault(); backToGame(); }
      return;
    }
    if (!view.scry) return;
    if (k === 'Escape' || k === 'Enter') {
      e.preventDefault();
      if (!e.repeat) scryDone(k === 'Enter');
    } else if (/^Arrow|^Home$|^End$/.test(k)) {
      e.preventDefault();
      scryMove(k);
    }
  }

  function onMenu(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !view) return;
    if (btn.dataset.act === 'new') askNewRun();
    else if (btn.dataset.act === 'end-run') {
      if (!endRun().length) return;
      view.help = false;
      view.scry = null;
      view.peek = false;
      show([]);
      syncCard(true);
      announce(`Run ended. Score ${num(run.score)} saved.`);
    }
    else if (btn.dataset.act === 'help') {
      if (view.bouncing) { stopBounce(); finishWin(); } // the finish ends here, so it can't eat the first click on Back
      view.help = true;
      syncCard(true);
    }
  }

  // New run (the menu): straight away, or after a word if one's under way.
  function askNewRun() {
    if (!run || run.step === 'over' || run.step === 'won' || (run.n === 1 && run.deal.pile.length === 1 && run.deal.slots.every((c) => c >= 0))) { begin(); return; }
    K.dialog({
      title: 'New run',
      icon: 'controller',
      message: `Start a new run? This one ends here, on deal ${run.deal.n} with ${plural(run.score + (run.deal.over ? 0 : run.deal.score), 'point')}.`,
      buttons: ['Keep playing', 'New run'],
    }).then((v) => { if (v === '1') begin(); });
  }
  // The faces' pictures, fetched for the finish's canvas (the table's
  // cards have them already, so they come from the cache).
  function primeFaces() {
    if (!view || !run) return;
    view.faceImgs = (run.faces || []).map((fc) => {
      if (!fc) return null;
      const im = new Image();
      im.src = cardArt(fc.img);
      return im;
    });
  }
  function begin() {
    const ev = newRun();
    if (!view) return;
    primeFaces();
    view.help = false;
    view.scry = null;
    view.peek = false;
    syncCard(false);
    show(ev);
    view.focus = -1;
    syncCards();
    focusCard();
    dealWords();
  }
  // A new deal, in words (and his line about it).
  function dealText() {
    const d = run.deal;
    const p = { n: d.n, target: d.target, curses: d.curses, hex: d.hex };
    return `${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}`}, ${layoutOf(d).name}, target ${num(d.target)}.${d.curses.length ? ` ${d.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(p)}.` : ''} The pile: ${caption(pileFace(d))}. ${movesOf().length ? `${plural(movesOf().length, 'card')} can go on it.` : 'Nothing goes on it yet.'}`;
  }
  function dealWords() {
    announce(dealText());
    wizardSays(lineOf(finalDeal(run.deal.n) ? 'finalLines' : 'dealLines'), 2400);
  }

  function backToGame() {
    view.help = false;
    syncCard(true);
    if (!view.card) focusTable();
  }

  function onCard(e) {
    const btn = e.target.closest('button');
    if (!btn || !view) return;
    if (btn.dataset.scry) { scryPick(Number(btn.dataset.scry)); return; }
    if (btn.dataset.up) {
      const ev = choose(btn.dataset.up);
      if (!ev.length) return;
      run.onwards = false;
      sound('pick');
      view.peek = false;
      syncCard(false);
      show(ev);
      view.focus = -1;
      syncCards();
      focusCard();
      dealWords();
      return;
    }
    const what = btn.dataset.act;
    if (what === 'start' || what === 'again') begin();
    else if (what === 'onwards') {
      if (!keepDealing().length) return;
      if (!run.offer.length) { dealOn(); return; }
      run.onwards = true;
      sound('pick');
      syncCard(true);
      announce(`Endless deals: a curse on every deal, and higher targets. Pick a spell or a charm. ${nextWords(run.next)}`);
    } else if (what === 'back') backToGame();
    else if (what === 'scry-done') scryDone(true);
    else if (what === 'peek') {
      view.peek = true;
      syncCard(false);
      focusTable();
      say('This is where it ended. Press New run to deal again.', 3200);
    }
  }

  /* ---------- the finish: bouncing cards ----------
     A won run sends the thirteen faces bouncing off the pile, one after
     another, on a canvas that's never cleared, so they leave the classic
     trails. About 8 seconds; any key or click ends it. Never with reduced
     motion. */
  const BOUNCE_FOR = 8000;
  function bounceFinish(done) {
    const v = view;
    if (RM || !v || !v.bounce.getContext) { done(); return; }
    const box = v.stage.getBoundingClientRect();
    const pile = v.pile.getBoundingClientRect();
    if (!box.width || !pile.width) { done(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = v.bounce;
    cv.width = Math.round(box.width * dpr);
    cv.height = Math.round(box.height * dpr);
    cv.hidden = false;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = pile.width * 0.8;
    const h = w * 1.4;
    const css = getComputedStyle(v.root);
    const colour = (name) => css.getPropertyValue(name).trim() || '#AE9DF3';
    // Each face drawn once (its art, if it has loaded), then stamped.
    const stamps = range(13).map((r) => {
      const c = r + 13 * (r % SUITS.length);
      const s = document.createElement('canvas');
      s.width = Math.round(w * dpr);
      s.height = Math.round(h * dpr);
      const x = s.getContext('2d');
      x.scale(dpr, dpr);
      const round = (px, py, pw, ph, rad) => { x.beginPath(); x.moveTo(px + rad, py); x.arcTo(px + pw, py, px + pw, py + ph, rad); x.arcTo(px + pw, py + ph, px, py + ph, rad); x.arcTo(px, py + ph, px, py, rad); x.arcTo(px, py, px + pw, py, rad); x.closePath(); };
      round(1, 1, w - 2, h - 2, w * 0.12);
      x.fillStyle = colour(`--${SUITS[suitOf(c)].colour}`);
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = colour('--ink');
      x.stroke();
      const img = v.faceImgs && v.faceImgs[r];
      const iw = w * 0.8;
      const ih = h * 0.6;
      const ix = (w - iw) / 2;
      const iy = h * 0.3;
      if (img && img.complete && img.naturalWidth) {
        const k = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
        const sw = iw / k;
        const sh = ih / k;
        x.save();
        round(ix, iy, iw, ih, 4);
        x.clip();
        x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * 0.28, sw, sh, ix, iy, iw, ih);
        x.restore();
        round(ix, iy, iw, ih, 4);
        x.stroke();
      }
      x.fillStyle = colour('--ink');
      x.font = `${Math.round(h * 0.2)}px ${css.getPropertyValue('--font-display') || 'sans-serif'}`;
      x.textBaseline = 'top';
      x.fillText(RANKS[r], w * 0.12, h * 0.06);
      return s;
    });
    let H = box.height;
    let W = box.width;
    const fly = [];
    let launched = 0;
    let last = performance.now();
    const start = last;
    const from = { x: pile.left - box.left + (pile.width - w) / 2, y: pile.top - box.top };
    const launch = () => {
      const dir = launched % 2 ? -1 : 1;
      fly.push({ s: stamps[launched], x: from.x, y: from.y, vx: dir * (90 + Math.random() * 140), vy: -(220 + Math.random() * 260) });
      launched++;
    };
    const tick = (now) => {
      if (view !== v || !v.bouncing) return;
      // The window changed size (maximised, say): a fresh canvas to match.
      const b = v.stage.getBoundingClientRect();
      if (b.width && b.height && (Math.abs(b.width - W) > 1 || Math.abs(b.height - H) > 1)) {
        W = b.width;
        H = b.height;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now - start;
      if (launched < 13 && t > launched * 520) launch();
      fly.forEach((f) => {
        f.vy += 1100 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y + h > H) { f.y = H - h; f.vy = -f.vy * 0.74; }
        ctx.drawImage(f.s, f.x, f.y, w, h);
      });
      for (let k = fly.length - 1; k >= 0; k--) if (fly[k].x < -w || fly[k].x > W) fly.splice(k, 1);
      if (t > BOUNCE_FOR || (launched >= 13 && !fly.length)) { stopBounce(); done(); return; }
      v.bouncing.raf = requestAnimationFrame(tick);
    };
    v.bouncing = { raf: requestAnimationFrame(tick) };
  }
  function stopBounce() {
    if (!view || !view.bouncing) return;
    cancelAnimationFrame(view.bouncing.raf);
    view.bouncing = null;
    const cv = view.bounce;
    const ctx = cv.getContext && cv.getContext('2d');
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
    cv.hidden = true;
  }

  K.solitaire = { mount, unmount };
})();

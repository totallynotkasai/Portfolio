/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - SPELL SOLITAIRE  (a game in the Games window)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. What the wizard says, the words on
   the spell, charm and curse cards, which artwork each rank wears and
   the drawings for the cards live in content.js under "solitaire"; the
   wizard wears his own drawings (wizard.frames), stand-ins and all.
   apps.js fetches this file the first time the game opens.

   TriPeaks with spells. Three peaks of cards, their bottom row face up:
   play any uncovered card one rank above or below the top of the pile
   (Kings and Aces go round), or draw from the stock. Every card in an
   unbroken streak is worth more than the last, a draw ends the streak,
   and clearing a peak pays a bonus. A run is seven deals, each with a
   target: a deal under its target costs a heart, and the Final Deal
   must be beaten. Between deals you pick a spell (Wild, Fireball, Echo,
   Rewind or Moonlight) or a charm, and from the fourth deal on curses
   join in. Beat the Final Deal to complete the run, then keep dealing
   for as long as your hearts last. Nothing is ever timed. Each visitor's
   best is kept.
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
  const TARGETS = [700, 850, 1000, 1050, 1150, 1250, 1675]; // the points each deal must reach (deals 4 to 7 are cursed too)
  const GROW = 1.08;             // endless: every deal's target this much higher than the last
  const HEARTS = 3;              // at the start of a run
  const MOST_HEARTS = 5;         // the Healing Potion stops offering itself here
  const CARD = 10;               // a card scores this times its place in the streak (10, 20, 30...)
  const PEAK = [100, 100, 250];  // the first, second and third peak cleared (the third is a clean sweep)
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

  /* ---------- the peaks ----------
     28 places in four rows of 3, 6, 9 and 10, top first. x is in card
     widths along the bottom row (0 to 9). Each card lies over the two
     cards half a card either side of it in the row above, so a card is
     uncovered once both cards lying over it are gone; the bottom row
     starts uncovered and face up. The top card of each peak is its tip. */
  const ROWS = [[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];
  const SLOTS = [];
  ROWS.forEach((xs, y) => xs.forEach((x) => SLOTS.push({ x, y, over: [], under: [] })));
  // over: the places whose cards lie over this one; under: the ones it lies over.
  SLOTS.forEach((s, i) => SLOTS.forEach((t, j) => {
    if (t.y === s.y + 1 && Math.abs(t.x - s.x) === 0.5) { s.over.push(j); t.under.push(i); }
  }));
  const PLACES = SLOTS.length;
  const LAST_ROW = ROWS.length - 1;
  const TIPS = [0, 1, 2];
  const MIDDLE = 1;    // the middle peak's tip
  const SEALED = [MIDDLE].concat(SLOTS[MIDDLE].over); // what the Seal holds: the middle tip and the two cards lying over it

  /* ---------- spells ----------
     Each pick of a spell is one more charge of it in every deal (up to
     CHARGES); they're all back at the start of the next deal. Wild and
     Fireball are cast on a card. */
  const SPELLS = {
    wild: { key: 'w', icon: 'wild', colour: 'pink', name: 'Wild', blurb: 'Play any uncovered card, whatever its rank. The streak carries on.', aim: true },
    fireball: { key: 'f', icon: 'fireball', colour: 'coral', name: 'Fireball', blurb: 'Burn an uncovered card away. The streak carries on, and a peak still pays.', aim: true },
    echo: { key: 'e', icon: 'echo', colour: 'blue', name: 'Echo', blurb: 'Draw a card without breaking your streak.' },
    rewind: { key: 'r', icon: 'rewind', colour: 'teal', name: 'Rewind', blurb: 'Take back your last play.' },
    moonlight: { key: 'm', icon: 'moonlight', colour: 'lavender', name: 'Moonlight', blurb: 'Every face-down card turns face up for this deal.', most: 1 },
  };
  const SPELL_IDS = Object.keys(SPELLS);

  /* ---------- charms (pick one instead of a spell; they last the run) ---------- */
  const CHARMS = {
    ember: { icon: 'ember', colour: 'coral', name: 'Ember', blurb: 'Streaks start a step higher: 20, 30, 40...', most: 1 },
    twin: { icon: 'peaks', colour: 'lavender', name: 'Twin Peaks', blurb: 'Peak bonuses are doubled.', most: 1 },
    kindred: { icon: 'kindred', colour: 'pink', name: 'Kindred', blurb: 'A card played on its own suit scores double.', most: 1 },
    crystal: { icon: 'crystal', colour: 'blue', name: 'Crystal Ball', blurb: 'See the top card of the stock (two with a second ball).', most: 2 },
    deck: { icon: 'deck', colour: 'teal', name: 'Second Deck', blurb: `Once a deal, an empty stock gets ${REFILL} cards back from the pile.`, most: 1 },
    potion: { icon: 'potion', colour: 'pink', name: 'Healing Potion', blurb: 'One more heart, and all your hearts back.' },
    spellbook: { icon: 'book', colour: 'yellow', name: 'Spellbook', blurb: 'Each clean sweep gives a free spell charge for the next deal.', most: 1 },
  };
  const CHARM_IDS = Object.keys(CHARMS);

  /* ---------- curses (one on each of deals 4 to 6, two on the Final Deal) ---------- */
  const CURSES = {
    circle: { icon: 'circle', name: 'Broken Circle', blurb: "Kings and Aces don't connect." },
    seal: { icon: 'seal', name: 'Seal', blurb: "The middle peak's top three cards are sealed until both outer peaks are clear." },
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
  const free = (d, i) => d.slots[i] >= 0 && SLOTS[i].over.every((j) => d.slots[j] < 0);
  const sealed = (d, i) => SEALED.indexOf(i) !== -1 && cursed(d, 'seal') && (d.slots[0] >= 0 || d.slots[2] >= 0);
  const open = (d, i) => free(d, i) && !sealed(d, i);
  const opens = (d) => range(PLACES).filter((i) => open(d, i));
  // One rank either side of the pile's top card. Kings and Aces go round,
  // unless the Broken Circle is on the deal.
  const fits = (d, c) => {
    const gap = Math.abs(rankOf(c) - rankOf(topOf(d)));
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
    return d.slots.some((c, k) => c >= 0 && !d.up[k]) ? '' : 'nothing'; // moonlight
  }
  const usable = (id, i) => !why(id, i);
  // Nothing left to try: no play, nothing to draw, and no spell that could
  // change that. The deal ends by itself then.
  const hopeless = () => stuck() && !usable('wild') && !usable('fireball') && !usable('rewind');

  // A new run, from the first deal. seed: which run (the same one deals
  // the same cards), or none for a fresh one. Anything still being drawn
  // from the old run is stopped first, so none of it lands in the new one.
  function newRun(seed) {
    if (run && !run.recorded && run.score > 0) finishRun(false); // a run left halfway still counts
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
    let curses = [];
    if (n > 3 && n < DEALS) curses = [run.bag[n - 4]];
    else if (finalDeal(n)) {
      const pairs = [];
      CURSE_IDS.forEach((a, i) => CURSE_IDS.slice(i + 1).forEach((b) => {
        if (!(a === 'circle' && b === 'moths')) pairs.push([a, b]);
      }));
      curses = pairs[rand(pairs.length)];
    } else if (n > DEALS) {
      const last = run.deal ? run.deal.curses : [];
      const pool = CURSE_IDS.filter((id) => !(last.length === 1 && last[0] === id));
      curses = [pool[rand(pool.length)]];
    }
    return { n, target: targetOf(n), curses, hex: curses.indexOf('hex') !== -1 ? rand(SUITS.length) : -1 };
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
      slots: cards.slice(0, PLACES),       // the card at each place (-1 once it's gone)
      up: SLOTS.map((s) => s.y === LAST_ROW), // face up
      pile: [cards[PLACES]],               // its top card last
      stock: cards.slice(PLACES + 1),      // its top card last
      charges: {},   // spells left to cast this deal
      eaten: [],
      burnt: [],
      undo: [],      // what Rewind can take back (since the last draw)
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
  function scored(d, card, under, streak) {
    const hexed = d.hex >= 0 && suitOf(card) === d.hex;
    const s = hexed ? 1 : streak + 1;
    const kin = !!run.have.kindred && suitOf(card) === suitOf(under);
    return { pts: CARD * (s + run.have.ember) * (kin ? 2 : 1), streak: s, hexed, kin };
  }

  // A card onto the pile, by a play or by Wild.
  function put(i, wild) {
    const d = run.deal;
    keep(d, i);
    const card = d.slots[i];
    const sc = scored(d, card, topOf(d), d.streak);
    d.slots[i] = -1;
    d.pile.push(card);
    d.streak = sc.streak;
    d.best = Math.max(d.best, d.streak);
    run.longest = Math.max(run.longest, d.streak);
    d.score += sc.pts;
    const ev = [{ t: 'play', i, card, pts: sc.pts, streak: d.streak, kin: sc.kin, hexed: sc.hexed, wild: !!wild }];
    gone(i, ev);
    return settle(ev);
  }

  // Fireball: the card at place i burns away. It scores nothing and the
  // streak carries on; it uncovers cards, and a tip pays, as a play would.
  function burn(i) {
    const d = run.deal;
    keep(d, i);
    const card = d.slots[i];
    d.slots[i] = -1;
    d.burnt.push(card);
    const ev = [{ t: 'burn', i, card }];
    gone(i, ev);
    return settle(ev);
  }

  // Kept before every move on the peaks, for Rewind.
  function keep(d, i) {
    d.undo.push({ i, card: d.slots[i], slots: d.slots.slice(), pile: d.pile.slice(), burnt: d.burnt.slice(), score: d.score, streak: d.streak, peaks: d.peaks, reached: d.reached });
  }

  // A card has left place i: the cards it lay over may be uncovered (they
  // turn face up), a tip pays its peak's bonus, and the Seal may break.
  function gone(i, ev) {
    const d = run.deal;
    SLOTS[i].under.forEach((j) => {
      if (d.slots[j] >= 0 && !d.up[j] && free(d, j)) {
        d.up[j] = true;
        ev.push({ t: 'flip', i: j, card: d.slots[j] });
      }
    });
    if (TIPS.indexOf(i) === -1) return;
    const pts = PEAK[d.peaks] * (run.have.twin ? 2 : 1);
    d.peaks++;
    d.score += pts;
    ev.push({ t: 'peak', i, n: d.peaks, pts });
    if (i !== MIDDLE && cursed(d, 'seal') && (d.slots[0] < 0 && d.slots[2] < 0) && SEALED.some((k) => d.slots[k] >= 0)) ev.push({ t: 'unseal' });
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
  // deal with the Second Deck (some of the pile, shuffled); with nothing
  // at all left to draw and no play, drawing ends the deal.
  function draw(echo) {
    if (!playing()) return [];
    const d = run.deal;
    const ev = [];
    if (!d.stock.length) {
      if (!(d.refills > 0 && d.pile.length > 1)) return stuck() ? endDeal(false) : [{ t: 'deny', why: 'empty' }];
      d.refills--;
      const top = d.pile.pop();
      d.stock = shuffle(d.pile).splice(0, REFILL);
      d.pile.push(top);
      ev.push({ t: 'refill', n: d.stock.length });
    }
    const card = d.stock.pop();
    d.pile.push(card);
    d.undo = [];
    const broke = echo ? 0 : d.streak;
    if (!echo) d.streak = 0;
    const toll = cursed(d, 'toll') ? Math.min(TOLL, d.score) : 0;
    d.score -= toll;
    ev.push({ t: 'draw', card, broke, echo: !!echo, toll, left: d.stock.length });
    return settle(ev);
  }

  // Cast a spell (on place i, for Wild and Fireball).
  function cast(id, i) {
    if (!playing() || !SPELLS[id]) return [];
    const no = why(id, i);
    if (no) return [{ t: 'deny', spell: id, i, why: no }];
    const d = run.deal;
    d.charges[id]--;
    const ev = [{ t: 'cast', spell: id, i }];
    if (id === 'wild') return ev.concat(put(i, true));
    if (id === 'fireball') return ev.concat(burn(i));
    if (id === 'echo') return ev.concat(draw(true));
    if (id === 'rewind') return ev.concat(rewind());
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
    Object.assign(d, { slots: s.slots, pile: s.pile, burnt: s.burnt, score: s.score, streak: s.streak, peaks: s.peaks, reached: s.reached });
    return settle([{ t: 'rewind', i: s.i, card: s.card }]);
  }

  // The deal's over: a clean sweep (every card gone from the peaks), or
  // nothing left to try. A clean sweep pays for each card left in the
  // stock and wins a heart back (and a free spell, with the Spellbook). A
  // deal under its target costs a heart; with none left, or on a Final
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
      if (run.hearts < run.max) { run.hearts++; d.healed = true; ev.push({ t: 'heal', hearts: run.hearts }); }
      if (run.have.spellbook) {
        const id = SPELL_IDS[rand(SPELL_IDS.length)];
        run.extra[id] = (run.extra[id] || 0) + 1;
        ev.push({ t: 'book', spell: id });
      }
    }
    run.score += d.score;
    const made = d.score >= d.target;
    const final = finalDeal(d.n);
    if (made) run.made++;
    ev.push({ t: 'end', n: d.n, made, swept: !!swept, score: d.score, target: d.target, final });
    if (!made) {
      run.hearts = Math.max(0, run.hearts - 1);
      ev.push({ t: 'hurt', hearts: run.hearts });
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
    ev.push({ t: 'pick' });
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

  // A pick between deals, then the next deal.
  function choose(id) {
    if (!run || run.step !== 'pick' || run.offer.indexOf(id) === -1) return [];
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
    return [{ t: 'pick', onwards: true }];
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
  const sound = (name, o) => !!view && !!K.sound && K.sound.play(name, o);
  const panAt = (i) => (SLOTS[i] ? (SLOTS[i].x / 9 - 0.5) * 0.8 : 0);

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
            <div class="ss-peaks" role="group" aria-label="The peaks" data-peaks></div>
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
      help: false,     // ...and it's the help card
      peek: false,     // the run's over and you're looking at the table
      moving: new Set(), // cards in flight, and anything else that can skip to its end
      timers: new Set(),
      after: null,     // what happens once everything has landed (a card over the table)
      count: null,     // a clean sweep's stock bonus, counting up
      heldScore: null, // the score the HUD shows while that counts up
      lastStreak: 0,
    };
    wire(view);
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
    n: 1, target: TARGETS[0], curses: [], hex: -1, slots: range(PLACES), up: SLOTS.map(() => false), pile: [], stock: range(23),
    charges: {}, undo: [], score: 0, streak: 0, peaks: 0, refills: 0, idle: true,
  }));
  const live = (d) => !!(run && run.deal === d && playing());

  const suitPic = (id) => iconOf(id, 'ss-suit');
  const faceHtml = (c) => {
    const s = SUITS[suitOf(c)];
    const r = rankOf(c) - 1;
    const f = faceOf(c);
    const art = f ? cardArt(f.img) : '';
    return `<span class="ss-face ${s.colour}${r === 9 ? ' is-10' : ''}"><span class="ss-corner"><b>${RANKS[r]}</b>${suitPic(s.id)}</span>` +
      `<span class="ss-art">${art ? `<img src="${esc(art)}" alt="" draggable="false" decoding="async" />` : suitPic(s.id)}</span>` +
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
    view.shown = d;
    view.peaks.innerHTML = SLOTS.map((s, i) => `<div class="ss-card" data-slot="${i}" style="--x:${s.x};--y:${s.y}"></div>`).join('');
    view.els = Array.prototype.slice.call(view.peaks.children);
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
      el.classList.toggle('is-down', !up);
      el.classList.toggle('is-free', isFree);
      el.classList.toggle('is-sealed', held);
      el.classList.toggle('is-ringed', ringed.indexOf(i) !== -1);
      el.title = up ? caption(c) : '';
      if (isFree) {
        el.setAttribute('role', 'button');
        el.tabIndex = i === view.focus ? 0 : -1;
        el.removeAttribute('aria-hidden');
        el.setAttribute('aria-label', `${caption(c)}${held ? ', sealed' : fitsNow.indexOf(i) !== -1 ? ', goes on the pile' : ''}`);
      } else {
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-label');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    view.peaks.setAttribute('aria-label', d.idle ? 'The peaks' : `The peaks: ${plural(d.slots.filter((c) => c >= 0).length, 'card')}, ${frees.length} uncovered`);
  }

  // Of the cards in `list`, the one nearest place `from` (left to right).
  function nearest(list, from) {
    if (!list.length) return -1;
    if (from < 0 || !SLOTS[from]) return list.slice().sort(byPlace)[0];
    const s = SLOTS[from];
    return list.slice().sort((a, b) => Math.abs(SLOTS[a].x - s.x) + Math.abs(SLOTS[a].y - s.y) * 0.6 - (Math.abs(SLOTS[b].x - s.x) + Math.abs(SLOTS[b].y - s.y) * 0.6))[0];
  }
  const byPlace = (a, b) => SLOTS[a].x - SLOTS[b].x || SLOTS[a].y - SLOTS[b].y;

  // The pile: its top card, big enough to show off the art.
  function syncPile() {
    const d = dealShown();
    const c = view.pileCard;
    const want = c >= 0 ? String(c) : '';
    if (view.pile.dataset.show !== want) {
      view.pile.innerHTML = c >= 0 ? `<div class="ss-card is-pile">${faceHtml(c)}</div>` : '<span class="ss-empty"></span>';
      view.pile.dataset.show = want;
    }
    view.pile.title = c >= 0 ? `The pile: ${caption(c)}` : 'The pile';
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
      (peek.length ? `<span class="ss-peek">${peek.map((c) => `<span class="ss-card is-peek">${faceHtml(c)}</span>`).join('')}</span>` : '');
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
    if (view.shown !== d || dealt) drawTable(dealt && !RM);
    const flips = [];
    let rewound = -1;
    ev.forEach((e) => {
      if (e.t === 'play') flyToPile(e.card, view.els[e.i], e.i);
      else if (e.t === 'draw') flyToPile(e.card, view.stock, -1);
      else if (e.t === 'burn') burnAway(e.i);
      else if (e.t === 'flip') flips.push(e.i);
      else if (e.t === 'moonlight') flips.push(...e.flipped);
      else if (e.t === 'rewind') { rewound = e.i; view.pileCard = topOf(d); }
      else if (e.t === 'refill') view.pileCard = topOf(d);
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
    hear(ev);
  }

  // What a move sounds like (a heart lost is heard where it's drawn).
  function hear(ev) {
    if (ev.some((e) => e.t === 'deal')) sound('deal');
    const play = ev.find((e) => e.t === 'play');
    if (play) sound('card', { step: play.streak, pan: panAt(play.i) });
    if (ev.some((e) => e.t === 'draw' || e.t === 'flip' || e.t === 'moonlight')) sound('flip');
    if (ev.some((e) => e.t === 'burn')) sound('hit', { step: 3 });
    if (ev.some((e) => e.t === 'deny')) sound('deny');
    const cast = ev.find((e) => e.t === 'cast');
    if (cast) sound('cast', { step: SPELL_IDS.indexOf(cast.spell) * 2 });
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
    const w = i >= 0 ? from.width : to.width / 1.6;
    el.style.cssText = `left:${from.left - box.left + (from.width - w) / 2}px;top:${from.top - box.top}px;width:${w}px`;
    view.table.appendChild(el);
    const k = to.width / w;
    const a = el.animate([
      { transform: 'none' },
      { transform: `translate(${to.left - from.left - (from.width - w) / 2}px, ${to.top - from.top}px) scale(${k.toFixed(3)})` },
    ], { duration: i >= 0 ? 280 : 240, easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)', fill: 'forwards' });
    track(a, () => { el.remove(); land(); });
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
    if (!view || !view.wiz || view.wiz.tagName !== 'IMG') return;
    const d = dealShown();
    const name = view.posed || (run && run.step === 'over' ? 'startled' : run && run.step === 'won' ? 'party' : live(d) && d.streak >= 5 ? 'happy' : 'idle');
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
    view.hearts.innerHTML = range(max).map((k) => `<span${k < hearts ? ' class="is-full"' : ''}>${doodleIcon('heart')}</span>`).join('') +
      `<span class="vh">${plural(hearts, 'heart')} out of ${max}</span>`;
    const score = view.heldScore != null ? view.heldScore : d.score;
    view.score.textContent = num(score);
    view.target.textContent = ` / ${num(d.target)}`;
    view.bar.style.width = `${Math.min(100, (100 * Math.max(0, score)) / d.target).toFixed(1)}%`;
    view.goal.classList.toggle('is-made', score >= d.target && !d.idle);
    view.goal.title = d.idle ? '' : `This deal: ${num(score)} of ${num(d.target)} points${score >= d.target ? ' (target reached)' : ''}. Score so far: ${num(run.score + (d.over ? 0 : score))}`;
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
    const label = `Curse: ${w.name}. ${id === 'hex' && d.hex >= 0 ? `${SUITS[d.hex].name} still score, but start the streak again.` : w.blurb}`;
    return `<li class="gm-chip ink ss-curse" title="${esc(label)}">${iconOf(CURSES[id].icon)}${id === 'hex' && d.hex >= 0 ? `<span class="ss-hex ${SUITS[d.hex].colour}">${suitPic(SUITS[d.hex].id)}</span>` : ''}<span class="vh">${esc(label)}</span></li>`;
  };
  const charmChip = (id) => {
    const n = run.have[id];
    const w = words(id);
    const left = id === 'deck' ? dealShown().refills : null;
    const label = `${w.name}${n > 1 ? ` x${n}` : ''}${left != null ? `: ${left ? 'ready' : 'used'} this deal` : ''}. ${w.blurb}`;
    return `<li class="gm-chip ${CHARMS[id].colour}${left === 0 ? ' is-spent' : ''}" title="${esc(label)}">${iconOf(CHARMS[id].icon)}${n > 1 ? `<b aria-hidden="true">${n}</b>` : ''}<span class="vh">${esc(label)}</span></li>`;
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
    const up = view.help || !run || run.step === 'pick' || ((run.step === 'over' || run.step === 'won') && !view.peek);
    view.card = up;
    view.stage.inert = up;
    view.dock.inert = up;
    view.dock.hidden = up; // (it can't be used then: the card gets its room)
    if (up) { view.toast.hidden = true; view.armed = ''; }
    view.overlay.hidden = !up;
    view.overlay.innerHTML = up ? cardHtml() : '';
    if (up && focus) {
      const go = view.overlay.querySelector('[data-first]') || view.overlay.querySelector('button');
      if (go) go.focus({ preventScroll: true });
    }
    syncCards();
    drawDock();
    drawStatus();
    syncWizard();
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
  const cursesWords = (p) => p.curses.map((id) => `${words(id).name} (${id === 'hex' && p.hex >= 0 ? `${SUITS[p.hex].name} still score, but start the streak again` : words(id).blurb.replace(/\.$/, '').replace(/^./, (ch) => ch.toLowerCase())})`).join(' and ');
  const nextWords = (p) => `Next: ${finalDeal(p.n) ? `deal ${p.n}, ${endless() ? 'a Final Deal' : 'the Final Deal'}` : `deal ${p.n}${endless() ? '' : ` of ${DEALS}`}`}, target ${num(p.target)}.${p.curses.length ? ` ${p.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(p)}.` : ''}`;

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
            <li>Seven deals, each with a target: miss one and lose a heart. Spells and charms come between deals, curses from deal 4.</li>
          </ul>
          <p class="gm-keys"><span class="hint-mouse">Keys: arrows, Enter to play, D to draw, W F E R M to cast, L to look.</span><span class="hint-touch">Tap a card to play it, or the stock to draw.</span></p>
          ${bests.map((t) => `<p class="gm-best">${esc(t)}</p>`).join('')}
          <p class="gm-actions">${run
            ? '<button class="os-button" type="button" data-act="back" data-first>Back to the game</button>'
            : '<button class="os-button gm-go" type="button" data-act="start" data-first>Deal me in</button>'}</p>
        </section>`;
    }
    const d = run.deal;
    if (run.step === 'pick') {
      const onwards = !!run.onwards;
      const kicker = onwards ? 'Endless deals' : `${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}${endless() ? '' : ` of ${DEALS}`}`}: ${d.swept ? 'clean sweep!' : d.score >= d.target ? 'target made' : 'under target'}`;
      const notes = [];
      if (!onwards) {
        if (d.healed) notes.push('a heart back for the clean sweep');
        if (d.score < d.target) notes.push('a heart lost');
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
          <p class="ss-next">${esc(nextWords(run.next))}</p>
        </section>`;
    }
    const won = run.step === 'won';
    const bestText = bestWords(run.mode);
    return `
      <section class="gm-card" aria-labelledby="ss-card-h">
        ${run.line ? `<p class="gm-said">${esc(run.line)}</p>` : ''}
        <span class="gm-card-art">${wizardPic(won ? 'party' : 'startled')}</span>
        ${won ? '<p class="gm-kicker">The Final Deal is beaten</p>' : ''}
        <h3 class="gm-card-h" id="ss-card-h">${won ? 'Run complete!' : run.hearts ? 'The Final Deal won' : 'Out of hearts'}</h3>
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
    const r = rankOf(topOf(d));
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
        if (e.streak >= 5 && e.streak % 5 === 0 && !e.hexed) {
          note = `Streak ${e.streak}!`;
          if (e.streak >= 10) wizardSays(lineOf('streakLines'), 2200);
        }
      } else if (e.t === 'draw') {
        out.push(`${e.echo ? 'Echo: drew' : 'Drew'} the ${cardName(e.card)}${e.echo ? `, streak kept at ${d.streak}` : e.broke ? `. Streak over at ${e.broke}` : ''}.${e.toll ? ` Toll: minus ${e.toll}.` : ''}`);
      } else if (e.t === 'refill') out.push(`The Second Deck shuffles ${plural(e.n, 'card')} back into the stock.`);
      else if (e.t === 'burn') out.push(`Fireball: the ${cardName(e.card)} burns away. The streak carries on at ${d.streak}.`);
      else if (e.t === 'rewind') out.push(`Rewind: the ${cardName(e.card)} goes back. Streak ${d.streak}.`);
      else if (e.t === 'moonlight') out.push(e.flipped.length ? `${plural(e.flipped.length, 'card')} turn face up.` : 'Every card was face up already.');
      else if (e.t === 'flip') out.push(`Turned over: ${caption(e.card)}.`);
      else if (e.t === 'peak') out.push(`Peak! Plus ${e.pts}.`);
      else if (e.t === 'unseal') out.push('Both outer peaks are clear: the Seal breaks.');
      else if (e.t === 'target') { out.push('Target reached!'); note = note || 'Target reached!'; wizardSays(lineOf('targetLines'), 2400); }
      else if (e.t === 'sweep') out.push(`Clean sweep!${e.left ? ` Plus ${e.pts} for the ${plural(e.left, 'card')} left in the stock.` : ''}`);
      else if (e.t === 'heal') out.push('A heart back.');
      else if (e.t === 'book') out.push(`The Spellbook gives a free ${words(e.spell).name} for the next deal.`);
      else if (e.t === 'end') out.push(`${e.final ? 'Final Deal' : `Deal ${e.n}`} over: ${num(e.score)} of ${num(e.target)} points${e.made ? ', target made' : ', under target'}.`);
      else if (e.t === 'hurt') out.push(`A heart lost: ${plural(e.hearts, 'heart')} left.`);
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
        empty: 'The stock is empty: there is nothing to draw.',
        nothing: e.spell === 'rewind' ? 'Nothing to take back since the last draw.' : e.spell === 'moonlight' ? 'Every card is face up already.' : 'No uncovered card to cast it on.',
        sealed: 'That card is sealed until both outer peaks are clear.',
        covered: 'That card is covered.',
      }[e.why] || 'Not now.';
    }
    if (e.why === 'sealed') return 'Sealed until both outer peaks are clear.';
    if (e.why === 'covered') return 'That card is covered.';
    if (e.why === 'empty') return 'The stock is empty.';
    return `The ${cardName(d.slots[e.i])} doesn't go on the ${cardName(topOf(d))}: play ${fitWords(d)}.`;
  }

  // L: the whole table, said aloud.
  function look() {
    if (!run || !run.deal) return;
    const d = run.deal;
    const parts = [`${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}${endless() ? '' : ` of ${DEALS}`}`}: ${num(d.score)} of ${num(d.target)} points, streak ${d.streak}, ${plural(run.hearts, 'heart')}.`];
    if (d.curses.length) parts.push(`${d.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(d)}.`);
    parts.push(`The pile: ${caption(topOf(d))}. ${playing() ? `It takes ${fitWords(d)}.` : ''}`);
    const fits = movesOf();
    const frees = range(PLACES).filter((i) => free(d, i)).sort(byPlace);
    parts.push(fits.length ? `You can play: ${fits.sort(byPlace).map((i) => caption(d.slots[i])).join(', ')}.` : 'Nothing uncovered goes on the pile.');
    const others = frees.filter((i) => fits.indexOf(i) === -1);
    if (others.length) parts.push(`Also uncovered: ${others.map((i) => `${cardName(d.slots[i])}${sealed(d, i) ? ' (sealed)' : ''}`).join(', ')}.`);
    const down = d.slots.filter((c, i) => c >= 0 && !d.up[i]).length;
    const left = d.slots.filter((c) => c >= 0).length;
    parts.push(`${plural(left, 'card')} left in the peaks, ${down} face down.`);
    const peek = run.have.crystal ? d.stock.slice(-run.have.crystal).reverse() : [];
    parts.push(`Stock: ${plural(d.stock.length, 'card')}${peek.length ? `, next ${peek.map(cardName).join(', then ')}` : ''}.`);
    const spells = SPELL_IDS.filter((id) => d.charges[id] > 0).map((id) => `${words(id).name} ${d.charges[id]}`);
    if (spells.length) parts.push(`Spells: ${spells.join(', ')}.`);
    announce(parts.join(' '));
  }

  /* ---------- playing ----------
     Mouse and touch: a card plays it, the stock draws, a spell in the dock
     casts it (Wild and Fireball then want a card). Keys: the arrows move
     between the uncovered cards (only they are in the tab order), Enter or
     Space plays one, D draws (or ends the deal), W, F, E, R and M cast,
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
    } else run.last = lineOf(d.score >= d.target ? (d.swept ? 'sweepLines' : 'madeLines') : 'hurtLines');
    const wait = RM ? 300 : end.swept ? 1700 : 1000;
    whenStill(() => {
      if (run.step === 'won') {
        sound('win');
        bounceFinish(finishWin);
        return;
      }
      if (run.step === 'over') later(() => sound(run.newBest ? 'best' : 'lose'), 200);
      syncCard(true);
      announce(run.step === 'pick' ? `Pick a spell or a charm. ${nextWords(run.next)}` : `The run is over. Score ${num(run.score)}.`);
    }, wait);
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
    const frees = range(PLACES).filter((i) => free(d, i)).sort(byPlace);
    if (!frees.length) return;
    const at = frees.indexOf(view.focus);
    let to = view.focus;
    if (key === 'ArrowRight') to = frees[Math.min(frees.length - 1, at + 1)];
    else if (key === 'ArrowLeft') to = frees[Math.max(0, at - 1)];
    else if (key === 'Home') to = frees[0];
    else if (key === 'End') to = frees[frees.length - 1];
    else {
      const y = SLOTS[view.focus] ? SLOTS[view.focus].y : LAST_ROW;
      const rows = frees.filter((i) => (key === 'ArrowUp' ? SLOTS[i].y < y : SLOTS[i].y > y));
      if (rows.length) {
        const near = key === 'ArrowUp' ? Math.max(...rows.map((i) => SLOTS[i].y)) : Math.min(...rows.map((i) => SLOTS[i].y));
        to = nearest(rows.filter((i) => SLOTS[i].y === near), view.focus);
      }
    }
    if (to == null || to < 0) to = frees[0];
    view.focus = to;
    syncCards();
    focusCard();
  }

  function wire(v) {
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
      say(`The pile: ${caption(topOf(d))}. It takes ${fitWords(d)}.`, 2600);
    });
    v.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !run) return;
      if (b.dataset.act === 'draw') act(draw());
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
    if (e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented || !view || !run || view.card) return;
    if (e.target.closest && e.target.closest('.win-bar, .gm-menu, input, textarea')) return;
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
      if (k === 'd') act(draw());
      else if (k === 'l') look();
      else spell(id);
    }
  }

  function onMenu(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !view) return;
    if (btn.dataset.act === 'new') askNewRun();
    else if (btn.dataset.act === 'help') {
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
    view.peek = false;
    syncCard(false);
    show(ev);
    view.focus = -1;
    syncCards();
    focusCard();
    dealWords();
  }
  // A new deal, in words (and his line about it).
  function dealWords() {
    const d = run.deal;
    const p = { n: d.n, target: d.target, curses: d.curses, hex: d.hex };
    announce(`${finalDeal(d.n) ? 'Final Deal' : `Deal ${d.n}`}, target ${num(d.target)}.${d.curses.length ? ` ${d.curses.length > 1 ? 'Curses' : 'Curse'}: ${cursesWords(p)}.` : ''} The pile: ${caption(topOf(d))}. ${movesOf().length ? `${plural(movesOf().length, 'card')} can go on it.` : 'Nothing goes on it yet.'}`);
    wizardSays(lineOf(finalDeal(d.n) ? 'finalLines' : 'dealLines'), 2400);
  }

  function onCard(e) {
    const btn = e.target.closest('button');
    if (!btn || !view) return;
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
      run.onwards = true;
      sound('pick');
      syncCard(true);
      announce(`Endless deals: a curse on every deal, and higher targets. Pick a spell or a charm. ${nextWords(run.next)}`);
    } else if (what === 'back') {
      view.help = false;
      syncCard(true);
      if (playing()) focusCard();
    } else if (what === 'peek') {
      view.peek = true;
      syncCard(false);
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
    const H = box.height;
    const W = box.width;
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

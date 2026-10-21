/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - WIZARD SWEEPER  (the game in the Games window)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. What the wizards say and the words on
   the upgrade cards live in content.js under "sweeper"; the wizards wear
   the pet wizard's drawings (wizard.frames), stand-ins and all.
   apps.js fetches this file the first time the game opens, so the desktop
   never waits for it.

   Minesweeper, but the mines are sleeping wizards. A number counts the
   wizards asleep on the 8 tiles touching it, a star marks a tile you think
   hides one, and clearing every safe tile finishes the level. The first
   move of each level is always safe. A run is a string of levels, each a
   little bigger and sleepier, with an upgrade to pick after every one.
   Clearing level 12 wins the run; you can keep sweeping into endless
   levels after that. Wake a wizard with no Shield left and the run is
   over. Each visitor's best is kept.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  if (!K || K.sweeper) return;
  const C = K.C || {};
  const { esc, doodleIcon, plural } = K;
  const S = C.sweeper || {};
  const RM = K.REDUCE_MOTION;
  const PHONE = window.matchMedia('(max-width: 760px)');

  /* ---------- the rules, in numbers ---------- */
  const STORE_KEY = 'kasai:sweeper'; // { best: { score, levels, at }, won: { at, times } }
  const LAST_LEVEL = 12;             // clearing it wins the run (endless levels follow)
  const LEVEL_POINTS = 100;          // for every level cleared (the speed bonus pays no more than this)
  const HOURGLASS_SECONDS = 20;      // each Hourglass adds this to the clock
  const LONG_PRESS = 420;            // ms a finger rests on a tile to star it
  const GAP = 3;                     // px between tiles    } the same as
  const PAD = 8;                     // px round the board  } .sw-board in style.css
  const FINGER = 32;                 // the smallest tile worth tapping (phones)
  // Board sizes (columns, rows), level by level; the last one repeats.
  // Phones stay nine tiles wide, so every tile is big enough for a finger.
  const SIZES = {
    wide: [[8, 8], [9, 8], [10, 9], [11, 9], [12, 10], [13, 11], [14, 12], [15, 13], [16, 14]],
    tall: [[8, 8], [8, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16]],
  };
  // How many tiles hide a wizard: 1 in 8 at first, a little more every
  // level, up to 22% (about Minesweeper's expert board) by level 12. Endless
  // levels keep creeping up, to 26%.
  const density = (level) => (level <= LAST_LEVEL
    ? Math.min(0.22, 0.125 + 0.009 * (level - 1))
    : Math.min(0.26, 0.22 + 0.004 * (level - LAST_LEVEL)));
  // Seconds on each level's speed bonus clock: bigger boards get longer.
  const clockFor = (safe, hourglasses) => 30 + Math.round(safe * 0.6) + hourglasses * HOURGLASS_SECONDS;

  /* ---------- upgrades (pick one after every level; they stack) ---------- */
  const UPGRADES = {
    lantern: { colour: 'yellow', icon: 'lantern', name: 'Lantern', blurb: 'Every level starts with a safe 3x3 patch already lit.' },
    shield: { colour: 'blue', icon: 'shield', name: 'Shield', blurb: 'Wake a wizard and your shield sends him back to sleep. Used up when it saves you.' },
    scry: { colour: 'lavender', icon: 'orb', name: 'Scry', blurb: 'Your crystal ball spots one sleeping wizard at the start of every level.' },
    chord: { colour: 'teal', icon: 'chord', name: 'Chord charm', blurb: 'Tap or click a number once all its wizards are starred to clear the rest of the tiles around it.', once: true },
    hourglass: { colour: 'pink', icon: 'hourglass', name: 'Hourglass', blurb: "20 more seconds on every level's speed bonus clock." },
    lucky: { colour: 'ink', icon: 'star', name: 'Lucky star', blurb: "Once a level, a star that can't be wrong: it lands on a wizard or safely clears the tile." },
  };
  const UPGRADE_IDS = Object.keys(UPGRADES);
  // The names and blurbs can be reworded in content.js.
  const words = (id) => {
    const mine = (S.upgrades || {})[id] || {};
    const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
    return { name: text(mine.name, UPGRADES[id].name), blurb: text(mine.blurb, UPGRADES[id].blurb) };
  };

  /* ---------- the game's own doodles (they join the shared set) ---------- */
  const ICONS = {
    lantern: '<path d="M9.5 7V5a2.5 2.5 0 0 1 5 0v2"/><path d="M7.5 7h9"/><path d="M8.5 7 7 10v7.5L8.5 20h7l1.5-2.5V10L15.5 7"/><path d="M12 11.5c1.3 1.2 1.3 3.1 0 4.2-1.3-1.1-1.3-3 0-4.2z"/>',
    shield: '<path d="M12 3.2 5 6v5.5c0 4.4 2.9 7.7 7 9.3 4.1-1.6 7-4.9 7-9.3V6z"/><path d="M9 12.2l2.1 2.1L15.2 10"/>',
    orb: '<circle cx="12" cy="10" r="6.5"/><path d="M8.4 15.2 6.5 20.5h11l-1.9-5.3"/><path d="M9.2 8.4a3.2 3.2 0 0 1 2.4-2"/>',
    chord: '<path d="M9 17.5V6l10-2.2v11.7"/><path d="M9 9.6l10-2.2"/><circle cx="6.6" cy="17.5" r="2.4"/><circle cx="16.6" cy="15.5" r="2.4"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3l4 5-4 5v4M16 3.5v3l-4 5 4 5v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!K.DOODLE_ICONS[k]) K.DOODLE_ICONS[k] = ICONS[k]; });
  const STAR = doodleIcon('star');

  /* ---------- the wizards ----------
     They wear the pet wizard's drawings (pet.js lends a stand-in for any
     not drawn yet): asleep on the board, startled when woken. */
  const frame = (name) => (K.pet && K.pet.frame ? K.pet.frame(name) : '');
  const wizardPic = (name, cls) => {
    const src = frame(name);
    return src
      ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}" alt="" draggable="false" decoding="async" />`
      : doodleIcon('hat', cls);
  };

  /* ---------- what they say (content.js, under "sweeper") ---------- */
  const DEFAULT_LINES = {
    loseLines: ['WHO DARES WAKE ME?', 'five more minutes. FIVE.', "it's not even morning!"],
    clearLines: ['shhh... not one of them stirred.', 'they slept right through it.'],
    winLines: ['twelve levels, and they all slept through it.', 'sweet dreams, every one of them.'],
    bestLines: ['a new best! the wizards will hear about it tomorrow.'],
    shieldLines: ['your shield hummed him back to sleep.'],
  };
  // What the pet wizard tells the desktop after a run. {level} becomes the
  // level it ended on.
  const DESK_LINES = {
    lose: ['i got to level {level} of Wizard Sweeper!'],
    win: ['i cleared all twelve levels of Wizard Sweeper!'],
    endless: ['i swept all the way to level {level}!'],
  };
  const pick = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : '');
  // A missing list uses the lines above; an empty one (or '') keeps them quiet.
  const linesOf = (v, fallback) => (Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x)
    : typeof v === 'string' ? (v ? [v] : []) : fallback);
  const lineOf = (key) => pick(linesOf(S[key], DEFAULT_LINES[key]));

  /* ---------- the best run (kept per visitor) ---------- */
  const bestRun = () => {
    const b = (K.store.get(STORE_KEY, null) || {}).best;
    return b && Number.isFinite(b.score) && b.score > 0 ? b : null;
  };

  const rand = (n) => Math.floor(Math.random() * n);
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  /* ══════════════════════════════════════════════════════════════════════
     THE GAME
     ══════════════════════════════════════════════════════════════════════
     Every tile is one of: hidden, star (hidden, with your star on it), open
     (cleared: a number, or nothing), sure (a Lucky star's wizard), known (a
     sleeping wizard you've been shown), calm (one your Shield sent back to
     sleep) and, once a run is over, woken, asleep or wrong (a star with no
     wizard under it). */
  const FOUND = new Set(['star', 'sure', 'known', 'calm']); // count as wizards found

  let run = null;       // the run being played (it waits while the window is shut)
  let view = null;      // the window it's drawn in, while that's open
  let starMode = false; // taps and clicks place stars instead of clearing
  let armed = false;    // the next tap or click uses a Lucky star

  function boardSize(level) {
    const table = PHONE.matches ? SIZES.tall : SIZES.wide;
    const [cols, rows] = table[Math.min(level, table.length) - 1];
    // A short phone gets fewer rows rather than tiles too small to tap.
    const h = view ? view.stage.clientHeight : 0;
    if (PHONE.matches && h > 0) {
      const fit = Math.floor((h - 2 * PAD + GAP) / (FINGER + GAP));
      return [cols, Math.max(8, Math.min(rows, fit))];
    }
    return [cols, rows];
  }

  function makeBoard(level) {
    const [cols, rows] = boardSize(level);
    const n = cols * rows;
    const count = Math.round(n * density(level));
    const near = []; // each tile's neighbours
    for (let i = 0; i < n; i++) {
      const r = (i / cols) | 0;
      const c = i % cols;
      const list = [];
      for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++) {
        for (let x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) {
          if (y !== r || x !== c) list.push(y * cols + x);
        }
      }
      near.push(list);
    }
    const cells = [];
    for (let i = 0; i < n; i++) cells.push({ wiz: false, adj: 0, s: 'hidden' });
    shuffle(cells.map((_, i) => i)).slice(0, count).forEach((i) => { cells[i].wiz = true; });
    const b = {
      level, cols, rows, n, count, cells, near,
      opened: 0,              // safe tiles cleared so far...
      safe: n - count,        // ...out of this many
      firstMove: true,        // the first move can't wake anyone
      started: false,         // the clock starts with the first clear
      used: 0,                // ms of clock used
      budget: clockFor(n - count, run.have.hourglass),
      lucky: run.have.lucky,  // Lucky stars left on this level
    };
    recount(b);
    return b;
  }
  const recount = (b) => b.cells.forEach((c, i) => { c.adj = b.near[i].filter((j) => b.cells[j].wiz).length; });
  const secondsLeft = (b) => Math.max(0, b.budget - b.used / 1000);
  const wizardsLeft = (b) => b.count - b.cells.filter((c) => FOUND.has(c.s)).length;
  const steps = (b, a, z) => Math.max(Math.abs(((a / b.cols) | 0) - ((z / b.cols) | 0)), Math.abs((a % b.cols) - (z % b.cols)));
  const owned = (id) => (id === 'shield' ? run.shields : run.have[id]);

  // Nothing is open on or beside this tile, so a wizard can come or go
  // here without changing a number anyone has seen.
  const unseen = (b, i) => b.cells[i].s !== 'open' && b.near[i].every((j) => b.cells[j].s !== 'open');
  function moveWizard(b, i, keepOut) {
    const spots = [];
    b.cells.forEach((c, j) => { if (!c.wiz && c.s === 'hidden' && !keepOut.has(j) && unseen(b, j)) spots.push(j); });
    if (!spots.length) return false;
    b.cells[i].wiz = false;
    b.cells[spots[rand(spots.length)]].wiz = true;
    return true;
  }
  // The first move of a level: wizards on and around the tile tiptoe off
  // somewhere else (when nobody can tell), so it usually opens a patch.
  function makeRoom(b, i) {
    const zone = new Set([i].concat(b.near[i]));
    zone.forEach((j) => {
      const c = b.cells[j];
      if (c.wiz && c.s === 'hidden' && unseen(b, j)) moveWizard(b, j, zone);
    });
    recount(b);
  }

  // Clear a tile; one with no wizards beside it clears its neighbours too.
  function flood(b, start) {
    const out = [];
    const queue = [start];
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k];
      const c = b.cells[i];
      if (c.s !== 'hidden' || c.wiz) continue;
      c.s = 'open';
      b.opened++;
      out.push(i);
      if (!c.adj) b.near[i].forEach((j) => { if (b.cells[j].s === 'hidden') queue.push(j); });
    }
    return out;
  }

  // Lanterns: a safe 3x3 patch each, spread as far apart as they'll go,
  // lit before the level starts.
  function light(b, lanterns) {
    const patch = new Set();
    const centres = [];
    for (let k = 0; k < lanterns; k++) {
      const free = [];
      for (let r = 1; r < b.rows - 1; r++) {
        for (let c = 1; c < b.cols - 1; c++) {
          const i = r * b.cols + c;
          if (!patch.has(i) && !b.near[i].some((j) => patch.has(j))) free.push(i);
        }
      }
      if (!free.length) break;
      let i = free[rand(free.length)];
      if (centres.length) {
        const gap = (j) => Math.min(...centres.map((z) => steps(b, j, z)));
        const most = Math.max(...free.map(gap));
        const far = free.filter((j) => gap(j) === most);
        i = far[rand(far.length)];
      }
      centres.push(i);
      patch.add(i);
      b.near[i].forEach((j) => patch.add(j));
    }
    patch.forEach((j) => { if (b.cells[j].wiz) moveWizard(b, j, patch); });
    recount(b);
    const lit = [];
    centres.forEach((i) => { flood(b, i).forEach((j) => lit.push({ i: j, from: i })); });
    return { patches: centres.filter((i) => b.cells[i].s === 'open').length, lit };
  }

  // Scry: a sleeping wizard shown at the start, ideally one out in the dark
  // where nothing else gives him away.
  function scry(b, times) {
    let seen = 0;
    for (let k = 0; k < times; k++) {
      const all = [];
      const dark = [];
      b.cells.forEach((c, i) => {
        if (!c.wiz || c.s !== 'hidden') return;
        all.push(i);
        if (b.near[i].every((j) => b.cells[j].s !== 'open')) dark.push(i);
      });
      const from = dark.length ? dark : all;
      if (!from.length) break;
      b.cells[from[rand(from.length)]].s = 'known';
      seen++;
    }
    return seen;
  }

  /* ---------- your moves ---------- */
  // Clear a tile (or, with the Chord charm, around a finished number).
  function clearAt(i) {
    const b = run && run.board;
    if (!b || run.step !== 'play') return;
    const c = b.cells[i];
    if (c.s === 'open') { if (c.adj && run.have.chord) chord(b, i); return; }
    if (c.s !== 'hidden') return; // stars and found wizards are safe from clicks
    if (b.firstMove) makeRoom(b, i);
    reveal(b, [i], i);
  }

  function chord(b, i) {
    const around = b.near[i];
    const covered = around.filter((j) => b.cells[j].s === 'hidden');
    if (!covered.length) return;
    const found = around.filter((j) => FOUND.has(b.cells[j].s)).length;
    const need = b.cells[i].adj;
    if (found !== need) {
      say(need === 1 ? 'Star the wizard beside it first.' : `Star all ${need} wizards beside it first.`, 0, i);
      return;
    }
    reveal(b, covered, i);
  }

  function reveal(b, list, from) {
    const first = b.firstMove;
    b.firstMove = false;
    b.started = true;
    const opened = [];
    const woke = [];
    let note = '';
    let noteAt;
    list.forEach((i) => {
      const c = b.cells[i];
      if (c.s !== 'hidden') return;
      if (!c.wiz) { flood(b, i).forEach((j) => opened.push(j)); return; }
      // The first move never wakes anyone: he dozes on, marked for you.
      if (first) {
        c.s = 'known';
        paint(i, 'is-pop');
        note = 'Shh, a deep sleeper! Your first move is always safe, so he stays asleep and is marked for you.';
        noteAt = i;
        return;
      }
      woke.push(i);
    });
    paintCleared(b, opened, from);
    for (const i of woke) {
      if (run.shields < 1) { lose(b, i); return; }
      run.shields--;
      calm(b, i);
      note = `${lineOf('shieldLines') || 'Your shield sent him back to sleep.'} ${run.shields ? plural(run.shields, 'shield') + ' left.' : 'That was your last shield.'}`;
      noteAt = i;
    }
    drawHud();
    if (note) say(note, 4200, noteAt);
    else if (opened.length === 1) announce(describe(b, opened[0]).what);
    else if (opened.length > 1) announce(`${opened.length} tiles cleared.`);
    if (b.opened === b.safe) cleared(b);
  }

  // A Shield at work: the wizard jolts awake, then nods off again.
  function calm(b, i) {
    const c = b.cells[i];
    c.s = 'calm';
    c.jolt = true;
    paint(i, 'is-jolted');
    setTimeout(() => {
      c.jolt = false;
      if (view && view.shown === b) paint(i);
    }, 1600);
  }

  function star(i) {
    const b = run && run.board;
    if (!b || run.step !== 'play') return;
    const c = b.cells[i];
    if (c.s === 'hidden') c.s = 'star';
    else if (c.s === 'star') c.s = 'hidden';
    else return;
    paint(i, c.s === 'star' ? 'is-starring' : '');
    drawHud();
    announce(c.s === 'star' ? `Starred. ${plural(wizardsLeft(b), 'wizard')} left to find.` : 'Star taken off.');
  }

  // A Lucky star can't be wrong: a wizard gets a gold star, a safe tile is
  // simply cleared.
  function lucky(i) {
    const b = run && run.board;
    if (!b || run.step !== 'play') return;
    if (b.lucky < 1) { if (run.have.lucky) say('No lucky stars left on this level.'); return; }
    const c = b.cells[i];
    if (c.s !== 'hidden' && c.s !== 'star') { say('Pick a covered tile for your lucky star.', 0, i); return; }
    b.lucky--;
    armed = false;
    b.started = true;
    if (c.wiz) {
      c.s = 'sure';
      paint(i, 'is-starring');
      say('Lucky star! A wizard was asleep there.', 0, i);
    } else {
      c.s = 'hidden';
      const opened = flood(b, i);
      paintCleared(b, opened, i);
      say(opened.length > 1 ? `Lucky star: no wizard there, and ${opened.length} tiles cleared.` : 'Lucky star: no wizard there, so the tile is cleared.', 0, i);
    }
    drawHud();
    drawMenu();
    drawStatus();
    if (b.opened === b.safe) cleared(b);
  }

  /* ---------- levels and runs ---------- */
  function newRun() {
    if (run && !run.recorded && run.score > 0) finishRun(); // a run left halfway still counts
    // Nothing the old run had waiting (its end card) may turn up in the new one.
    if (view) { view.timers.forEach(clearTimeout); view.timers.clear(); }
    // step: 'play', 'pick' (choosing an upgrade), 'won' (level 12 cleared)
    // or 'over'. won: level 12 is behind you, so the levels are endless.
    run = { level: 1, score: 0, bonus: 0, cleared: 0, shields: 0, have: {}, step: 'play', board: null, won: false };
    UPGRADE_IDS.forEach((id) => { run.have[id] = 0; });
    armed = false;
    if (view) { view.help = false; view.peek = false; }
    startLevel();
  }

  function startLevel() {
    const b = makeBoard(run.level);
    run.board = b;
    run.step = 'play';
    run.offer = null;
    const notes = [];
    const lamps = run.have.lantern ? light(b, run.have.lantern) : { patches: 0, lit: [] };
    if (lamps.patches) notes.push(lamps.patches > 1 ? `Your lanterns lit ${lamps.patches} safe patches.` : 'Your lantern lit a safe patch.');
    const seen = run.have.scry ? scry(b, run.have.scry) : 0;
    if (seen) notes.push(seen > 1 ? `Your crystal ball spotted ${seen} sleeping wizards.` : 'Your crystal ball spotted a sleeping wizard.');
    if (view) {
      drawAll();
      lamps.lit.forEach((t) => paint(t.i, 'is-lit', RM ? 0 : Math.min(900, 200 + 50 * steps(b, t.from, t.i))));
      syncCard(false);
      focusBoard();
    }
    say([`Level ${b.level}: ${plural(b.count, 'wizard')} asleep.`].concat(notes).join(' '), 3600);
    if (b.opened === b.safe) cleared(b);
  }

  // A level cleared: points, then an upgrade to pick. Level 12 wins the run
  // first (its card offers endless levels, and the upgrade after that).
  function cleared(b) {
    const starred = [];
    b.cells.forEach((c, i) => { if (c.wiz && c.s === 'hidden') { c.s = 'star'; starred.push(i); } });
    // Clearing a level always counts for more than speed.
    const bonus = Math.min(LEVEL_POINTS, Math.ceil(secondsLeft(b)));
    run.score += LEVEL_POINTS + bonus;
    run.bonus += bonus;
    run.cleared++;
    run.last = { level: b.level, bonus, line: lineOf('clearLines') };
    run.offer = shuffle(UPGRADE_IDS.filter((id) => !(UPGRADES[id].once && run.have[id]))).slice(0, 3);
    const win = b.level === LAST_LEVEL;
    run.step = win ? 'won' : 'pick';
    armed = false;
    if (win) {
      run.won = true;
      run.line = lineOf('winLines');
      finishRun();
      K.trophy.award('sweeper');
    }
    if (view) {
      starred.forEach((i) => paint(i, 'is-starring'));
      drawHud();
      drawMenu();
      drawStatus();
      later(() => syncCard(true), RM ? 0 : win ? 900 : 700);
    }
    announce(win
      ? `Level ${b.level} cleared! Every wizard is tucked in, so the run is won. Keep sweeping into endless levels, or start a new run.`
      : `Level ${b.level} cleared! Pick an upgrade.`);
    if (win) tellDesktop(true);
  }

  // After the win: on into endless levels, from the upgrade level 12 earned.
  // The run's best is kept already; from here it counts again when it ends.
  function keepSweeping() {
    if (!run || run.step !== 'won') return;
    run.step = 'pick';
    run.recorded = false;
    run.newBest = false;
    run.last.line = '';
    run.last.onwards = true;
    if (view) syncCard(true);
    announce('Endless levels: each one sleepier than the last, until you wake a wizard. Pick an upgrade.');
  }

  function lose(b, i) {
    const changed = [i];
    b.cells[i].s = 'woken';
    b.cells.forEach((c, j) => {
      if (c.wiz && c.s === 'hidden') { c.s = 'asleep'; changed.push(j); }
      else if (!c.wiz && c.s === 'star') { c.s = 'wrong'; changed.push(j); }
    });
    run.step = 'over';
    run.woke = i;
    run.line = lineOf('loseLines');
    armed = false;
    finishRun();
    if (view) {
      changed.forEach((j) => paint(j));
      drawHud();
      drawMenu();
      drawStatus();
      later(() => syncCard(true), RM ? 0 : 1100);
    }
    announce('You woke a wizard! The run is over.');
    tellDesktop(false);
  }

  // A finished run (won, lost, or left for a new one): kept if it's the best.
  function finishRun() {
    if (!run || run.recorded) return;
    run.recorded = true;
    const prev = bestRun();
    run.newBest = run.score > 0 && (!prev || run.score > prev.score);
    run.bestLine = run.newBest ? lineOf('bestLines') : '';
    if (run.newBest) K.store.merge(STORE_KEY, { best: { score: run.score, levels: run.cleared, at: Date.now() } });
  }

  // The pet wizard on the desktop tells everyone how it went (and throws
  // himself a party for a win or a new best).
  function tellDesktop(win) {
    if (!K.pet || !K.pet.say) return;
    const key = win ? 'win' : run.won ? 'endless' : 'lose';
    const lines = linesOf((S.deskLines || {})[key], DESK_LINES[key]);
    const text = pick(lines).replace(/\{level\}/g, String(run.level));
    const party = win || run.newBest;
    setTimeout(() => {
      if (party && K.pet.party) {
        K.pet.party();
        if (text) setTimeout(() => K.pet.say(text, 3600), 3800);
      } else if (text) K.pet.say(text, 3600);
    }, 1400);
  }

  function choose(id) {
    if (!run || run.step !== 'pick' || run.offer.indexOf(id) === -1) return;
    run.have[id]++;
    if (id === 'shield') run.shields++;
    run.level++;
    if (view) view.help = false;
    startLevel();
  }

  /* ---------- the speed bonus clock ----------
     It only runs while you can play: the game in front, the tab showing,
     no card or dialog in the way. */
  let lastTick = 0;
  const playing = () => !!view && !view.card && view.win.open && !view.win.minimised &&
    view.win.el.classList.contains('is-active') && !document.hidden && !document.querySelector('dialog[open]');
  function tick() {
    const now = performance.now();
    const dt = Math.min(250, Math.max(0, now - lastTick));
    lastTick = now;
    const b = run && run.board;
    if (!b || run.step !== 'play' || !b.started || !playing()) return;
    const shown = Math.ceil(secondsLeft(b));
    b.used += dt;
    if (Math.ceil(secondsLeft(b)) !== shown) view.clock.textContent = Math.ceil(secondsLeft(b));
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE WINDOW
     ══════════════════════════════════════════════════════════════════════
     apps.js opens the window and hands it over here. Closing it keeps the
     run (and stops the clock) until it opens again. */
  function mount(win) {
    if (view) unmount(view.win);
    const root = document.createElement('div');
    root.className = 'sw';
    root.innerHTML = `
      <div class="sw-hud">
        <span class="sw-stat sw-level">Level <b data-level>1</b></span>
        <span class="sw-stat" title="Wizards left to find">${wizardPic('sweeperTile', 'sw-stat-wiz')}<b data-left>0</b><span class="vh"> wizards left to find</span></span>
        <span class="sw-stat" title="Speed bonus: seconds left">${doodleIcon('clock')}<b data-clock>0</b><span class="vh"> seconds left on the speed bonus clock</span></span>
        <span class="sw-stat">Score <b data-score>0</b></span>
        <ul class="sw-owned" aria-label="Your upgrades" data-owned hidden></ul>
      </div>
      <div class="sw-play">
        <div class="sw-stage" data-stage><div class="sw-board" role="grid" data-board></div></div>
        <p class="sw-toast" aria-hidden="true" data-toast hidden></p>
        <div class="sw-overlay" data-overlay hidden></div>
      </div>
      <p class="vh" role="status" data-live></p>`;
    const old = win.body.querySelector('.sw-loading, .sw');
    if (old) old.replaceWith(root);
    else win.body.appendChild(root);
    win.menu.innerHTML = `
      <div class="sw-menu" role="group" aria-label="Game">
        <button type="button" data-act="new">${doodleIcon('controller')}New run</button>
        <button type="button" data-act="star" aria-pressed="false">${STAR}Star mode</button>
        <button type="button" data-act="lucky" aria-pressed="false" hidden>${STAR}Lucky star <b>0</b></button>
        <button type="button" data-act="help">Help</button>
      </div>`;
    win.menu.hidden = false;
    const q = (s) => root.querySelector(s);
    view = {
      win,
      menu: win.menu,
      stage: q('[data-stage]'),
      board: q('[data-board]'),
      overlay: q('[data-overlay]'),
      toast: q('[data-toast]'),
      live: q('[data-live]'),
      level: q('[data-level]'),
      left: q('[data-left]'),
      clock: q('[data-clock]'),
      score: q('[data-score]'),
      owned: q('[data-owned]'),
      cells: [],
      cursor: 0,       // the tile keyboard focus sits on
      shown: null,     // the board drawn
      card: false,     // a card is over the board
      help: false,     // ...and it's the help card
      peek: false,     // the run is over and you're looking at the board
      timers: new Set(),
    };
    wire(view);
    drawAll();
    syncCard(false);
    lastTick = performance.now();
    view.ticker = setInterval(tick, 200);
  }

  function unmount(win) {
    if (!view || (win && view.win !== win)) return;
    clearInterval(view.ticker);
    clearTimeout(view.toastTimer);
    clearTimeout(view.liveTimer);
    view.timers.forEach(clearTimeout);
    dropPress();
    armed = false;
    view = null;
  }

  // A timer that goes away with the window.
  const later = (fn, ms) => {
    if (!view) return;
    const v = view;
    const t = setTimeout(() => { v.timers.delete(t); if (view === v) fn(); }, ms);
    v.timers.add(t);
  };

  function drawAll() {
    drawBoard(run ? run.board : idleBoard());
    drawHud();
    drawMenu();
    drawStatus();
  }

  // Before the first run: a quiet field behind the title card.
  const idleBoard = () => {
    const cells = [];
    for (let i = 0; i < 64; i++) cells.push({ wiz: false, adj: 0, s: 'hidden' });
    return { idle: true, level: 1, cols: 8, rows: 8, n: 64, cells };
  };

  function drawBoard(b) {
    if (view.shown !== b) view.cursor = ((b.rows / 2) | 0) * b.cols + ((b.cols / 2) | 0);
    view.shown = b;
    let html = '';
    for (let r = 0; r < b.rows; r++) {
      html += '<div class="sw-row" role="row">';
      for (let c = 0; c < b.cols; c++) {
        const i = r * b.cols + c;
        html += `<div class="sw-cell" role="gridcell" data-i="${i}" tabindex="${i === view.cursor ? 0 : -1}"></div>`;
      }
      html += '</div>';
    }
    const el = view.board;
    el.style.setProperty('--cols', b.cols);
    el.style.setProperty('--rows', b.rows);
    el.setAttribute('aria-label', b.idle ? 'Wizard Sweeper board' : `Level ${b.level} board, ${b.cols} by ${b.rows} tiles`);
    el.innerHTML = html;
    view.cells = Array.prototype.slice.call(el.querySelectorAll('.sw-cell'));
    for (let i = 0; i < b.n; i++) paint(i);
  }

  // How a tile looks, and what a screen reader says about it.
  function describe(b, i) {
    const c = b.cells[i];
    switch (c.s) {
      case 'star': return { cls: 'is-hidden is-star', html: STAR, what: 'Starred' };
      case 'open': return c.adj
        ? { cls: `is-open is-num n${c.adj}`, html: String(c.adj), what: plural(c.adj, 'wizard') + ' nearby' }
        : { cls: 'is-open', html: '', what: 'Clear' };
      case 'sure': return { cls: 'is-sure', html: STAR, what: 'Lucky star: a wizard is asleep here' };
      case 'known': return { cls: 'is-known', html: wizardPic('sweeperTile'), what: 'Sleeping wizard' };
      case 'calm': return {
        cls: 'is-calm',
        html: wizardPic(c.jolt ? 'sweeperAwake' : 'sweeperTile') + `<span class="sw-badge">${doodleIcon('shield')}</span>`,
        what: 'Wizard, sent back to sleep by your shield',
      };
      case 'woken': return { cls: 'is-woken', html: wizardPic('sweeperAwake'), what: 'The wizard you woke' };
      case 'asleep': return { cls: 'is-asleep', html: wizardPic('sweeperTile'), what: 'Sleeping wizard' };
      case 'wrong': return { cls: 'is-wrong', html: STAR + `<span class="sw-cross">${doodleIcon('close')}</span>`, what: 'Star, but no wizard here' };
      default: return { cls: 'is-hidden', html: '', what: 'Hidden' };
    }
  }

  // Redraw one tile. `fx` is a one-off animation (a pop, a star landing...).
  function paint(i, fx, delay) {
    if (!view || !view.shown) return;
    const b = view.shown;
    const el = view.cells[i];
    if (!el) return;
    const look = describe(b, i);
    el.className = `sw-cell ${look.cls}${fx ? ' ' + fx : ''}`;
    if (delay) el.style.setProperty('--d', delay + 'ms');
    else el.style.removeProperty('--d');
    if (el.swHtml !== look.html) { el.innerHTML = look.html; el.swHtml = look.html; }
    el.setAttribute('aria-label', `${look.what}, row ${((i / b.cols) | 0) + 1}, column ${(i % b.cols) + 1}`);
  }
  // Newly cleared tiles pop open in a ripple from where you clicked.
  function paintCleared(b, list, from) {
    if (!view || view.shown !== b) return;
    list.forEach((i) => paint(i, 'is-pop', RM ? 0 : Math.min(400, 26 * steps(b, from, i))));
  }

  function drawHud() {
    if (!view) return;
    const b = run ? run.board : null;
    view.level.textContent = run ? run.level : 1;
    view.left.textContent = b ? wizardsLeft(b) : 8;
    view.clock.textContent = b ? Math.ceil(secondsLeft(b)) : clockFor(56, 0);
    view.score.textContent = run ? run.score : 0;
    const chips = run ? UPGRADE_IDS.filter((id) => owned(id) > 0).map(chip).join('') : '';
    if (view.chips !== chips) { view.owned.innerHTML = chips; view.chips = chips; }
    view.owned.hidden = !chips;
  }
  // An upgrade you have, as a little badge (with how many, if it matters).
  const chip = (id) => {
    const u = UPGRADES[id];
    const n = owned(id);
    const name = words(id).name;
    const label = id === 'shield' ? `${name}: ${n} left` : n > 1 ? `${name} x${n}` : name;
    return `<li class="sw-chip ${u.colour}" title="${esc(label)}">${doodleIcon(u.icon)}` +
      `${id === 'shield' || n > 1 ? `<b aria-hidden="true">${n}</b>` : ''}<span class="vh">${esc(label)}</span></li>`;
  };

  function drawMenu() {
    if (!view) return;
    const b = run && run.board;
    const left = b && run.step === 'play' ? b.lucky : 0;
    if (!left) armed = false;
    view.menu.querySelector('[data-act="star"]').setAttribute('aria-pressed', String(starMode));
    const lb = view.menu.querySelector('[data-act="lucky"]');
    lb.hidden = !(run && run.have.lucky);
    lb.disabled = !left;
    lb.setAttribute('aria-pressed', String(armed));
    lb.querySelector('b').textContent = left;
    view.stage.classList.toggle('is-starmode', starMode);
    view.board.classList.toggle('is-lucky', armed);
    view.board.classList.toggle('can-chord', !!(run && run.have.chord));
  }

  function drawStatus() {
    if (!view) return;
    const best = bestRun();
    const hint = armed ? K.hint('Click a covered tile for your lucky star', 'Tap a covered tile for your lucky star')
      : starMode ? K.hint('Star mode: clicks place stars', 'Star mode: tap to star, hold to clear')
        : K.hint('Click to clear, right-click to star', 'Tap to clear, hold to star');
    view.win.setStatus(`<span class="sw-best-run">${best ? `Best run: ${best.score}` : 'No best run yet'}</span>${hint}`);
  }

  /* ---------- the cards over the board (title, upgrades, the win, run over) ---------- */
  function syncCard(focus) {
    if (!view) return;
    const show = view.help || !run || run.step === 'pick' || run.step === 'won' || (run.step === 'over' && !view.peek);
    view.card = show;
    view.board.inert = show;
    if (show) view.toast.hidden = true;
    view.overlay.hidden = !show;
    view.overlay.innerHTML = show ? cardHtml() : '';
    if (show && focus) {
      const go = view.overlay.querySelector('[data-first]') || view.overlay.querySelector('button');
      if (go) go.focus({ preventScroll: true });
    }
  }

  function cardHtml() {
    const best = bestRun();
    const bestText = best ? `Best run: ${best.score} points, ${plural(best.levels, 'level')} cleared.` : '';
    if (view.help || !run) {
      return `
        <section class="sw-card" aria-labelledby="sw-card-h">
          <span class="sw-card-art">${wizardPic('asleep')}</span>
          <h3 class="sw-card-h" id="sw-card-h">Wizard Sweeper</h3>
          <p>Clear every safe tile without waking a wizard. Levels get sleepier, with an upgrade after each. Clear level ${LAST_LEVEL} to win.</p>
          <ul class="sw-rules">
            <li>A number counts the wizards on the 8 tiles touching it, corners too, even starred, spotted or shielded ones.</li>
            <li>Star the tiles you think hide a wizard. Not every covered tile beside a number does, so read the numbers together.</li>
            <li>Each level's first move is safe, and speed earns a bonus.</li>
          </ul>
          <p class="sw-keys"><span class="hint-mouse">Click to clear, right-click to star.
            Keys: arrows, Enter to clear, F to star, L for a lucky star (Esc puts it away).</span><span class="hint-touch">Tap to clear a tile. Hold it (or use Star mode) to star it.</span></p>
          ${bestText ? `<p class="sw-best">${esc(bestText)}</p>` : ''}
          <p class="sw-actions">${run
            ? '<button class="os-button" type="button" data-act="back" data-first>Back to the game</button>'
            : '<button class="os-button sw-go" type="button" data-act="start" data-first>Start a run</button>'}</p>
        </section>`;
    }
    // What the level paid (the speed bonus stops at the level's own points).
    const paid = (l) => `+${LEVEL_POINTS} for the level, +${l.bonus} speed bonus${l.bonus >= LEVEL_POINTS ? ' (the most it pays)' : ''}. Score: ${run.score}`;
    const bestNote = run.newBest
      ? `<p class="sw-best is-new">New best run!${run.bestLine ? ` <span>${esc(run.bestLine)}</span>` : ''}</p>`
      : bestText ? `<p class="sw-best">${esc(bestText)}</p>` : '';
    if (run.step === 'pick') {
      const l = run.last;
      return `
        <section class="sw-card" aria-labelledby="sw-card-h">
          ${l.line ? `<p class="sw-said">${esc(l.line)}</p>` : ''}
          <span class="sw-card-art">${wizardPic('happy')}</span>
          <p class="sw-kicker">${l.onwards ? 'Endless levels' : `Level ${l.level} cleared`}</p>
          <p class="sw-tally">${l.onwards ? `Each level from here is a little sleepier than the last. Score: ${run.score}` : paid(l)}</p>
          <h3 class="sw-card-h" id="sw-card-h">Pick an upgrade</h3>
          <div class="sw-ups">${run.offer.map((id, k) => upgradeCard(id, k === 0)).join('')}</div>
        </section>`;
    }
    if (run.step === 'won') {
      return `
        <section class="sw-card" aria-labelledby="sw-card-h">
          ${run.line ? `<p class="sw-said">${esc(run.line)}</p>` : ''}
          <span class="sw-card-art">${wizardPic('party')}</span>
          <p class="sw-kicker">All ${LAST_LEVEL} levels cleared</p>
          <h3 class="sw-card-h" id="sw-card-h">Every wizard tucked in</h3>
          <p class="sw-tally">${paid(run.last)}</p>
          ${bestNote}
          <p>Keep sweeping into endless levels, each one sleepier than the last, until you wake a wizard.</p>
          <p class="sw-actions">
            <button class="os-button sw-go" type="button" data-act="onwards" data-first>Keep sweeping</button>
            <button class="os-button" type="button" data-act="again">New run</button>
          </p>
        </section>`;
    }
    const endless = run.cleared - LAST_LEVEL;
    return `
      <section class="sw-card" aria-labelledby="sw-card-h">
        ${run.line ? `<p class="sw-said">${esc(run.line)}</p>` : ''}
        <span class="sw-card-art">${wizardPic('startled')}</span>
        <h3 class="sw-card-h" id="sw-card-h">Run over</h3>
        <p class="sw-tally">You cleared ${plural(run.cleared, 'level')}${run.won && endless > 0 ? `, ${endless} of them endless` : ''}.<br />Score: ${run.score}${run.bonus ? ` (${run.score - run.bonus} + ${run.bonus} speed bonus)` : ''}</p>
        ${bestNote}
        <p class="sw-actions">
          <button class="os-button sw-go" type="button" data-act="again" data-first>New run</button>
          <button class="os-button" type="button" data-act="peek">See the board</button>
        </p>
      </section>`;
  }

  const upgradeCard = (id, first) => {
    const u = UPGRADES[id];
    const w = words(id);
    const n = owned(id);
    return `<button class="sw-up ${u.colour}" type="button" data-up="${id}"${first ? ' data-first' : ''}>
        <span class="sw-up-icon">${doodleIcon(u.icon)}</span>
        <span class="sw-up-name">${esc(w.name)}</span>
        <span class="sw-up-blurb">${esc(w.blurb)}</span>
        ${n ? `<span class="sw-up-have">You have ${n}</span>` : ''}
      </button>`;
  };

  /* ---------- telling you things ---------- */
  // A note over the field, read out by screen readers too. It sits along
  // the top, or the bottom when there's more to see up top (and always
  // away from `near`, the tile it's about).
  function say(text, ms, near) {
    if (!view || !text) return;
    const t = view.toast;
    t.textContent = text;
    t.hidden = false;
    t.classList.toggle('is-low', lowNote(near));
    t.classList.remove('is-in');
    void t.offsetWidth; // restart the pop-in
    t.classList.add('is-in');
    clearTimeout(view.toastTimer);
    view.toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2800);
    announce(text);
  }
  function lowNote(near) {
    const b = view.shown;
    if (!b || b.idle) return false;
    const band = Math.min(2, b.rows >> 1);
    let top = 0;
    let low = 0;
    b.cells.forEach((c, i) => {
      if (c.s === 'hidden') return;
      const r = (i / b.cols) | 0;
      if (r < band) top++;
      else if (r >= b.rows - band) low++;
    });
    if (near != null) { if (((near / b.cols) | 0) < b.rows / 2) top += 1000; else low += 1000; }
    return top > low;
  }
  function announce(text) {
    if (!view || !text) return;
    const live = view.live;
    live.textContent = '';
    clearTimeout(view.liveTimer);
    view.liveTimer = setTimeout(() => { live.textContent = text; }, 40);
  }

  /* ---------- mouse, touch and keyboard ----------
     Mouse: click clears, right-click stars. Touch: a tap clears, holding
     stars (Star mode swaps the two). Keyboard: arrow keys move, Enter or
     Space clears, F stars, L uses a Lucky star (Escape puts it away). */
  let press = null;     // a finger resting on a tile
  let swallowUntil = 0; // the click at the end of a long press isn't a tap
  let lastPointer = 'mouse';
  const tileOf = (t) => (t && t.closest ? t.closest('.sw-cell') : null);
  const tileIndex = (el) => Number(el.dataset.i);
  const dropPress = () => { if (press) clearTimeout(press.timer); press = null; };
  const inPlay = () => !!(run && run.step === 'play');

  function act(i, how) {
    if (armed) lucky(i);
    else if (how === 'star') star(i);
    else clearAt(i);
  }

  function wire(v) {
    const { board } = v;
    board.addEventListener('click', (e) => {
      const el = tileOf(e.target);
      if (!el || !inPlay() || performance.now() < swallowUntil) return;
      setCursor(tileIndex(el));
      act(tileIndex(el), starMode ? 'star' : 'clear');
    });
    board.addEventListener('contextmenu', (e) => {
      const el = tileOf(e.target);
      if (!el) return;
      e.preventDefault();
      if (lastPointer === 'touch' || !inPlay()) return; // a held finger has its own way
      setCursor(tileIndex(el));
      star(tileIndex(el));
    });
    board.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType || 'mouse';
      const el = tileOf(e.target);
      if (!el || e.pointerType !== 'touch' || !e.isPrimary || !inPlay()) return;
      dropPress();
      const i = tileIndex(el);
      const p = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
      p.timer = setTimeout(() => {
        p.done = true;
        setCursor(i);
        // Holding does the other thing: it stars (or, in Star mode, clears).
        if (starMode) clearAt(i);
        else star(i);
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* not allowed */ } }
      }, LONG_PRESS);
      press = p;
    });
    board.addEventListener('pointermove', (e) => {
      if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) dropPress();
    });
    const endPress = (e) => {
      if (!press || e.pointerId !== press.id) return;
      if (press.done) swallowUntil = performance.now() + 450;
      dropPress();
    };
    board.addEventListener('pointerup', endPress);
    board.addEventListener('pointercancel', endPress);
    board.addEventListener('keydown', onKey);
    board.addEventListener('focusin', (e) => { const el = tileOf(e.target); if (el) setCursor(tileIndex(el)); });
    const FX = { 'sw-pop': 'is-pop', 'sw-lit': 'is-lit', 'sw-star': 'is-starring', 'sw-jolt': 'is-jolted' };
    board.addEventListener('animationend', (e) => {
      const el = tileOf(e.target);
      if (el && FX[e.animationName]) el.classList.remove(FX[e.animationName]);
    });
    v.menu.addEventListener('click', onMenu);
    v.overlay.addEventListener('click', onCard);
  }

  function setCursor(i, focus) {
    const cells = view.cells;
    if (!cells[i]) return;
    if (cells[view.cursor]) cells[view.cursor].tabIndex = -1;
    view.cursor = i;
    cells[i].tabIndex = 0;
    if (focus) cells[i].focus();
  }
  function focusBoard() {
    if (view && !view.card && view.cells[view.cursor]) view.cells[view.cursor].focus();
  }

  function onKey(e) {
    const el = tileOf(e.target);
    if (!el || e.altKey || e.metaKey) return;
    const b = view.shown;
    const i = tileIndex(el);
    const r = (i / b.cols) | 0;
    const c = i % b.cols;
    let to;
    switch (e.key) {
      case 'ArrowUp': to = r > 0 ? i - b.cols : i; break;
      case 'ArrowDown': to = r < b.rows - 1 ? i + b.cols : i; break;
      case 'ArrowLeft': to = c > 0 ? i - 1 : i; break;
      case 'ArrowRight': to = c < b.cols - 1 ? i + 1 : i; break;
      case 'Home': to = e.ctrlKey ? 0 : r * b.cols; break;
      case 'End': to = e.ctrlKey ? b.n - 1 : r * b.cols + b.cols - 1; break;
      case 'PageUp': to = c; break;
      case 'PageDown': to = (b.rows - 1) * b.cols + c; break;
      case 'Enter':
      case ' ':
        if (e.ctrlKey) return;
        e.preventDefault();
        if (!e.repeat && inPlay()) act(i, starMode ? 'star' : 'clear');
        return;
      case 'f':
      case 'F':
        if (e.ctrlKey) return;
        e.preventDefault();
        if (!e.repeat && inPlay()) star(i);
        return;
      case 'l':
      case 'L':
        if (e.ctrlKey) return;
        e.preventDefault();
        if (!e.repeat) lucky(i);
        return;
      case 'Escape':
        // Puts a Lucky star away (otherwise Escape tucks the window away).
        if (!armed) return;
        e.preventDefault();
        armed = false;
        drawMenu();
        drawStatus();
        say('Lucky star put away.');
        return;
      default:
        return;
    }
    e.preventDefault();
    setCursor(to, true);
  }

  function onMenu(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !view) return;
    const what = btn.dataset.act;
    if (what === 'new') askNewRun();
    else if (what === 'star') {
      starMode = !starMode;
      drawMenu();
      drawStatus();
      say(starMode ? 'Star mode on: taps and clicks place stars.' : 'Star mode off: taps and clicks clear tiles.');
    } else if (what === 'lucky') {
      armed = !armed;
      drawMenu();
      drawStatus();
      if (armed) say('Lucky star ready: pick a covered tile.');
    } else if (what === 'help') {
      view.help = true;
      syncCard(true);
    }
  }

  function askNewRun() {
    if (!run || run.step === 'over' || run.step === 'won' || (run.level === 1 && !run.board.started)) { newRun(); return; }
    K.dialog({
      title: 'New run',
      icon: 'controller',
      message: `Start a new run? This one ends here, on level ${run.level} with ${plural(run.score, 'point')}.`,
      buttons: ['Keep playing', 'New run'],
    }).then((v) => { if (v === '1') newRun(); });
  }

  function onCard(e) {
    const btn = e.target.closest('button');
    if (!btn || !view) return;
    if (btn.dataset.up) { choose(btn.dataset.up); return; }
    const what = btn.dataset.act;
    if (what === 'start' || what === 'again') newRun();
    else if (what === 'onwards') keepSweeping();
    else if (what === 'back') {
      view.help = false;
      syncCard(true);
      focusBoard();
    } else if (what === 'peek') {
      view.peek = true;
      syncCard(false);
      focusBoard();
      say('Here is where they were all sleeping. Press New run to play again.', 3600, run.woke);
    }
  }

  K.sweeper = { mount, unmount };
})();

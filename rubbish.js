/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - NOT RUBBISH  (a game in the Games window)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. What the wizard says, the words on
   the program cards and the gremlins' drawings live in content.js under
   "rubbish"; the wizard wears his own drawings (wizard.frames), stand-ins
   and all. apps.js fetches this file the first time the game opens.

   Someone dropped the pet wizard in the Trash, so he climbs out: ten
   floors dressed as the site's retired designs, oldest at the bottom,
   then the lid, where the Empty Recycle Bin dialog waits. Everything moves
   when he does: he makes his move, the gremlins strike the tiles they
   marked in pink, then they move and mark new ones. He bonks a gremlin by
   walking into it, hops two tiles over anything and naps to win back a
   heart. After each floor he installs a program. Lose every heart and the
   run is over. Each visitor's best is kept.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  if (!K || K.rubbish) return;
  const C = K.C || {};
  const { esc, doodleIcon, plural } = K;
  const R = C.rubbish || {};
  const RM = K.REDUCE_MOTION;

  /* ---------- the rules, in numbers ---------- */
  const STORE_KEY = 'kasai:rubbish'; // { best: { score, floor, won, at } }
  const COLS = 7;
  const ROWS = 8;
  const N = COLS * ROWS;
  const FLOORS = 10;        // old designs to climb through; the lid is floor 11
  const HEARTS = 3;         // at the start of a run
  const MOST_HEARTS = 6;    // Extra RAM stops offering itself here
  const HOP_RECHARGE = 4;   // turns from one hop to the next (Overclock takes one off, down to 2)
  const NAPS = 1;           // naps on each floor (the Snooze button adds more)
  const LID_HP = 8;         // bonks the Empty Recycle Bin dialog can take
  const MOST_GREMLINS = 9;  // copies and summons stop here
  const POINTS = { floor: 100, gremlin: 10, star: 25, lid: 300, heart: 50 };

  /* ---------- the floors: Andrew's retired designs, oldest first ----------
     Two floors each, dressed in style.css (.nr-stage.era-...). The picture
     on the program card is that design's screenshot in the Trash. */
  const ERAS = [
    { key: 'boxes', name: 'White-box art cards', when: 'June 2026', img: 'assets/recycle/White-box art cards (June 2026).png' },
    { key: 'folders', name: 'Folder project cards', when: 'Sept 2026', img: 'assets/recycle/Folder project cards (Sept 2026).png' },
    { key: 'cards', name: 'Index card writing', when: 'Sept 2026', img: 'assets/recycle/Index card writing (Sept 2026).png' },
    { key: 'polaroids', name: 'Colour-pop polaroids', when: 'Oct 2026', img: 'assets/recycle/Colour-pop polaroids (Oct 2026).png' },
    { key: 'about', name: 'The old About page', when: 'Oct 2026', img: 'assets/recycle/About page (Oct 2026).png' },
  ];
  const eraOf = (n) => ERAS[Math.min(ERAS.length - 1, (n - 1) >> 1)];

  /* ---------- the gremlins ----------
     Each one marks the tiles it will strike after his next move:
       bug      the four tiles beside it, every turn
       webcam   a beam at him along its row or column, then it recharges
       bunny    naps every other turn; awake, all eight tiles round it
       spinner  rolls at him along a row or column until something stops
                it, then sits dizzy for a turn
       printer  bites like a bug, and every fourth turn prints a copy of itself
     Webcam beams and rolling spinners hit gremlins too. */
  const TYPES = {
    bug: { name: 'Bug', hp: 1, icon: 'bug', rule: 'Bites the four tiles beside it.' },
    webcam: { name: 'Webcam', hp: 1, icon: 'webcam', rule: 'Shoots a beam along its row or column when you line up with it, then recharges for a turn. Its beam hits gremlins too.' },
    bunny: { name: 'Dust bunny', hp: 2, icon: 'bunny', rule: 'Naps every other turn. Awake, it sneezes on all eight tiles round it.' },
    spinner: { name: 'Spinner', hp: 1, icon: 'refresh', rule: 'Rolls at you along its row or column and hits the first thing in its way, then sits dizzy for a turn.' },
    printer: { name: 'Printer', hp: 1, icon: 'printer', rule: 'Bites like a bug, and every fourth turn it prints a copy of itself.' },
  };
  // Who each floor brings (placed at random, a few steps from his start).
  const FLOOR_PLAN = [
    ['bug', 'bug'],
    ['bug', 'bug', 'webcam'],
    ['bug', 'webcam', 'bunny'],
    ['bug', 'bug', 'webcam', 'bunny'],
    ['bug', 'webcam', 'bunny', 'spinner'],
    ['bug', 'bug', 'webcam', 'bunny', 'spinner'],
    ['bug', 'webcam', 'bunny', 'spinner', 'printer'],
    ['bug', 'bug', 'webcam', 'spinner', 'printer', 'bunny'],
    ['bug', 'bug', 'webcam', 'webcam', 'spinner', 'printer'],
    ['bug', 'bug', 'webcam', 'webcam', 'bunny', 'spinner', 'printer'],
  ];
  // The lid: who's waiting, and who the dialog calls in (in turn).
  const LID_PLAN = ['webcam', 'bug'];
  const SUMMONS = ['webcam', 'bug', 'printer', 'spinner'];

  /* ---------- programs (install one after every floor; they stack) ---------- */
  const PROGRAMS = {
    undo: { colour: 'blue', icon: 'back', name: 'Ctrl+Z', blurb: 'Once a floor, take back a turn. If a hit would knock you out, it steps in by itself.' },
    firewall: { colour: 'teal', icon: 'shield', name: 'Firewall', blurb: 'Blocks the first hit on every floor.' },
    screensaver: { colour: 'lavender', icon: 'laptop', name: 'Screensaver', blurb: 'Once a floor, every gremlin forgets its attack and sits out a turn. Using it costs no turn.' },
    ram: { colour: 'pink', icon: 'heart', name: 'Extra RAM', blurb: 'One more heart, and all your hearts back.' },
    overclock: { colour: 'yellow', icon: 'power', name: 'Overclock', blurb: 'Your hop recharges a turn sooner.' },
    antivirus: { colour: 'coral', icon: 'hammer', name: 'Antivirus', blurb: 'Bonks do double damage.', once: true },
    snooze: { colour: 'grey', icon: 'clock', name: 'Snooze button', blurb: 'One more nap on every floor.' },
    popper: { colour: 'ink', icon: 'star', name: 'Party popper', blurb: 'Once a floor, every gremlin round you gets dizzy. Using it costs no turn.' },
  };
  const PROGRAM_IDS = Object.keys(PROGRAMS);
  // The names and blurbs can be reworded in content.js.
  const words = (id) => {
    const mine = (R.programs || {})[id] || {};
    const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
    return { name: text(mine.name, PROGRAMS[id].name), blurb: text(mine.blurb, PROGRAMS[id].blurb) };
  };

  /* ---------- the game's own doodles (they join the shared set) ---------- */
  const ICONS = {
    bug: '<path d="M12 8.5c2.8 0 4.8 2.6 4.8 5.8S14.8 20 12 20s-4.8-2.5-4.8-5.7S9.2 8.5 12 8.5z"/><path d="M12 8.5V20"/><path d="M9.6 8.9 8 5.5M14.4 8.9 16 5.5"/><path d="M7.4 12.5H4M7.3 16H3.8M16.6 12.5H20M16.7 16h3.5"/>',
    bunny: '<path d="M9.6 9.3 8 3.9a1.3 1.3 0 0 1 2.4-.9L12 8M14.4 9.3 16 3.9a1.3 1.3 0 0 0-2.4-.9L12 8"/><path d="M5.5 15.2a6.5 6.5 0 0 1 13 0c0 2.9-2.9 4.8-6.5 4.8s-6.5-1.9-6.5-4.8z"/><path d="M9.8 14.6h.01M14.2 14.6h.01"/>',
    shield: '<path d="M12 3.2 5 6v5.5c0 4.4 2.9 7.7 7 9.3 4.1-1.6 7-4.9 7-9.3V6z"/><path d="M9 12.2l2.1 2.1L15.2 10"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3l4 5-4 5v4M16 3.5v3l-4 5 4 5v4"/>',
    up: '<path d="M12 19.5V5"/><path d="M6 11l6-6 6 6"/>',
    webcam: '<circle cx="12" cy="10" r="6.5"/><circle cx="12" cy="10" r="2.5"/><path d="M12 16.5V20M8 20.5h8"/>',
    printer: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14.5h10v6H7z"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!K.DOODLE_ICONS[k]) K.DOODLE_ICONS[k] = ICONS[k]; });

  /* ---------- the wizard and the gremlins' drawings ----------
     He wears the pet wizard's drawings (pet.js lends a stand-in for any
     not drawn yet). A gremlin without a drawing in content.js gets a
     stand-in: a coloured blob with eyes and its doodle. */
  const frame = (name) => (K.pet && K.pet.frame ? K.pet.frame(name) : '');
  const wizardPic = (name, cls) => {
    const src = frame(name);
    return src
      ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}" alt="" draggable="false" decoding="async" />`
      : doodleIcon('hat', cls);
  };
  const drawingOf = (type) => {
    const p = (R.gremlins || {})[type];
    return typeof p === 'string' && p.trim() ? K.webSrc(p.trim()) : '';
  };

  /* ---------- what's said (content.js, under "rubbish") ---------- */
  const DEFAULT_LINES = {
    floorLines: ['up we go.', 'one floor closer to the desktop.', 'that floor smelled like June.'],
    loseLines: ['back to the bottom of the bin...', 'i was nearly out!', 'someone empty this thing already.'],
    winLines: ['told you. NOT rubbish.', 'fresh air! and wallpaper!'],
    bestLines: ['a new best! the gremlins are fuming.'],
  };
  const LID_LINES = ['Are you sure?', 'Are you really sure?', 'Are you totally sure?', 'This cannot be undone!', 'Seriously, this is permanent.', 'Last chance!', 'Final answer?', 'Fine. Keep him.'];
  const DESK_LINES = { lose: ['i made it to floor {floor} of the Trash!'], win: ['i climbed out of the Trash! not rubbish.'] };
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (list) => (list.length ? list[rand(list.length)] : '');
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  // A missing list uses the lines above; an empty one (or '') keeps him quiet.
  const linesOf = (v, fallback) => (Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x)
    : typeof v === 'string' ? (v ? [v] : []) : fallback);
  const lineOf = (key) => pick(linesOf(R[key], DEFAULT_LINES[key]));
  const lidLines = () => { const l = linesOf(R.lidLines, LID_LINES); return l.length ? l : LID_LINES; };

  /* ---------- the best run (kept per visitor) ---------- */
  const bestRun = () => {
    const b = (K.store.get(STORE_KEY, null) || {}).best;
    return b && Number.isFinite(b.score) && b.score > 0 ? b : null;
  };

  /* ══════════════════════════════════════════════════════════════════════
     THE BOARD
     ══════════════════════════════════════════════════════════════════════
     Tiles are numbered row by row from the top-left. He starts at the
     bottom; the Restore arrow (the way up) sits somewhere along the top. */
  const FLOOR = 0;  // anyone can stand here
  const JUNK = 1;   // a pile of old files: nobody gets past
  const EXIT = 2;   // the Restore arrow
  const LID = 3;    // under the Empty Recycle Bin dialog
  const rowOf = (i) => (i / COLS) | 0;
  const colOf = (i) => i % COLS;
  const at = (r, c) => (r < 0 || c < 0 || r >= ROWS || c >= COLS ? -1 : r * COLS + c);
  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const DIR_NAMES = Object.keys(DIRS);
  const next = (i, d) => (i < 0 ? -1 : at(rowOf(i) + DIRS[d][0], colOf(i) + DIRS[d][1]));
  const beside = (i) => DIR_NAMES.map((d) => next(i, d)).filter((j) => j >= 0);
  const around = (i) => {
    const out = [];
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const j = y || x ? at(rowOf(i) + y, colOf(i) + x) : -1;
        if (j >= 0) out.push(j);
      }
    }
    return out;
  };
  const apart = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
  const lined = (a, b) => a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b));
  const dirTo = (a, b) => (rowOf(a) === rowOf(b) ? (colOf(b) > colOf(a) ? 'right' : 'left') : rowOf(b) > rowOf(a) ? 'down' : 'up');
  const START = at(ROWS - 1, 3);
  // The dialog covers the middle five tiles of the top two rows.
  const LID_TILES = [];
  for (let r = 0; r < 2; r++) for (let c = 1; c < COLS - 1; c++) LID_TILES.push(at(r, c));

  const alive = (g) => g.hp > 0;
  const gremlinAt = (f, i) => f.gs.find((g) => g.i === i && g.hp > 0) || null;
  // Somewhere a gremlin could go: plain floor nobody's standing on.
  const vacant = (f, i) => i >= 0 && f.tiles[i] === FLOOR && i !== f.pet && !gremlinAt(f, i);
  // Somewhere he could land: floor or the Restore arrow, no gremlin on it.
  const landable = (f, i) => i >= 0 && (f.tiles[i] === FLOOR || f.tiles[i] === EXIT) && !gremlinAt(f, i);

  // Every tile he could stand on can be reached from his start.
  function connected(tiles) {
    const seen = new Set([START]);
    const q = [START];
    for (let k = 0; k < q.length; k++) {
      beside(q[k]).forEach((j) => {
        if (!seen.has(j) && (tiles[j] === FLOOR || tiles[j] === EXIT)) { seen.add(j); q.push(j); }
      });
    }
    return tiles.every((t, i) => (t !== FLOOR && t !== EXIT) || seen.has(i));
  }

  function makeFloor(n) {
    const lid = n > FLOORS;
    const have = run.have;
    let tiles = null;
    let exit = -1;
    for (let tries = 0; tries < 400; tries++) {
      tiles = new Array(N).fill(FLOOR);
      exit = -1;
      if (lid) LID_TILES.forEach((i) => { tiles[i] = LID; });
      else { exit = at(0, rand(COLS)); tiles[exit] = EXIT; }
      // Junk in the middle rows, never hard by his start or the way up.
      const spots = range(N).filter((i) => rowOf(i) > 0 && rowOf(i) < ROWS - 1 && tiles[i] === FLOOR &&
        apart(i, START) > 1 && (exit < 0 || apart(i, exit) > 1));
      const junk = tries > 300 ? 0 : lid ? 2 : 4 + rand(4);
      shuffle(spots).slice(0, junk).forEach((i) => { tiles[i] = JUNK; });
      if (connected(tiles)) break;
    }
    const f = {
      n,
      era: lid ? 'lid' : eraOf(n).key,
      tiles,
      exit,
      items: {},
      pet: START,
      facing: 1,
      gs: [],
      nextId: 1,
      lid: lid ? { hp: LID_HP, max: LID_HP, tick: 0, marks: null, summon: null, stun: 0, called: 0 } : null,
      hopCd: 0,
      naps: NAPS + have.snooze,
      undos: have.undo,
      blocks: have.firewall,
      savers: have.screensaver,
      poppers: have.popper,
      turn: 0,
    };
    // A star or two to grab, and now and then a heart.
    const spare = shuffle(range(N).filter((i) => tiles[i] === FLOOR && i !== START &&
      rowOf(i) >= (lid ? 2 : 1) && rowOf(i) < ROWS - 1));
    for (let k = n >= 6 ? 2 : 1; k > 0 && spare.length; k--) f.items[spare.pop()] = 'star';
    if (spare.length && (lid || Math.random() < 0.35)) f.items[spare.pop()] = 'heart';
    // The gremlins, a few steps from his start (and the shooters and
    // rollers out of line with it, so no floor opens with a shot at him).
    const homes = shuffle(range(N).filter((i) => tiles[i] === FLOOR && !f.items[i] &&
      rowOf(i) <= 4 && rowOf(i) >= (lid ? 2 : 0) && apart(i, START) >= 4));
    (lid ? LID_PLAN : FLOOR_PLAN[n - 1]).forEach((type) => {
      const aims = type === 'webcam' || type === 'spinner';
      const k = aims ? homes.findIndex((i) => !lined(i, START)) : homes.length - 1;
      if (homes.length) addGremlin(f, type, homes.splice(k < 0 ? homes.length - 1 : k, 1)[0], 0);
    });
    think(f, true); // they size him up: first marks, no moves yet
    return f;
  }

  function addGremlin(f, type, i, stun) {
    const g = {
      id: f.nextId++,
      type,
      i,
      hp: TYPES[type].hp,
      max: TYPES[type].hp,
      marks: null,   // the tiles it strikes after his next move
      kind: '',      // bite, beam, sneeze or roll
      dir: '',
      copy: -1,      // printer: where its copy turns up
      hitsLid: false,
      stun,          // turns left sitting dizzy
      reload: 0,     // webcams: a turn to recharge after firing
      tick: rand(3), // printer: copies itself every fourth turn
      awake: Math.random() < 0.5, // dust bunnies: awake or napping
    };
    f.gs.push(g);
    return g;
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE GREMLINS' TURN
     ══════════════════════════════════════════════════════════════════════
     Each moves (unless it's dizzy) and marks the tiles it will strike once
     he's made his next move. `still`: marks only (a floor's first look). */
  function think(f, still) {
    f.gs.forEach((g) => {
      if (!alive(g)) return;
      g.marks = null;
      g.copy = -1;
      g.hitsLid = false;
      if (g.stun > 0) { g.stun--; return; }
      AI[g.type](f, g, still);
    });
    if (f.lid) thinkLid(f, still);
  }

  const AI = {
    bug(f, g, still) {
      if (!still && beside(g.i).indexOf(f.pet) === -1) stepTowards(f, g);
      bite(f, g);
    },
    printer(f, g, still) {
      AI.bug(f, g, still);
      if (still) return;
      g.tick++;
      if (g.tick % 4 === 0 && f.gs.filter(alive).length < MOST_GREMLINS) {
        const spots = beside(g.i).filter((j) => vacant(f, j));
        if (spots.length) g.copy = pick(spots);
      }
    },
    // The slower gremlins either move or take aim in a turn, never both,
    // so there's always a turn's warning once they're in place.
    bunny(f, g, still) {
      if (!still) g.awake = !g.awake;
      if (!g.awake) return; // napping
      if (around(g.i).indexOf(f.pet) !== -1) {
        g.kind = 'sneeze';
        g.marks = around(g.i).filter((j) => f.tiles[j] !== JUNK && f.tiles[j] !== LID);
      } else if (!still) stepTowards(f, g);
    },
    webcam(f, g, still) {
      if (g.reload > 0) {
        g.reload--;
        if (!still) lineUp(f, g, false);
        return;
      }
      const d = inLine(f, g, false);
      if (d) { g.kind = 'beam'; g.dir = d; g.marks = ray(f, g, d); }
      else if (!still) lineUp(f, g, false);
    },
    spinner(f, g, still) {
      const d = inLine(f, g, true);
      if (d) { g.kind = 'roll'; g.dir = d; g.marks = ray(f, g, d); }
      else if (!still) lineUp(f, g, true);
    },
  };

  function bite(f, g) {
    g.kind = 'bite';
    g.marks = beside(g.i).filter((j) => f.tiles[j] !== JUNK && f.tiles[j] !== LID);
  }

  // Is he along this gremlin's row or column with nothing solid between?
  // (`clear`: no other gremlin in the way either.) Gives the direction.
  function inLine(f, g, clear, from) {
    const here = from == null ? g.i : from;
    if (!lined(here, f.pet)) return '';
    const d = dirTo(here, f.pet);
    for (let j = next(here, d); j !== f.pet; j = next(j, d)) {
      if (f.tiles[j] === JUNK || f.tiles[j] === LID) return '';
      if (clear) { const o = gremlinAt(f, j); if (o && o !== g) return ''; }
    }
    return d;
  }

  // A straight line from a gremlin to the first junk (or the edge).
  function ray(f, g, d) {
    const out = [];
    for (let j = next(g.i, d); j >= 0; j = next(j, d)) {
      if (f.tiles[j] === JUNK) break;
      if (f.tiles[j] === LID) { g.hitsLid = true; break; }
      out.push(j);
    }
    return out;
  }

  // One step nearer to him, the shortest way round junk and gremlins.
  function stepTowards(f, g) {
    const dist = new Array(N).fill(Infinity);
    dist[f.pet] = 0;
    const q = [f.pet];
    for (let k = 0; k < q.length; k++) {
      beside(q[k]).forEach((j) => {
        if (dist[j] !== Infinity || f.tiles[j] !== FLOOR) return;
        const o = gremlinAt(f, j);
        if (o && o !== g) return;
        dist[j] = dist[q[k]] + 1;
        q.push(j);
      });
    }
    const ways = beside(g.i).filter((j) => vacant(f, j) && dist[j] < dist[g.i]);
    if (ways.length) { g.i = pick(ways); return; }
    // No way through: shuffle closer as the crow flies, if there's room.
    const closer = beside(g.i).filter((j) => vacant(f, j) && apart(j, f.pet) < apart(g.i, f.pet));
    if (closer.length) g.i = pick(closer);
  }

  // Shooters and rollers walk to the nearest spot in line with him (at
  // least two tiles off), one step a turn.
  function lineUp(f, g, clear) {
    const good = (i) => apart(i, f.pet) >= 2 && !!inLine(f, g, clear, i);
    if (good(g.i)) return;
    const from = new Array(N).fill(-2);
    from[g.i] = -1;
    const q = [g.i];
    let goal = -1;
    for (let k = 0; k < q.length; k++) {
      const i = q[k];
      if (i !== g.i && good(i)) { goal = i; break; }
      shuffle(beside(i)).forEach((j) => { if (from[j] === -2 && vacant(f, j)) { from[j] = i; q.push(j); } });
    }
    if (goal < 0) { stepTowards(f, g); return; }
    let s = goal;
    while (from[s] !== g.i) s = from[s];
    g.i = s;
  }

  /* ---------- the lid: the Empty Recycle Bin dialog ----------
     It never moves. In turn it deletes his row, deletes his column and
     calls in a gremlin (two once it's down to half). Each bonk wears it
     down and stops whatever it was about to delete (but not the gremlins
     it called), so the danger while he bonks is its gremlins. */
  function thinkLid(f, still) {
    const b = f.lid;
    b.marks = null;
    b.summon = null;
    if (b.stun > 0) { b.stun--; return; }
    if (still) return; // it watches his first move
    b.tick++;
    const step = b.tick % 3;
    const usable = (j) => j >= 0 && f.tiles[j] !== JUNK && f.tiles[j] !== LID;
    if (step === 1) b.marks = range(COLS).map((c) => at(rowOf(f.pet), c)).filter(usable);
    else if (step === 2) b.marks = range(ROWS).map((r) => at(r, colOf(f.pet))).filter(usable);
    else {
      const room = MOST_GREMLINS - f.gs.filter(alive).length;
      const spots = shuffle(range(N).filter((j) => vacant(f, j) && rowOf(j) >= 2 && apart(j, f.pet) >= 3));
      b.summon = spots.slice(0, Math.max(0, Math.min(room, b.hp <= b.max / 2 ? 2 : 1)));
      if (!b.summon.length) b.summon = null;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     HIS TURN
     ══════════════════════════════════════════════════════════════════════
     A step, a bonk, a hop or a nap is a turn: then every marked tile is
     struck at once, and the gremlins move and mark new ones. Walking into
     a wall isn't a turn. `ev` collects what happened, for the drawing and
     for screen readers. */
  let run = null;   // the run being played (it waits while the window is shut)
  let view = null;  // the window it's drawn in, while that's open
  let armed = false; // the next move is a hop

  const inPlay = () => !!(run && run.step === 'play' && run.floor);
  const power = () => 1 + (run.have.antivirus ? 1 : 0);
  const hopRecharge = () => Math.max(2, HOP_RECHARGE - run.have.overclock);

  function tryStep(d) {
    if (!inPlay()) return;
    const f = run.floor;
    if (armed) { tryHop(d); return; }
    const to = next(f.pet, d);
    if (to < 0 || f.tiles[to] === JUNK) { nudge(d); return; }
    begin();
    const ev = [];
    face(f, d);
    const g = gremlinAt(f, to);
    if (f.tiles[to] === LID) {
      bonkLid(f, d, ev);
      if (f.lid.hp <= 0) { won(ev); return; }
    } else if (g) bonk(f, g, d, ev);
    else {
      f.pet = to;
      ev.push({ t: 'step', d });
      collect(f, ev);
      if (to === f.exit) { climb(ev); return; }
    }
    endTurn(f, ev);
  }

  // Two tiles in a straight line, over anything, onto a free tile.
  const hopTarget = (f, d) => {
    const to = next(next(f.pet, d), d);
    return landable(f, to) ? to : -1;
  };
  function tryHop(d) {
    if (!inPlay()) return;
    const f = run.floor;
    if (f.hopCd > 0) { armed = false; say(`Hop is recharging: ready in ${plural(f.hopCd, 'turn')}.`); drawDock(); return; }
    const to = hopTarget(f, d);
    if (to < 0) { say("He can't land there: hops go two tiles in a straight line, onto an empty tile."); nudge(d); return; }
    begin();
    armed = false;
    const ev = [{ t: 'hop', d }];
    face(f, d);
    f.pet = to;
    f.hopCd = hopRecharge();
    collect(f, ev);
    if (to === f.exit) { climb(ev); return; }
    // Landing makes the gremlins beside him dizzy.
    beside(to).forEach((j) => {
      const g = gremlinAt(f, j);
      if (g) { dizzy(g); ev.push({ t: 'dizzy', id: g.id }); }
    });
    endTurn(f, ev);
  }

  function nap() {
    if (!inPlay()) return;
    const f = run.floor;
    begin();
    armed = false;
    const healed = run.hearts < run.max && f.naps > 0;
    if (healed) { f.naps--; run.hearts++; }
    endTurn(f, [{ t: 'nap', healed }]);
  }

  const face = (f, d) => { if (d === 'left') f.facing = -1; else if (d === 'right') f.facing = 1; };

  // A dizzy gremlin forgets what it marked and sits out its next turn.
  const dizzy = (g) => { g.marks = null; g.copy = -1; g.stun = Math.max(g.stun, 1); };

  // Bonk: a hit, and a shove one tile back (into something solid, that
  // hurts more). Whatever's left of it is dizzy.
  function bonk(f, g, d, ev) {
    ev.push({ t: 'bonk', d, id: g.id });
    hurt(f, g, power(), ev);
    if (!alive(g)) return;
    const to = next(g.i, d);
    const other = to >= 0 ? gremlinAt(f, to) : null;
    if (to >= 0 && f.tiles[to] === FLOOR && !other && to !== f.pet) {
      g.i = to;
      ev.push({ t: 'shove', id: g.id });
    } else {
      hurt(f, g, 1, ev);
      if (other) hurt(f, other, 1, ev);
      else if (to >= 0 && f.tiles[to] === LID) hurtLid(f, 1, ev);
    }
    if (alive(g)) dizzy(g);
  }

  // A bonk on the dialog: it wears down, and whatever it was about to
  // delete is stopped (the gremlins it called still turn up).
  function bonkLid(f, d, ev) {
    ev.push({ t: 'bonk', d, lid: true });
    hurtLid(f, power(), ev);
    f.lid.marks = null;
  }

  function hurt(f, g, dmg, ev) {
    if (!alive(g)) return;
    g.hp = Math.max(0, g.hp - dmg);
    ev.push({ t: 'hurt', id: g.id, type: g.type, dead: g.hp === 0 });
    if (g.hp === 0) {
      g.marks = null;
      g.copy = -1;
      run.score += POINTS.gremlin;
      run.bonked++;
    }
  }

  function hurtLid(f, dmg, ev) {
    const b = f.lid;
    if (!b || b.hp <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    ev.push({ t: 'lid', hp: b.hp });
  }

  function hitHim(f, by, ev) {
    if (f.blocks > 0) { f.blocks--; ev.push({ t: 'block', by }); return; }
    run.hearts = Math.max(0, run.hearts - 1);
    ev.push({ t: 'hit', by });
  }

  function collect(f, ev) {
    const item = f.items[f.pet];
    if (!item) return;
    delete f.items[f.pet];
    if (item === 'heart' && run.hearts < run.max) {
      run.hearts++;
      ev.push({ t: 'item', item, what: 'a heart' });
    } else {
      run.score += POINTS.star;
      run.stars++;
      ev.push({ t: 'item', item, what: item === 'star' ? `a star (+${POINTS.star})` : `a spare heart (+${POINTS.star})` });
    }
  }

  // His move is done: every marked tile is struck at once. Then what they
  // do to each other, rolls, copies and the lid's summons.
  function strike(f, ev) {
    const live = f.gs.filter(alive);
    live.forEach((g) => {
      if (g.marks && g.kind !== 'roll' && g.marks.indexOf(f.pet) !== -1) hitHim(f, g.type, ev);
    });
    const b = f.lid;
    if (b && b.marks && b.marks.indexOf(f.pet) !== -1) hitHim(f, 'lid', ev);
    live.forEach((g) => {
      const marks = g.marks;
      const copy = g.copy;
      g.marks = null;
      g.copy = -1;
      if (copy >= 0 && alive(g) && vacant(f, copy) && f.gs.filter(alive).length < MOST_GREMLINS) {
        ev.push({ t: 'spawn', id: addGremlin(f, 'printer', copy, 1).id, type: 'printer' });
      }
      if (!marks || !alive(g)) return;
      ev.push({ t: 'strike', kind: g.kind, tiles: marks });
      if (g.kind === 'beam') {
        marks.forEach((j) => { const o = gremlinAt(f, j); if (o && o !== g) hurt(f, o, 1, ev); });
        if (g.hitsLid) hurtLid(f, 1, ev);
        g.reload = 1;
      } else if (g.kind === 'roll') roll(f, g, marks, ev);
    });
    // (The dialog only ever deletes him: its gremlins are on its side.)
    if (b && b.marks) {
      ev.push({ t: 'strike', kind: 'delete', tiles: b.marks });
      b.marks = null;
    }
    if (b && b.summon) {
      b.summon.forEach((j) => {
        if (!vacant(f, j) || f.gs.filter(alive).length >= MOST_GREMLINS) return;
        const type = SUMMONS[b.called++ % SUMMONS.length];
        ev.push({ t: 'spawn', id: addGremlin(f, type, j, 1).id, type });
      });
      b.summon = null;
    }
  }

  // A spinner rolls along its line until it hits something: him, a
  // gremlin, junk, the Restore arrow or the edge. Then it's dizzy.
  function roll(f, g, path, ev) {
    let end = g.i;
    let stopped = false;
    for (const j of path) {
      if (j === f.pet) { hitHim(f, 'spinner', ev); stopped = true; break; }
      const o = gremlinAt(f, j);
      if (o) { hurt(f, o, 1, ev); stopped = true; break; }
      if (f.tiles[j] !== FLOOR) { stopped = true; break; }
      end = j;
    }
    if (!stopped && g.hitsLid) hurtLid(f, 1, ev);
    ev.push({ t: 'roll', id: g.id });
    g.i = end;
    g.stun = 1;
  }

  function endTurn(f, ev) {
    strike(f, ev);
    if (run.hearts <= 0) {
      // Ctrl+Z steps in by itself rather than let him be knocked out.
      if (rewind(true)) return;
      lose(ev);
      return;
    }
    f.gs = f.gs.filter(alive);
    if (f.lid && f.lid.hp <= 0) { won(ev); return; }
    think(f, false);
    f.turn++;
    if (f.hopCd > 0) f.hopCd--;
    show(ev);
    tell(ev);
  }

  /* ---------- programs you can use (they don't cost a turn) ---------- */
  function useSaver() {
    if (!inPlay()) return;
    const f = run.floor;
    if (f.savers < 1) { say('No screensavers left on this floor.'); return; }
    f.savers--;
    f.gs.forEach(dizzy);
    if (f.lid) { f.lid.marks = null; f.lid.summon = null; f.lid.stun = Math.max(f.lid.stun, 1); }
    show([{ t: 'saver' }]);
    say('Screensaver! Every gremlin is mesmerised for a turn.');
  }

  function usePopper() {
    if (!inPlay()) return;
    const f = run.floor;
    if (f.poppers < 1) { say('No party poppers left on this floor.'); return; }
    f.poppers--;
    const ev = [{ t: 'popper' }];
    let n = 0;
    around(f.pet).forEach((j) => {
      const g = gremlinAt(f, j);
      if (g) { dizzy(g); ev.push({ t: 'dizzy', id: g.id }); n++; }
    });
    show(ev);
    say(n ? `Pop! ${plural(n, 'gremlin')} dizzy.` : 'Pop! Nobody was close enough to notice.');
  }

  function toggleHop() {
    if (!inPlay()) return;
    const f = run.floor;
    if (f.hopCd > 0) { armed = false; say(`Hop is recharging: ready in ${plural(f.hopCd, 'turn')}.`); drawDock(); return; }
    armed = !armed;
    drawDock();
    syncTargets();
    drawStatus();
    say(armed ? 'Hop ready: pick a direction (two tiles, over anything).' : 'Hop put away.');
  }

  /* ---------- Ctrl+Z ----------
     Before every turn a copy of everything is kept; Ctrl+Z puts the last
     one back. It can't reach past the start of a floor. */
  function begin() {
    run.history.push(JSON.stringify({ floor: run.floor, hearts: run.hearts, score: run.score, bonked: run.bonked, stars: run.stars }));
    if (run.history.length > 30) run.history.shift();
  }
  function rewind(auto) {
    if (!run || !run.floor || run.floor.undos < 1 || !run.history.length) {
      if (!auto && inPlay()) say(run.floor.undos < 1 ? 'No Ctrl+Z left on this floor.' : 'Nothing to take back yet.');
      return false;
    }
    const undos = run.floor.undos - 1;
    const s = JSON.parse(run.history.pop());
    run.floor = s.floor;
    run.floor.undos = undos;
    run.hearts = s.hearts;
    run.score = s.score;
    run.bonked = s.bonked;
    run.stars = s.stars;
    armed = false;
    show([{ t: 'undo' }]);
    say(auto ? 'Ctrl+Z! That knockout never happened.' : 'Ctrl+Z: that turn never happened.', 3200);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════
     FLOORS AND RUNS
     ══════════════════════════════════════════════════════════════════════ */
  function newRun() {
    if (run && !run.recorded && run.score > 0) finishRun(false); // a run left halfway still counts
    // step: 'play', 'pick' (installing a program), 'over' or 'won'.
    run = { n: 1, score: 0, hearts: HEARTS, max: HEARTS, have: {}, step: 'play', floor: null, history: [], bonked: 0, stars: 0 };
    PROGRAM_IDS.forEach((id) => { run.have[id] = 0; });
    armed = false;
    if (view) { view.help = false; view.peek = false; }
    startFloor();
  }

  function startFloor() {
    run.floor = makeFloor(run.n);
    run.history = [];
    run.step = 'play';
    run.offer = null;
    armed = false;
    if (view) {
      show([{ t: 'floor' }]);
      syncCard(false);
      focusBoard();
    }
    const e = eraOf(run.n);
    if (run.n > FLOORS) say('The lid! Bonk the Empty Recycle Bin dialog until it gives up: each bonk stops what it was about to delete.', 5200, false, true);
    else say(`Floor ${run.n}: ${e.name} (${e.when}). ${plural(run.floor.gs.length, 'gremlin')}.`, 3600);
  }

  // He reached the Restore arrow.
  function climb(ev) {
    const f = run.floor;
    run.score += POINTS.floor;
    run.last = { n: f.n, line: lineOf('floorLines') };
    run.offer = offerPrograms();
    run.step = 'pick';
    armed = false;
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 520);
    }
    announce(`Floor ${f.n} cleared! Install a program.`);
  }

  function offerPrograms() {
    return shuffle(PROGRAM_IDS.filter((id) => {
      if (PROGRAMS[id].once && run.have[id]) return false;
      if (id === 'overclock' && hopRecharge() <= 2) return false;
      if (id === 'ram' && run.max >= MOST_HEARTS) return false;
      return true;
    })).slice(0, 3);
  }

  function choose(id) {
    if (!run || run.step !== 'pick' || run.offer.indexOf(id) === -1) return;
    run.have[id]++;
    if (id === 'ram') { run.max++; run.hearts = run.max; }
    run.n++;
    if (view) view.help = false;
    startFloor();
  }

  function lose(ev) {
    run.step = 'over';
    run.line = lineOf('loseLines');
    armed = false;
    finishRun(false);
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 1100);
    }
    announce(`Knocked out on floor ${run.n}. The run is over.`);
    tellDesktop(false);
  }

  function won(ev) {
    const f = run.floor;
    run.score += POINTS.lid + run.hearts * POINTS.heart;
    run.step = 'won';
    run.line = lineOf('winLines');
    armed = false;
    f.gs.forEach((g) => { g.marks = null; g.copy = -1; });
    if (f.lid) { f.lid.marks = null; f.lid.summon = null; }
    finishRun(true);
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 1300);
    }
    announce('The dialog gave up. He climbed out of the Trash!');
    tellDesktop(true);
  }

  // A finished run (lost, won, or left for a new one): kept if it's the best.
  function finishRun(out) {
    if (!run || run.recorded) return;
    run.recorded = true;
    const prev = bestRun();
    run.newBest = run.score > 0 && (!prev || run.score > prev.score);
    run.bestLine = run.newBest ? lineOf('bestLines') : '';
    if (run.newBest) K.store.set(STORE_KEY, { best: { score: run.score, floor: run.n, won: !!out, at: Date.now() } });
  }

  // The pet wizard on the desktop tells everyone how it went (and throws
  // himself a party for a new best).
  function tellDesktop(out) {
    if (!K.pet || !K.pet.say) return;
    const key = out ? 'win' : 'lose';
    const lines = linesOf((R.deskLines || {})[key], DESK_LINES[key]);
    const text = pick(lines).replace(/\{floor\}/g, String(run.n));
    const best = run.newBest;
    setTimeout(() => {
      if (best && K.pet.party) {
        K.pet.party();
        if (text) setTimeout(() => K.pet.say(text, 3600), 3800);
      } else if (text) K.pet.say(text, 3600);
    }, 1400);
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE WINDOW
     ══════════════════════════════════════════════════════════════════════
     apps.js opens the window and hands it over here. Closing it keeps the
     run until it opens again. */
  function mount(win) {
    if (view) unmount(view.win);
    const root = document.createElement('div');
    root.className = 'gm nr';
    root.innerHTML = `
      <div class="gm-hud">
        <span class="gm-stat gm-level">Floor <b data-floor>1</b></span>
        <span class="gm-stat nr-hearts" data-hearts></span>
        <span class="gm-stat">Score <b data-score>0</b></span>
        <ul class="gm-owned" aria-label="Your programs" data-owned hidden></ul>
      </div>
      <div class="gm-play">
        <div class="nr-stage" data-stage><div class="nr-board" role="grid" data-board></div></div>
        <p class="gm-toast" aria-hidden="true" data-toast hidden></p>
        <div class="gm-overlay" data-overlay hidden></div>
      </div>
      <div class="nr-dock" role="group" aria-label="Moves" data-dock>
        <button class="nr-act" type="button" data-act="hop" aria-pressed="false">${doodleIcon('up')}<span>Hop</span><b></b><kbd class="hint-mouse">H</kbd></button>
        <button class="nr-act" type="button" data-act="nap">${doodleIcon('clock')}<span>Nap</span><b></b><kbd class="hint-mouse">N</kbd></button>
        <button class="nr-act" type="button" data-act="undo" hidden>${doodleIcon('back')}<span>Ctrl+Z</span><b></b><kbd class="hint-mouse">Z</kbd></button>
        <button class="nr-act" type="button" data-act="saver" hidden>${doodleIcon('laptop')}<span>Screensaver</span><b></b><kbd class="hint-mouse">X</kbd></button>
        <button class="nr-act" type="button" data-act="popper" hidden>${doodleIcon('star')}<span>Party popper</span><b></b><kbd class="hint-mouse">P</kbd></button>
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
      board: q('[data-board]'),
      overlay: q('[data-overlay]'),
      toast: q('[data-toast]'),
      live: q('[data-live]'),
      floorNo: q('[data-floor]'),
      hearts: q('[data-hearts]'),
      score: q('[data-score]'),
      owned: q('[data-owned]'),
      dock: q('[data-dock]'),
      cells: [],
      gEls: new Map(),
      shown: null,   // the floor drawn
      card: false,   // a card is over the board
      help: false,   // ...and it's the help card
      peek: false,   // the run is over and you're looking at the board
      lit: 0,        // the gremlin whose marks are picked out
      stepN: 0,
      timers: new Set(),
    };
    wire(view);
    // Fetch his poses now, so none of them flickers in mid-move.
    ['walk1', 'walk2', 'hop', 'bonk', 'hurt', 'asleep', 'happy', 'party', 'startled'].forEach((k) => {
      const s = frame(k);
      if (s) { const pre = new Image(); pre.src = s; }
    });
    show([{ t: 'floor' }]);
    syncCard(false);
  }

  function unmount(win) {
    if (!view || (win && view.win !== win)) return;
    clearTimeout(view.toastTimer);
    clearTimeout(view.liveTimer);
    clearTimeout(view.poseTimer);
    view.timers.forEach(clearTimeout);
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

  // Before the first run: an empty first floor behind the title card.
  const idleFloor = () => ({
    n: 1, era: ERAS[0].key, tiles: new Array(N).fill(FLOOR), exit: at(0, 3), items: {}, pet: START, facing: 1,
    gs: [], lid: null, hopCd: 0, naps: NAPS, undos: 0, blocks: 0, savers: 0, poppers: 0, turn: 0, idle: true,
  });
  const floorShown = () => (run && run.floor ? run.floor : view.idle || (view.idle = (() => {
    const f = idleFloor();
    f.tiles[f.exit] = EXIT;
    return f;
  })()));

  /* ---------- drawing the floor ---------- */
  // The tiles, then a layer on top for the marks, the things to grab, the
  // gremlins and him (positioned by --x and --y).
  function drawBoard(f) {
    view.shown = f;
    let html = '';
    for (let r = 0; r < ROWS; r++) {
      html += '<div class="nr-row" role="row">';
      for (let c = 0; c < COLS; c++) {
        const i = at(r, c);
        const t = f.tiles[i];
        const cls = t === JUNK ? ' is-junk' : t === EXIT ? ' is-exit' : t === LID ? ' is-lid' : '';
        html += `<div class="nr-cell${cls}" role="gridcell" data-i="${i}" data-t="${(r * 2 + c * 3) % 5}" tabindex="-1"></div>`;
      }
      html += '</div>';
    }
    html += `<div class="nr-layer" aria-hidden="true">
        <div data-marks></div><div data-items></div><div data-sprites>
          ${f.exit >= 0 ? `<span class="nr-exit" style="--x:${colOf(f.exit)};--y:${rowOf(f.exit)}">${doodleIcon('up')}</span>` : ''}
          ${f.lid ? lidHtml(f) : ''}
          <span class="nr-sprite nr-pet"><span class="nr-pet-body">${wizardPic('idle')}</span></span>
        </div>
      </div>`;
    const b = view.board;
    b.classList.add('is-still');
    b.innerHTML = html;
    b.setAttribute('aria-label', f.idle ? 'Not Rubbish board' : f.lid ? 'The lid: 7 by 8 tiles' : `Floor ${f.n}, 7 by 8 tiles`);
    view.cells = Array.prototype.slice.call(b.querySelectorAll('.nr-cell'));
    view.marks = b.querySelector('[data-marks]');
    view.items = b.querySelector('[data-items]');
    view.sprites = b.querySelector('[data-sprites]');
    view.pet = b.querySelector('.nr-pet');
    view.petImg = view.pet.querySelector('img');
    view.lid = b.querySelector('.nr-lid');
    view.gEls = new Map();
    view.stage.className = `nr-stage era-${f.era}`;
    clearTimeout(view.poseTimer);
    // Let the new floor settle before anything glides again.
    requestAnimationFrame(() => requestAnimationFrame(() => { if (view && view.board === b) b.classList.remove('is-still'); }));
  }

  const lidHtml = (f) => `
    <div class="nr-lid yellow">
      <span class="os-shadow"></span>
      <div class="nr-lid-frame">
        <div class="os-bar"><span class="os-app">${doodleIcon('alert')}</span><span class="os-title">Empty Recycle Bin</span></div>
        <p class="nr-lid-msg" data-lid-msg>Permanently delete Pet Wizard?</p>
        <span class="nr-lid-hp" data-lid-hp></span>
        <p class="nr-lid-btns"><span>Delete</span><span>Delete</span></p>
      </div>
    </div>`;

  const place = (el, i) => { el.style.setProperty('--x', colOf(i)); el.style.setProperty('--y', rowOf(i)); };

  // Bring the drawing up to date with the floor. `ev` (what just
  // happened) picks the little animations.
  function show(ev) {
    if (!view) return;
    const f = floorShown();
    if (view.shown !== f) drawBoard(f);
    ev = ev || [];
    syncPet(f, ev);
    syncGremlins(f, ev);
    syncLid(f, ev);
    syncItems(f);
    syncMarks(f);
    syncTargets();
    syncCells(f);
    drawHud();
    drawDock();
    drawStatus();
    flashes(f, ev);
  }

  function syncPet(f, ev) {
    const el = view.pet;
    place(el, f.pet);
    el.classList.toggle('is-left', f.facing < 0);
    let pose = '';
    let ms = 0;
    const was = (t) => ev.some((e) => e.t === t);
    if (was('hit')) { pose = 'hurt'; ms = 520; restart(el, 'is-hit'); }
    else if (was('hop')) { pose = 'hop'; ms = 300; restart(el, 'is-hopping'); }
    else if (was('bonk')) {
      const b = ev.find((e) => e.t === 'bonk');
      el.style.setProperty('--dx', DIRS[b.d][1]);
      el.style.setProperty('--dy', DIRS[b.d][0]);
      pose = 'bonk'; ms = 260; restart(el, 'is-bonking');
    } else if (was('step')) { pose = ++view.stepN % 2 ? 'walk1' : 'walk2'; ms = 180; }
    else if (was('nap')) { pose = 'asleep'; ms = 700; }
    else if (was('popper')) { pose = 'party'; ms = 900; }
    if (was('block')) restart(el, 'is-blocked');
    const stepDone = run && (run.step === 'over' || run.step === 'won' || run.step === 'pick');
    const base = !run || !run.floor ? 'idle'
      : run.step === 'over' ? 'startled' : run.step === 'won' ? 'party' : run.step === 'pick' ? 'happy' : 'idle';
    clearTimeout(view.poseTimer);
    if (pose && !stepDone) {
      setPose(pose);
      view.poseTimer = setTimeout(() => { if (view) setPose(base); }, ms);
    } else if (pose && stepDone) {
      setPose(pose);
      view.poseTimer = setTimeout(() => { if (view) setPose(base); }, Math.max(ms, 380));
    } else setPose(base);
  }
  const setPose = (name) => {
    const s = frame(name);
    if (view.petImg && s && view.petImg.getAttribute('src') !== s) view.petImg.setAttribute('src', s);
  };
  // Restart a one-off animation class.
  const restart = (el, cls) => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  function syncGremlins(f, ev) {
    const seen = new Set();
    const hurtIds = new Set(ev.filter((e) => e.t === 'hurt' || e.t === 'bonk').map((e) => e.id));
    const fresh = new Set(ev.filter((e) => e.t === 'spawn').map((e) => e.id));
    const rolled = new Set(ev.filter((e) => e.t === 'roll').map((e) => e.id));
    f.gs.forEach((g) => {
      if (!alive(g)) return;
      seen.add(g.id);
      let el = view.gEls.get(g.id);
      if (!el) {
        el = document.createElement('span');
        el.className = `nr-sprite nr-g ${g.type}`;
        el.innerHTML = `<span class="nr-g-body">${gremlinFace(g.type)}</span><span class="nr-hp"></span><span class="nr-state"></span>`;
        view.sprites.insertBefore(el, view.pet);
        view.gEls.set(g.id, el);
        place(el, g.i);
        if (fresh.has(g.id)) restart(el, 'is-new');
      }
      place(el, g.i);
      el.classList.toggle('is-dizzy', g.stun > 0);
      el.classList.toggle('is-napping', g.type === 'bunny' && !g.awake && !g.stun);
      el.classList.toggle('is-reloading', g.type === 'webcam' && g.reload > 0 && !g.stun);
      el.classList.toggle('is-angry', !!(g.marks && g.marks.indexOf(f.pet) !== -1));
      if (hurtIds.has(g.id)) restart(el, 'is-bonked');
      if (rolled.has(g.id)) restart(el, 'is-rolling');
      const hp = g.max > 1 ? range(g.max).map((k) => `<i${k < g.hp ? '' : ' class="is-gone"'}></i>`).join('') : '';
      const hpEl = el.querySelector('.nr-hp');
      if (hpEl.innerHTML !== hp) hpEl.innerHTML = hp;
      const state = g.stun > 0 ? doodleIcon('star') : g.type === 'bunny' && !g.awake ? 'z' : g.type === 'webcam' && g.reload > 0 ? doodleIcon('hourglass') : '';
      const stEl = el.querySelector('.nr-state');
      if (stEl.innerHTML !== state) stEl.innerHTML = state;
    });
    // The ones that are gone pop out of sight.
    view.gEls.forEach((el, id) => {
      if (seen.has(id)) return;
      view.gEls.delete(id);
      if (RM) { el.remove(); return; }
      el.classList.add('is-dying');
      setTimeout(() => el.remove(), 320);
    });
  }

  // A gremlin may have a second drawing for while he stands on a tile it's
  // about to strike (the ladybug turns green): both load, CSS shows one.
  const gremlinFace = (type) => {
    const src = drawingOf(type);
    const angry = src && drawingOf(type + 'Angry');
    const img = (s, cls) => `<img${cls ? ` class="${cls}"` : ''} src="${esc(s)}" alt="" draggable="false" decoding="async" />`;
    return src
      ? angry ? img(src, 'nr-calm') + img(angry, 'nr-angry') : img(src)
      : `<span class="nr-token"><span class="nr-eyes"><i></i><i></i></span>${doodleIcon(TYPES[type].icon)}</span>`;
  };

  function syncLid(f, ev) {
    if (!view.lid || !f.lid) return;
    const b = f.lid;
    // A line for each bonk; the last one waits until it gives up.
    const lines = lidLines();
    const last = lines.length - 1;
    const taken = b.max - b.hp;
    const msg = b.hp <= 0 ? lines[last] : taken ? lines[Math.max(0, Math.min(last - 1, taken - 1))] : 'Permanently delete Pet Wizard?';
    const m = view.lid.querySelector('[data-lid-msg]');
    if (m.textContent !== msg) m.textContent = msg;
    view.lid.querySelector('[data-lid-hp]').innerHTML = range(b.max).map((k) => `<i${k < b.hp ? '' : ' class="is-gone"'}></i>`).join('');
    view.lid.classList.toggle('is-angry', !!(b.marks && b.marks.indexOf(f.pet) !== -1));
    view.lid.classList.toggle('is-beaten', b.hp <= 0);
    if (ev.some((e) => e.t === 'lid')) restart(view.lid, 'is-bonked');
    const btns = view.lid.querySelector('.nr-lid-btns');
    const want = b.hp <= 0 ? '<span>Keep him</span>' : '<span>Delete</span><span>Delete</span>';
    if (btns.innerHTML !== want) btns.innerHTML = want;
  }

  function syncItems(f) {
    view.items.innerHTML = Object.keys(f.items).map((k) => {
      const i = Number(k);
      return `<span class="nr-item ${f.items[k]}" style="--x:${colOf(i)};--y:${rowOf(i)}">${doodleIcon(f.items[k] === 'heart' ? 'heart' : 'star')}</span>`;
    }).join('');
  }

  // What's struck after his next move: a map of tile -> how many, by whom.
  function markMap(f) {
    const map = new Map();
    const add = (i, by, kind, dir) => {
      const m = map.get(i) || { n: 0, by: [], kinds: new Set(), dir: '' };
      if (kind !== 'copy') m.n++;
      m.by.push(by);
      m.kinds.add(kind);
      if (dir) m.dir = dir;
      map.set(i, m);
    };
    f.gs.forEach((g) => {
      if (!alive(g)) return;
      if (g.marks) g.marks.forEach((j) => add(j, g.id, g.kind, g.kind === 'roll' ? g.dir : ''));
      if (g.copy >= 0) add(g.copy, g.id, 'copy');
    });
    if (f.lid) {
      if (f.lid.marks) f.lid.marks.forEach((j) => add(j, 'lid', 'delete'));
      if (f.lid.summon) f.lid.summon.forEach((j) => add(j, 'lid', 'copy'));
    }
    return map;
  }
  const ROT = { up: '90deg', right: '180deg', down: '270deg', left: '0deg' };

  function syncMarks(f) {
    const map = markMap(f);
    view.map = map;
    let html = '';
    map.forEach((m, i) => {
      const copy = m.n === 0;
      const lit = view.lit && m.by.indexOf(view.lit) !== -1 ? ' is-lit' : '';
      // The dialog's deletes wear a little cross, so they're told apart
      // from the gremlins' (a bonk on the dialog stops them).
      const del = m.kinds.has('delete') ? ' is-delete' : '';
      const arrow = m.kinds.has('roll') && m.dir ? `<span class="nr-mark-arrow" style="--rot:${ROT[m.dir]}">${doodleIcon('back')}</span>` : '';
      const cross = del ? `<i class="nr-mark-x">${doodleIcon('close')}</i>` : '';
      html += `<span class="nr-mark${copy ? ' is-copy' : ''}${del}${lit}" style="--x:${colOf(i)};--y:${rowOf(i)}">${copy ? doodleIcon('plus') : arrow}${cross}${m.n > 1 ? `<b>${m.n}</b>` : ''}</span>`;
    });
    view.marks.innerHTML = html;
  }

  // Where a tap or click can take him: the tiles beside him and, with his
  // hop ready, the ones two away.
  function syncTargets() {
    if (!view || !view.cells.length) return;
    const f = floorShown();
    const play = inPlay();
    const near = new Set(play ? beside(f.pet).filter((j) => f.tiles[j] !== JUNK) : []);
    const hops = new Set(play && f.hopCd === 0 ? DIR_NAMES.map((d) => hopTarget(f, d)).filter((j) => j >= 0) : []);
    view.cells.forEach((el, i) => {
      el.classList.toggle('is-near', near.has(i));
      el.classList.toggle('is-hop', hops.has(i));
    });
    view.board.classList.toggle('is-armed', armed);
  }

  // Each tile's label for screen readers; keyboard focus sits on his tile.
  function syncCells(f) {
    const map = view.map || new Map();
    view.cells.forEach((el, i) => {
      const bits = [];
      if (i === f.pet && !f.idle) bits.push('the wizard, you');
      const g = gremlinAt(f, i);
      if (g) {
        let s = TYPES[g.type].name;
        if (g.max > 1) s += `, ${plural(g.hp, 'heart')}`;
        if (g.stun > 0) s += ', dizzy';
        else if (g.type === 'bunny' && !g.awake) s += ', napping';
        else if (g.type === 'webcam' && g.reload > 0) s += ', recharging';
        bits.push(s);
      } else if (f.tiles[i] === JUNK) bits.push('junk');
      else if (f.tiles[i] === LID) bits.push('the Empty Recycle Bin dialog');
      if (i === f.exit) bits.push('the Restore arrow, the way up');
      if (f.items[i]) bits.push(f.items[i] === 'heart' ? 'a heart' : 'a star');
      if (!bits.length) bits.push('floor');
      const m = map.get(i);
      if (m && m.n) {
        const del = m.kinds.has('delete') ? ' (the dialog deletes it; a bonk on the dialog stops that)' : '';
        bits.push((m.n > 1 ? `struck by ${m.n} after your move` : 'struck after your move') + del);
      } else if (m) bits.push('a gremlin turns up here next');
      el.setAttribute('aria-label', `${bits.join(', ')}. Row ${rowOf(i) + 1}, column ${colOf(i) + 1}`);
      el.tabIndex = i === f.pet ? 0 : -1;
    });
  }

  // Quick flashes where things were struck.
  function flashes(f, ev) {
    if (RM || !view) return;
    const tiles = new Set();
    ev.forEach((e) => { if (e.t === 'strike' && e.kind !== 'roll') e.tiles.forEach((j) => tiles.add(j)); });
    if (!tiles.size) return;
    const layer = view.marks.parentElement;
    const box = document.createElement('div');
    box.innerHTML = [...tiles].map((j) => `<span class="nr-flash" style="--x:${colOf(j)};--y:${rowOf(j)}"></span>`).join('');
    layer.insertBefore(box, view.items);
    setTimeout(() => box.remove(), 400);
  }

  function drawHud() {
    if (!view) return;
    const f = run && run.floor;
    view.floorNo.textContent = !run ? 1 : run.n > FLOORS ? 'Lid' : run.n;
    const hearts = run ? run.hearts : HEARTS;
    const max = run ? run.max : HEARTS;
    view.hearts.innerHTML = range(max).map((k) => `<span${k < hearts ? ' class="is-full"' : ''}>${doodleIcon('heart')}</span>`).join('') +
      `<span class="vh">${plural(hearts, 'heart')} out of ${max}</span>`;
    view.score.textContent = run ? run.score : 0;
    const chips = run && f ? PROGRAM_IDS.filter((id) => run.have[id] > 0).map(chip).join('') : '';
    if (view.chips !== chips) { view.owned.innerHTML = chips; view.chips = chips; }
    view.owned.hidden = !chips;
  }
  // A program you have, as a little badge: what's left on this floor, or how many.
  const LEFT = { undo: 'undos', firewall: 'blocks', screensaver: 'savers', popper: 'poppers' };
  const chip = (id) => {
    const p = PROGRAMS[id];
    const n = run.have[id];
    const left = LEFT[id] ? run.floor[LEFT[id]] : null;
    const name = words(id).name;
    const label = left != null ? `${name}: ${left} left on this floor` : n > 1 ? `${name} x${n}` : name;
    const count = left != null ? left : n > 1 ? n : '';
    return `<li class="gm-chip ${p.colour}" title="${esc(label)}">${doodleIcon(p.icon)}` +
      `${count !== '' ? `<b aria-hidden="true">${count}</b>` : ''}<span class="vh">${esc(label)}</span></li>`;
  };

  function drawDock() {
    if (!view) return;
    const f = floorShown();
    const play = inPlay();
    if (!play) armed = false;
    const btn = (act) => view.dock.querySelector(`[data-act="${act}"]`);
    const hop = btn('hop');
    hop.querySelector('b').textContent = f.hopCd > 0 ? f.hopCd : 'ready';
    hop.classList.toggle('is-ready', f.hopCd === 0);
    hop.setAttribute('aria-pressed', String(armed));
    hop.setAttribute('aria-label', f.hopCd > 0 ? `Hop, ready in ${plural(f.hopCd, 'turn')}` : 'Hop, ready');
    hop.disabled = !play;
    const nap = btn('nap');
    nap.querySelector('b').textContent = f.naps;
    nap.setAttribute('aria-label', `Nap, ${plural(f.naps, 'nap')} left on this floor`);
    nap.disabled = !play;
    [['undo', 'undo', 'undos'], ['saver', 'screensaver', 'savers'], ['popper', 'popper', 'poppers']].forEach(([act, id, key]) => {
      const b = btn(act);
      const have = !!(run && run.have[id]);
      b.hidden = !have;
      if (!have) return;
      b.querySelector('b').textContent = f[key];
      b.disabled = !play || f[key] < 1 || (act === 'undo' && !run.history.length);
      b.setAttribute('aria-label', `${words(id).name}, ${f[key]} left on this floor`);
    });
  }

  function drawStatus() {
    if (!view) return;
    const f = run && run.floor;
    const where = !f ? 'C:\\Trash' : f.lid ? 'The lid' : `${eraOf(f.n).name} (${eraOf(f.n).when})`;
    const hint = armed ? K.hint('Hop: arrow keys, or click a ringed tile', 'Hop: tap a ringed tile or swipe')
      : K.hint('Arrows to step, Shift+arrow to hop', 'Tap beside him or swipe');
    view.win.setStatus(`<span class="nr-where">${esc(where)}</span>${hint}`);
  }

  /* ---------- the cards over the board (title, programs, the end) ---------- */
  function syncCard(focus) {
    if (!view) return;
    const show = view.help || !run || run.step === 'pick' || ((run.step === 'over' || run.step === 'won') && !view.peek);
    view.card = show;
    view.board.inert = show;
    view.dock.inert = show;
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
    const bestText = best ? `Best run: ${best.score} points, ${best.won ? 'out of the Trash' : `floor ${best.floor > FLOORS ? 'the lid' : best.floor}`}.` : '';
    if (view.help || !run) {
      return `
        <section class="gm-card" aria-labelledby="nr-card-h">
          <span class="gm-card-art">${wizardPic('startled')}</span>
          <h3 class="gm-card-h" id="nr-card-h">Not Rubbish</h3>
          <p>Someone dropped the wizard in the Trash. Help him climb out through Andrew's old designs.</p>
          <ul class="gm-rules">
            <li>Everything moves when he does. Gremlins strike the pink tiles after his move.</li>
            <li>Walk into a gremlin to bonk it. It's shoved back and loses its turn.</li>
            <li>Hop two tiles over anything. Nap to win back a heart.</li>
            <li>Reach the yellow arrow to climb, then install a program.</li>
          </ul>
          <p class="gm-keys"><span class="hint-mouse">Click beside him to step, or a ringed tile to hop. Hover a gremlin to see its marks.
            Keys: arrows, Shift+arrow to hop, N to nap, L to look around.</span><span class="hint-touch">Tap beside him (or swipe) to step, or a ringed tile to hop. Tap a gremlin to learn its moves.</span></p>
          ${bestText ? `<p class="gm-best">${esc(bestText)}</p>` : ''}
          <p class="gm-actions">${run
            ? '<button class="os-button" type="button" data-act="back" data-first>Back to the game</button>'
            : '<button class="os-button gm-go" type="button" data-act="start" data-first>Start a run</button>'}</p>
        </section>`;
    }
    if (run.step === 'pick') {
      const l = run.last;
      const up = run.n + 1;
      const e = eraOf(up);
      const pic = up > FLOORS ? '' : K.imgInfo(e.img) ? `<img src="${esc(K.webSrc(e.img))}" alt="" />` : '';
      const nextText = up > FLOORS
        ? 'Next: the lid, where the Empty Recycle Bin dialog is waiting.'
        : `Next: floor ${up}, ${e.name} (${e.when}).`;
      return `
        <section class="gm-card" aria-labelledby="nr-card-h">
          ${l.line ? `<p class="gm-said">${esc(l.line)}</p>` : ''}
          <span class="gm-card-art">${wizardPic('happy')}</span>
          <p class="gm-kicker">Floor ${l.n} cleared</p>
          <p class="gm-tally">+${POINTS.floor} for the floor. Score: ${run.score}</p>
          <h3 class="gm-card-h" id="nr-card-h">Install a program</h3>
          <div class="gm-ups">${run.offer.map((id, k) => programCard(id, k === 0)).join('')}</div>
          <p class="nr-next">${pic}<span>${esc(nextText)}</span></p>
        </section>`;
    }
    const won = run.step === 'won';
    return `
      <section class="gm-card" aria-labelledby="nr-card-h">
        ${run.line ? `<p class="gm-said">${esc(run.line)}</p>` : ''}
        <span class="gm-card-art">${wizardPic(won ? 'party' : 'startled')}</span>
        ${won ? '<p class="gm-kicker">Out of the Trash</p>' : ''}
        <h3 class="gm-card-h" id="nr-card-h">${won ? 'Not rubbish after all' : 'Run over'}</h3>
        <p class="gm-tally">${won
          ? `All ${FLOORS} floors and the lid, with ${plural(run.hearts, 'heart')} to spare.<br />Score: ${run.score}`
          : `He was knocked out on ${run.n > FLOORS ? 'the lid' : `floor ${run.n}`}.<br />Score: ${run.score}`}</p>
        ${run.newBest
          ? `<p class="gm-best is-new">New best run!${run.bestLine ? ` <span>${esc(run.bestLine)}</span>` : ''}</p>`
          : bestText ? `<p class="gm-best">${esc(bestText)}</p>` : ''}
        <p class="gm-actions">
          <button class="os-button gm-go" type="button" data-act="again" data-first>New run</button>
          ${won ? '' : '<button class="os-button" type="button" data-act="peek">See the board</button>'}
        </p>
      </section>`;
  }

  const programCard = (id, first) => {
    const p = PROGRAMS[id];
    const w = words(id);
    const n = run.have[id];
    return `<button class="gm-up ${p.colour}" type="button" data-up="${id}"${first ? ' data-first' : ''}>
        <span class="gm-up-icon">${doodleIcon(p.icon)}</span>
        <span class="gm-up-name">${esc(w.name)}</span>
        <span class="gm-up-blurb">${esc(w.blurb)}</span>
        ${n ? `<span class="gm-up-have">You have ${n}</span>` : ''}
      </button>`;
  };

  /* ---------- telling you things ---------- */
  // A note over the board, read out by screen readers too (unless `quiet`:
  // the turn's own summary is about to say it). `mid`: across the middle,
  // clear of both him and the dialog on the lid.
  function say(text, ms, quiet, mid) {
    if (!view || !text) return;
    const t = view.toast;
    t.textContent = text;
    t.hidden = false;
    // Along the top, unless he's up there.
    const f = floorShown();
    t.classList.toggle('is-mid', !!mid);
    t.classList.toggle('is-low', !mid && rowOf(f.pet) < 3);
    t.classList.remove('is-in');
    void t.offsetWidth; // restart the pop-in
    t.classList.add('is-in');
    clearTimeout(view.toastTimer);
    view.toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2800);
    if (!quiet) announce(text);
  }
  function announce(text) {
    if (!view || !text) return;
    const live = view.live;
    live.textContent = '';
    clearTimeout(view.liveTimer);
    view.liveTimer = setTimeout(() => { live.textContent = text; }, 40);
  }

  // After each turn, for screen readers: what happened, then what's
  // struck round him next.
  function tell(ev) {
    const f = run.floor;
    const out = [];
    const name = (type) => (type === 'lid' ? 'The dialog' : `The ${TYPES[type] ? TYPES[type].name.toLowerCase() : 'gremlin'}`);
    const waited = run.hearts >= run.max ? 'He waits a turn (full hearts, so no nap needed).' : 'He waits a turn (no naps left on this floor).';
    ev.forEach((e) => {
      if (e.t === 'step') out.push(`Stepped ${e.d}.`);
      else if (e.t === 'hop') out.push(`Hopped ${e.d}.`);
      else if (e.t === 'nap') out.push(e.healed ? 'He napped and won back a heart.' : waited);
      else if (e.t === 'bonk') out.push(e.lid ? 'Bonked the dialog.' : 'Bonk!');
      else if (e.t === 'hurt' && e.dead) out.push(`${name(e.type)} is gone.`);
      else if (e.t === 'item') out.push(`Picked up ${e.what}.`);
      else if (e.t === 'hit') out.push(`${name(e.by)} hit you.`);
      else if (e.t === 'block') out.push('Your firewall blocked a hit.');
      else if (e.t === 'spawn') out.push(`A ${TYPES[e.type].name.toLowerCase()} turned up.`);
    });
    if (ev.some((e) => e.t === 'hit')) out.push(`${plural(run.hearts, 'heart')} left.`);
    // Hits, blocks and naps get a note over the board too (the summary
    // below already says them).
    const hits = ev.filter((e) => e.t === 'hit').length;
    let note = '';
    if (hits) note = hits > 1 ? `Ouch! ${hits} hits. ${plural(run.hearts, 'heart')} left.` : `Ouch! ${plural(run.hearts, 'heart')} left.`;
    else if (ev.some((e) => e.t === 'block')) note = 'Your firewall blocked a hit.';
    else if (ev.some((e) => e.t === 'nap' && e.healed)) note = 'A quick nap: one heart back.';
    else if (ev.some((e) => e.t === 'nap')) note = waited;
    if (note) say(note, 2400, true);
    out.push(dangerText(f));
    announce(out.join(' '));
  }

  function dangerText(f) {
    const map = view ? view.map || markMap(f) : markMap(f);
    const hot = (j) => { const m = map.get(j); return !!(m && m.n); };
    const near = DIR_NAMES.filter((d) => { const j = next(f.pet, d); return j >= 0 && hot(j); });
    const here = hot(f.pet) ? 'Your tile will be struck: move!' : '';
    return [here, near.length ? `Struck next to you: ${near.join(', ')}.` : 'Nothing struck next to you.'].filter(Boolean).join(' ');
  }

  // L: everything on the floor, said aloud.
  function look() {
    if (!run || !run.floor) return;
    const f = run.floor;
    const where = (i) => {
      const dr = rowOf(i) - rowOf(f.pet);
      const dc = colOf(i) - colOf(f.pet);
      const bits = [];
      if (dr) bits.push(`${Math.abs(dr)} ${dr < 0 ? 'up' : 'down'}`);
      if (dc) bits.push(`${Math.abs(dc)} ${dc < 0 ? 'left' : 'right'}`);
      return bits.join(' and ');
    };
    const parts = [`${f.lid ? 'The lid' : `Floor ${f.n}`}, ${plural(run.hearts, 'heart')} left.`];
    f.gs.filter(alive).forEach((g) => {
      const state = g.stun > 0 ? ', dizzy' : g.type === 'bunny' && !g.awake ? ', napping' : g.type === 'webcam' && g.reload ? ', recharging' : '';
      parts.push(`${TYPES[g.type].name} ${where(g.i)}${state}.`);
    });
    if (f.lid) parts.push(`The dialog has ${plural(f.lid.hp, 'bonk')} left in it; it's along the top.`);
    if (f.exit >= 0) parts.push(`The way up is ${where(f.exit)}.`);
    parts.push(f.hopCd ? `Hop ready in ${plural(f.hopCd, 'turn')}.` : 'Hop ready.');
    parts.push(dangerText(f));
    announce(parts.join(' '));
  }

  // A gremlin, explained (and its marks picked out for a moment).
  function inspect(g) {
    const t = TYPES[g.type];
    const state = g.stun > 0 ? ' It is dizzy for a turn.' : g.type === 'bunny' && !g.awake ? ' It is napping.' : g.type === 'webcam' && g.reload ? ' It is recharging.' : '';
    say(`${t.name}: ${t.rule}${state}`, 4200);
    light(g.id);
    later(() => { if (view && view.lit === g.id) light(0); }, 2600);
  }
  function light(id) {
    if (!view || view.lit === id) return;
    view.lit = id;
    if (run && run.floor) syncMarks(run.floor);
  }

  // A bump into a wall: a little shake, no turn.
  function nudge(d) {
    if (!view || RM) return;
    view.pet.style.setProperty('--dx', DIRS[d][1]);
    view.pet.style.setProperty('--dy', DIRS[d][0]);
    restart(view.pet, 'is-nudged');
  }

  /* ---------- mouse, touch and keyboard ----------
     Mouse: click a tile beside him to step (or bonk), a ringed tile to
     hop. Touch: the same taps, or swipe to step. Keyboard: arrows or WASD
     step, Shift+arrow hops, N or Space naps, Z undoes, X and P run the
     Screensaver and the Party popper, L looks around. */
  let swipe = null;
  let swallowUntil = 0;
  let lastPointer = 'mouse';
  const cellOf = (t) => (t && t.closest ? t.closest('.nr-cell') : null);
  const KEY_DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

  function tapTile(i) {
    const f = run.floor;
    const d = lined(f.pet, i) ? dirTo(f.pet, i) : '';
    const far = apart(f.pet, i);
    if (d && far === 2 && f.hopCd === 0 && hopTarget(f, d) === i) { tryHop(d); return; }
    // With the hop ready, a tile beside him picks the direction.
    if (armed) {
      if (d && far === 1) { tryHop(d); return; }
      armed = false;
      drawDock();
      syncTargets();
      drawStatus();
      say('Hop put away.');
      return;
    }
    if (d && far === 1) { tryStep(d); return; }
    const g = gremlinAt(f, i);
    if (g) { inspect(g); return; }
    if (i === f.pet) { say(lastPointer === 'touch' ? 'Tap a tile beside him to step there, or swipe.' : 'Click a tile beside him to step there.'); return; }
    if (f.lid && f.tiles[i] === LID) { say(`The Empty Recycle Bin dialog: it deletes his row, then his column, then calls in gremlins. Bonk it from beside it: a bonk stops what it was about to delete. ${plural(f.lid.hp, 'bonk')} to go.`, 5200); return; }
    say(lastPointer === 'touch' ? 'Tap a tile right beside him, or swipe.' : 'Click a tile right beside him to step there.');
  }

  function wire(v) {
    const { board } = v;
    board.addEventListener('click', (e) => {
      const el = cellOf(e.target);
      if (!el || !inPlay() || performance.now() < swallowUntil) return;
      tapTile(Number(el.dataset.i));
    });
    board.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType || 'mouse';
      if (e.pointerType !== 'touch' || !e.isPrimary) return;
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    board.addEventListener('pointerup', (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28 || !inPlay()) return;
      swallowUntil = performance.now() + 400; // the tap at the end of a swipe isn't a tap
      tryStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    board.addEventListener('pointercancel', () => { swipe = null; });
    // Hover a gremlin to pick out what it marked.
    board.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const el = cellOf(e.target);
      const f = run && run.floor;
      const i = el ? Number(el.dataset.i) : -1;
      const g = f && i >= 0 ? gremlinAt(f, i) : null;
      light(g ? g.id : f && i >= 0 && f.tiles[i] === LID ? 'lid' : 0);
    });
    board.addEventListener('pointerleave', () => light(0));
    board.addEventListener('keydown', onKey);
    const FX = { 'nr-hop': 'is-hopping', 'nr-bonk': 'is-bonking', 'nr-hit': 'is-hit', 'nr-nudge': 'is-nudged', 'nr-bonked': 'is-bonked', 'nr-new': 'is-new', 'nr-spin': 'is-rolling', 'nr-ring': 'is-blocked' };
    board.addEventListener('animationend', (e) => {
      const el = e.target.closest('.nr-sprite, .nr-lid');
      if (el && FX[e.animationName]) el.classList.remove(FX[e.animationName]);
    });
    v.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b || !inPlay()) return;
      const act = b.dataset.act;
      if (act === 'hop') toggleHop();
      else if (act === 'nap') nap();
      else if (act === 'undo') rewind(false);
      else if (act === 'saver') useSaver();
      else if (act === 'popper') usePopper();
      if (e.detail !== 0) focusBoard(); // a click hands the keys back to the board
    });
    v.menu.addEventListener('click', onMenu);
    v.overlay.addEventListener('click', onCard);
  }

  function focusBoard() {
    if (!view || view.card || !view.cells.length) return;
    const f = floorShown();
    const el = view.cells[f.pet];
    if (el) el.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.altKey || e.metaKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.ctrlKey) {
      if (k === 'z') { e.preventDefault(); if (!e.repeat && inPlay()) rewind(false); }
      return;
    }
    const d = KEY_DIRS[k];
    if (d) {
      e.preventDefault();
      if (e.repeat || !inPlay()) return;
      if (e.shiftKey) tryHop(d);
      else tryStep(d);
      focusBoard();
      return;
    }
    const acts = {
      h: toggleHop,
      n: nap,
      ' ': nap,
      z: () => rewind(false),
      x: useSaver,
      p: usePopper,
      l: look,
    };
    if (acts[k]) {
      e.preventDefault();
      if (!e.repeat && (inPlay() || k === 'l')) { acts[k](); focusBoard(); }
      return;
    }
    if (k === 'Escape' && armed) {
      // Puts the hop away (otherwise Escape tucks the window away).
      e.preventDefault();
      armed = false;
      drawDock();
      syncTargets();
      drawStatus();
      say('Hop put away.');
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

  function askNewRun() {
    if (!run || run.step === 'over' || run.step === 'won' || (run.n === 1 && !run.floor.turn)) { newRun(); return; }
    K.dialog({
      title: 'New run',
      icon: 'controller',
      message: `Start a new run? This one ends here, on ${run.n > FLOORS ? 'the lid' : `floor ${run.n}`} with ${plural(run.score, 'point')}.`,
      buttons: ['Keep playing', 'New run'],
    }).then((v) => { if (v === '1') newRun(); });
  }

  function onCard(e) {
    const btn = e.target.closest('button');
    if (!btn || !view) return;
    if (btn.dataset.up) { choose(btn.dataset.up); return; }
    const what = btn.dataset.act;
    if (what === 'start' || what === 'again') newRun();
    else if (what === 'back') {
      view.help = false;
      syncCard(true);
      focusBoard();
    } else if (what === 'peek') {
      view.peek = true;
      syncCard(false);
      focusBoard();
      say('This is where it ended. Press New run to try again.', 3600);
    }
  }

  K.rubbish = { mount, unmount };
})();

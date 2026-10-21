/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - STAR DROP  (a game in the Games window)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. What the wizard says, the words on
   the star and charm cards and the nightmares' drawings live in content.js
   under "stardrop"; the wizard wears his own drawings (wizard.frames),
   stand-ins and all. apps.js fetches this file the first time the game
   opens.

   The pet wizard is asleep, and his nightmares are creeping along a lane
   towards his bed. In his dream he flicks the star off his hat down
   through a sky of pegs: every peg it touches pops and adds damage (a
   pink, coral or white one counts as several), a yellow peg doubles the
   shot and the green one lights every peg again. Once in a blue moon a
   moon rises, and the shot that pops it counts ten times over. The
   damage lands on the nightmare in the ring (pick another to change
   that), then every nightmare steps closer. One that reaches the bed
   costs hearts. Nothing moves while you aim, and a shot can be skipped
   to its end. A run is a week of nights, Monday to Sunday (the
   Bogeyman's), with a new star or a charm to pick each morning; endless
   runs carry on into harder weeks until his hearts run out. Lose every
   heart and the run is over. Each visitor's best is kept, one for each.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  if (!K || K.stardrop) return;
  const C = K.C || {};
  const { esc, doodleIcon, plural } = K;
  const S = C.stardrop || {};
  const RM = K.REDUCE_MOTION;

  /* ---------- the rules, in numbers ---------- */
  const STORE_KEY = 'kasai:stardrop'; // { best: { score, night, won, at }, endless: { score, night, at }, won: { at, times } }
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const NIGHTS = DAYS.length; // a week; Sunday night is the Bogeyman's
  const LANE = 7;             // squares between the dark and his bed
  const HEARTS = 5;           // at the start of a run
  const MOST_HEARTS = 8;      // Hot cocoa stops offering itself here
  const SWAPS = 1;            // star swaps each night (Fluffy slippers add more)
  const MOST_POLISH = 2;      // times a kind of star can be polished (one more damage a peg each time)
  const REFILL = 0.3;         // every peg comes back once fewer than this share are left
  const CLOUD_STOP = 3;       // storm clouds come no closer than four squares from the bed
  const CLOUD_EVERY = 3;      // turns between a storm cloud's lightning strikes
  const CATCH = 5;            // the Dreamcatcher's damage to every nightmare (it toughens up night by night, as they do)
  const CALLED_HP = 36;       // a shadow the Bogeyman calls up
  const PUSH = 2;             // squares the Pillow star knocks a nightmare back
  const ALARM = 2;            // ...and the Alarm clock pushes them all back
  const SHEEP = 4;            // Counting sheep: a nightmare nods off every this many turns
  const MOON = 10;            // the blue moon multiplies the shot by this...
  const MOON_ODDS = 100;      // ...and rises before about one shot in this many
  const SPOTTED = 3;          // ...or this many times as often with the Telescope
  const GROW = 1.1;           // endless: nightmares get this much tougher every night after the first week
  const POINTS = { peg: 1, moon: 100, nightmare: 10, bogeyman: 200, night: 100, win: 300, heart: 50 };

  /* ---------- the pegs ----------
     Most are plain (lavender, worth one peg each). Before every shot a
     few light up as something else, each in its own colour and shape, so
     colour is never the only clue. n: how many light up. worth: how many
     pegs it counts as. times: what it multiplies the whole shot by. The
     blue moon is rare: it rises now and then and stays up until it's
     popped (or the night's over). */
  const KINDS = {
    crit:    { n: 2, times: 2, said: 'a yellow peg' },  // Lucky socks add more; the Bedtime story makes it 3
    refresh: { n: 1, said: 'the green peg' },           // every peg comes back after the shot
    pink:    { n: 3, worth: 2, said: 'a pink peg' },
    coral:   { n: 2, worth: 3, said: 'a coral peg' },
    white:   { n: 1, worth: 5, said: 'a white peg' },
    moon:    { times: MOON, said: 'the blue moon' },
  };

  /* ---------- the stars (one comes out of the bag for every shot) ----------
     dmg: damage for each peg it pops. r: its size, in the sky's units.
     Picking a kind you already have polishes it instead: one more damage
     a peg for every one of them. */
  const STARS = {
    plain: { colour: 'yellow', name: 'Plain star', blurb: 'One damage for every peg it pops.', dmg: 1, r: 1.7 },
    split: { colour: 'teal', name: 'Split star', blurb: 'Splits in two on the first peg it touches.', dmg: 1, r: 1.7, split: true },
    heavy: { colour: 'coral', name: 'Heavy star', blurb: 'Crashes straight through pegs for 2 damage each, so its whole path shows as you aim.', dmg: 2, r: 2, heavy: true },
    bouncy: { colour: 'pink', name: 'Bouncy star', blurb: 'Extra bouncy, and it bounces back up off the bottom once.', dmg: 1, r: 1.7, give: 0.8, floor: 1 },
    lullaby: { colour: 'lavender', name: 'Lullaby star', blurb: 'Every nightmare it hits nods off and loses its next turn.', dmg: 1, r: 1.7, lull: true },
    starfall: { colour: 'blue', name: 'Starfall', blurb: 'Every nightmare takes the hit, at half damage.', dmg: 1, r: 1.7, all: true },
    big: { colour: 'yellow', name: 'Big star', blurb: 'Half as big again, so it pops more pegs.', dmg: 1, r: 2.6 },
    // straight: no falling until its first peg. burst: how far round its
    // first peg the firework pops. grow/most: the snowball's growth with
    // each peg, and its biggest. push: squares a hit knocks a nightmare back.
    north: { colour: 'grey', name: 'North star', blurb: 'Flies dead straight until it touches a peg, then falls like the rest.', dmg: 1, r: 2.2, straight: true },
    firework: { colour: 'coral', name: 'Firework', blurb: 'Bursts on the first peg it touches and pops every peg round it. The aiming line shows which.', dmg: 1, r: 1.7, burst: 15 },
    snowball: { colour: 'blue', name: 'Snowball star', blurb: 'Starts small and grows with every peg it pops.', dmg: 1, r: 1.4, grow: 0.3, most: 3.6 },
    pillow: { colour: 'lavender', name: 'Pillow star', blurb: `Knocks every nightmare it hits back ${PUSH} squares, if there's room. The Bogeyman is too heavy to budge.`, dmg: 1, r: 1.7, push: PUSH },
  };
  const STAR_IDS = Object.keys(STARS);

  /* ---------- charms (pick one instead of a star; they stack) ---------- */
  const CHARMS = {
    nightlight: { colour: 'yellow', icon: 'bulb', name: 'Night light', blurb: 'Your aiming line shows the second bounce too.', most: 1 },
    teddy: { colour: 'coral', icon: 'teddy', name: 'Teddy bear', blurb: 'Guards the bed: the first nightmare or lightning to reach it each night does no harm.', most: 2 },
    cocoa: { colour: 'pink', icon: 'cup', name: 'Hot cocoa', blurb: 'One more heart, and all your hearts back.' },
    socks: { colour: 'teal', icon: 'sock', name: 'Lucky socks', blurb: 'One more yellow peg in the sky.', most: 2 },
    dreamcatcher: { colour: 'lavender', icon: 'web', name: 'Dreamcatcher', blurb: 'The green peg also hits every nightmare, harder as the nights get tougher.', most: 2 },
    stardust: { colour: 'ink', icon: 'star', name: 'Stardust', blurb: 'Every star does one more damage for each peg it pops.', most: 2 },
    story: { colour: 'blue', icon: 'book', name: 'Bedtime story', blurb: 'A yellow peg triples the shot instead of doubling it.', most: 1 },
    alarm: { colour: 'grey', icon: 'alarm', name: 'Alarm clock', blurb: `Once a night, ring it to push every nightmare but the Bogeyman back ${ALARM} squares. It costs no shot.`, most: 2 },
    jar: { colour: 'yellow', icon: 'jar', name: 'Star jar', blurb: 'Pink, coral and white pegs each count as one more peg.', most: 2 },
    telescope: { colour: 'blue', icon: 'telescope', name: 'Telescope', blurb: `Spots the blue moon ${SPOTTED} times as often.`, most: 1 },
    slippers: { colour: 'pink', icon: 'slipper', name: 'Fluffy slippers', blurb: 'One more star swap each night.', most: 2 },
    sheep: { colour: 'grey', icon: 'sheep', name: 'Counting sheep', blurb: 'Every fourth turn, the nightmare nearest the bed nods off and misses it.', most: 1 }, // fourth: SHEEP
  };
  const CHARM_IDS = Object.keys(CHARMS);
  // The names and blurbs can be reworded in content.js.
  const words = (id) => {
    const star = !!STARS[id];
    const mine = ((star ? S.stars : S.charms) || {})[id] || {};
    const base = star ? STARS[id] : CHARMS[id];
    const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
    return { name: text(mine.name, base.name), blurb: text(mine.blurb, base.blurb) };
  };

  /* ---------- the nightmares ----------
     Each steps along the lane after every shot, in its own pattern (the
     little badge on it says what it does next). Two can't share a square,
     so a slow one holds up the ones behind it. hp is a Monday night's;
     they toughen up night by night. */
  const TYPES = {
    shadow: { name: 'Shadow', hp: 16, hearts: 1, icon: 'ghost', rule: 'Creeps one square closer every turn.' },
    spider: { name: 'Spider', hp: 10, hearts: 1, icon: 'spider', rule: 'Scuttles two squares every turn.' },
    raggedy: { name: 'Raggedy teddy', hp: 40, hearts: 2, icon: 'teddy', rule: 'Big and slow: it rests, then steps, turn about. It costs two hearts if it reaches the bed.' },
    cloud: { name: 'Storm cloud', hp: 20, hearts: 1, icon: 'cloud', rule: 'Drifts in to four squares from the bed, and strikes the bed with lightning every third turn.' },
    bogeyman: { name: 'The Bogeyman', hp: 440, hearts: 0, icon: 'eye', rule: 'Takes a step every third turn and calls up a shadow every other turn, and his shadows slip past him. If he reaches the bed, the run is over.' },
    // Endless only, from the second week.
    bat: { name: 'Bat', hp: 12, hearts: 1, icon: 'bat', rule: 'Flutters one square closer every turn, and flies straight over anything in its way.' },
    jack: { name: 'Jack-in-the-box', hp: 30, hearts: 1, icon: 'jack', rule: 'Winds up for two turns, then springs three squares.' },
  };
  // Who comes each night, in order, and the earliest turn each can creep
  // in (one at a time, onto the far square once it's free).
  const PLAN = [
    [['shadow', 0], ['spider', 2], ['shadow', 3]],
    [['shadow', 0], ['spider', 1], ['shadow', 2], ['raggedy', 3]],
    [['spider', 0], ['cloud', 1], ['shadow', 2], ['spider', 3], ['shadow', 4]],
    [['spider', 0], ['cloud', 1], ['shadow', 2], ['raggedy', 3], ['spider', 4], ['shadow', 5]],
    [['cloud', 0], ['raggedy', 1], ['shadow', 2], ['spider', 3], ['spider', 4], ['shadow', 5], ['raggedy', 6]],
    [['raggedy', 0], ['cloud', 1], ['spider', 2], ['shadow', 3], ['spider', 4], ['raggedy', 5], ['cloud', 6]],
    [['bogeyman', 0], ['cloud', 5]],
  ];
  const TOUGHER = [1.25, 1.6, 2.05, 2.5, 2.9, 3, 3.1]; // their hit points, night by night (not the Bogeyman's)

  // Endless: after the first week each night is that weekday's nightmares
  // again, plus a newcomer for every week gone (up to three), in a fresh
  // order. Sunday is the Bogeyman's every week. Everything, him included,
  // gets a little tougher every night.
  const NEWCOMERS = ['bat', 'jack'];
  const weekOf = (n) => Math.ceil(n / NIGHTS);
  const extrasOn = (n) => (n > NIGHTS && n % NIGHTS ? Math.min(3, weekOf(n) - 1) : 0);
  const tougher = (n) => (n <= NIGHTS ? 1 : Math.pow(GROW, n - NIGHTS));
  // How much tougher than a Monday's the nightmares are on night n (the
  // Bogeyman only gets tougher in endless weeks).
  const toughness = (n) => TOUGHER[Math.min(n, NIGHTS) - 1] * tougher(n);
  const hpOn = (n, type) => Math.round(TYPES[type].hp * (type === 'bogeyman' ? tougher(n) : toughness(n)));
  const catchOn = (n) => Math.round(CATCH * toughness(n)); // what the Dreamcatcher hits every nightmare for
  const comingOn = (n) => PLAN[(n - 1) % NIGHTS].length + extrasOn(n);
  function planFor(n) {
    const plan = PLAN[(n - 1) % NIGHTS];
    if (n <= NIGHTS || n % NIGHTS === 0) return plan;
    const types = plan.map(([type]) => type);
    for (let k = 0; k < extrasOn(n); k++) types.push(NEWCOMERS[(n + k) % NEWCOMERS.length]);
    return shuffle(types).map((type, k) => [type, k]);
  }

  /* ---------- the game's own doodles (they join the shared set) ---------- */
  const ICONS = {
    ghost: '<path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8z"/><path d="M9.6 11h.01M14.4 11h.01"/>',
    spider: '<circle cx="12" cy="14" r="3.6"/><circle cx="12" cy="8.4" r="2"/><path d="M8.6 12.4 4.5 9.8 3 6.5M8.4 14.3H3.5M8.7 16.2l-4.2 2.4-1.5 3M15.4 12.4l4.1-2.6L21 6.5M15.6 14.3h4.9M15.3 16.2l4.2 2.4 1.5 3"/>',
    door: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M12 3v18M10 12.5h.01M14 12.5h.01"/>',
    cloud: '<path d="M7.2 18.5h9.6a4 4 0 0 0 .5-8 5.6 5.6 0 0 0-10.8 1.4 3.3 3.3 0 0 0 .7 6.6z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    bolt: '<path d="M13.5 2.5 5.5 13.5H12l-1.5 8 8-11H12z"/>',
    bulb: '<path d="M9.5 17.5h5M10.3 20.5h3.4"/><path d="M8.6 14.6a6 6 0 1 1 6.8 0c-.6.5-.9 1.2-.9 2v.9h-5v-.9c0-.8-.3-1.5-.9-2z"/>',
    teddy: '<circle cx="12" cy="13.5" r="6.2"/><circle cx="6.6" cy="7" r="2.3"/><circle cx="17.4" cy="7" r="2.3"/><path d="M9.8 12.6h.01M14.2 12.6h.01M10.6 16c.8.6 2 .6 2.8 0"/>',
    cup: '<path d="M5 9.5h11V14a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h1.4a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3.5c-.8 1 .8 2 0 3.2M12.5 3.5c-.8 1 .8 2 0 3.2"/>',
    sock: '<path d="M9 3h6.5v8.6l3.4 3.4a2.9 2.9 0 0 1-4.1 4.1l-5-5A3 3 0 0 1 9 12z"/><path d="M9 6.5h6.5"/>',
    web: '<circle cx="12" cy="9" r="6"/><path d="M12 3v12M6.8 6l10.4 6M17.2 6 6.8 12"/><path d="M8.6 14 7.4 21M15.4 14l1.2 7"/>',
    alarm: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.4 1.6M4.5 6.6 7.2 4M19.5 6.6 16.8 4M7.4 19l-1.6 2M16.6 19l1.6 2"/>',
    swap: '<path d="M5 8h13M14.5 4.5 18 8l-3.5 3.5M19 16H6M9.5 12.5 6 16l3.5 3.5"/>',
    skip: '<path d="M4.5 6.5 11 12l-6.5 5.5zM12.5 6.5 19 12l-6.5 5.5z"/>',
    jar: '<rect x="7.5" y="3" width="9" height="3.2" rx="1"/><path d="M8.5 6.2v1.6A3.5 3.5 0 0 0 6 11.2V18a2.5 2.5 0 0 0 2.5 2.5h7A2.5 2.5 0 0 0 18 18v-6.8a3.5 3.5 0 0 0-2.5-3.4V6.2"/><path d="M12 11.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z"/>',
    telescope: '<path d="M3.5 13.6 14.6 7.5l2.1 3.9-11.1 6.1z"/><path d="M14.6 7.5 18 5.6l2.6 4.8-3.9 1"/><path d="M10.4 14.4 7.4 21M11 14.2l3.4 6.8"/>',
    slipper: '<path d="M3.5 17.2c0-2 1.6-3.6 3.6-3.6h2.6c1.4 0 2.7-.6 3.7-1.5l1.7-1.6a3.4 3.4 0 0 1 5.4 1.1c.3.6.5 1.3.5 2v3.6c0 1.2-1 2.2-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z"/><path d="M12.6 12.4c1.2 1.4 3 2.2 4.8 2"/>',
    sheep: '<path d="M8.2 17.2a3 3 0 0 1-1.6-5.5 3 3 0 0 1 4.6-3.4 3 3 0 0 1 5 .7 2.9 2.9 0 0 1 1 5.4 2.9 2.9 0 0 1-2.8 2.8z"/><path d="M17.4 10.2l1.7-.5a1.6 1.6 0 0 1 .9 3.1l-1.8.4M9.2 17.2v3.2M14 17.2v3.2"/>',
    bat: '<path d="M12 9c-1.1 0-1.9.9-2 2-1.6-1.4-3.7-2.1-6.3-1.8 1.1 1.3 1.4 2.8 1.1 4.4 1.3-.6 2.6-.5 3.7.4.3-1 1.3-1.6 2.3-1.2.2 1 .6 1.8 1.2 2.3.6-.5 1-1.3 1.2-2.3 1-.4 2 .2 2.3 1.2 1.1-.9 2.4-1 3.7-.4-.3-1.6 0-3.1 1.1-4.4-2.6-.3-4.7.4-6.3 1.8-.1-1.1-.9-2-2-2z"/><path d="M10.9 9.3 10.4 7M13.1 9.3l.5-2.3"/>',
    jack: '<rect x="5" y="13.5" width="14" height="7.5" rx="1.5"/><path d="M12 13.5 9.8 12.4l4.4-1.3-4.4-1.3L12 8.7"/><circle cx="12" cy="5.8" r="2.3"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!K.DOODLE_ICONS[k]) K.DOODLE_ICONS[k] = ICONS[k]; });

  /* ---------- the wizard and the nightmares' drawings ----------
     He wears the pet wizard's drawings (pet.js lends a stand-in for any
     not drawn yet). A nightmare without a drawing in content.js gets a
     stand-in: a coloured blob with eyes and its doodle. */
  const frame = (name) => (K.pet && K.pet.frame ? K.pet.frame(name) : '');
  const wizardPic = (name, cls) => {
    const src = frame(name);
    return src
      ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}" alt="" draggable="false" decoding="async" />`
      : doodleIcon('hat', cls);
  };
  const drawingOf = (type) => {
    const p = (S.nightmares || {})[type];
    return typeof p === 'string' && p.trim() ? K.webSrc(p.trim()) : '';
  };

  /* ---------- what's said (content.js, under "stardrop") ---------- */
  const DEFAULT_LINES = {
    nightLines: ['phew. what a night.', 'five more minutes...', 'one night down.'],
    loseLines: ['AAAH! ...oh. it was only a dream.', 'i am sleeping with the light on.'],
    winLines: ['a whole week of sweet dreams!', 'the Bogeyman? never heard of him.'],
    weekLines: ['another whole week!', 'Monday again already?'],
    moonLines: ['once in a blue moon!', 'a blue moon! make a wish!'],
    bestLines: ['a new best! sweet dreams indeed.'],
  };
  const DESK_LINES = {
    lose: ['i made it to {night} night in Star Drop!'],
    win: ['i slept through a whole week of nightmares!'],
    endless: ['i made it to night {night} of endless Star Drop!'],
  };
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
  const lineOf = (key) => pick(linesOf(S[key], DEFAULT_LINES[key]));

  /* ---------- the best runs (kept per visitor: one for the week, one endless) ---------- */
  const SLOTS = { week: 'best', endless: 'endless' };
  const bestRun = (mode) => {
    const b = (K.store.get(STORE_KEY, null) || {})[SLOTS[mode] || 'best'];
    return b && Number.isFinite(b.score) && b.score > 0 ? b : null;
  };

  /* ══════════════════════════════════════════════════════════════════════
     THE SKY  (the pegs, in its own units: 100 across and 100 down)
     ══════════════════════════════════════════════════════════════════════
     The star leaves his hat at the top and falls through the pegs; every
     peg it touches pops. A shot is worked out in full the moment it's
     dropped (the same aim on the same sky always does the same thing),
     then drawn a little faster than life. */
  const W = 100;
  const H = 100;
  const HAT = { x: 50, y: 4.3 }; // where every shot starts (as the sums see it)
  // He stands on the sky's top edge, in TOP units of room above it, WIZ
  // across, his feet at WIZ_FEET. His hat's star (its centre and outer
  // radius, from his drawing) is the size a star is drawn at: a star waits
  // there, then leaves for HAT in the first LEAVE seconds of a shot.
  const TOP = 16;
  const WIZ = 30;
  const WIZ_FEET = 13;
  const WIZ_Y = WIZ_FEET - WIZ * (1172 / 1254);
  const HAT_STAR = { y: WIZ_Y + WIZ * (367 / 1254), r: WIZ * (89.5 / 1254) };
  const LEAVE = 0.15;
  const STAR_TIP = 1.3;  // a star's points reach this many times its size (drawn a little bigger than it is)
  const PEG_R = 1.5;
  const MOON_R = 2.4;    // the blue moon is bigger than a peg (and easier to hit)
  const BURST_LAG = 0.005; // seconds a firework's burst takes to reach each unit further out
  const GRAVITY = 95;
  const LAUNCH = 58;     // how fast he flicks it
  const BOUNCE = 0.62;   // the share of its speed a peg gives back
  const WALL = 0.85;     // ...and the sides and the top
  const DT = 1 / 240;    // one step of the sums, in seconds
  const SAMPLE = 4;      // steps between the points kept for drawing it
  const LONGEST = 14;    // seconds: no shot runs longer
  const AIM_MOST = 80;   // degrees either side of straight down
  const SPLIT = 0.35;    // radians between a split star's halves and its path
  const STUB = 40;       // steps of the aiming line past the bounce it shows
  const PLAY = 1.9;      // shots play this many times faster than life

  // The skies: each night picks one (never the last night's). Every one is
  // the same on both sides, so neither side is luckier.
  const SKIES = {
    rows() {
      const out = [];
      for (let i = 0; i < 9; i++) {
        for (let x = i % 2 ? 14 : 8; x < 93; x += 12) out.push({ x, y: 21 + i * 8.6 });
      }
      return out;
    },
    scatter() {
      const out = [];
      const clear = (p) => out.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 8.4);
      for (let tries = 0; tries < 3000 && out.length < 62; tries++) {
        const y = 21 + Math.random() * 70;
        let x = 6 + Math.random() * 44;
        if (x > 45.6) x = 50;
        const pair = x === 50 ? [{ x, y }] : [{ x, y }, { x: W - x, y }];
        if (pair.every(clear)) out.push(...pair);
      }
      return out;
    },
    rings() {
      const out = [[50, 21], [9, 21], [91, 21], [9, 50], [91, 50], [9, 84], [91, 84]].map(([x, y]) => ({ x, y }));
      [[27, 33], [73, 33], [50, 50], [27, 67], [73, 67], [50, 84]].forEach(([cx, cy]) => {
        out.push({ x: cx, y: cy });
        for (let k = 0; k < 8; k++) {
          const a = ((k + 0.5) * Math.PI) / 4;
          out.push({ x: cx + Math.cos(a) * 8.5, y: cy + Math.sin(a) * 8.5 });
        }
      });
      return out;
    },
    clusters() {
      const out = [[8, 48], [92, 48], [50, 48], [8, 84], [92, 84], [35, 30], [65, 30], [20, 48], [80, 48], [35, 66], [65, 66], [20, 84], [80, 84], [50, 84]]
        .map(([x, y]) => ({ x, y }));
      [[20, 30], [50, 30], [80, 30], [35, 48], [65, 48], [20, 66], [50, 66], [80, 66], [35, 84], [65, 84]].forEach(([x, y]) => {
        out.push({ x, y }, { x: x - 5, y }, { x: x + 5, y }, { x, y: y - 5 }, { x, y: y + 5 });
      });
      return out;
    },
    waves() {
      const out = [];
      for (let i = 0; i < 8; i++) {
        for (let x = i % 2 ? 15 : 10; x < 91; x += 10) {
          out.push({ x, y: 23 + i * 9.4 + Math.cos(((x - 50) / 50) * Math.PI * 2) * 3 });
        }
      }
      return out;
    },
    funnel() {
      const out = [];
      for (let i = 0; i < 9; i++) {
        const inset = 6 + i * 3.2; // each row a little narrower than the one above
        const n = Math.max(2, Math.round((W - 2 * inset) / 11));
        for (let k = 0; k <= n; k++) out.push({ x: inset + ((W - 2 * inset) * k) / n, y: 21 + i * 8.6 });
      }
      return out;
    },
  };
  const SKY_NAMES = Object.keys(SKIES);

  // One step of a falling star: gravity (not for the North star until its
  // first peg), then the sides and the top. b.r is its size right now.
  function move(b) {
    const r = b.r;
    if (!b.straight) b.vy += GRAVITY * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * WALL; }
    else if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx) * WALL; }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * WALL; }
  }
  // The bouncy star's one bounce off the bottom.
  function floorBounce(b) {
    if (!b.floor || b.y <= H - b.r || b.vy <= 0) return false;
    b.floor--;
    b.y = H - b.r;
    b.vy = -b.vy * 0.95;
    return true;
  }
  const pegR = (f, i) => (i === f.moon ? MOON_R : PEG_R);
  // The first lit peg it's touching (-1 for none).
  function touching(f, live, b) {
    for (let i = 0; i < live.length; i++) {
      if (!live[i]) continue;
      const p = f.pegs[i];
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const reach = b.r + pegR(f, i);
      if (dx * dx + dy * dy < reach * reach) return i;
    }
    return -1;
  }
  // Off a peg: it comes away along the line between them, a little slower.
  function bounce(b, p, give, pr) {
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + give) * vn * nx;
      b.vy -= (1 + give) * vn * ny;
    }
    b.x = p.x + nx * (b.r + pr);
    b.y = p.y + ny * (b.r + pr);
  }
  // A firework's burst: every other lit peg round peg i, nearest first.
  function burstRound(f, live, i, reach) {
    const c = f.pegs[i];
    const out = [];
    for (let j = 0; j < live.length; j++) {
      if (!live[j] || j === i) continue;
      const d = Math.hypot(f.pegs[j].x - c.x, f.pegs[j].y - c.y);
      if (d <= reach) out.push({ j, d });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  // A split star's two halves leave the peg either side of the bounce.
  function halve(b, extra) {
    const twin = Object.assign({}, b, extra);
    const turn = (s, a) => {
      const c = Math.cos(a);
      const n = Math.sin(a);
      const vx = s.vx;
      s.vx = vx * c - s.vy * n;
      s.vy = vx * n + s.vy * c;
    };
    turn(b, -SPLIT);
    turn(twin, SPLIT);
    return twin;
  }
  const flick = (angle, st) => {
    const a = (angle * Math.PI) / 180;
    return { x: HAT.x, y: HAT.y, vx: Math.sin(a) * LAUNCH, vy: Math.cos(a) * LAUNCH, floor: st.floor || 0, r: st.r, straight: !!st.straight };
  };
  // What a peg does to a star that touches it, before the star moves on:
  // the North star starts falling, and the snowball grows.
  const touched = (b, st) => {
    b.straight = false;
    if (st.grow) b.r = Math.min(st.most, b.r + st.grow);
  };

  // A whole shot: every star's path (points of [time, x, y], to draw it
  // by), its size as it grows ([time, size], the snowball's), the pegs it
  // pops and when, the firework's burst, and when it's all over.
  function fly(f, angle, id) {
    const st = STARS[id];
    const live = f.live.slice();
    const first = Object.assign(flick(angle, st), { from: 0, until: 0, pts: [0, HAT.x, HAT.y], sizes: [] });
    const balls = [first];
    const pops = [];
    const floors = [];
    let burst = null;
    let split = !!st.split;
    let n = 0;
    while (n * DT < LONGEST && balls.some((b) => !b.until)) {
      n++;
      const t = n * DT;
      for (let k = 0; k < balls.length; k++) {
        const b = balls[k];
        if (b.until) continue;
        move(b);
        if (floorBounce(b)) floors.push({ t, x: b.x });
        if (b.y > H + b.r) { b.until = t; b.pts.push(t, b.x, b.y); continue; }
        // The heavy star pops everything in its way; the others bounce.
        for (let i = touching(f, live, b); i >= 0; i = st.heavy ? touching(f, live, b) : -1) {
          live[i] = false;
          pops.push({ t, i });
          // The firework bursts on its first peg, and that's the end of it.
          if (st.burst) {
            const p = f.pegs[i];
            burst = { t, x: p.x, y: p.y, r: st.burst };
            burstRound(f, live, i, st.burst).forEach(({ j, d }) => { live[j] = false; pops.push({ t: t + d * BURST_LAG, i: j }); });
            b.until = t;
            b.pts.push(t, b.x, b.y);
            break;
          }
          touched(b, st);
          if (st.grow) b.sizes.push(t, b.r);
          if (st.heavy) continue;
          bounce(b, f.pegs[i], st.give || BOUNCE, pegR(f, i));
          if (split) {
            split = false;
            balls.push(halve(b, { from: t, until: 0, pts: [t, b.x, b.y], sizes: [] }));
          }
        }
      }
      if (n % SAMPLE === 0) balls.forEach((b) => { if (!b.until) b.pts.push(t, b.x, b.y); });
    }
    const end = Math.max(n * DT, pops.length ? pops[pops.length - 1].t : 0);
    balls.forEach((b) => { if (!b.until) { b.until = n * DT; b.pts.push(n * DT, b.x, b.y); } });
    return { star: id, angle, balls, pops, floors, burst, end };
  }

  // The aiming line: from his hat to the first peg it would touch (the
  // second with the Night light), then a little way along the bounce. The
  // heavy star never bounces, so its line runs all the way down; the
  // firework's stops where it bursts, with a ring round every peg it pops.
  function aimLine(f, angle, id) {
    const st = STARS[id];
    const live = f.live.slice();
    const sees = st.heavy ? Infinity : 1 + (run && run.have.nightlight ? 1 : 0);
    const out = { lines: [], touched: [], marks: [], ring: null };
    let split = !!st.split;
    const trace = (b, seen) => {
      const pts = [b.x, b.y];
      let stub = -1; // steps left once it has seen enough
      for (let n = 1; n * DT < LONGEST; n++) {
        move(b);
        floorBounce(b);
        if (n % 2 === 0) pts.push(b.x, b.y);
        if (b.y > H + b.r || (stub >= 0 && --stub < 0)) break;
        const i = touching(f, live, b);
        if (i < 0) continue;
        if (stub >= 0) break; // the stub stops short of the next peg
        live[i] = false;
        out.touched.push(i);
        if (st.burst) {
          const p = f.pegs[i];
          out.marks.push([b.x, b.y, b.r]);
          out.ring = { x: p.x, y: p.y, r: st.burst };
          burstRound(f, live, i, st.burst).forEach(({ j }) => { live[j] = false; out.touched.push(j); });
          pts.push(b.x, b.y);
          break;
        }
        const r = b.r;
        touched(b, st);
        if (st.heavy) continue;
        out.marks.push([b.x, b.y, r]);
        bounce(b, f.pegs[i], st.give || BOUNCE, pegR(f, i));
        pts.push(b.x, b.y);
        seen++;
        if (split) {
          split = false;
          const twin = halve(b, {});
          if (seen < sees) trace(twin, seen);
          else { const tp = [twin.x, twin.y]; stubOf(twin, tp); out.lines.push(tp); }
        }
        if (seen >= sees) stub = STUB;
      }
      out.lines.push(pts);
    };
    // Just the short stub, for the second half of a split star.
    const stubOf = (b, pts) => {
      for (let n = 1; n <= STUB; n++) {
        move(b);
        if (n % 2 === 0) pts.push(b.x, b.y);
        if (touching(f, live, b) >= 0) break;
      }
    };
    trace(flick(angle, st), 0);
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE NIGHT
     ══════════════════════════════════════════════════════════════════════
     The lane's squares are numbered from the bed: 0 is right beside it,
     LANE - 1 is the far end, where nightmares creep in. One standing on
     square n is n + 1 steps from the bed. */
  let run = null;   // the run being played (it waits while the window is shut)
  let view = null;  // the window it's drawn in, while that's open

  // Sounds (sound.js; silent while sound is off) only while the game is on
  // screen, and only for what's drawn: the pops of a shot you skip stay
  // silent. Across the sky, a sound moves from your left ear to your right.
  const sound = (name, o) => !!view && !!K.sound && K.sound.play(name, o);
  const panOf = (x) => (x / W - 0.5) * 0.8;

  const playing = () => !!(run && run.night && run.step === 'aim');
  const alive = (m) => m.hp > 0 && !m.gone;
  const at = (f, sq) => f.ms.find((m) => m.sq === sq && alive(m)) || null;
  const byLane = (f) => f.ms.filter(alive).sort((a, b) => a.sq - b.sq);
  const dayOf = (n) => DAYS[(Math.max(1, n) - 1) % NIGHTS];
  const endless = () => !!(run && run.mode === 'endless');
  // "Thursday night" in a week; "night 11 (Thursday)" when it's endless.
  const nightName = (n) => (endless() ? `night ${n} (${dayOf(n)})` : `${dayOf(n)} night`);
  const critTimes = () => (run.have.story ? 3 : 2);
  const perPeg = (id) => STARS[id].dmg + run.level[id] + run.have.stardust;
  // What a popped peg counts as: one, or more for a pink, coral or white
  // one (and one more each with every Star jar).
  const worthOf = (kind) => (KINDS[kind] && KINDS[kind].worth ? KINDS[kind].worth + run.have.jar : 1);
  const away = (m) => plural(m.sq + 1, 'square');

  // mode: 'week' (Monday to Sunday) or 'endless'.
  function newRun(mode) {
    if (run && !run.recorded && run.score > 0) finishRun(false); // a run left halfway still counts
    // A star still falling, or the nightmares' turn still to come, belongs to
    // the old run: none of it may land in the new one.
    if (view) {
      cancelAnimationFrame(view.raf);
      view.anim = null;
      view.ballBox.innerHTML = '';
      view.timers.forEach(clearTimeout);
      view.timers.clear();
      view.tally.hidden = true;
    }
    // step: 'aim', 'shot' (the star's falling), 'busy' (the nightmares'
    // turn), 'pick' (a star or a charm), 'over' or 'won'.
    run = { mode: mode === 'endless' ? 'endless' : 'week', n: 1, score: 0, hearts: HEARTS, max: HEARTS, bag: ['plain', 'plain', 'plain'], level: {}, have: {}, step: 'aim', night: null, shot: null, offer: null, sky: '', beaten: 0, pegs: 0, moons: 0, seen: {} };
    CHARM_IDS.forEach((id) => { run.have[id] = 0; });
    STAR_IDS.forEach((id) => { run.level[id] = 0; });
    if (view) { view.help = false; view.peek = false; }
    startNight();
  }

  function startNight() {
    const n = run.n;
    run.sky = pick(SKY_NAMES.filter((k) => k !== run.sky));
    const pegs = SKIES[run.sky]();
    const f = {
      n,
      pegs,
      live: pegs.map(() => true),
      kinds: {},     // peg -> its kind, when it isn't plain (see KINDS)
      moon: -1,      // the peg the blue moon is on, while it's up
      ms: [],        // the nightmares
      nextId: 1,
      queue: planFor(n).map(([type, when]) => ({ type, when })),
      turn: 0,
      stars: shuffle(run.bag.slice()), // the bag: the first one is next to drop
      swaps: SWAPS + run.have.slippers,
      alarms: run.have.alarm,
      guards: run.have.teddy,
      lost: 0,       // hearts lost tonight
      aim: 0,        // degrees from straight down (minus is left)
      target: 0,
    };
    run.night = f;
    run.step = 'aim';
    run.offer = null;
    run.shot = null;
    arrive(f, []);
    const moon = roll(f);
    deal(f);
    target(f);
    if (view) {
      view.trail = null;
      show([{ t: 'night' }]);
      syncCard(false);
      focusSky();
    }
    // Newcomers get a word the first night they turn up.
    const tonight = f.ms.map((m) => m.type).concat(f.queue.map((q) => q.type));
    const fresh = NEWCOMERS.filter((type) => !run.seen[type] && tonight.indexOf(type) !== -1);
    tonight.forEach((type) => { run.seen[type] = true; });
    const news = fresh.length ? ` New tonight: ${fresh.map((type) => `the ${TYPES[type].name.toLowerCase()}, which ${TYPES[type].rule.charAt(0).toLowerCase()}${TYPES[type].rule.slice(1, -1)}`).join('; and ')}.` : '';
    const count = plural(f.queue.length + f.ms.length, 'nightmare');
    const up = moon ? ' And a blue moon is up!' : '';
    if (n % NIGHTS === 0) {
      say(n === NIGHTS
        ? `${endless() ? 'Night 7: ' : ''}Sunday night. The Bogeyman is coming, calling up shadows that slip past him to the bed.${up}`
        : `Night ${n}: Sunday again. The Bogeyman is back, tougher than last week.${up}`, 4600);
    } else if (endless()) say(`Night ${n}, ${dayOf(n)}${n > NIGHTS ? ` of week ${weekOf(n)}` : ''}: ${count} to fight off.${news}${up}`, news ? 6400 : 3200);
    else say(`${dayOf(n)} night: ${count} to fight off.${up}`, 3200);
  }

  // Keep at least two stars in sight: the one to drop and the next.
  function deal(f) {
    while (f.stars.length < 2) f.stars.push(...shuffle(run.bag.slice()));
  }

  // The coloured pegs move to new spots before every shot. The blue moon
  // stays where it is until it's popped; while it's down, there's a small
  // chance it rises (true when it does).
  function roll(f) {
    f.kinds = {};
    if (f.moon >= 0 && f.live[f.moon]) f.kinds[f.moon] = 'moon';
    else f.moon = -1;
    const lit = shuffle(range(f.pegs.length).filter((i) => f.live[i] && i !== f.moon));
    let k = 0;
    const light = (kind, n) => { for (let j = 0; j < n && k < lit.length; j++) f.kinds[lit[k++]] = kind; };
    light('crit', KINDS.crit.n + run.have.socks);
    ['refresh', 'pink', 'coral', 'white'].forEach((kind) => light(kind, KINDS[kind].n));
    if (f.moon >= 0 || k >= lit.length || Math.random() * MOON_ODDS >= (run.have.telescope ? SPOTTED : 1)) return false;
    f.moon = lit[k];
    f.kinds[f.moon] = 'moon';
    return true;
  }

  // `called`: a shadow the Bogeyman calls up (it can slip past him).
  function add(f, type, called) {
    const hp = called ? Math.round(CALLED_HP * tougher(f.n)) : hpOn(f.n, type);
    const m = { id: f.nextId++, type, sq: LANE - 1, hp, max: hp, tick: 0, charge: CLOUD_EVERY, sleep: 0, gone: false, called: !!called };
    f.ms.push(m);
    return m;
  }

  // The next nightmare in tonight's plan creeps in, if its turn has come
  // and the far square is free.
  function arrive(f, ev) {
    const q = f.queue[0];
    if (!q || q.when > f.turn || at(f, LANE - 1)) return;
    f.queue.shift();
    ev.push({ t: 'arrive', id: add(f, q.type).id, type: q.type });
  }

  // The nightmare in the ring: the one you picked, or the nearest the bed.
  function target(f) {
    let m = f.ms.find((x) => x.id === f.target && alive(x));
    if (!m) {
      m = byLane(f)[0] || null;
      f.target = m ? m.id : 0;
    }
    return m;
  }

  // What a nightmare does on its next turn.
  function plan(m) {
    if (m.sleep > 0) return { steps: 0, asleep: true };
    if (m.type === 'spider') return { steps: 2 };
    if (m.type === 'raggedy') return { steps: m.tick % 2 ? 1 : 0 };
    if (m.type === 'cloud') return { steps: m.sq > CLOUD_STOP ? 1 : 0, zap: m.charge <= 1 };
    if (m.type === 'bogeyman') return { steps: m.tick % 3 === 2 ? 1 : 0, call: m.tick % 2 === 1 };
    if (m.type === 'jack') return { steps: m.tick % 3 === 2 ? 3 : 0, spring: 3 - (m.tick % 3) };
    return { steps: 1 };
  }

  // Counting sheep: the one that nods off on their next turn (if it's a
  // sheep's turn): the nearest the bed that's still awake.
  const sheepNext = (f) => (run.have.sheep && (f.turn + 1) % SHEEP === 0 ? byLane(f).find((m) => m.sleep <= 0) || null : null);

  // The nightmares' turn, nearest the bed first: each steps (no further
  // than the square behind the next one, except a bat, and the Bogeyman's
  // shadows, which slip past him), storm clouds count down, and new ones
  // creep in. `dry`: a look ahead, so the hearts stay put.
  function creep(f, ev, dry) {
    const sheep = sheepNext(f);
    f.turn++;
    if (sheep) {
      sheep.sleep = 1;
      ev.push({ t: 'sheep', id: sheep.id, type: sheep.type });
    }
    let calls = 0;
    byLane(f).forEach((m) => {
      if (!alive(m)) return;
      if (m.sleep > 0) { m.sleep--; ev.push({ t: 'asleep', id: m.id, type: m.type }); return; }
      const p = plan(m);
      m.tick++;
      const from = m.sq;
      if (m.type === 'bat') {
        // It flies over anything in its way, onto the next free square.
        let to = m.sq - 1;
        while (to >= 0 && at(f, to)) to--;
        if (to < 0) reachBed(f, m, ev, dry);
        else m.sq = to;
      } else for (let k = p.steps; k > 0; k--) {
        if (m.sq === 0) { reachBed(f, m, ev, dry); break; }
        const ahead = at(f, m.sq - 1);
        // One of his shadows, right behind him: it slips past, onto the
        // square in front of him (or the bed, if he's beside it).
        if (ahead && m.called && ahead.type === 'bogeyman') {
          if (ahead.sq === 0) { reachBed(f, m, ev, dry); break; }
          if (at(f, ahead.sq - 1)) break;
          m.sq = ahead.sq - 1;
          continue;
        }
        if (ahead) break;
        m.sq--;
      }
      if (!m.gone && m.sq !== from) ev.push({ t: 'step', id: m.id, type: m.type, from, to: m.sq });
      if (m.type === 'cloud' && !m.gone && --m.charge <= 0) {
        m.charge = CLOUD_EVERY;
        ev.push({ t: 'zap', id: m.id });
        hurtHim(f, 1, 'cloud', ev, dry);
      }
      if (p.call) calls++;
    });
    f.ms = f.ms.filter((m) => !m.gone);
    arrive(f, ev);
    // The Bogeyman calls up a shadow, if the far square is free.
    if (calls && !at(f, LANE - 1)) ev.push({ t: 'call', id: add(f, 'shadow', true).id, type: 'shadow' });
  }

  function reachBed(f, m, ev, dry) {
    m.gone = true;
    if (m.type === 'bogeyman') {
      ev.push({ t: 'bed', by: m.type, id: m.id, n: run.hearts, all: true });
      if (!dry) { f.lost += run.hearts; run.hearts = 0; }
      return;
    }
    hurtHim(f, TYPES[m.type].hearts, m.type, ev, dry, m.id);
  }

  function hurtHim(f, n, by, ev, dry, id) {
    if (f.guards > 0) {
      f.guards--;
      ev.push({ t: 'guard', by, id });
      return;
    }
    ev.push({ t: by === 'cloud' ? 'struck' : 'bed', by, id, n });
    if (dry) return;
    run.hearts = Math.max(0, run.hearts - n);
    f.lost += n;
  }

  // After your next shot, if nothing's beaten: who reaches the bed (and
  // the lightning), and what it would cost; how far each one moves, and
  // who gets to the bed even if the teddy bear stops it doing harm.
  function forecast(f) {
    const g = Object.assign({}, f, { ms: f.ms.map((m) => Object.assign({}, m)), queue: f.queue.slice() });
    const ev = [];
    creep(g, ev, true);
    const bed = new Set();
    const moves = new Map();
    let cost = 0;
    let everything = false;
    ev.forEach((e) => {
      if (e.t === 'bed' || e.t === 'struck') { bed.add(e.id); cost += e.n; if (e.all) everything = true; }
      if (e.t === 'step') moves.set(e.id, e.from - e.to);
    });
    const left = new Set(g.ms.map((m) => m.id));
    const reach = new Set(f.ms.filter((m) => alive(m) && !left.has(m.id)).map((m) => m.id));
    return { bed, cost, everything, guarded: ev.some((e) => e.t === 'guard'), moves, reach };
  }

  /* ══════════════════════════════════════════════════════════════════════
     A SHOT
     ══════════════════════════════════════════════════════════════════════
     Aim, drop, watch (or skip to the end); then the damage lands, the
     nightmares take their turn, and the next star comes out of the bag. */
  function aimTo(angle) {
    if (!playing()) return;
    const a = Math.max(-AIM_MOST, Math.min(AIM_MOST, Math.round(angle * 10) / 10));
    const f = run.night;
    if (a === f.aim && !(view && view.trail)) return;
    f.aim = a;
    if (view) {
      view.trail = null;
      syncAim(f);
    }
  }

  function drop() {
    if (!playing()) return;
    const f = run.night;
    run.shot = fly(f, f.aim, f.stars[0]);
    // What he'll say if it pops the blue moon.
    if (run.shot.pops.some((p) => f.kinds[p.i] === 'moon')) run.shot.said = lineOf('moonLines');
    run.step = 'shot';
    if (view && !RM) play(run.shot);
    else land();
  }

  // The star's gone: its pegs pop, the damage lands. Each peg counts as
  // its worth (one, unless it's pink, coral or white); a yellow peg and
  // the blue moon multiply the lot.
  function land() {
    const f = run.night;
    const shot = run.shot;
    run.shot = null;
    const st = STARS[shot.star];
    const ev = [];
    const pops = shot.pops.map((p) => p.i);
    pops.forEach((i) => { f.live[i] = false; });
    const has = (kind) => pops.some((i) => f.kinds[i] === kind);
    const crit = has('crit');
    const fresh = has('refresh');
    const moon = has('moon');
    const worth = pops.reduce((sum, i) => sum + worthOf(f.kinds[i]), 0);
    const times = (crit ? critTimes() : 1) * (moon ? MOON : 1);
    const dmg = worth * perPeg(shot.star) * times;
    run.score += worth * POINTS.peg + (moon ? POINTS.moon : 0);
    run.pegs += pops.length;
    if (moon) { f.moon = -1; run.moons++; }
    ev.push({ t: 'shot', star: shot.star, pegs: pops.length, worth, crit, fresh, moon, times, dmg, said: shot.said || '' });
    const boss = f.ms.some((m) => m.type === 'bogeyman' && alive(m));
    if (fresh && run.have.dreamcatcher) byLane(f).forEach((m) => hurt(f, m, catchOn(f.n) * run.have.dreamcatcher, ev, 'catch'));
    if (st.all) byLane(f).forEach((m) => hurt(f, m, Math.ceil(dmg / 2), ev, 'star', st.lull));
    else strike(f, dmg, st.lull, ev);
    if (st.push) knock(f, st.push, ev, new Set(ev.filter((e) => e.t === 'hurt' && e.how === 'star' && !e.dead).map((e) => e.id)));
    f.ms = f.ms.filter(alive);
    // With the Bogeyman beaten, his shadows (and the rest) scatter.
    if (boss && !f.ms.some((m) => m.type === 'bogeyman')) {
      if (f.ms.length) ev.push({ t: 'flee', n: f.ms.length });
      f.ms = [];
      f.queue = [];
    }
    // Every peg comes back after the green one, or once they run low.
    const left = f.live.filter(Boolean).length;
    if (fresh || left < f.pegs.length * REFILL) {
      f.live.fill(true);
      ev.push({ t: 'refill', fresh });
    }
    if (view) {
      view.trail = shot;
      showTally(ev[0]);
      // (Already told if the shot was drawn; with reduced motion, now.)
      if (moon) moonMoment(f.pegs[pops.find((i) => f.kinds[i] === 'moon')], shot.said);
      view.moonShown = false;
    }
    if (!f.ms.length && !f.queue.length) { dawn(ev); return; }
    target(f);
    run.step = 'busy';
    if (view && !RM) {
      show(ev);
      tellShot(ev);
      later(theirTurn, f.ms.length ? 620 : 120);
    } else theirTurn(ev);
  }

  // The shot's damage goes to the nightmare in the ring; what's left over
  // spills onto the next one nearest the bed, and so on.
  function strike(f, dmg, lull, ev) {
    let left = dmg;
    const first = target(f);
    const order = (first ? [first] : []).concat(byLane(f).filter((m) => m !== first));
    for (const m of order) {
      if (left <= 0) break;
      const d = Math.min(left, m.hp);
      left -= d;
      hurt(f, m, d, ev, 'star', lull);
    }
  }

  function hurt(f, m, d, ev, how, lull) {
    if (!alive(m) || d <= 0) return;
    m.hp = Math.max(0, m.hp - d);
    ev.push({ t: 'hurt', id: m.id, type: m.type, d, how, dead: m.hp === 0 });
    if (m.hp === 0) {
      run.score += m.type === 'bogeyman' ? POINTS.bogeyman : POINTS.nightmare;
      run.beaten++;
    } else if (lull && !m.sleep) {
      m.sleep = 1;
      ev.push({ t: 'lull', id: m.id, type: m.type });
    }
  }

  // Knocked back (furthest first, so each has room): everything the Pillow
  // star hit that's still standing (`hit`), or the whole lane for the Alarm
  // clock. Never the Bogeyman: he's too heavy to budge.
  function knock(f, squares, ev, hit) {
    byLane(f).reverse().forEach((m) => {
      if ((hit && !hit.has(m.id)) || m.type === 'bogeyman') return;
      const from = m.sq;
      for (let k = 0; k < squares && m.sq < LANE - 1 && !at(f, m.sq + 1); k++) m.sq++;
      if (m.sq !== from) ev.push({ t: 'push', id: m.id, type: m.type, from, to: m.sq });
    });
  }

  // Their turn, then yours again (with the next star out of the bag).
  // `before`: what the shot did, when it's all told in one go.
  function theirTurn(before) {
    const f = run.night;
    const ev = [];
    creep(f, ev, false);
    if (run.hearts <= 0) { lose(ev, before); return; }
    if (roll(f)) ev.push({ t: 'moonrise' });
    f.stars.shift();
    deal(f);
    target(f);
    run.step = 'aim';
    show(ev);
    tell(before ? before.concat(ev) : ev, !!before);
  }

  // The window closed mid-shot (or mid-turn): finish it now.
  function settle() {
    if (!run) return;
    if (run.step === 'shot' && run.shot) land();
    else if (run.step === 'busy') theirTurn();
  }

  /* ---------- free moves (they cost no shot) ---------- */
  function swap() {
    if (!playing()) return;
    const f = run.night;
    if (f.swaps < 1 || f.stars[0] === f.stars[1]) {
      say(f.swaps < 1 ? 'No swaps left tonight.' : 'The next star is the same kind, so there is nothing to swap.');
      sound('deny');
      return;
    }
    f.swaps--;
    [f.stars[0], f.stars[1]] = [f.stars[1], f.stars[0]];
    show([]);
    sound('flip');
    say(`Swapped: the ${words(f.stars[0]).name} drops first.`);
  }

  // Every nightmare backs away, as from the Pillow star (and the Bogeyman
  // doesn't budge either).
  function ring() {
    if (!playing()) return;
    const f = run.night;
    if (f.alarms < 1) { say('The alarm clock has rung tonight already.'); sound('deny'); return; }
    f.alarms--;
    const ev = [{ t: 'alarm' }];
    knock(f, ALARM, ev);
    show(ev);
    const moved = ev.filter((e) => e.t === 'push');
    const boss = f.ms.some((m) => m.type === 'bogeyman' && alive(m));
    const stuck = moved.length || (boss && f.ms.length === 1) ? '' : f.ms.length ? 'Nobody had room to back away.' : 'Nobody is in the lane.';
    const heavy = boss ? "The Bogeyman didn't budge." : '';
    const note = moved.length ? `${plural(moved.length, 'nightmare')} backed away${boss ? ", but the Bogeyman didn't budge" : ''}.` : [stuck, heavy].filter(Boolean).join(' ');
    say(`Brrring! ${note}`, 2800, true);
    announce(['Brrring!']
      .concat(moved.map((e) => `${nameOf(e.type)} backs away to ${plural(e.to + 1, 'square')} from the bed.`), [stuck, heavy, dangerText(f)])
      .filter(Boolean).join(' '));
  }

  function choose(id) {
    if (!run || run.step !== 'pick' || run.offer.indexOf(id) === -1) return;
    if (STARS[id]) {
      if (run.bag.indexOf(id) === -1) run.bag.push(id);
      else run.level[id]++;
    } else {
      run.have[id]++;
      if (id === 'cocoa') { run.max++; run.hearts = run.max; }
    }
    run.n++;
    if (view) view.help = false;
    sound('pick');
    startNight();
  }

  // Pick a nightmare for the ring (`dir`: the next one along, either way).
  function aimAt(id, dir) {
    if (!playing()) return;
    const f = run.night;
    const list = byLane(f);
    if (!list.length) return;
    let m = list.find((x) => x.id === id);
    if (!m) {
      const k = list.findIndex((x) => x.id === f.target);
      m = list[(k + (dir || 1) + list.length) % list.length];
    }
    f.target = m.id;
    show([]);
    const t = TYPES[m.type];
    say(`Aiming at the ${t.name.replace(/^The /, '')}: ${plural(m.hp, 'hit point')} left, ${away(m)} from the bed.`, 2400);
  }

  /* ══════════════════════════════════════════════════════════════════════
     NIGHTS AND RUNS
     ══════════════════════════════════════════════════════════════════════ */
  // Morning: the night's beaten. A night without losing a heart wins one
  // back. Sunday's is the end of the week (endless runs carry on, with
  // what winning the week is worth).
  function dawn(ev) {
    const f = run.night;
    run.score += POINTS.night;
    const sunday = f.n % NIGHTS === 0;
    if (sunday && !endless()) { won(ev); return; }
    // An endless run that gets through a Sunday has won a week too.
    if (sunday) K.trophy.award('stardrop');
    const week = sunday ? POINTS.win + run.hearts * POINTS.heart : 0;
    run.score += week;
    morning(f, sunday ? 'weekLines' : 'nightLines', week);
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 700);
      // Just after the last hit lands: a jingle (a whole week: a fanfare).
      later(() => sound(sunday ? 'win' : 'clear'), 250);
    }
    announce(`${cap(nightName(f.n))} is over.${sunday ? ` Week ${weekOf(f.n)} survived!` : ''} Pick a star or a charm.`);
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // The morning's card: a heart back after a sound night, and a pick.
  function morning(f, lines, week) {
    const soundly = f.lost === 0;
    const healed = soundly && run.hearts < run.max;
    if (healed) run.hearts++;
    run.last = { n: f.n, line: lineOf(lines), soundly, healed, week };
    run.offer = offer();
    run.step = 'pick';
  }

  // Two stars (new kinds, or polish for ones you have) and a charm. A long
  // endless run can use up the lot; then any star can be polished again.
  function offer() {
    let stars = shuffle(STAR_IDS.filter((id) => run.level[id] < MOST_POLISH));
    const charms = shuffle(CHARM_IDS.filter((id) => {
      if (CHARMS[id].most && run.have[id] >= CHARMS[id].most) return false;
      if (id === 'cocoa' && run.max >= MOST_HEARTS) return false;
      return true;
    }));
    if (stars.length < 2) stars = stars.concat(shuffle(STAR_IDS.filter((id) => stars.indexOf(id) === -1)));
    const out = stars.slice(0, charms.length ? 2 : 3);
    if (charms.length) out.push(charms[0]);
    return out;
  }

  function lose(ev, before) {
    run.step = 'over';
    run.line = lineOf('loseLines');
    finishRun(false);
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 1100);
      later(() => sound(run.newBest ? 'best' : 'lose'), 1100);
    }
    const all = (before || []).concat(ev);
    announce(`${all.some((e) => e.t === 'bed' && e.all) ? 'The Bogeyman reached the bed.' : 'Out of hearts.'} He woke up on ${nightName(run.n)}. The run is over.`);
    tellDesktop(false);
  }

  function won(ev) {
    run.score += POINTS.win + run.hearts * POINTS.heart;
    run.step = 'won';
    run.line = lineOf('winLines');
    finishRun(true);
    K.trophy.award('stardrop');
    if (view) {
      show(ev);
      later(() => syncCard(true), RM ? 0 : 1100);
      later(() => sound('win'), 250); // (it says new best too)
    }
    announce('The Bogeyman is beaten. A whole week of sweet dreams! Keep dreaming to carry on into endless nights, or start a new run.');
    tellDesktop(true);
  }

  // After a won week: carry on into endless nights, from Monday's pick.
  // The week's best is already kept; from here the run counts as endless.
  function keepDreaming() {
    if (!run || run.step !== 'won') return;
    run.mode = 'endless';
    run.recorded = false;
    run.newBest = false;
    morning(run.night, 'nightLines', 0);
    run.last.line = '';
    run.last.onwards = true;
    if (view) { view.peek = false; syncCard(true); }
    sound('pick');
    announce('Endless nights: they go on, harder and harder, until his hearts run out. Pick a star or a charm.');
  }

  // A finished run (lost, won, or left for a new one): kept if it's the
  // best of its kind. (best.won only says whether the best week was a win;
  // every win is kept on its own as well, for the trophy.)
  function finishRun(out) {
    if (!run || run.recorded) return;
    run.recorded = true;
    const prev = bestRun(run.mode);
    run.newBest = run.score > 0 && (!prev || run.score > prev.score);
    run.bestLine = run.newBest ? lineOf('bestLines') : '';
    if (!run.newBest) return;
    K.store.merge(STORE_KEY, {
      [SLOTS[run.mode]]: endless()
        ? { score: run.score, night: run.n, at: Date.now() }
        : { score: run.score, night: run.n, won: !!out, at: Date.now() },
    });
  }

  // The pet wizard on the desktop tells everyone how it went (and throws
  // himself a party for a new best).
  function tellDesktop(out) {
    if (!K.pet || !K.pet.say) return;
    const key = endless() ? 'endless' : out ? 'win' : 'lose';
    const lines = linesOf((S.deskLines || {})[key], DESK_LINES[key]);
    const text = pick(lines).replace(/\{night\}/g, endless() ? String(run.n) : dayOf(run.n));
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
    root.className = 'gm sd';
    root.innerHTML = `
      <div class="gm-hud">
        <span class="gm-stat gm-level"><b data-night>Monday</b><span class="sd-wide" data-sub> night</span></span>
        <span class="gm-stat sd-hearts" data-hearts></span>
        <span class="gm-stat">Score <b data-score>0</b></span>
        <ul class="gm-owned" aria-label="Your charms" data-owned hidden></ul>
      </div>
      <div class="gm-play">
        <div class="sd-stage" data-stage>
          <div class="sd-lane" aria-hidden="true" data-lane>
            <span class="sd-bed" data-bed>
              <span class="sd-pillow"></span>${wizardPic('asleep', 'sd-sleeper')}<span class="sd-blanket"></span>
              <span class="sd-warn" data-warn hidden></span>
            </span>
            <div class="sd-track" data-track>
              ${range(LANE).map((k) => `<span class="sd-sq" style="--x:${k}"></span>`).join('')}
              <div class="sd-ms" data-ms></div>
            </div>
            <span class="sd-door" data-door></span>
          </div>
          <div class="sd-sky" data-sky tabindex="0" role="slider" aria-label="Aim the star"
              aria-valuemin="${-AIM_MOST}" aria-valuemax="${AIM_MOST}" aria-valuenow="0">
            <svg class="sd-svg" viewBox="-1 ${-TOP} ${W + 2} ${H + 1 + TOP}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
              <rect class="sd-frame" data-frame x="0" y="0" width="${W}" height="${H}" rx="2.5" />
              <line class="sd-floor" data-floor x1="0" y1="${H}" x2="${W}" y2="${H}" />
              <g data-trail></g>
              <circle class="sd-halo" data-halo cx="0" cy="0" r="${MOON_R + 1.3}" visibility="hidden" />
              <g data-pegs></g>
              <clipPath id="sd-below-wiz"><rect x="-1" y="${WIZ_FEET + 1.5}" width="${W + 2}" height="${H}" /></clipPath>
              <path class="sd-aim" data-aim d="" clip-path="url(#sd-below-wiz)" />
              <g data-marks></g>
              <image class="sd-wiz" data-wiz x="${W / 2 - WIZ / 2}" y="${WIZ_Y.toFixed(2)}" width="${WIZ}" height="${WIZ}" href="" />
              <g data-balls></g>
              <g data-fx></g>
            </svg>
            <span class="sd-tally" data-tally hidden></span>
            <p class="sd-said" aria-hidden="true" data-said hidden></p>
          </div>
          <p class="sd-cramped">Not enough room for the sky. Make the window taller, or turn your phone upright.</p>
        </div>
        <p class="gm-toast is-low" aria-hidden="true" data-toast hidden></p>
        <div class="gm-overlay" data-overlay hidden></div>
      </div>
      <div class="sd-dock" role="group" aria-label="Your stars" data-dock>
        <p class="sd-bag" data-bag></p>
        <div class="sd-acts">
          <button class="sd-act" type="button" data-act="swap">${doodleIcon('swap')}<span>Swap</span><b></b><kbd class="hint-mouse">X</kbd></button>
          <button class="sd-act" type="button" data-act="alarm" hidden>${doodleIcon('alarm')}<span>Alarm</span><b></b><kbd class="hint-mouse">A</kbd></button>
          <button class="sd-act sd-drop" type="button" data-act="drop">${doodleIcon('star')}<span data-drop>Drop</span></button>
        </div>
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
      lane: q('[data-lane]'),
      bed: q('[data-bed]'),
      sleeper: q('.sd-sleeper'),
      warn: q('[data-warn]'),
      msBox: q('[data-ms]'),
      door: q('[data-door]'),
      sky: q('[data-sky]'),
      svg: q('.sd-svg'),
      floor: q('[data-floor]'),
      frame: q('[data-frame]'),
      trailBox: q('[data-trail]'),
      halo: q('[data-halo]'),
      pegBox: q('[data-pegs]'),
      aimPath: q('[data-aim]'),
      markBox: q('[data-marks]'),
      wiz: q('[data-wiz]'),
      ballBox: q('[data-balls]'),
      fxBox: q('[data-fx]'),
      tally: q('[data-tally]'),
      said: q('[data-said]'),
      overlay: q('[data-overlay]'),
      toast: q('[data-toast]'),
      live: q('[data-live]'),
      nightNo: q('[data-night]'),
      nightSub: q('[data-sub]'),
      hearts: q('[data-hearts]'),
      score: q('[data-score]'),
      owned: q('[data-owned]'),
      dock: q('[data-dock]'),
      bag: q('[data-bag]'),
      dropText: q('[data-drop]'),
      pegEls: [],
      mEls: new Map(),
      shown: null,   // the night drawn
      card: false,   // a card is over the sky
      help: false,   // ...and it's the help card
      peek: false,   // the run is over and you're looking at the sky
      anim: null,    // the shot being drawn
      trail: null,   // the last shot, drawn faintly until you aim again
      aimed: new Set(),
      timers: new Set(),
    };
    wire(view);
    // Fetch his poses now, so none of them flickers in mid-shot.
    ['aim', 'hatless', 'asleep', 'startled', 'happy', 'party'].forEach((k) => {
      const s = frame(k);
      if (s) { const pre = new Image(); pre.src = s; }
    });
    show([{ t: 'night' }]);
    syncCard(false);
  }

  function unmount(win) {
    if (!view || (win && view.win !== win)) return;
    clearTimeout(view.toastTimer);
    clearTimeout(view.liveTimer);
    clearTimeout(view.poseTimer);
    clearTimeout(view.sayTimer);
    clearTimeout(view.saidTimer);
    cancelAnimationFrame(view.raf);
    view.timers.forEach(clearTimeout);
    view = null;
    settle();
  }

  // A timer that goes away with the window.
  const later = (fn, ms) => {
    if (!view) return;
    const v = view;
    const t = setTimeout(() => { v.timers.delete(t); if (view === v) fn(); }, ms);
    v.timers.add(t);
  };

  // Before the first run: Monday's sky, empty, behind the title card.
  const nightShown = () => (run && run.night ? run.night : view.idle || (view.idle = (() => {
    const pegs = SKIES.rows();
    return { n: 1, pegs, live: pegs.map(() => true), kinds: {}, moon: -1, ms: [], queue: [], stars: ['plain', 'plain'], swaps: 0, alarms: 0, guards: 0, aim: 0, target: 0, idle: true };
  })()));

  /* ---------- drawing the sky ---------- */
  const STAR_PATHS = {};
  const starPath = (r) => STAR_PATHS[r] || (STAR_PATHS[r] = range(10).map((k) => {
    const a = (k * Math.PI) / 5 - Math.PI / 2;
    const d = k % 2 ? r * STAR_TIP * 0.45 : r * STAR_TIP;
    return `${k ? 'L' : 'M'}${(Math.cos(a) * d).toFixed(2)} ${(Math.sin(a) * d).toFixed(2)}`;
  }).join('') + 'Z');
  const ballHtml = (id) => `<g class="sd-ball ${STARS[id].colour}"><path d="${starPath(STARS[id].r)}" /></g>`;
  // How much smaller (or bigger) a star is drawn while it waits on his hat.
  const onHat = (id) => HAT_STAR.r / (STAR_TIP * STARS[id].r);
  const pathOf = (pts) => 'M' + pts.map((v) => v.toFixed(1)).join(' ');

  // Each new kind of peg has a shape of its own, so its colour is never
  // the only clue: plain, yellow and green pegs are round, a pink one is a
  // ring, a coral one a diamond, a white one a sparkle and the blue moon a
  // crescent. (The ring's hole and the moon's shadow are cut out with
  // fill-rule: evenodd, in style.css.)
  const n2 = (v) => v.toFixed(2);
  const roundAt = (x, y, r) => `M${n2(x - r)} ${n2(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const SHAPES = {
    plain: (x, y) => roundAt(x, y, PEG_R),
    pink: (x, y) => roundAt(x, y, 1.65) + roundAt(x, y, 0.7),
    coral: (x, y) => `M${n2(x)} ${n2(y - 1.95)}L${n2(x + 1.95)} ${n2(y)}L${n2(x)} ${n2(y + 1.95)}L${n2(x - 1.95)} ${n2(y)}Z`,
    white: (x, y) => {
      const R = 2.3;
      const a = 0.08 * R;
      const b = 0.48 * R;
      return `M${n2(x)} ${n2(y - R)}C${n2(x + a)} ${n2(y - b)} ${n2(x + b)} ${n2(y - a)} ${n2(x + R)} ${n2(y)}` +
        `C${n2(x + b)} ${n2(y + a)} ${n2(x + a)} ${n2(y + b)} ${n2(x)} ${n2(y + R)}` +
        `C${n2(x - a)} ${n2(y + b)} ${n2(x - b)} ${n2(y + a)} ${n2(x - R)} ${n2(y)}` +
        `C${n2(x - b)} ${n2(y - a)} ${n2(x - a)} ${n2(y - b)} ${n2(x)} ${n2(y - R)}Z`;
    },
    // The lit part of a full moon (radius MOON_R) with a smaller circle's
    // shadow over its top right: from the top horn round the left to the
    // lower horn, then back in along the shadow's edge.
    moon: (x, y) => `M${n2(x - 0.09)} ${n2(y - 2.4)}A2.4 2.4 0 1 0 ${n2(x + 2.31)} ${n2(y + 0.65)}A1.95 1.95 0 1 1 ${n2(x - 0.09)} ${n2(y - 2.4)}Z`,
  };
  const shapeOf = (p, kind) => (SHAPES[kind] || SHAPES.plain)(p.x, p.y);
  const kindClass = (kind) => (kind ? ` is-${kind}` : '');

  function drawSky(f) {
    view.shown = f;
    view.pegBox.innerHTML = f.pegs.map((p, i) => `<path class="sd-peg" data-i="${i}" d="${shapeOf(p)}" />`).join('');
    view.pegEls = Array.prototype.slice.call(view.pegBox.children);
    view.pegEls.forEach((el) => { el.dataset.k = ''; });
    view.fxBox.innerHTML = '';
    view.mEls.forEach((el) => el.remove());
    view.mEls = new Map();
    view.ballBox.innerHTML = '';
    view.trailBox.innerHTML = '';
    view.lane.classList.add('is-still');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (view && view.shown === f) view.lane.classList.remove('is-still'); }));
  }

  // Bring the drawing up to date with the night. `ev` (what just happened)
  // picks the little animations.
  function show(ev) {
    if (!view) return;
    const f = nightShown();
    if (view.shown !== f) drawSky(f);
    ev = ev || [];
    if (!view.anim) syncPegs(f, ev);
    syncAim(f);
    syncLane(f, ev);
    syncBed(f, ev);
    syncWizard();
    drawHud();
    drawDock();
    drawStatus();
    hear(ev);
  }

  // What a turn sounds like: the shot's damage landing (a higher bonk when
  // it beats one), the alarm clock, a blue moon rising. A heart lost is
  // heard where the bed flashes (syncBed).
  function hear(ev) {
    if (ev.some((e) => e.t === 'hurt')) sound('hit', { step: ev.some((e) => e.t === 'hurt' && e.dead) ? 5 : 0 });
    if (ev.some((e) => e.t === 'alarm')) sound('alert');
    if (ev.some((e) => e.t === 'moonrise')) sound('moon', { gain: 0.45 });
  }

  function syncPegs(f, ev) {
    const back = ev.some((e) => e.t === 'refill');
    const rise = ev.some((e) => e.t === 'moonrise');
    view.pegEls.forEach((el, i) => {
      const kind = f.kinds[i] || '';
      if (el.dataset.k !== kind) {
        el.setAttribute('d', shapeOf(f.pegs[i], kind));
        el.dataset.k = kind;
      }
      let cls = 'sd-peg' + kindClass(kind);
      if (!f.live[i]) cls += ' is-out';
      if (view.aimed.has(i)) cls += ' is-aimed';
      if (back && f.live[i]) cls += ' is-back';
      if (rise && kind === 'moon') cls += ' is-rising';
      if (el.getAttribute('class') !== cls) el.setAttribute('class', cls);
    });
    syncHalo(f);
    view.floor.classList.toggle('is-on', playing() && !!STARS[f.stars[0]].floor);
  }
  // A ring round the blue moon while it's up.
  function syncHalo(f) {
    const p = f.moon >= 0 && f.live[f.moon] ? f.pegs[f.moon] : null;
    if (p) {
      view.halo.setAttribute('cx', n2(p.x));
      view.halo.setAttribute('cy', n2(p.y));
    }
    view.halo.setAttribute('visibility', p ? 'visible' : 'hidden');
  }

  // The dotted aiming line, the star waiting on his hat, and the faint
  // path of the last shot until you aim again.
  function syncAim(f) {
    const on = playing() && !view.card && !view.anim;
    const was = view.aimed;
    view.aimed = new Set();
    let d = '';
    let marks = '';
    if (on) {
      const line = aimLine(f, f.aim, f.stars[0]);
      d = line.lines.map(pathOf).join('');
      line.touched.forEach((i) => view.aimed.add(i));
      marks = line.marks.map(([x, y, r]) => `<circle class="sd-ghost" cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" />`).join('') +
        (line.ring ? `<circle class="sd-ring" cx="${n2(line.ring.x)}" cy="${n2(line.ring.y)}" r="${line.ring.r}" />` : '');
      view.sky.setAttribute('aria-valuenow', String(Math.round(f.aim)));
      view.sky.setAttribute('aria-valuetext', aimText(f, line));
    }
    view.aimPath.setAttribute('d', d);
    view.markBox.innerHTML = marks;
    view.trailBox.innerHTML = on && view.trail
      ? view.trail.balls.map((b) => `<path class="sd-trail" d="${pathOf(b.pts.filter((_, k) => k % 3))}" />`).join('') : '';
    if (!view.anim) view.ballBox.innerHTML = on ? ballHtml(f.stars[0]) : '';
    if (on) {
      const b = view.ballBox.firstElementChild;
      if (b) b.setAttribute('transform', `translate(${HAT.x} ${HAT_STAR.y}) scale(${onHat(f.stars[0]).toFixed(3)})`);
    }
    // Only the pegs whose ring changed need touching.
    if (view.pegEls.length && (was.size || view.aimed.size)) {
      was.forEach((i) => { if (!view.aimed.has(i) && view.pegEls[i]) view.pegEls[i].classList.remove('is-aimed'); });
      view.aimed.forEach((i) => { if (view.pegEls[i]) view.pegEls[i].classList.add('is-aimed'); });
    }
  }

  // A peg, in words: "a pink peg (worth 2)", "the blue moon (times 10)".
  function pegSaid(f, i) {
    const kind = f.kinds[i];
    if (!kind) return 'a peg';
    const k = KINDS[kind];
    if (k.worth) return `${k.said} (worth ${worthOf(kind)})`;
    return kind === 'moon' ? `${k.said} (times ${MOON})` : k.said;
  }
  // The coloured pegs in a list, in words: "1 yellow, 2 pink and the green one".
  function colours(f, list) {
    const n = (kind) => list.filter((i) => f.kinds[i] === kind).length;
    const out = [];
    if (n('moon')) out.push(`the blue moon (times ${MOON})`);
    ['crit', 'white', 'coral', 'pink'].forEach((kind) => { if (n(kind)) out.push(`${n(kind)} ${kind === 'crit' ? 'yellow' : kind}`); });
    if (n('refresh')) out.push('the green one');
    return out.length > 1 ? `${out.slice(0, -1).join(', ')} and ${out[out.length - 1]}` : out[0] || '';
  }

  // The aim, in words (the slider reads it out).
  function aimText(f, line) {
    const a = Math.round(f.aim);
    const dir = a === 0 ? 'Straight down' : `${Math.abs(a)} degrees ${a < 0 ? 'left' : 'right'}`;
    if (!line.touched.length) return `${dir}: it misses every peg on the way down.`;
    const st = STARS[f.stars[0]];
    if (st.heavy || st.burst) {
      const n = plural(line.touched.length, 'peg');
      const c = colours(f, line.touched);
      return `${dir}: ${st.heavy ? `it crashes through ${n}` : `it bursts on ${pegSaid(f, line.touched[0])} and pops ${n}`}${c ? `, among them ${c}` : ''}.`;
    }
    return `${dir}: it touches ${pegSaid(f, line.touched[0])} first${line.touched.length > 1 ? `, then ${pegSaid(f, line.touched[1])}` : ''}.`;
  }

  function syncWizard() {
    const s = frame(run && (run.step === 'shot' || run.step === 'busy') ? 'hatless' : 'aim');
    if (s && view.wiz.getAttribute('href') !== s) view.wiz.setAttribute('href', s);
  }

  /* ---------- the lane ---------- */
  const tokenHtml = (type) => {
    const src = drawingOf(type);
    return src
      ? `<img src="${esc(src)}" alt="" draggable="false" decoding="async" />`
      : `<span class="sd-token"><span class="sd-eyes"><i></i><i></i></span>${doodleIcon(TYPES[type].icon)}</span>`;
  };
  // The badge on a nightmare: what it does next turn. `fc`: the forecast,
  // if it's been worked out already.
  function nextOf(m, f, fc) {
    const p = plan(m);
    if (p.asleep) return { html: 'z', text: 'asleep: it misses its next turn' };
    if (f && sheepNext(f) === m) return { html: 'z', text: 'counting sheep: it nods off and misses its next turn' };
    if (m.type === 'cloud') {
      return { html: `${doodleIcon('bolt')}<i>${m.charge}</i>`, text: m.charge <= 1 ? 'lightning strikes the bed after your shot' : `lightning in ${plural(m.charge, 'turn')}`, hot: m.charge <= 1 };
    }
    if (m.type === 'jack' && !p.steps) return { html: `${doodleIcon('jack')}<i>${p.spring}</i>`, text: `springs three squares in ${plural(p.spring, 'turn')}` };
    // A bat flies over what's in its way, and the Bogeyman's shadows slip
    // past him, so either can go further than its pattern says: the badge
    // shows how far it really goes.
    if (f && (m.type === 'bat' || m.called)) {
      const ahead = fc && fc.moves ? fc : forecast(f);
      const bat = m.type === 'bat';
      if (ahead.reach.has(m.id)) {
        return {
          html: `${doodleIcon('back')}<i>${m.sq + 1}</i>`,
          text: m.sq && (bat || at(f, m.sq - 1)) ? `${bat ? 'flies over everything in its way' : 'slips past the Bogeyman'}, right to the bed` : 'reaches the bed next',
        };
      }
      const n = ahead.moves.get(m.id) || 0;
      if (bat) return { html: `${doodleIcon('back')}<i>${n}</i>`, text: n > 1 ? `flies ${n} squares next, over the ones in its way` : 'flutters one square next, over anything in its way' };
      if (n > p.steps) return { html: `${doodleIcon('back')}<i>${n}</i>`, text: `slips past the Bogeyman: ${n} squares next` };
    }
    const call = p.call ? ' and calls up a shadow' : '';
    if (!p.steps) return { html: '<i>-</i>', text: m.type === 'bogeyman' ? `waits${call}` : 'rests next turn' };
    return { html: `${doodleIcon('back')}<i>${p.steps}</i>`, text: `steps ${p.steps} next${call}` };
  }

  function syncLane(f, ev) {
    const seen = new Set();
    const fresh = new Set(ev.filter((e) => e.t === 'arrive' || e.t === 'call').map((e) => e.id));
    const pushed = new Set(ev.filter((e) => e.t === 'push').map((e) => e.id));
    const hits = new Map();
    ev.forEach((e) => { if (e.t === 'hurt') hits.set(e.id, (hits.get(e.id) || 0) + e.d); });
    const fc = run && run.night === f && playing() ? forecast(f) : { bed: new Set() };
    f.ms.forEach((m) => {
      if (!alive(m)) return;
      seen.add(m.id);
      let el = view.mEls.get(m.id);
      if (!el) {
        el = document.createElement('span');
        el.className = `sd-m ${m.type}`;
        el.dataset.id = m.id;
        el.innerHTML = `<span class="sd-m-body">${tokenHtml(m.type)}</span><span class="sd-hp"><i></i><b></b></span><span class="sd-next"></span>`;
        view.msBox.appendChild(el);
        view.mEls.set(m.id, el);
        el.style.setProperty('--x', m.sq);
        if (fresh.has(m.id)) restart(el, 'is-new');
      }
      el.style.setProperty('--x', m.sq);
      el.style.setProperty('--hp', (m.hp / m.max).toFixed(3));
      el.querySelector('.sd-hp b').textContent = m.hp;
      el.classList.toggle('is-target', m.id === f.target && !f.idle);
      el.classList.toggle('is-danger', fc.bed.has(m.id));
      el.classList.toggle('is-asleep', m.sleep > 0);
      const nx = nextOf(m, f, fc);
      const badge = el.querySelector('.sd-next');
      if (badge.innerHTML !== nx.html) badge.innerHTML = nx.html;
      badge.classList.toggle('is-hot', !!nx.hot);
      el.title = `${TYPES[m.type].name}: ${plural(m.hp, 'hit point')}, ${away(m)} from the bed; ${nx.text}`;
      if (hits.has(m.id)) {
        restart(el, 'is-hit');
        pop(el, `-${hits.get(m.id)}`);
      }
      if (pushed.has(m.id)) restart(el, 'is-pushed');
    });
    // The beaten ones fade out (with the damage that did it).
    view.mEls.forEach((el, id) => {
      if (seen.has(id)) return;
      view.mEls.delete(id);
      if (hits.has(id)) pop(el, `-${hits.get(id)}`);
      if (RM) { el.remove(); return; }
      el.classList.add('is-gone');
      setTimeout(() => el.remove(), 420);
    });
    const coming = f.queue.length;
    view.door.innerHTML = coming ? `<b>+${coming}</b>` : '';
    view.door.classList.toggle('is-open', !!coming);
    view.door.title = coming ? `${plural(coming, 'more nightmare')} to come tonight` : 'Nobody else is coming tonight';
  }

  // A number that floats up off a nightmare.
  function pop(el, text) {
    const n = document.createElement('span');
    n.className = 'sd-pop';
    n.textContent = text;
    el.appendChild(n);
    setTimeout(() => n.remove(), RM ? 900 : 1000);
  }

  function syncBed(f, ev) {
    const fc = run && run.night === f && playing() ? forecast(f) : { bed: new Set(), cost: 0 };
    const w = view.warn;
    w.hidden = !fc.cost;
    w.textContent = fc.everything ? '!' : fc.cost ? `-${fc.cost}` : '';
    view.bed.classList.toggle('is-danger', !!fc.cost);
    view.bed.title = fc.cost
      ? (fc.everything ? 'The Bogeyman reaches the bed after your shot!' : `After your shot this costs ${plural(fc.cost, 'heart')}, unless you stop it`)
      : 'His bed';
    const hit = ev.some((e) => e.t === 'bed' || e.t === 'struck');
    if (hit) {
      restart(view.bed, 'is-hit');
      // Hearts lost: an "ow", and the whole stage jolts.
      K.shake(view.stage);
      sound('hurt');
    }
    if (ev.some((e) => e.t === 'struck')) restart(view.bed, 'is-zapped');
    if (ev.some((e) => e.t === 'guard')) restart(view.bed, 'is-guarded');
    const base = !run || !run.night ? 'asleep' : run.step === 'over' ? 'startled' : 'asleep';
    clearTimeout(view.poseTimer);
    if (hit && run && run.step !== 'over') {
      setSleeper('startled');
      view.poseTimer = setTimeout(() => { if (view) setSleeper('asleep'); }, 900);
    } else setSleeper(base);
  }
  const setSleeper = (name) => {
    const s = frame(name);
    if (view.sleeper && s && view.sleeper.getAttribute('src') !== s) view.sleeper.setAttribute('src', s);
  };
  // Restart a one-off animation class.
  const restart = (el, cls) => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  /* ---------- a shot, drawn ---------- */
  function play(shot) {
    const v = view;
    v.trail = null;
    syncAim(run.night);
    v.ballBox.innerHTML = shot.balls.map(() => ballHtml(shot.star)).join('');
    v.anim = { shot, start: performance.now(), popped: 0, heard: 0, idx: shot.balls.map(() => 0), worth: 0, crit: false, moon: false, boom: false };
    v.moonShown = false;
    v.tally.hidden = false;
    v.tally.className = 'sd-tally';
    v.tally.innerHTML = '<b>0</b> pegs';
    show([]);
    sound('drop'); // off his hat
    v.raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    const v = view;
    if (!v || !v.anim) return;
    const a = v.anim;
    const t = Math.min(a.shot.end, ((now - a.start) / 1000) * PLAY);
    drawAt(t);
    if (t >= a.shot.end) { finishShot(); return; }
    v.raf = requestAnimationFrame(tick);
  }

  // Everything that has happened by time t: pegs popped (what each was
  // worth floats off it), the firework's burst, the stars' places and
  // sizes. Each pop sounds a step up the scale from the last one heard (one
  // hard on the heels of another is let go), from where it is in the sky,
  // with a glint for a yellow peg. `quiet`: a skipped shot, whose pops stay
  // silent.
  function drawAt(t, quiet) {
    const a = view.anim;
    const f = run.night;
    const shot = a.shot;
    let popped = -1;
    let gold = false;
    while (a.popped < shot.pops.length && shot.pops[a.popped].t <= t) {
      const i = shot.pops[a.popped++].i;
      const kind = f.kinds[i] || '';
      const el = view.pegEls[i];
      if (el) el.setAttribute('class', `sd-peg is-popping${kindClass(kind)}`);
      const worth = worthOf(kind);
      if (worth > 1) fx(`<text class="sd-plus" x="${n2(f.pegs[i].x)}" y="${n2(f.pegs[i].y - 2.4)}">+${worth}</text>`, 900);
      if (kind === 'crit') { a.crit = true; gold = true; }
      if (kind === 'moon') {
        a.moon = true;
        view.halo.setAttribute('visibility', 'hidden');
        moonMoment(f.pegs[i], shot.said, quiet);
      }
      a.worth += worth;
      popped = i;
    }
    if (popped >= 0) {
      tallyText(a.worth, a.crit, a.moon);
      if (!quiet) {
        const pan = panOf(f.pegs[popped].x);
        if (sound('peg', { step: a.heard, pan })) a.heard++;
        if (gold) sound('gold', { pan });
      }
    }
    if (shot.burst && !a.boom && t >= shot.burst.t) {
      a.boom = true;
      fx(`<circle class="sd-boom" cx="${n2(shot.burst.x)}" cy="${n2(shot.burst.y)}" r="${shot.burst.r}" />`, 700);
    }
    const els = view.ballBox.children;
    const st = STARS[shot.star];
    shot.balls.forEach((b, k) => {
      const el = els[k];
      if (!el) return;
      if (t < b.from || t > b.until) { el.setAttribute('visibility', 'hidden'); return; }
      el.removeAttribute('visibility');
      const p = b.pts;
      let j = a.idx[k];
      while (j + 3 < p.length && p[j + 3] <= t) j += 3;
      a.idx[k] = j;
      const t1 = j + 3 < p.length ? p[j + 3] : p[j];
      const u = t1 > p[j] ? (t - p[j]) / (t1 - p[j]) : 0;
      const x = p[j + 1] + ((j + 4 < p.length ? p[j + 4] : p[j + 1]) - p[j + 1]) * u;
      let y = p[j + 2] + ((j + 5 < p.length ? p[j + 5] : p[j + 2]) - p[j + 2]) * u;
      let r = st.r;
      for (let s = 0; s < b.sizes.length && b.sizes[s] <= t; s += 2) r = b.sizes[s + 1];
      let size = r / st.r;
      // Leaving his hat: from the hat star's size and place to its own.
      if (!b.from && t < LEAVE) {
        const e = 1 - (1 - t / LEAVE) ** 2;
        const k = onHat(shot.star);
        size *= k + (1 - k) * e;
        y += (HAT_STAR.y - HAT.y) * (1 - e);
      }
      el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${Math.round(t * 400) % 360})${size !== 1 ? ` scale(${size.toFixed(3)})` : ''}`);
    });
  }

  function tallyText(worth, crit, moon) {
    view.tally.innerHTML = `<b>${worth}</b> ${worth === 1 ? 'peg' : 'pegs'}${crit ? ` <i>x${critTimes()}</i>` : ''}${moon ? ` <i class="is-moon">x${MOON}</i>` : ''}`;
    view.tally.classList.toggle('is-crit', crit || moon);
  }

  // The shot's over: what it came to, for a moment. With reduced motion no
  // pegs were heard popping, so the tally is (the blue moon has its own).
  function showTally(s) {
    const v = view;
    v.tally.hidden = false;
    if (RM && !s.moon) sound('tally');
    tallyText(s.worth, s.crit, s.moon);
    v.tally.insertAdjacentHTML('beforeend', ` <span>= ${s.dmg}</span>`);
    clearTimeout(v.sayTimer);
    v.sayTimer = setTimeout(() => { if (view === v && !v.anim) v.tally.hidden = true; }, s.moon ? 2600 : 1600);
  }

  // A little something drawn over the sky that tidies itself away.
  function fx(html, ms) {
    if (!view) return;
    view.fxBox.insertAdjacentHTML('beforeend', html);
    const el = view.fxBox.lastElementChild;
    setTimeout(() => el.remove(), ms);
  }

  // The blue moon pops: a chime, sparkles fly off it, the sky lights up
  // blue for a moment, and he says something about it (with reduced
  // motion, the chime and that). `p`: where it was. `said`: his line.
  // `quiet`: a skipped shot (no chime).
  function moonMoment(p, said, quiet) {
    if (!view || view.moonShown) return;
    view.moonShown = true;
    if (!quiet) sound('moon', { pan: panOf(p.x) });
    if (!RM) {
      fx(`<g class="sd-sparks" transform="translate(${n2(p.x)} ${n2(p.y)})">${range(8).map((k) => {
        const a = (k * Math.PI) / 4;
        return `<path style="--dx:${n2(Math.cos(a) * 15)}px;--dy:${n2(Math.sin(a) * 15)}px" d="${starPath(1.3)}" />`;
      }).join('')}</g>`, 1000);
      restart(view.sky, 'is-moonlit');
    }
    wizardSays(said);
  }

  // His words in a speech bubble, just under him at the top of the sky.
  // Screen readers hear them in the turn's summary instead.
  function wizardSays(text, ms) {
    if (!view || !text) return;
    const el = view.said;
    el.textContent = text;
    el.hidden = false;
    const m = view.svg.getScreenCTM();
    if (m) {
      const box = view.sky.getBoundingClientRect();
      const p = new DOMPoint(HAT.x, 15).matrixTransform(m);
      el.style.left = `${Math.round(p.x - box.left)}px`;
      el.style.top = `${Math.round(p.y - box.top)}px`;
    }
    restart(el, 'is-in');
    clearTimeout(view.saidTimer);
    const v = view;
    view.saidTimer = setTimeout(() => { v.said.hidden = true; }, ms || 2800);
  }

  function finishShot() {
    view.anim = null;
    view.ballBox.innerHTML = '';
    land();
  }

  // Skip to the end of the shot.
  function skip() {
    if (!view || !view.anim || !run || run.step !== 'shot') return;
    if (performance.now() - view.anim.start < 250) return; // a double press isn't a skip
    cancelAnimationFrame(view.raf);
    drawAt(view.anim.shot.end, true);
    finishShot();
  }

  /* ---------- the bar along the top, and the dock ---------- */
  function drawHud() {
    if (!view) return;
    const f = run && run.night;
    const n = run ? run.n : 1;
    // A week counts the days; endless runs count the nights.
    view.nightNo.textContent = endless() ? `Night ${n}` : dayOf(n);
    view.nightSub.textContent = endless() ? `· ${dayOf(n)}` : ' night';
    const hearts = run ? run.hearts : HEARTS;
    const max = run ? run.max : HEARTS;
    view.hearts.innerHTML = range(max).map((k) => `<span${k < hearts ? ' class="is-full"' : ''}>${doodleIcon('heart')}</span>`).join('') +
      `<span class="vh">${plural(hearts, 'heart')} out of ${max}</span>`;
    view.score.textContent = run ? run.score : 0;
    const chips = run && f ? CHARM_IDS.filter((id) => run.have[id] > 0).map(chip).join('') : '';
    if (view.chips !== chips) { view.owned.innerHTML = chips; view.chips = chips; }
    view.owned.hidden = !chips;
  }
  // A charm you have, as a little badge: what's left tonight, how many,
  // or (Counting sheep) the turns until the next one nods off.
  const LEFT = { alarm: 'alarms', teddy: 'guards' };
  const chip = (id) => {
    const c = CHARMS[id];
    const n = run.have[id];
    const left = LEFT[id] ? run.night[LEFT[id]] : null;
    const name = words(id).name;
    let label = left != null ? `${name}: ${left} left tonight` : n > 1 ? `${name} x${n}` : name;
    let count = left != null ? left : n > 1 ? n : '';
    if (id === 'sheep') {
      count = SHEEP - (run.night.turn % SHEEP);
      label = `${name}: one nods off ${count === 1 ? 'after your next shot' : `in ${plural(count, 'turn')}`}`;
    } else if (id === 'dreamcatcher') label = `${name}: the green peg hits every nightmare for ${catchOn(run.night.n) * n} tonight`;
    return `<li class="gm-chip ${c.colour}" title="${esc(label)}">${doodleIcon(c.icon)}` +
      `${count !== '' ? `<b aria-hidden="true">${count}</b>` : ''}<span class="vh">${esc(label)}</span></li>`;
  };

  const starIcon = (id) => `<span class="sd-star-ico ${STARS[id].colour}${STARS[id].r > 2.2 ? ' is-big' : ''}">${doodleIcon('star')}</span>`;

  function drawDock() {
    if (!view) return;
    const f = nightShown();
    const play = playing();
    const now = f.stars[0];
    const next = f.stars[1];
    const each = run ? perPeg(now) : 1;
    const bag = `<span class="sd-now">${starIcon(now)}<span><b>${esc(words(now).name)}</b> <small>${each} a peg</small></span></span>` +
      `<span class="sd-then"><span class="sd-wide">then</span>${starIcon(next)}<span>${esc(words(next).name)}</span></span>`;
    if (view.bagHtml !== bag) { view.bag.innerHTML = bag; view.bagHtml = bag; }
    view.bag.setAttribute('aria-label', `Your star: ${words(now).name}, ${each} damage a peg. Next: ${words(next).name}.`);
    const btn = (act) => view.dock.querySelector(`[data-act="${act}"]`);
    const sw = btn('swap');
    sw.querySelector('b').textContent = f.swaps;
    sw.disabled = !play || f.swaps < 1;
    sw.setAttribute('aria-label', `Swap stars, ${f.swaps} left tonight`);
    const al = btn('alarm');
    al.hidden = !(run && run.have.alarm);
    al.querySelector('b').textContent = f.alarms;
    al.disabled = !play || f.alarms < 1;
    al.setAttribute('aria-label', `Ring the alarm clock, ${f.alarms} left tonight`);
    const dr = btn('drop');
    const shooting = !!(run && run.step === 'shot' && view.anim);
    view.dropText.textContent = shooting ? 'Skip' : 'Drop';
    const icon = shooting ? 'skip' : 'star';
    if (dr.dataset.icon !== icon) {
      dr.querySelector('svg').outerHTML = doodleIcon(icon);
      dr.dataset.icon = icon;
    }
    dr.classList.toggle('is-skip', shooting);
    dr.disabled = !(play || shooting);
    dr.setAttribute('aria-label', shooting ? 'Skip to the end of the shot' : 'Drop the star');
  }

  function drawStatus() {
    if (!view) return;
    const f = run && run.night;
    const where = !f ? 'Lights out' : cap(nightName(f.n));
    const step = run ? run.step : '';
    const hint = step === 'shot' ? K.hint('Enter, Space or a click skips to the end', 'Tap Skip to see the end')
      : step === 'pick' ? '<span class="status-hint">Pick a star or a charm</span>'
        : step === 'over' || step === 'won' ? `<span class="status-hint">New run starts ${endless() ? 'endless nights' : 'the week'} again</span>`
          : K.hint('Move the mouse to aim, click to drop', 'Drag to aim, then Drop');
    view.win.setStatus(`<span class="sd-where">${esc(where)}</span>${hint}`);
  }

  /* ---------- the cards over the game (title, a star or charm, the end) ---------- */
  function syncCard(focus) {
    if (!view) return;
    const show = view.help || !run || run.step === 'pick' || ((run.step === 'over' || run.step === 'won') && !view.peek);
    view.card = show;
    view.stage.inert = show;
    view.dock.inert = show;
    if (show) view.toast.hidden = true;
    view.overlay.hidden = !show;
    view.overlay.innerHTML = show ? cardHtml() : '';
    if (show && focus) {
      const go = view.overlay.querySelector('[data-first]') || view.overlay.querySelector('button');
      if (go) go.focus({ preventScroll: true });
    }
    syncAim(nightShown());
  }

  // The best runs, in words.
  const bestWords = (mode) => {
    const b = bestRun(mode);
    if (!b) return '';
    return mode === 'endless'
      ? `Best endless run: ${b.score} points, night ${b.night}.`
      : `Best week: ${b.score} points, ${b.won ? 'the whole week' : `${dayOf(b.night)} night`}.`;
  };
  // Where a run ended, in words: "Thursday night", or "night 17 (Wednesday of week 3)".
  const endedOn = (n) => (endless() ? `night ${n} (${dayOf(n)}${n > NIGHTS ? ` of week ${weekOf(n)}` : ''})` : `${dayOf(n)} night`);

  // What each peg is worth, with its shape (the Help card's key): what
  // shows, and what a screen reader says.
  const LEGEND = [
    ['', '1 peg', 'A plain peg counts as 1 peg.'],
    ['pink', `${KINDS.pink.worth} pegs`, `A pink peg, a ring, counts as ${KINDS.pink.worth} pegs.`],
    ['coral', `${KINDS.coral.worth} pegs`, `A coral peg, a diamond, counts as ${KINDS.coral.worth} pegs.`],
    ['white', `${KINDS.white.worth} pegs`, `A white peg, a sparkle, counts as ${KINDS.white.worth} pegs.`],
    ['crit', 'doubles', 'A yellow peg doubles the shot.'],
    ['refresh', 'refills', 'The green peg lights every peg again.'],
    ['moon', `x${MOON}, rare`, `Once in a blue moon a blue moon rises, a crescent: popping it makes the shot count ${MOON} times over.`],
  ];
  const legendHtml = () => `<ul class="sd-legend" aria-label="What the pegs are worth">${LEGEND.map(([kind, shown, said]) =>
    `<li><svg class="sd-swatch" viewBox="-3.2 -3.2 6.4 6.4" aria-hidden="true" focusable="false"><path class="sd-peg${kindClass(kind)}" d="${shapeOf({ x: 0, y: 0 }, kind)}" /></svg>` +
    `<span aria-hidden="true">${esc(shown)}</span><span class="vh">${esc(said)}</span></li>`).join('')}</ul>`;

  function cardHtml() {
    if (view.help || !run) {
      const bests = ['week', 'endless'].map(bestWords).filter(Boolean);
      return `
        <section class="gm-card" aria-labelledby="sd-card-h">
          <span class="gm-card-art">${wizardPic('asleep')}</span>
          <h3 class="gm-card-h" id="sd-card-h">Star Drop</h3>
          <p>The wizard's asleep, and his nightmares are creeping towards his bed. In his dream, he flicks the star off his hat to fight them off.</p>
          <ul class="gm-rules">
            <li>Aim, then drop the star. Every peg it pops is a point of damage, and coloured pegs count for more (below).</li>
            <li>The damage goes to the nightmare in the yellow ring. Then they all step closer.</li>
            <li>One that reaches the bed costs hearts. Last the week, Monday to Sunday, or play endless nights: they get harder and harder until his hearts run out.</li>
          </ul>
          ${legendHtml()}
          <p class="gm-keys"><span class="hint-mouse">Move the mouse to aim and click to drop. Click a nightmare to aim the damage at it.
            Keys: left and right arrows to aim (Shift for small steps), Enter or Space to drop, S or Esc to skip ahead, T to pick a nightmare, X to swap stars, A to ring the alarm, L to look around.</span><span class="hint-touch">Drag on the sky to aim, then press Drop. Tap a nightmare to aim the damage at it and learn its moves.</span></p>
          ${bests.map((t) => `<p class="gm-best">${esc(t)}</p>`).join('')}
          <p class="gm-actions">${run
            ? '<button class="os-button" type="button" data-act="back" data-first>Back to the game</button>'
            : '<button class="os-button gm-go" type="button" data-act="start" data-mode="week" data-first>Start the week</button>' +
              '<button class="os-button" type="button" data-act="start" data-mode="endless">Endless nights</button>'}</p>
        </section>`;
    }
    const bestText = bestWords(run.mode);
    if (run.step === 'pick') {
      const l = run.last;
      const up = run.n + 1;
      let nextText;
      if (!endless()) {
        nextText = up === NIGHTS ? 'Next: Sunday night, and the Bogeyman.' : `Next: ${dayOf(up)} night, ${plural(comingOn(up), 'nightmare')}.`;
      } else if (up % NIGHTS === 0) {
        nextText = `Next: night ${up}, Sunday, and the Bogeyman${up > NIGHTS ? ', tougher than last week' : ''}.`;
      } else nextText = `Next: night ${up} (${dayOf(up)}), ${plural(comingOn(up), 'nightmare')}.`;
      const counts = {};
      run.bag.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
      const bag = Object.keys(counts).map((id) =>
        `${counts[id] > 1 ? counts[id] : 'a'} ${words(id).name.toLowerCase()}${counts[id] > 1 ? 's' : ''} (${perPeg(id)} a peg)`);
      const kicker = l.onwards ? 'Endless nights' : `${cap(nightName(l.n))}${l.soundly ? ': slept soundly' : ' is over'}`;
      const tally = l.onwards
        ? `The nights go on, harder and harder, until his hearts run out.${l.healed ? ' A heart back for a sound night.' : ''} Score: ${run.score}`
        : `+${POINTS.night} for the night${l.week ? `, +${l.week} for the whole week` : ''}${l.healed ? ', and a heart back' : ''}. Score: ${run.score}`;
      return `
        <section class="gm-card" aria-labelledby="sd-card-h">
          ${l.line ? `<p class="gm-said">${esc(l.line)}</p>` : ''}
          <span class="gm-card-art">${wizardPic(l.week ? 'party' : 'happy')}</span>
          <p class="gm-kicker">${esc(kicker)}</p>
          <p class="gm-tally">${esc(tally)}</p>
          <h3 class="gm-card-h" id="sd-card-h">Pick a star or a charm</h3>
          <div class="gm-ups">${run.offer.map((id, k) => upCard(id, k === 0)).join('')}</div>
          <p class="sd-next-night">${esc(nextText)} Your bag: ${esc(bag.join(', '))}.</p>
        </section>`;
    }
    const won = run.step === 'won';
    const other = endless() ? ['week', 'Play the week'] : ['endless', 'Endless nights'];
    return `
      <section class="gm-card" aria-labelledby="sd-card-h">
        ${run.line ? `<p class="gm-said">${esc(run.line)}</p>` : ''}
        <span class="gm-card-art">${wizardPic(won ? 'party' : 'startled')}</span>
        ${won ? '<p class="gm-kicker">Sunday night is over</p>' : ''}
        <h3 class="gm-card-h" id="sd-card-h">${won ? 'Sweet dreams' : 'Wide awake'}</h3>
        <p class="gm-tally">${won
          ? `A whole week of nightmares, the Bogeyman too, with ${plural(run.hearts, 'heart')} to spare.<br />Score: ${run.score}`
          : `The nightmares woke him on ${esc(endedOn(run.n))}.<br />Score: ${run.score}`}</p>
        ${run.newBest
          ? `<p class="gm-best is-new">${endless() ? 'New best endless run!' : 'New best week!'}${run.bestLine ? ` <span>${esc(run.bestLine)}</span>` : ''}</p>`
          : bestText ? `<p class="gm-best">${esc(bestText)}</p>` : ''}
        ${won ? '<p>Keep dreaming to carry on into endless nights, with everything you have: harder every night, until his hearts run out.</p>' : ''}
        <p class="gm-actions">${won
          ? '<button class="os-button gm-go" type="button" data-act="onwards" data-first>Keep dreaming</button>' +
            '<button class="os-button" type="button" data-act="again">New run</button>'
          : '<button class="os-button gm-go" type="button" data-act="again" data-first>New run</button>' +
            '<button class="os-button" type="button" data-act="peek">See the sky</button>' +
            `<button class="os-button" type="button" data-act="again" data-mode="${other[0]}">${other[1]}</button>`}</p>
      </section>`;
  }

  // A star you don't have yet, polish for one you do, or a charm.
  const upCard = (id, first) => {
    const star = !!STARS[id];
    const w = words(id);
    let blurb = w.blurb;
    let kind = `Charm${run.have[id] ? `, you have ${run.have[id]}` : ''}`;
    if (star) {
      const n = run.bag.filter((x) => x === id).length;
      kind = n ? 'Polish' : 'New star';
      if (n) blurb = `Polish ${n > 1 ? `all ${n}` : 'yours'}: ${perPeg(id) + 1} damage for every peg ${n > 1 ? 'they pop' : 'it pops'}, up from ${perPeg(id)}.`;
    } else if (id === 'dreamcatcher') blurb += ` Next night: ${catchOn(run.n + 1) * (run.have.dreamcatcher + 1)} each.`;
    const icon = star ? `<span class="gm-up-icon sd-up-star">${starIcon(id)}</span>` : `<span class="gm-up-icon">${doodleIcon(CHARMS[id].icon)}</span>`;
    return `<button class="gm-up ${star ? STARS[id].colour : CHARMS[id].colour}" type="button" data-up="${id}"${first ? ' data-first' : ''}>
        ${icon}
        <span class="gm-up-name">${esc(w.name)}</span>
        <span class="gm-up-blurb">${esc(blurb)}</span>
        <span class="gm-up-have">${kind}</span>
      </button>`;
  };

  /* ---------- telling you things ---------- */
  // A note over the sky, read out by screen readers too (unless `quiet`:
  // the turn's own summary is about to say it).
  function say(text, ms, quiet) {
    if (!view || !text) return;
    const t = view.toast;
    t.textContent = text;
    t.hidden = false;
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

  const nameOf = (type) => (type === 'bogeyman' ? 'The Bogeyman' : `The ${TYPES[type].name.toLowerCase()}`);

  // What the shot did, in words.
  function shotWords(ev) {
    const out = [];
    const s = ev.find((e) => e.t === 'shot');
    if (s) {
      if (!s.pegs) out.push('The star missed every peg.');
      else {
        const among = [];
        if (s.worth !== s.pegs) among.push(`worth ${s.worth}`);
        if (s.crit) among.push(`a yellow one among them (times ${critTimes()})`);
        if (s.moon) among.push(`and the blue moon (times ${MOON})`);
        out.push(`The ${words(s.star).name.toLowerCase()} popped ${plural(s.pegs, 'peg')}${among.length ? `, ${among.join(', ')}` : ''}: ${s.dmg} damage.`);
      }
      if (s.moon && s.said) out.push(`He says: ${s.said}`);
    }
    ev.forEach((e) => {
      if (e.t === 'hurt' && e.dead) out.push(`${nameOf(e.type)} is beaten.`);
      else if (e.t === 'lull') out.push(`${nameOf(e.type)} nods off.`);
      else if (e.t === 'push') out.push(`${nameOf(e.type)} is knocked back to ${plural(e.to + 1, 'square')} from the bed.`);
      else if (e.t === 'flee') out.push('Its shadows scatter.');
      else if (e.t === 'refill') out.push(e.fresh ? 'The green peg lit every peg again.' : 'The pegs ran low, so every one is lit again.');
    });
    return out;
  }
  // A shot worth a note over the sky: the blue moon, or a yellow peg.
  const shotNote = (s) => {
    if (!s) return '';
    if (s.moon) return `Blue moon! ${plural(s.worth, 'peg')} times ${s.times}: ${s.dmg} damage.`;
    return s.crit ? `Yellow peg! ${plural(s.worth, 'peg')} times ${critTimes()}: ${s.dmg} damage.` : '';
  };
  const MOONRISE = `A blue moon is up! Pop it and the shot counts ${MOON} times over.`;

  function tellShot(ev) {
    const note = shotNote(ev.find((e) => e.t === 'shot'));
    if (note) say(note, 2400, true);
    announce(shotWords(ev).join(' '));
  }

  // After their turn: what they did, then what happens after the next shot.
  function tell(ev, withShot) {
    const f = run.night;
    const out = withShot ? shotWords(ev) : [];
    ev.forEach((e) => {
      if (e.t === 'sheep') out.push(`A sheep jumps over the bed, and ${nameOf(e.type).replace(/^The /, 'the ')} nods off.`);
      else if (e.t === 'step') out.push(`${nameOf(e.type)} ${e.to === 0 ? 'is right beside the bed' : `is ${plural(e.to + 1, 'square')} from the bed`}.`);
      else if (e.t === 'bed') out.push(`${nameOf(e.by)} reached the bed: ${plural(e.n, 'heart')} gone.`);
      else if (e.t === 'struck') out.push('Lightning struck the bed: a heart gone.');
      else if (e.t === 'guard') out.push('The teddy bear guarded the bed.');
      else if (e.t === 'arrive' || e.t === 'call') out.push(`${e.t === 'call' ? 'The Bogeyman called up a shadow' : `A ${TYPES[e.type].name.toLowerCase()} crept in`} at the far end.`);
      else if (e.t === 'asleep') out.push(`${nameOf(e.type)} slept through its turn.`);
      else if (e.t === 'moonrise') out.push(MOONRISE);
    });
    const lost = ev.filter((e) => e.t === 'bed' || e.t === 'struck').reduce((n, e) => n + e.n, 0);
    const note = withShot ? shotNote(ev.find((e) => e.t === 'shot')) : '';
    if (lost) {
      out.push(`${plural(run.hearts, 'heart')} left.`);
      say(`Ouch! ${plural(lost, 'heart')} gone. ${plural(run.hearts, 'heart')} left.`, 2400, true);
    } else if (ev.some((e) => e.t === 'guard')) say('The teddy bear guarded the bed!', 2400, true);
    else if (ev.some((e) => e.t === 'moonrise')) say(MOONRISE, 3600, true);
    else if (note) say(note, 2400, true);
    out.push(dangerText(f));
    out.push(`Your star: the ${words(f.stars[0]).name.toLowerCase()}.`);
    announce(out.join(' '));
  }

  function dangerText(f) {
    const fc = forecast(f);
    if (fc.everything) return 'After your next shot the Bogeyman reaches the bed, unless you stop him.';
    if (!fc.cost) return 'Nothing reaches the bed after your next shot.';
    return `After your next shot you lose ${plural(fc.cost, 'heart')}, unless you stop ${fc.bed.size > 1 ? 'them' : 'it'}.`;
  }

  // L: the whole night, said aloud.
  function look() {
    if (!run || !run.night) return;
    const f = run.night;
    const parts = [`${cap(nightName(f.n))}, ${plural(run.hearts, 'heart')} left.`];
    const list = byLane(f);
    const fc = forecast(f);
    if (!list.length) parts.push('No nightmares in the lane.');
    list.forEach((m) => {
      parts.push(`${TYPES[m.type].name}${m.id === f.target ? ' (aimed at)' : ''}: ${away(m)} from the bed, ${plural(m.hp, 'hit point')}, ${nextOf(m, f, fc).text}.`);
    });
    if (f.queue.length) parts.push(`${plural(f.queue.length, 'more')} to come tonight.`);
    const lit = f.live.filter(Boolean).length;
    const c = colours(f, Object.keys(f.kinds).map(Number).filter((i) => f.live[i]));
    parts.push(`${plural(lit, 'peg')} lit${c ? `, among them ${c}` : ''}.`);
    parts.push(`Your star: the ${words(f.stars[0]).name.toLowerCase()}, then the ${words(f.stars[1]).name.toLowerCase()}.`);
    parts.push(dangerText(f));
    announce(parts.join(' '));
  }

  // A nightmare, explained (and put in the ring).
  function inspect(m) {
    const t = TYPES[m.type];
    if (playing()) run.night.target = m.id;
    show([]);
    say(`${t.name}: ${t.rule} ${plural(m.hp, 'hit point')} left.${playing() ? ' Aimed at.' : ''}`, 4200);
  }

  /* ---------- mouse, touch and keyboard ----------
     Mouse: the aim follows the pointer over the sky; a click drops the
     star. Touch: drag on the sky to aim, then press Drop. Either way, a
     nightmare picked in the lane takes the damage. Keyboard: left and
     right aim (Shift for small steps), Enter or Space drops (and skips,
     as do S and Escape), T picks a nightmare, X swaps stars, A rings the
     alarm clock, L looks around. */
  let lastPointer = 'mouse';
  let dragging = null;

  // From a point on the screen to an aim (degrees from straight down).
  function aimFromPoint(x, y) {
    const m = view.svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    const dx = p.x - HAT.x;
    const dy = Math.max(0.5, p.y - HAT.y);
    aimTo((Math.atan2(dx, dy) * 180) / Math.PI);
  }

  function wire(v) {
    const { sky } = v;
    sky.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType || 'mouse';
      view.swallow = false;
      if (!run || view.card) return;
      if (run.step === 'shot') { view.swallow = true; skip(); return; }
      if (lastPointer === 'mouse' || !playing()) return;
      // Touch and pens: drag to aim; nothing drops until Drop is pressed.
      dragging = e.pointerId;
      try { sky.setPointerCapture(e.pointerId); } catch (err) { /* gone */ }
      aimFromPoint(e.clientX, e.clientY);
    });
    sky.addEventListener('pointermove', (e) => {
      if (dragging === e.pointerId || (e.pointerType === 'mouse' && !dragging)) {
        if (playing() && !view.card) aimFromPoint(e.clientX, e.clientY);
      }
    });
    const letGo = (e) => { if (dragging === e.pointerId) dragging = null; };
    sky.addEventListener('pointerup', letGo);
    sky.addEventListener('pointercancel', letGo);
    sky.addEventListener('click', (e) => {
      if (view.swallow) { view.swallow = false; return; } // the click that skipped a shot
      if (lastPointer !== 'mouse' || e.button !== 0 || !playing() || view.card) return;
      aimFromPoint(e.clientX, e.clientY);
      drop();
    });
    sky.addEventListener('keydown', onKey);
    v.lane.addEventListener('click', (e) => {
      if (!run || !run.night) return;
      const el = e.target.closest('.sd-m');
      const f = run.night;
      if (el) {
        const m = f.ms.find((x) => x.id === Number(el.dataset.id) && alive(x));
        if (m) inspect(m);
      } else if (e.target.closest('.sd-bed')) {
        say(`His bed. A nightmare that reaches it costs hearts; ${plural(run.hearts, 'heart')} left.${dangerText(f) ? ` ${dangerText(f)}` : ''}`, 4200);
      } else if (e.target.closest('.sd-door')) {
        const q = f.queue[0];
        say(q ? `${plural(f.queue.length, 'more nightmare')} to come tonight. Next: a ${TYPES[q.type].name.toLowerCase()}.` : 'Nobody else is coming tonight.', 3200);
      }
      if (e.detail !== 0) focusSky();
    });
    const FX = { 'sd-new': 'is-new', 'sd-hit': 'is-hit', 'sd-pushed': 'is-pushed', 'sd-bed-hit': 'is-hit', 'sd-zap': 'is-zapped', 'sd-guard': 'is-guarded' };
    v.lane.addEventListener('animationend', (e) => {
      const el = e.target.closest('.sd-m, .sd-bed');
      if (el && FX[e.animationName]) el.classList.remove(FX[e.animationName]);
    });
    v.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b || !run) return;
      const act = b.dataset.act;
      if (act === 'drop') { if (run.step === 'shot') skip(); else drop(); }
      else if (act === 'swap') swap();
      else if (act === 'alarm') ring();
      if (e.detail !== 0) focusSky(); // a click hands the keys back to the sky
    });
    v.menu.addEventListener('click', onMenu);
    v.overlay.addEventListener('click', onCard);
  }

  function focusSky() {
    if (!view || view.card) return;
    view.sky.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.altKey || e.metaKey || e.ctrlKey || !run || view.card) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (run.step === 'shot') {
      if (k === 'Enter' || k === ' ' || k === 's' || k === 'Escape') {
        e.preventDefault();
        if (!e.repeat) skip();
      }
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      if (!playing()) return;
      const step = e.shiftKey ? 0.5 : 2;
      aimTo(run.night.aim + (k === 'ArrowLeft' ? -step : step));
      return;
    }
    if (k === 'Home' || k === 'End') {
      e.preventDefault();
      if (playing()) aimTo(k === 'Home' ? -AIM_MOST : AIM_MOST);
      return;
    }
    const acts = {
      Enter: drop,
      ' ': drop,
      t: () => aimAt(0, e.shiftKey ? -1 : 1),
      x: swap,
      a: ring,
      l: look,
    };
    if (acts[k]) {
      e.preventDefault();
      if (!e.repeat && (playing() || k === 'l')) acts[k]();
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

  // New run (the menu): another of the same kind, week or endless.
  function askNewRun() {
    const mode = run ? run.mode : 'week';
    if (!run || run.step === 'over' || run.step === 'won' || (run.n === 1 && !run.night.turn)) { newRun(mode); return; }
    K.dialog({
      title: 'New run',
      icon: 'controller',
      message: `Start a new run? This one ends here, on ${nightName(run.n)} with ${plural(run.score, 'point')}.`,
      buttons: ['Keep playing', 'New run'],
    }).then((v) => { if (v === '1') newRun(mode); });
  }

  function onCard(e) {
    const btn = e.target.closest('button');
    if (!btn || !view) return;
    if (btn.dataset.up) { choose(btn.dataset.up); return; }
    const what = btn.dataset.act;
    if (what === 'start' || what === 'again') newRun(btn.dataset.mode || (run ? run.mode : 'week'));
    else if (what === 'onwards') keepDreaming();
    else if (what === 'back') {
      view.help = false;
      syncCard(true);
      focusSky();
    } else if (what === 'peek') {
      view.peek = true;
      syncCard(false);
      focusSky();
      say('This is where it ended. Press New run to try again.', 3600);
    }
  }

  K.stardrop = { mount, unmount };
})();

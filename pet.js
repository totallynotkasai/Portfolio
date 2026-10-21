/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - THE PET WIZARD  (lives on the desktop, behind the windows)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. Everything about him (his lines, his
   drawings, how soon he naps) lives in content.js under "wizard".
   He teleports about the free bits of the desktop, blinks, beams when
   petted, naps when ignored and chats when a window opens. Drag him with
   the mouse (or press and hold on a touch screen) to carry him about, or
   double-click an empty bit of the desktop (kasai-os.js) to call him over.
   He remembers where you left him and whether you petted him, and pet.exe
   in the Start menu shows how he's doing. Pet him ten times for a surprise.
   The desktop menu's Refresh makes him do a trick, and the secret codes
   (kasai-os.js) throw him a party.
   On the desktop he's the animated drawing in wizard-rig.js (made by the
   Wizard Virtual Pet project): this file says what he's up to by setting
   data-state, data-play and data-eyes on it, and the drawing's own CSS
   does the moving.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const C = K.C;
  const RIG = K.WIZARD_RIG && K.WIZARD_RIG.svg ? K.WIZARD_RIG : null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : '');
  // Lines from content.js. Missing ones use the built-in lines below; an
  // empty list (or '') means he keeps quiet.
  const linesOf = (v, fallback) => (Array.isArray(v) ? v.filter(Boolean) : typeof v === 'string' ? (v ? [v] : []) : fallback);
  const DEFAULT_LINES = {
    heldLines: ['wheee!', 'put me down!!', 'i can see my house from here'],
    dropLines: ['oof.', 'rude.', 'the room is spinning'],
    trashLines: ["i'm NOT rubbish!", 'hey! not recyclable.'],
    welcomeBack: ['welcome back!', 'oh hi, you again :)'],
    trickLines: ['ta-da!', 'did you see that?!'],
    partyLines: ["it's a party!", 'nobody said there was a dress code'],
  };
  const SUMMON_LINES = ['you rang?', 'poof!']; // content.js: wizard.lines.summon

  /* ---------- his drawings ----------
     His still drawings, from content.js. pet.exe and the games show him as
     these (K.pet.frame), and so does the desktop with reduced motion or if
     wizard-rig.js is missing. A drawing that doesn't exist yet borrows the
     next one along its chain, and every chain ends at idle, so he always
     has something to wear. */
  const BORROW = {
    half: 'idle', blink: 'idle', happy: 'idle', asleep: 'blink',
    walk1: 'idle', walk2: 'walk1', held: 'startled', startled: 'idle',
    dizzy: 'half', party: 'happy', wave: 'happy',
    sweeperTile: 'asleep', sweeperAwake: 'startled',
    hop: 'walk2', bonk: 'idle', hurt: 'startled',
    aim: 'idle', hatless: 'idle',
  };
  const FRAMES = ['idle'].concat(Object.keys(BORROW));
  // Only ever worn in the games, never by him on the desktop.
  const GAME_ONLY = ['sweeperTile', 'sweeperAwake', 'hop', 'bonk', 'hurt', 'aim', 'hatless'];

  // content.js paths become the small copies the build makes (worked out
  // the first time a picture is wanted).
  let srcs = null;
  const sources = () => {
    if (srcs) return srcs;
    const W = C.wizard || {};
    const given = W.frames || {};
    srcs = {};
    FRAMES.forEach((k) => { if (given[k]) srcs[k] = K.webSrc(given[k]); });
    if (!srcs.idle && W.image) srcs.idle = K.webSrc(W.image);
    return srcs;
  };
  // A drawing's picture, or the one it borrows ('' with no drawings at all).
  const frameSrc = (name) => {
    const src = sources();
    let k = name;
    while (k && !src[k]) k = BORROW[k];
    return src[k || 'idle'] || '';
  };

  const PET_KEY = 'kasai:pet';       // { pets, since, last, carried }, saved once he's been petted
  const DESK_KEY = 'kasai:desktop';  // where things sit on the desktop (shared with the icons)
  const AWAY = 30 * 60 * 1000;       // gone this long, then back: "welcome back"
  const WAVE_GAP = 30 * 1000;        // at most one wave hello this often
  const LONG_PRESS = 450;            // ms a finger rests on him to pick him up
  const LIFT = 1.06;                 // how much nearer he looks while held (.pet.is-held in style.css)
  // How long his moves take, in ms (from wizard-rig.js; these stand in without it).
  const DUR = Object.assign({ 'dizzy-in': 240, dizzy: 1200, party: 840, startled: 1500, wave: 1400 }, RIG && RIG.durations);
  // Every so often he pops off somewhere else: this many ms from now.
  const wanderIn = () => 20000 + Math.random() * 20000;

  // What pet.exe calls his mood: what he's busy with, or else how loved he feels.
  const BUSY = { asleep: 'Fast asleep', held: 'Being carried', dizzy: 'Seeing stars', teleport: 'Popping about', party: 'Partying' };
  const FEELING = ['A bit bored', 'Content', 'Content', 'Happy', 'Very happy', 'Over the moon'];

  let live = null; // the wizard on the desktop, once init() has run

  K.pet = {
    init(layer) {
      const W = C.wizard;
      if (live || !layer || !W || !W.enabled) return;
      live = wizard(layer, W);
    },
    // pet.exe (Start menu): a little window with him, his mood and his pets.
    openExe(opts) { if (live) live.openExe(opts || {}); },
    // The desktop menu's Refresh: a flip (just a grin with reduced motion).
    trick() { if (live) live.trick(); },
    // A secret code: the party hat and a little dance.
    party() { if (live) live.party(); },
    // Called over to a point on the screen (a double-click on the empty
    // desktop): false if he isn't about or can't come (he's being carried).
    summon(x, y) { return live ? live.summon(x, y) : false; },
    // Says a line, if he's about (false if he isn't).
    say(text, ms) { return live ? live.speak(text, ms) : false; },
    // The picture for one of his drawings (or its stand-in), for anything
    // else that shows a wizard, like Wizard Sweeper. Works even if he's retired.
    frame: frameSrc,
  };

  function wizard(layer, W) {
    const RM = K.REDUCE_MOTION;
    const desktop = layer.parentElement;
    const root = document.documentElement;
    const PHONE = window.matchMedia('(max-width: 760px)');
    const TOUCH = window.matchMedia('(hover: none)');

    const src = sources();
    if (!src.idle) return null;
    const lineOf = (key) => pick(linesOf(W[key], DEFAULT_LINES[key]));

    layer.innerHTML = `
      <div class="pet">
        <p class="pet-bubble" hidden></p>
        <button class="pet-sprite" type="button" aria-label="Pet the wizard">
          <span class="pet-body"><span class="pet-pic"></span></span>
        </button>
      </div>`;
    const el = layer.firstElementChild;
    const bubble = el.querySelector('.pet-bubble');
    const btn = el.querySelector('.pet-sprite');
    const body = el.querySelector('.pet-body');
    // The animated him, or his picture if wizard-rig.js is missing. (The
    // drawing animates itself, so the page's breathing and squishing go on
    // .pet-pic round it, never on the svg.)
    const pic = el.querySelector('.pet-pic');
    if (RIG) pic.innerHTML = RIG.svg;
    const rig = pic.querySelector('svg.wz');
    if (!rig) pic.innerHTML = `<img src="${K.esc(src.idle)}" alt="" decoding="async" draggable="false" />`;
    const img = rig ? null : pic.querySelector('img');
    // No motion (reduced motion, or no rig): he wears his still drawings.
    const STILLS = RM || !rig;
    let preloaded = false;
    const preload = () => {
      if (preloaded) return;
      preloaded = true;
      Object.keys(src).forEach((k) => {
        if (GAME_ONLY.indexOf(k) === -1) { const pre = new Image(); pre.src = src[k]; }
      });
    };
    if (STILLS) preload();

    /* ---------- how he looks ----------
       On his drawing, data-state is what he's doing (idle, happy, held,
       dizzy, asleep, party), data-play a one-shot over it (startled, wave,
       a teleport, a way out of a state) and data-eyes a blink. Without
       motion he wears the matching still instead, and pet.exe always shows
       the still. */
    // The still for each state and one-shot not named after one.
    const STILL_OF = {
      teleport: 'idle', wake: 'idle', 'happy-out': 'idle', 'held-out': 'idle', 'dizzy-out': 'idle',
      'teleport-out': 'idle', 'teleport-in': 'idle', 'party-in': 'party', 'party-out': 'party',
    };
    const stillOf = (name) => STILL_OF[name] || name;
    // Without motion these one-shots show their still for as long as they'd
    // play; the rest are over at once.
    const OWN_STILL = { startled: true, wave: true };
    let exe = null;     // pet.exe's moving parts, while its window is open
    let frame = 'idle'; // the still he's wearing (pet.exe shows it)
    const toExe = (name) => {
      const s = frameSrc(name);
      if (exe && exe.img.getAttribute('src') !== s) exe.img.setAttribute('src', s);
    };
    const wear = (name) => {
      frame = name;
      if (img) { const s = frameSrc(name); if (img.getAttribute('src') !== s) img.setAttribute('src', s); }
      if (rig && STILLS) rig.setAttribute('data-frame', name);
      toExe(name);
    };
    // What he's doing: a state.
    const look = (s) => {
      if (!STILLS) {
        rig.removeAttribute('data-eyes');
        rig.setAttribute('data-state', s);
      }
      wear(stillOf(s));
    };
    // A step of a blink (null: eyes open). pet.exe blinks along.
    const EYE_STILL = { droop: 'idle', half: 'half', slit: 'half', closed: 'blink' };
    const eyes = (v) => {
      const still = v ? EYE_STILL[v] || v : 'idle';
      if (STILLS) { wear(still); return; }
      if (v) rig.setAttribute('data-eyes', v);
      else rig.removeAttribute('data-eyes');
      toExe(still);
    };

    /* One-shots play over the state, which stays set. When one ends, `then`
       sets what comes next (a state, or straight into another one-shot, as
       a teleport's two halves do) and data-play is cleared in the same
       step, so he never shows a frame of anything else. It ends with its
       animation (animationend), or after its time if that never comes.
       `speed` plays it faster (a hurried teleport). */
    let playing = null; // { name, dur, then, timer }
    const ANIM = (name) => 'wz-' + name.replace('teleport', 'tp') + '-'; // its animations' names start so
    function play(name, then, speed) {
      const again = !STILLS && rig.getAttribute('data-play') === name;
      if (playing) { // one cut short by this one
        clearTimeout(playing.timer);
        if (!STILLS) rig.style.removeProperty('--wz-dur-' + playing.name);
      }
      const p = { name, then, dur: Math.round((DUR[name] || 0) / (speed || 1)) };
      playing = p;
      wear(stillOf(name));
      if (!STILLS) {
        rig.removeAttribute('data-eyes');
        if (again) { rig.removeAttribute('data-play'); void rig.getBoundingClientRect(); } // so it starts over
        if (speed) rig.style.setProperty('--wz-dur-' + name, p.dur + 'ms');
        rig.setAttribute('data-play', name);
        p.timer = setTimeout(() => finish(p), p.dur + 120);
      } else if (OWN_STILL[name]) p.timer = setTimeout(() => finish(p), p.dur);
      else finish(p);
    }
    function finish(p) {
      if (playing !== p) return;
      clearTimeout(p.timer);
      playing = null;
      if (!STILLS) rig.style.removeProperty('--wz-dur-' + p.name);
      if (p.then) p.then();
      if (!playing && !STILLS) rig.removeAttribute('data-play');
    }
    // Cut a one-shot short (what it was leading to doesn't happen).
    function stopPlay() {
      if (playing) {
        clearTimeout(playing.timer);
        if (!STILLS) rig.style.removeProperty('--wz-dur-' + playing.name);
        playing = null;
      }
      if (!STILLS) rig.removeAttribute('data-play');
    }
    if (rig) {
      rig.addEventListener('animationend', (e) => {
        const p = playing;
        if (p && e.animationName.indexOf(ANIM(p.name)) === 0 && e.elapsedTime * 1000 > p.dur - 40) finish(p);
      });
    }
    // Short ways out of a state, which a pet or a grab may cut short. The
    // rest (a startle, a wave, the party hat spinning) play on.
    const SHORT = { 'happy-out': true, 'held-out': true, 'dizzy-out': true, wake: true };

    /* ---------- memory ----------
       Nothing is saved until the first pet. After that: how many pets he's
       had, when you met, when you were last here and whether you've
       carried him (so he stops explaining how). */
    const mem = K.store.get(PET_KEY, null) || {};
    mem.pets = Math.max(0, Math.floor(Number(mem.pets) || 0));
    const friend = mem.pets > 0;
    const welcome = friend && Date.now() - (Number(mem.last) || 0) > AWAY;
    const saveMem = () => {
      if (mem.pets > 0) K.store.set(PET_KEY, { pets: mem.pets, since: mem.since || Date.now(), last: mem.last || Date.now(), carried: !!mem.carried });
    };
    const seen = () => { if (mem.pets > 0) { mem.last = Date.now(); saveMem(); } };
    seen();
    window.addEventListener('pagehide', seen);

    /* ---------- speech bubbles ---------- */
    let bubbleTimer;
    let lastSaid = 0;
    let said = '';
    const say = (text, ms) => {
      if (!text) return;
      said = text;
      bubble.textContent = text;
      bubble.hidden = false;
      lastSaid = Date.now();
      fitBubble();
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => { bubble.hidden = true; said = ''; syncExe(); }, ms || 2600);
      syncExe();
    };
    // Keep the bubble in sight: under him when there's no room above, and
    // nudged sideways away from the desktop's edges and any window beside him.
    function fitBubble() {
      if (bubble.hidden) return;
      bubble.style.removeProperty('--shift');
      bubble.classList.remove('is-below');
      const d = desktop.getBoundingClientRect();
      let r = bubble.getBoundingClientRect();
      if (r.top < d.top + 4) { bubble.classList.add('is-below'); r = bubble.getBoundingClientRect(); }
      const me = layer.getBoundingClientRect();
      const mid = me.left + me.width / 2;
      let lo = d.left + 6;
      let hi = d.right - 6;
      document.querySelectorAll('#windows > .win:not([hidden])').forEach((w) => {
        const wr = w.getBoundingClientRect();
        if (!wr.width || wr.bottom <= r.top || wr.top >= r.bottom) return;
        if (wr.left >= mid) hi = Math.min(hi, wr.left - 6);
        else if (wr.right <= mid) lo = Math.max(lo, wr.right + 6);
      });
      const shift = r.left < lo ? lo - r.left : r.right > hi ? hi - r.right : 0;
      const room = Math.max(0, r.width / 2 - 18); // the tail stays on the bubble
      if (shift) bubble.style.setProperty('--shift', clamp(shift, -room, room).toFixed(1) + 'px');
    }

    /* ---------- what he's up to ----------
       idle (sitting about), teleport (popping off somewhere else), happy
       (just petted), asleep, held (being carried), dizzy (just put down)
       or party (a secret code). A one-shot may be playing over any of them. */
    let state = 'idle';
    const setState = (s) => {
      state = s;
      el.classList.toggle('is-teleporting', s === 'teleport');
      el.classList.toggle('is-held', s === 'held');
      btn.classList.toggle('asleep', s === 'asleep');
      syncExe();
    };
    // Sitting about with nothing playing: free for whatever's next.
    const free = () => state === 'idle' && !playing;
    let moodTimer; // what happens next after a reaction (happy, dizzy, a party...)
    // Back to sitting about.
    const toIdle = () => { setState('idle'); look('idle'); scheduleBlink(); };

    // He blinks on his own (not with reduced motion), now and then twice.
    let blinkTimer = null;
    const canBlink = !RM && (!!rig || !!(src.half || src.blink));
    const BLINK = rig ? RIG.blink : [['half', 80], ['blink', 90], ['half', 80]];
    const stopBlink = () => {
      clearTimeout(blinkTimer);
      blinkTimer = null;
      if (!STILLS) rig.removeAttribute('data-eyes');
    };
    const scheduleBlink = () => {
      stopBlink();
      if (canBlink) blinkTimer = setTimeout(() => blink(Math.random() < 1 / 6), 2800 + Math.random() * 4200);
    };
    function blink(twice) {
      const start = performance.now();
      let at = 0; // each step's time from the start, so timer delays don't add up
      const step = (i) => {
        if (!free()) { scheduleBlink(); return; } // (which opens his eyes)
        if (i < BLINK.length) {
          eyes(BLINK[i][0]);
          at += BLINK[i][1];
          blinkTimer = setTimeout(() => step(i + 1), Math.max(0, start + at - performance.now()));
          return;
        }
        eyes(null);
        if (twice) blinkTimer = setTimeout(() => blink(false), (RIG && RIG.blinkGap) || 120);
        else scheduleBlink();
      };
      step(0);
    }

    // He naps when ignored (sooner late at night). Any attention puts it off.
    let sleepTimer;
    let sleepy = false; // nodded off mid-teleport: he naps when he lands
    let dozedAt = 0;    // when he nodded off
    const night = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
    const sleep = () => {
      if (state === 'teleport') { sleepy = true; return; }
      if (!free()) { rest(); return; }
      stopBlink();
      setState('asleep');
      look('asleep');
      dozedAt = Date.now();
    };
    // Dozing off still (his eyes aren't shut yet): waking him is just sitting up.
    const dozing = () => !STILLS && Date.now() - dozedAt < 1600;
    // Awake again (from asleep), then `then`.
    function wake(then) {
      stopBlink();
      setState('idle');
      const up = () => { look('idle'); scheduleBlink(); if (then) then(); };
      if (dozing()) up();
      else play('wake', up);
    }
    const rest = () => {
      sleepy = false;
      clearTimeout(sleepTimer);
      const after = Math.max(10, W.sleepAfter || 60) * (night() ? 0.5 : 1);
      sleepTimer = setTimeout(sleep, after * 1000);
    };

    // Happiness, out of 5: a pet adds one, being ignored slowly takes them away.
    let hearts = friend ? 3 : 2;
    let lastPet = 0;
    setInterval(() => {
      if (hearts > 0 && state !== 'asleep' && Date.now() - lastPet > 60000) { hearts--; syncExe(); }
    }, 60000);

    /* ---------- where he is ----------
       pos is his top-left corner on the desktop. A visitor who has moved
       him gets his spot remembered (kasai:desktop, beside the icons). */
    const pos = { x: 0, y: 0 };
    const size = () => ({ w: layer.offsetWidth || 232, h: layer.offsetHeight || 232 });
    const area = () => {
      const s = size();
      const dw = desktop.clientWidth;
      const dh = desktop.clientHeight;
      return { w: s.w, h: s.h, dw, dh, minX: 6, maxX: Math.max(6, dw - s.w - 6), minY: 6, maxY: Math.max(6, dh - s.h - 6) };
    };
    const place = (x, y) => {
      pos.x = x;
      pos.y = y;
      layer.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    };
    const spotKey = () => (PHONE.matches ? 'pet-phone' : 'pet');
    let keepSpot = false;
    // Where he was last called to (see "calling him"), while he's still there.
    let calledTo = null;
    const atCall = () => !!calledTo && calledTo.x === pos.x && calledTo.y === pos.y;
    const saveSpot = () => {
      const a = area();
      const items = K.store.get(DESK_KEY, { items: {} }).items || {};
      items[spotKey()] = [Number((pos.x / a.dw).toFixed(4)), Number((pos.y / a.dh).toFixed(4))];
      K.store.set(DESK_KEY, { items });
    };
    // His spot: where you last left him, or the bottom-right corner (the
    // bottom of a phone's home screen) the first time.
    function home() {
      const a = area();
      const s = (K.store.get(DESK_KEY, { items: {} }).items || {})[spotKey()];
      keepSpot = Array.isArray(s) && s.length === 2 && s.every((n) => Number.isFinite(n));
      if (keepSpot) return { x: clamp(s[0] * a.dw, a.minX, a.maxX), y: clamp(s[1] * a.dh, a.minY, a.maxY) };
      return PHONE.matches ? { x: (a.dw - a.w) / 2, y: a.maxY - 10 } : { x: a.maxX - 22, y: a.maxY - 2 };
    }

    // Everything he'd rather not sit under or on: open windows, the icons,
    // and the icons' column while they're still lined up down the side.
    function obstacles() {
      const d = desktop.getBoundingClientRect();
      const ox = d.left - desktop.scrollLeft;
      const oy = d.top - desktop.scrollTop;
      const box = (r, pad) => ({ x: r.left - ox - pad, y: r.top - oy - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
      const wins = [];
      document.querySelectorAll('#windows > .win:not([hidden])').forEach((w) => {
        const r = w.getBoundingClientRect();
        if (r.width && r.height) wins.push(box(r, 0));
      });
      const icons = [];
      let left = Infinity;
      let right = -Infinity;
      desktop.querySelectorAll('.desk-icon').forEach((i) => {
        const r = i.getBoundingClientRect();
        if (!r.width || !r.height) return;
        icons.push(box(r, 8));
        left = Math.min(left, r.left - ox);
        right = Math.max(right, r.right - ox);
      });
      const column = !PHONE.matches && icons.length && right - left < desktop.clientWidth * 0.35
        ? { x: left - 12, y: -9999, w: right - left + 24, h: 99999 } : null;
      return { wins, icons, column };
    }
    const overlap = (a, b) =>
      Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    // The drawn part of him (his picture has a little air round the edges).
    const bodyAt = (p, s) => ({ x: p.x + s.w * 0.14, y: p.y + s.h * 0.04, w: s.w * 0.72, h: s.h * 0.92 });
    // How much of him windows hide, how much sits on icons and how much is
    // in the icons' column (each 0 to 1).
    function cover(p, obs, s) {
      const b = bodyAt(p, s);
      const all = b.w * b.h;
      let win = 0;
      let icon = 0;
      obs.wins.forEach((r) => { win += overlap(b, r); });
      obs.icons.forEach((r) => { icon += overlap(b, r); });
      const col = obs.column ? overlap(b, obs.column) / all : 0;
      return { win: Math.min(1, win / all), icon: Math.min(1, icon / all), col };
    }
    // One number for "how much is he in the way": windows count most.
    const badness = (cv) => cv.win * 10 + cv.icon * 6 + cv.col * 4;
    const coverNow = () => cover(pos, obstacles(), size());

    // Somewhere to go: 'wander' looks for a free spot a short hop away,
    // 'escape' for the nearest free spot (out from behind a window).
    function findSpot(mode) {
      const a = area();
      const obs = obstacles();
      const cands = [];
      for (let i = 0; i < 40; i++) {
        cands.push({ x: a.minX + Math.random() * (a.maxX - a.minX), y: a.minY + Math.random() * (a.maxY - a.minY) });
      }
      if (mode === 'escape') {
        // Just past each edge of whatever is in his way.
        const b = bodyAt(pos, a);
        const gap = 16;
        obs.wins.concat(obs.icons, obs.column ? [obs.column] : []).forEach((r) => {
          if (!overlap(b, r)) return;
          cands.push(
            { x: r.x - a.w * 0.86 - gap, y: pos.y }, { x: r.x + r.w - a.w * 0.14 + gap, y: pos.y },
            { x: pos.x, y: r.y - a.h * 0.96 - gap }, { x: pos.x, y: r.y + r.h - a.h * 0.04 + gap });
        });
      }
      let best = null;
      cands.forEach((c) => {
        c.x = clamp(c.x, a.minX, a.maxX);
        c.y = clamp(c.y, a.minY, a.maxY);
        const cv = cover(c, obs, a);
        // Room above him for a speech bubble counts a little too.
        const talk = { x: c.x - 45, y: c.y - 54, w: a.w + 90, h: 54 };
        let hush = 0;
        obs.wins.forEach((r) => { hush += overlap(talk, r); });
        const dist = Math.hypot(c.x - pos.x, c.y - pos.y);
        let score = badness(cv) + Math.min(1, hush / (talk.w * talk.h)) * 1.5;
        score += mode === 'escape' ? dist / 700 : Math.abs(dist - 240) / 500 + (dist < 60 ? 3 : 0);
        if (!best || score < best.score) best = { x: c.x, y: c.y, score, cover: cv };
      });
      return best;
    }

    /* ---------- getting about ----------
       He teleports: his hat's star glows, he vanishes in a flash and pops
       up at the new spot (teleport-out, a move while he's gone, then
       teleport-in). Out from behind a window he's half as quick again.
       With reduced motion he's simply somewhere else. */
    let trip = null; // where a teleport is taking him: { x, y, then }
    function goTo(x, y, then, hurry) {
      if (STILLS) { place(x, y); arrive(then); return; }
      stopBlink();
      setState('teleport');
      trip = { x, y, then };
      const speed = hurry ? 1.5 : 0;
      play('teleport-out', () => {
        place(trip.x, trip.y);
        fitBubble();
        play('teleport-in', () => arrive(trip.then), speed);
      }, speed);
    }
    function arrive(then) {
      trip = null;
      setState('idle');
      look('idle');
      fitBubble();
      if (keepSpot) saveSpot();
      if (sleepy) sleep();
      else scheduleBlink();
      if (then) then();
    }

    // Out from behind a window (or off an icon) by the shortest way. Says
    // false when there's nowhere better to be.
    let stuckUntil = 0;
    function popOut(then) {
      const here = coverNow();
      const spot = findSpot('escape');
      if (!spot || spot.cover.win > 0.3 || badness(spot.cover) > badness(here) - 0.5) {
        stuckUntil = Date.now() + 8000; // sit tight and look again in a bit
        return false;
      }
      goTo(spot.x, spot.y, then, here.win > 0.3);
      return true;
    }
    function wander() {
      const spot = findSpot('wander');
      if (spot && spot.cover.win < 0.15 && spot.cover.icon < 0.05 && spot.cover.col < 0.1) goTo(spot.x, spot.y);
    }
    // Say something where it can be seen: if a window is hiding him, he
    // pops out first.
    function speakOut(text, ms, then) {
      if (!text) return;
      const go = () => { say(text, ms); if (then) then(); };
      if (free() && coverNow().win > 0.45 && popOut(go)) return;
      go();
    }

    // Every so often he looks around: out from under a window that has
    // landed on him, or off somewhere else. Called to a spot, he stays put
    // even in the icons' column (not on an icon, or under a window) until
    // he next wanders.
    let coveredAt = 0;
    let nextWander = Date.now() + wanderIn();
    function think() {
      if (document.hidden || playing || state === 'held' || state === 'teleport' || state === 'happy' || state === 'dizzy' || state === 'party') return;
      const now = Date.now();
      const cv = coverNow();
      if ((cv.win > 0.45 || cv.icon > 0.2 || (cv.col > 0.5 && !atCall())) && state !== 'asleep') {
        if (!coveredAt) coveredAt = now;
        if (now - coveredAt > 1200 && now > stuckUntil) popOut();
        return;
      }
      coveredAt = 0;
      if (state === 'idle' && !STILLS && now > nextWander) {
        nextWander = now + wanderIn();
        wander();
      }
    }
    setInterval(think, 900);

    /* ---------- petting ----------
       A click, a tap or Enter. Every tenth pet: doodle rain (which also
       unlocks the doodle trail). */
    let pets = 0; // this visit
    let hinted = false;
    const poked = {};
    const quiet = W.quietPages || [];
    const lineFor = (app) => pick(linesOf((W.lines || {})[app], []));
    const frontApp = () => {
      const f = K.wm && K.wm.front();
      if (!f) return null;
      return K.apps && K.apps[f.id] ? f.id : (f.spec && f.spec.parent) || null;
    };
    let swallowUntil = 0; // the click that ends a carry isn't a pet
    btn.addEventListener('click', () => {
      if (performance.now() < swallowUntil) return;
      petHim();
    });
    function petHim() {
      if (state === 'held' || state === 'teleport') return;
      bubble.setAttribute('role', 'status'); // from now on, what he says is read out too
      rest();
      nextWander = Date.now() + wanderIn();
      if (state === 'asleep') {
        // Poked awake: a start (his hat jumps off), unless he's only nodding off.
        const hello = () => say('...huh? oh. hello again.');
        if (dozing()) { wake(hello); return; }
        stopBlink();
        setState('idle');
        play('startled', () => { look('idle'); scheduleBlink(); hello(); });
        return;
      }
      pets++;
      lastPet = Date.now();
      hearts = Math.min(5, hearts + 1);
      mem.pets++;
      mem.since = mem.since || Date.now();
      mem.last = Date.now();
      saveMem();
      btn.classList.remove('petted');
      void btn.offsetWidth; // restart the squish
      btn.classList.add('petted');
      // He beams, unless he's busy showing something (a start, a wave, the
      // party hat), which plays on.
      if (!(playing && !SHORT[playing.name]) && state !== 'party') {
        stopPlay();
        clearTimeout(moodTimer);
        stopBlink();
        setState('happy');
        look('happy');
        moodTimer = setTimeout(() => { if (state === 'happy') play('happy-out', toIdle); }, 900);
      }
      if (pets % 10 === 0) {
        if (K.doodleRain()) say('DOODLE RAIN!!!', 4000);
        else say('<3', 2000);
        return;
      }
      // Poked while a quiet window is in front: that window's line, once.
      const app = frontApp();
      const line = app && quiet.indexOf(app) !== -1 && !poked[app] ? lineFor(app) : '';
      if (line) { poked[app] = true; say(line, 3000); return; }
      if (pets === 3 && !mem.carried && !hinted) {
        hinted = true;
        say(TOUCH.matches ? 'psst... press and hold to pick me up.' : 'psst... you can drag me about, you know.', 3600);
        return;
      }
      const pl = linesOf(W.petLines, []);
      if (pl.length) say(pl[(pets - 1) % pl.length], 1600);
    }
    // Tabbing to him while a window hides him brings him out to say hello.
    btn.addEventListener('focus', () => {
      if (free() && btn.matches(':focus-visible') && coverNow().win > 0.3) popOut();
    });

    /* ---------- picking him up ----------
       Drag him with a mouse or pen. On a touch screen, rest a finger on him
       for a moment first, so a swipe never turns into a kidnapping. He
       hangs from his hat: its tip slides under the mouse, and a finger
       holds him from about his own height above it, so he stays in sight.
       Mid-teleport he can't be caught. */
    let press = null;
    let swing = { a: 0, v: 0 };
    let vx = 0;
    let lastMove = 0;
    const ptr = { x: 0, y: 0 }; // the pointer holding him
    let hold = null;            // where on him it holds him, in his box (as he looks while held)
    let holdTo = null;          // where that slides to: his hat tip (a finger: his own height below it)
    let tipAt = null;           // his hat tip, as he looks while held
    let byTouch = false;
    let lastFollow = 0;
    let lastPy = 0;
    let settled = null;         // where he'd be, held by his hat
    btn.addEventListener('pointerdown', (e) => {
      if (press || state === 'teleport' || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const r = layer.getBoundingClientRect();
      press = { id: e.pointerId, touch: e.pointerType === 'touch', x: e.clientX, y: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, held: false };
      if (press.touch) {
        press.timer = setTimeout(() => { if (press && !press.held && state !== 'teleport') pickUp(); }, LONG_PRESS);
      } else {
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is already gone */ }
      }
    });
    btn.addEventListener('pointermove', (e) => {
      if (!press || e.pointerId !== press.id) return;
      if (!press.held) {
        const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
        if (press.touch) {
          if (moved > 10) { clearTimeout(press.timer); press = null; } // a swipe, not a hold
          return;
        }
        if (moved < 5 || state === 'teleport') return;
        pickUp();
      }
      carry(e);
    });
    const endPress = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const p = press;
      press = null;
      clearTimeout(p.timer);
      if (!p.held) return; // a plain click or tap: that's a pet
      swallowUntil = performance.now() + 500;
      drop(e.type === 'pointerup' ? e : null);
    };
    btn.addEventListener('pointerup', endPress);
    btn.addEventListener('pointercancel', endPress);
    btn.addEventListener('lostpointercapture', endPress);
    // A held finger shouldn't open the browser's menu or scroll the page.
    btn.addEventListener('contextmenu', (e) => { if (press && press.touch) e.preventDefault(); });
    btn.addEventListener('touchmove', (e) => { if (press && press.held) e.preventDefault(); }, { passive: false });
    // Fingers on him only scroll when there's something to scroll.
    const fitTouch = () => { btn.style.touchAction = desktop.scrollHeight > desktop.clientHeight + 1 ? '' : 'none'; };

    function pickUp() {
      press.held = true;
      clearTimeout(press.timer);
      if (press.touch) { try { btn.setPointerCapture(press.id); } catch (err) { /* the finger already lifted */ } }
      const s = size();
      const hat = RIG ? RIG.hatTip.map((v) => v / RIG.size) : [0.5, 0.016];
      tipAt = { x: s.w / 2 + (s.w * hat[0] - s.w / 2) * LIFT, y: s.h / 2 + (s.h * hat[1] - s.h / 2) * LIFT };
      byTouch = press.touch;
      hold = { x: press.gx, y: press.gy };
      holdTo = byTouch ? { x: tipAt.x, y: tipAt.y + s.h } : tipAt;
      lastFollow = performance.now();
      lastPy = press.y;
      settled = null;
      const wasAsleep = state === 'asleep';
      stopPlay();
      clearTimeout(moodTimer);
      stopBlink();
      el.classList.remove('is-landing', 'is-trick', 'is-party');
      setState('held');
      look('held');
      root.classList.add('pet-carrying');
      swing = { a: 0, v: 0 };
      vx = 0;
      lastMove = 0;
      mem.carried = true;
      saveMem();
      bubble.setAttribute('role', 'status');
      rest();
      say(wasAsleep ? '!!' : lineOf('heldLines'), 2200);
      if (press.touch) carry({ clientX: press.x, clientY: press.y });
      if (!RM) run();
    }
    // Where he hangs for the pointer, held at `g` (relative to his box).
    function spotFor(g) {
      const d = desktop.getBoundingClientRect();
      const a = area();
      return {
        x: clamp(ptr.x - d.left + desktop.scrollLeft - g.x, a.minX, a.maxX),
        y: clamp(ptr.y - d.top + desktop.scrollTop - g.y, a.minY, a.maxY),
      };
    }
    // He follows the pointer, held at first where it caught him, then by his
    // hat: the hold slides up there in about 120 ms. Low down there may be no
    // room below him for that, so he comes up with the pointer at half its
    // speed while the hold slides up to his hat. He swings from the hold (a
    // finger's: from his hat).
    function follow() {
      const d = desktop.getBoundingClientRect();
      const a = area();
      const s = size();
      const px = ptr.x - d.left + desktop.scrollLeft;
      const py = ptr.y - d.top + desktop.scrollTop;
      const now = performance.now();
      const k = RM ? 1 : 1 - Math.exp(-Math.min(100, now - lastFollow) / 40);
      const rose = lastPy - ptr.y; // how far the pointer went up since last time
      lastFollow = now;
      lastPy = ptr.y;
      const rem = holdTo.y - hold.y; // to go: below 0 he drops to it, above 0 he rises
      const room = rem < 0 ? a.maxY - (py - hold.y) : py - hold.y - a.minY;
      const gain = Math.max(0, rem < 0 ? rose : -rose);
      hold.x += (holdTo.x - hold.x) * k;
      hold.y += Math.abs(rem) <= Math.max(0, room) ? rem * k : Math.sign(rem) * Math.min(Math.abs(rem), gain / 2);
      place(clamp(px - hold.x, a.minX, a.maxX), clamp(py - hold.y, a.minY, a.maxY));
      const pivot = byTouch ? tipAt : hold;
      body.style.transformOrigin = `${(s.w / 2 + (pivot.x - s.w / 2) / LIFT).toFixed(1)}px ${(s.h / 2 + (pivot.y - s.h / 2) / LIFT).toFixed(1)}px`;
    }
    function carry(e) {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      // How fast he's being swung about (the slide itself doesn't count).
      const at = spotFor(holdTo);
      const now = performance.now();
      const dt = lastMove ? Math.max(8, now - lastMove) / 1000 : 1;
      lastMove = now;
      if (settled) vx = vx * 0.6 + ((at.x - settled.x) / dt) * 0.4;
      settled = at;
      follow();
    }
    // He dangles from his hat, swinging behind as he's swung about.
    function stepSwing(dt) {
      vx *= Math.exp(-dt * 6);
      const target = clamp(vx * 0.045, -32, 32);
      swing.v += ((target - swing.a) * 90 - swing.v * 9) * dt;
      swing.a += swing.v * dt;
      body.style.transform = `rotate(${swing.a.toFixed(2)}deg)`;
      follow();
    }
    let raf = 0;
    let last = 0;
    let ticks = 0;
    function run() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function tick(t) {
      raf = 0;
      if (state !== 'held') return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      stepSwing(dt);
      if (!bubble.hidden && ++ticks % 8 === 0) fitBubble();
      raf = requestAnimationFrame(tick);
    }

    const land = () => {
      el.classList.remove('is-landing');
      void el.offsetWidth; // restart the bump
      el.classList.add('is-landing');
    };
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'pet-land') el.classList.remove('is-landing');
      if (e.animationName === 'pet-squish') btn.classList.remove('petted');
      if (e.animationName === 'pet-flip') el.classList.remove('is-trick');
      if (e.animationName === 'pet-party') el.classList.remove('is-party');
    });

    // Put down: his third eye closes (held-out), then a wobble and a
    // complaint, or (now and then) a nap right where he lands. The Recycle
    // Bin gets a flinch, a start and a word of its own.
    function drop(e) {
      root.classList.remove('pet-carrying');
      body.style.transform = '';
      body.style.transformOrigin = '';
      const a = area();
      place(clamp(pos.x, a.minX, a.maxX), clamp(pos.y, a.minY, a.maxY));
      keepSpot = true;
      saveSpot();
      nextWander = Date.now() + wanderIn();
      setState('dizzy');
      land();
      const bin = desktop.querySelector('.desk-icon[data-app="trash"]');
      if (bin && inBin(bin, e)) {
        bin.classList.remove('is-jiggling');
        void bin.offsetWidth;
        bin.classList.add('is-jiggling');
        setTimeout(() => bin.classList.remove('is-jiggling'), 700);
        const line = lineOf('trashLines');
        play('held-out', () => {
          look('idle');
          eyes('closed'); // a flinch
          moodTimer = setTimeout(() => {
            if (state !== 'dizzy') return;
            play('startled', () => {
              setState('idle');
              look('idle');
              if (!popOut()) scheduleBlink();
            });
            // His word once his hat is back on (it lands 950 ms into the
            // start), so the bubble doesn't hide it flying off.
            moodTimer = setTimeout(() => say(line, 3200), STILLS ? 0 : Math.round(DUR.startled * 950 / 1500));
          }, 60);
        });
        return;
      }
      const cv = coverNow();
      if (cv.win < 0.45 && cv.icon < 0.2 && cv.col < 0.5 && Math.random() < (night() ? 0.5 : 0.25)) {
        clearTimeout(moodTimer);
        play('held-out', () => {
          setState('asleep');
          look('asleep');
          dozedAt = Date.now();
        });
        return;
      }
      say(lineOf('dropLines'), 2400);
      play('held-out', () => {
        look('dizzy');
        // Dizzy for his way in and one whole loop, so he comes out of it
        // with his head still.
        moodTimer = setTimeout(() => { if (state === 'dizzy') play('dizzy-out', toIdle); }, DUR['dizzy-in'] + DUR.dizzy);
      });
    }
    function inBin(icon, e) {
      const r = icon.getBoundingClientRect();
      if (!r.width) return false;
      if (e && e.clientX > r.left - 12 && e.clientX < r.right + 12 && e.clientY > r.top - 12 && e.clientY < r.bottom + 12) return true;
      const d = desktop.getBoundingClientRect();
      const ib = { x: r.left - d.left + desktop.scrollLeft, y: r.top - d.top + desktop.scrollTop, w: r.width, h: r.height };
      return overlap(bodyAt(pos, size()), ib) > ib.w * ib.h * 0.35;
    }

    /* ---------- when windows open ----------
       A line for each app's first opening (at most every 8 seconds, never
       in his sleep). A window with lines of its own (the CV) gets those
       instead of its app's. Windows listed in quietPages wait to be asked. */
    let quietUntil = 0;
    K.on('open', (e) => {
      setTimeout(think, 650); // a new window may have landed on him
      const key = (W.lines || {})[e.id] ? e.id : e.app;
      if (!e.first || !key || quiet.indexOf(key) !== -1) return;
      if (state === 'asleep' || state === 'held' || Date.now() < quietUntil || Date.now() - lastSaid < 8000) return;
      const line = lineFor(key);
      if (line) setTimeout(() => { if (state !== 'asleep' && state !== 'held') speakOut(line, 3600); }, 700);
    });

    /* ---------- tricks and parties ----------
       Refresh (the desktop menu) gets a flip; a secret code gets the party
       hat (it spins into one, he dances, and it spins back) . With reduced
       motion he just beams, or wears the hat. If a window is hiding him he
       pops out first, so nobody misses the show. Mid-teleport, the show
       waits until he lands. */
    function perform(kind) {
      if (state === 'held') return;
      if (state === 'teleport') {
        if (trip) { const then = trip.then; trip.then = () => { if (then) then(); perform(kind); }; }
        return;
      }
      if (state === 'asleep') { wake(() => perform(kind)); return; }
      const go = () => {
        if (state === 'held' || state === 'teleport') return;
        stopPlay();
        clearTimeout(moodTimer);
        rest();
        nextWander = Date.now() + wanderIn();
        stopBlink();
        el.classList.remove('is-landing', 'is-trick', 'is-party');
        bubble.setAttribute('role', 'status');
        if (kind === 'party') {
          setState('party');
          look('idle'); // party-in starts from his idle pose
          say(lineOf('partyLines'), 3400);
          play('party-in', () => {
            look('party');
            if (!RM) { void el.offsetWidth; el.classList.add('is-party'); } // the dance: three of his party loops
            moodTimer = setTimeout(() => { if (state === 'party') play('party-out', toIdle); }, DUR.party * 3);
          });
        } else {
          setState('happy');
          look('happy');
          say(lineOf('trickLines'), 2400);
          moodTimer = setTimeout(() => { if (state === 'happy') play('happy-out', toIdle); }, 1300);
          if (RM) return;
          void el.offsetWidth; // restart the flip
          el.classList.add('is-trick');
        }
      };
      if (free() && coverNow().win > 0.45 && popOut(go)) return;
      go();
    }
    const speak = (text, ms) => {
      if (!text) return false;
      bubble.setAttribute('role', 'status');
      speakOut(text, ms || 3000);
      return true;
    };

    /* ---------- calling him ----------
       A double-click on an empty bit of the desktop (a double-tap on a
       phone; kasai-os.js) calls him over. He teleports there (or just
       beside it, rather than under a window or on the icons) and says so
       (wizard.lines.summon). Asleep, he wakes with a start first.
       Mid-teleport he lands first, then comes; busy with something else
       (a wobble, a wave, the party) he comes once it's over, if that's
       within a few seconds. While he's carried, the call is ignored. The
       spot is remembered, like one he's dropped on. With reduced motion
       he's simply there. */
    let call = null; // the latest call he hasn't answered yet: { x, y, until }
    let callTimer = 0;
    function summon(x, y) {
      if (state === 'held' || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      call = { x, y, until: Date.now() + 6000 };
      answer();
      return true;
    }
    function answer() {
      clearTimeout(callTimer);
      const c = call;
      if (!c) return;
      if (state === 'held' || Date.now() > c.until) { call = null; return; }
      if (state === 'teleport') {
        // Once he lands (just once, however many calls come meanwhile).
        if (trip && !trip.called) {
          const then = trip.then;
          trip.called = true;
          trip.then = () => { if (then) then(); answer(); };
        }
        return;
      }
      if (state === 'asleep') {
        rest();
        if (dozing()) { wake(answer); return; } // only nodding off: he just sits up
        stopBlink();
        setState('idle');
        play('startled', () => { look('idle'); scheduleBlink(); answer(); });
        return;
      }
      if (!free()) { callTimer = setTimeout(answer, 200); return; }
      call = null;
      come(c);
    }
    function come(c) {
      const spot = spotNear(c);
      rest();
      nextWander = Date.now() + wanderIn();
      bubble.setAttribute('role', 'status'); // from now on, what he says is read out too
      keepSpot = true;
      const line = pick(linesOf((W.lines || {}).summon, SUMMON_LINES));
      const hello = () => { calledTo = { x: pos.x, y: pos.y }; say(line, 2400); };
      if (Math.hypot(spot.x - pos.x, spot.y - pos.y) < 12) { saveSpot(); hello(); return; } // already there
      goTo(spot.x, spot.y, hello);
    }
    // Where he lands when called to the point `c` on the screen: his middle
    // on it, or the nearest spot (within 240px) where he'd stay put, not
    // mostly hidden by a window or sitting on the icons (see think).
    function spotNear(c) {
      const s = size();
      const a = area();
      const obs = obstacles();
      const d = desktop.getBoundingClientRect();
      const cx = c.x - d.left + desktop.scrollLeft;
      const cy = c.y - d.top + desktop.scrollTop;
      let best = null;
      for (let dx = -240; dx <= 240; dx += 24) {
        for (let dy = -240; dy <= 240; dy += 24) {
          const p = { x: clamp(cx - s.w / 2 + dx, a.minX, a.maxX), y: clamp(cy - s.h / 2 + dy, a.minY, a.maxY) };
          const cv = cover(p, obs, s);
          const stays = cv.win <= 0.45 && cv.icon <= 0.2;
          const away = Math.hypot(p.x + s.w / 2 - cx, p.y + s.h / 2 - cy);
          const score = (stays ? 0 : 100) + away / 60 + (cv.win + cv.icon) * 2;
          if (!best || score < best.score) best = { x: p.x, y: p.y, score };
        }
      }
      return best;
    }

    /* ---------- waving hello ----------
       His star glows and a magic hand waves from his top left. For old
       friends back after a while (below), and for anyone back on his tab
       after waveAway seconds or more, at most every 30 seconds, as long as
       he's sitting about. */
    let lastWave = 0;
    const waveHello = () => {
      if (!free()) return;
      lastWave = Date.now();
      stopBlink();
      play('wave', toIdle);
    };
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); seen(); return; }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      const after = Number.isFinite(W.waveAway) ? W.waveAway : 10;
      if (away < after * 1000 || Date.now() - lastWave < WAVE_GAP || !free()) return;
      setTimeout(() => {
        if (document.hidden || !free() || Date.now() - lastWave < WAVE_GAP) return;
        lastWave = Date.now(); // even if he has to pop out from behind a window first
        speakOut(lineOf('welcomeBack'), 3000, waveHello);
      }, 400);
    });

    /* ---------- pet.exe ---------- */
    const moodText = () => BUSY[state] || FEELING[clamp(hearts, 0, 5)];
    const heartRow = () => {
      let out = '';
      for (let i = 0; i < 5; i++) out += `<span class="${i < hearts ? 'is-full' : ''}">${K.doodleIcon('heart')}</span>`;
      return out + `<span class="vh">${hearts} out of 5</span>`;
    };
    function syncExe() {
      if (!exe) return;
      exe.mood.textContent = moodText();
      exe.hearts.innerHTML = heartRow();
      exe.pets.textContent = mem.pets === pets ? String(pets) : `${mem.pets} (${pets} this visit)`;
      exe.since.hidden = !mem.since;
      if (mem.since) {
        exe.sinceDate.textContent = new Date(mem.since).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
      }
      exe.said.hidden = !said;
      exe.said.textContent = said;
    }
    function openExe(opts) {
      preload(); // so his stills swap without a flicker
      K.wm.open({
        id: 'pet',
        label: 'pet.exe',
        file: 'pet.exe',
        colour: 'teal',
        doodle: 'hat',
        size: [380, 548],
        minSize: [300, 360],
        render(win) {
          win.body.innerHTML = `
            <div class="petexe-stage">
              <p class="petexe-said" hidden></p>
              <img class="petexe-wizard" src="${K.esc(frameSrc(frame))}" alt="" draggable="false" />
            </div>
            <div class="petexe-info">
              <h2 class="petexe-name" id="${win.headingId}" tabindex="-1">Pet Wizard</h2>
              <dl class="petexe-stats">
                <div><dt>Mood</dt><dd data-mood></dd></div>
                <div><dt>Happiness</dt><dd class="petexe-hearts" data-hearts></dd></div>
                <div><dt>Pets</dt><dd data-pets></dd></div>
                <div data-since hidden><dt>Friends since</dt><dd data-since-date></dd></div>
              </dl>
              <p class="petexe-actions"><button class="os-button" type="button" data-pet>${K.doodleIcon('heart')}Pet him</button></p>
            </div>`;
          const q = (s) => win.body.querySelector(s);
          exe = {
            img: q('.petexe-wizard'),
            said: q('.petexe-said'),
            mood: q('[data-mood]'),
            hearts: q('[data-hearts]'),
            pets: q('[data-pets]'),
            since: q('[data-since]'),
            sinceDate: q('[data-since-date]'),
          };
          q('[data-pet]').addEventListener('click', petHim);
          exe.img.addEventListener('click', petHim);
          win.setStatus(K.hint('Click to pet, drag to carry', 'Tap to pet, hold to carry'));
          syncExe();
        },
        onClose() { exe = null; },
      }, { from: opts.from });
    }

    /* ---------- off he goes ---------- */
    const start = home();
    place(start.x, start.y);
    look('idle');
    // A tab opened in the background may have no desktop yet: he finds his
    // spot once it has a size.
    let homed = desktop.clientWidth > 0 && desktop.clientHeight > 0;
    fitTouch();
    rest();
    scheduleBlink();
    // Old friends get a hello of their own (instead of the first window's line).
    if (welcome) {
      quietUntil = Date.now() + 9000;
      lastWave = Date.now();
      setTimeout(() => speakOut(lineOf('welcomeBack'), 3800, waveHello), 1500);
    }

    // Keep him on the desktop when the browser window changes size.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!homed && desktop.clientWidth > 0 && desktop.clientHeight > 0) {
          homed = true;
          if (state !== 'held') { const h = home(); place(h.x, h.y); }
        }
        const a = area();
        if (trip) { trip.x = clamp(trip.x, a.minX, a.maxX); trip.y = clamp(trip.y, a.minY, a.maxY); }
        if (state !== 'held') place(clamp(pos.x, a.minX, a.maxX), clamp(pos.y, a.minY, a.maxY));
        fitTouch();
      }, 160);
    });
    // Phone home screen <-> desktop: each has its own spot.
    PHONE.addEventListener('change', () => {
      if (state === 'held') return;
      if (state === 'teleport') { stopPlay(); trip = null; toIdle(); }
      const h = home();
      place(h.x, h.y);
      fitTouch();
    });

    return { openExe, trick: () => perform('trick'), party: () => perform('party'), speak, summon };
  }
})();

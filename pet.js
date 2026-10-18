/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - THE PET WIZARD  (lives on the desktop, behind the windows)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. Everything about him (his lines, his
   drawings, how soon he naps) lives in content.js under "wizard".
   He wanders the free bits of the desktop with a little hop, blinks, beams
   when petted, naps when ignored and chats when a window opens. Drag him
   with the mouse (or press and hold on a touch screen) to carry him about.
   He remembers where you left him and whether you petted him, and pet.exe
   in the Start menu shows how he's doing. Pet him ten times for a surprise.
   The desktop menu's Refresh makes him do a trick, and the secret codes
   (kasai-os.js) throw him a party.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const C = K.C;
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

  /* ---------- his drawings ----------
     The five he started with plus the optional extras. A drawing that
     doesn't exist yet borrows the next one along its chain, and every chain
     ends at idle, so he always has something to wear. The games dress
     him (and Wizard Sweeper's wizards) from here too (K.pet.frame), so
     they borrow alike. */
  const BORROW = {
    half: 'idle', blink: 'idle', happy: 'idle', asleep: 'blink',
    walk1: 'idle', walk2: 'walk1', held: 'startled', startled: 'idle',
    dizzy: 'half', party: 'happy', wave: 'happy',
    sweeperTile: 'asleep',
    hop: 'walk2', bonk: 'idle', hurt: 'startled',
  };
  const FRAMES = ['idle'].concat(Object.keys(BORROW));
  // Only ever worn in the games, never by him on the desktop.
  const GAME_ONLY = ['sweeperTile', 'hop', 'bonk', 'hurt'];

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
  const SPEED = 66;                  // walking pace, pixels per second
  const HOP = 0.42;                  // seconds per hop
  const AIR = 0.72;                  // the part of each hop spent off the ground
  const LONG_PRESS = 450;            // ms a finger rests on him to pick him up

  // What pet.exe calls his mood: what he's busy with, or else how loved he feels.
  const BUSY = { asleep: 'Fast asleep', held: 'Being carried', dizzy: 'Seeing stars', walk: 'Out for a stroll', party: 'Partying' };
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
          <span class="pet-body"><img src="${K.esc(src.idle)}" alt="" decoding="async" draggable="false" /></span>
        </button>
      </div>`;
    const el = layer.firstElementChild;
    const bubble = el.querySelector('.pet-bubble');
    const btn = el.querySelector('.pet-sprite');
    const body = el.querySelector('.pet-body');
    const img = body.querySelector('img');
    Object.keys(src).forEach((k) => {
      if (GAME_ONLY.indexOf(k) === -1) { const pre = new Image(); pre.src = src[k]; }
    });

    let exe = null; // pet.exe's moving parts, while its window is open
    let frame = 'idle';
    const show = (name) => {
      frame = name;
      const s = frameSrc(name);
      if (img.getAttribute('src') !== s) img.setAttribute('src', s);
      if (exe && exe.img.getAttribute('src') !== s) exe.img.setAttribute('src', s);
    };

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
    document.addEventListener('visibilitychange', () => { if (document.hidden) seen(); });

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
       idle (sitting about), walk, happy (just petted), asleep, held (being
       carried), dizzy (just put down) or party (a secret code). */
    let state = 'idle';
    const setState = (s) => {
      state = s;
      el.classList.toggle('is-walking', s === 'walk');
      el.classList.toggle('is-held', s === 'held');
      btn.classList.toggle('asleep', s === 'asleep');
      syncExe();
    };
    let moodTimer;
    // Back to sitting about after a reaction (happy, dizzy...).
    const settleIn = (ms, from) => {
      clearTimeout(moodTimer);
      moodTimer = setTimeout(() => { if (state === from) { setState('idle'); show('idle'); scheduleBlink(); } }, ms);
    };

    // He blinks on his own (not with reduced motion).
    let blinkTimer = null;
    const canBlink = !RM && !!(src.half || src.blink);
    const stopBlink = () => { clearTimeout(blinkTimer); blinkTimer = null; };
    const scheduleBlink = () => {
      stopBlink();
      if (canBlink) blinkTimer = setTimeout(blink, 2800 + Math.random() * 4200);
    };
    function blink() {
      if (state !== 'idle') { scheduleBlink(); return; }
      show('half');
      setTimeout(() => { if (state === 'idle') show('blink'); }, 80);
      setTimeout(() => { if (state === 'idle') show('half'); }, 170);
      setTimeout(() => { if (state === 'idle') { show('idle'); scheduleBlink(); } }, 250);
    }

    // He naps when ignored (sooner late at night). Any attention puts it off.
    let sleepTimer;
    let sleepy = false; // nodded off mid-stroll: he naps when he gets there
    const night = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
    const sleep = () => {
      if (state === 'walk') { sleepy = true; return; }
      if (state !== 'idle') { rest(); return; }
      setState('asleep');
      stopBlink();
      show('asleep');
    };
    const wake = () => { setState('idle'); show('idle'); scheduleBlink(); };
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
    const size = () => ({ w: layer.offsetWidth || 116, h: layer.offsetHeight || 116 });
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

    // Somewhere to go: 'wander' looks for a free spot a short stroll away,
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

    /* ---------- walking ----------
       A hop-bob walk: a little crouch on the ground, then up and along.
       With reduced motion he never walks: he's simply somewhere else. */
    let walk = null;
    let raf = 0;
    let last = 0;
    let ticks = 0;
    // `hurry` is for getting out from behind a window: he scurries.
    function goTo(x, y, then, hurry) {
      if (RM) { place(x, y); arrive(then); return; }
      if (Math.abs(x - pos.x) > 2) el.classList.toggle('is-left', x < pos.x);
      walk = { x, y, t: 0, n: -1, then, speed: SPEED * (hurry ? 2 : 1) };
      setState('walk');
      stopBlink();
      run();
    }
    function stopWalk() {
      walk = null;
      body.style.transform = '';
    }
    function arrive(then) {
      stopWalk();
      setState('idle');
      show('idle');
      el.classList.remove('is-settling');
      void el.offsetWidth; // restart the little sit-down
      el.classList.add('is-settling');
      if (keepSpot) saveSpot();
      if (sleepy) sleep();
      else scheduleBlink();
      if (then) then();
    }
    function run() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function tick(t) {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      if (state === 'walk' && walk) stepWalk(dt);
      else if (state === 'held') stepSwing(dt);
      else return;
      if (!bubble.hidden && ++ticks % 8 === 0) fitBubble();
      raf = requestAnimationFrame(tick);
    }
    function stepWalk(dt) {
      walk.t += dt;
      if (walk.t > 30) { place(walk.x, walk.y); arrive(walk.then); return; } // never stroll forever
      const n = Math.floor(walk.t / HOP);
      if (n !== walk.n) { walk.n = n; show(n % 2 ? 'walk2' : 'walk1'); }
      const p = (walk.t % HOP) / HOP;
      const dir = el.classList.contains('is-left') ? -1 : 1;
      let lift = 0;
      let sx = 1;
      let sy = 1;
      let lean = 0;
      if (p < 1 - AIR) {
        const s = Math.sin((Math.PI * p) / (1 - AIR));
        sx = 1 + 0.05 * s;
        sy = 1 - 0.08 * s;
      } else {
        const s = Math.sin((Math.PI * (p - (1 - AIR))) / AIR);
        lift = 12 * s;
        sx = 1 - 0.02 * s;
        sy = 1 + 0.03 * s;
        lean = 3 * s * dir;
        const dx = walk.x - pos.x;
        const dy = walk.y - pos.y;
        const d = Math.hypot(dx, dy);
        const v = (walk.speed / AIR) * dt;
        if (d <= v) { place(walk.x, walk.y); arrive(walk.then); return; }
        place(pos.x + (dx / d) * v, pos.y + (dy / d) * v);
      }
      body.style.transform = `translateY(${(-lift).toFixed(2)}px) rotate(${lean.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
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
      if (state === 'idle' && coverNow().win > 0.45 && popOut(go)) return;
      go();
    }

    // Every so often he looks around: out from under a window that has
    // landed on him, or off for a stroll.
    let coveredAt = 0;
    let nextWander = Date.now() + 5000 + Math.random() * 7000;
    function think() {
      if (document.hidden || state === 'held' || state === 'walk' || state === 'happy' || state === 'dizzy' || state === 'party') return;
      const now = Date.now();
      const cv = coverNow();
      if ((cv.win > 0.45 || cv.icon > 0.2 || cv.col > 0.5) && state !== 'asleep') {
        if (!coveredAt) coveredAt = now;
        if (now - coveredAt > 1200 && now > stuckUntil) popOut();
        return;
      }
      coveredAt = 0;
      if (state === 'idle' && !RM && now > nextWander) {
        nextWander = now + 9000 + Math.random() * 12000;
        if (Math.random() < 0.75) wander();
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
      if (state === 'held') return;
      bubble.setAttribute('role', 'status'); // from now on, what he says is read out too
      rest();
      nextWander = Date.now() + 7000 + Math.random() * 6000;
      if (state === 'asleep') { wake(); say('...huh? oh. hello again.'); return; }
      if (state === 'walk') stopWalk();
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
      setState('happy');
      stopBlink();
      show('happy');
      settleIn(900, 'happy');
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
      if (state === 'idle' && btn.matches(':focus-visible') && coverNow().win > 0.3) popOut();
    });

    /* ---------- picking him up ----------
       Drag him with a mouse or pen. On a touch screen, rest a finger on him
       for a moment first, so a swipe never turns into a kidnapping. */
    let press = null;
    let swing = { a: 0, v: 0 };
    let vx = 0;
    let lastMove = 0;
    const grab = { x: 0, y: 0 };
    btn.addEventListener('pointerdown', (e) => {
      if (press || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const r = layer.getBoundingClientRect();
      press = { id: e.pointerId, touch: e.pointerType === 'touch', x: e.clientX, y: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, held: false };
      if (press.touch) {
        press.timer = setTimeout(() => { if (press && !press.held) pickUp(); }, LONG_PRESS);
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
        if (moved < 5) return;
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
      // A mouse holds him wherever it grabbed him; a finger holds his feet,
      // so he stays in sight above it.
      grab.x = press.touch ? s.w / 2 : press.gx;
      grab.y = press.touch ? s.h * 0.97 : press.gy;
      const wasAsleep = state === 'asleep';
      stopWalk();
      clearTimeout(moodTimer);
      el.classList.remove('is-landing', 'is-settling');
      setState('held');
      stopBlink();
      show('held');
      root.classList.add('pet-carrying');
      body.style.transformOrigin = `${grab.x.toFixed(1)}px ${grab.y.toFixed(1)}px`;
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
    function carry(e) {
      const d = desktop.getBoundingClientRect();
      const a = area();
      const x = clamp(e.clientX - d.left + desktop.scrollLeft - grab.x, a.minX, a.maxX);
      const y = clamp(e.clientY - d.top + desktop.scrollTop - grab.y, a.minY, a.maxY);
      const now = performance.now();
      const dt = lastMove ? Math.max(8, now - lastMove) / 1000 : 1;
      lastMove = now;
      vx = vx * 0.6 + ((x - pos.x) / dt) * 0.4;
      place(x, y);
    }
    // He dangles from where he's held, swinging behind as he's swung about
    // (held by his feet, it's his hat that trails behind).
    function stepSwing(dt) {
      vx *= Math.exp(-dt * 6);
      const lag = grab.y < size().h * 0.55 ? 1 : -1;
      const target = clamp(vx * 0.045 * lag, -32, 32);
      swing.v += ((target - swing.a) * 90 - swing.v * 9) * dt;
      swing.a += swing.v * dt;
      body.style.transform = `rotate(${swing.a.toFixed(2)}deg)`;
    }

    const land = () => {
      el.classList.remove('is-landing');
      void el.offsetWidth; // restart the bump
      el.classList.add('is-landing');
    };
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'pet-land') el.classList.remove('is-landing');
      if (e.animationName === 'pet-settle') el.classList.remove('is-settling');
      if (e.animationName === 'pet-squish') btn.classList.remove('petted');
      if (e.animationName === 'pet-flip') el.classList.remove('is-trick');
      if (e.animationName === 'pet-party') el.classList.remove('is-party');
    });

    // Put down: a wobble and a complaint, or (now and then) a nap right
    // where he lands. The Recycle Bin gets a word of its own.
    function drop(e) {
      root.classList.remove('pet-carrying');
      body.style.transform = '';
      body.style.transformOrigin = '';
      const a = area();
      place(clamp(pos.x, a.minX, a.maxX), clamp(pos.y, a.minY, a.maxY));
      keepSpot = true;
      saveSpot();
      nextWander = Date.now() + 9000 + Math.random() * 6000;
      setState('dizzy');
      land();
      const bin = desktop.querySelector('.desk-icon[data-app="trash"]');
      if (bin && inBin(bin, e)) {
        bin.classList.remove('is-jiggling');
        void bin.offsetWidth;
        bin.classList.add('is-jiggling');
        setTimeout(() => bin.classList.remove('is-jiggling'), 700);
        show('startled');
        say(lineOf('trashLines'), 3200);
        clearTimeout(moodTimer);
        moodTimer = setTimeout(() => {
          if (state !== 'dizzy') return;
          setState('idle');
          show('idle');
          if (!popOut()) scheduleBlink();
        }, 1500);
        return;
      }
      const cv = coverNow();
      if (cv.win < 0.45 && cv.icon < 0.2 && cv.col < 0.5 && Math.random() < (night() ? 0.5 : 0.25)) {
        clearTimeout(moodTimer);
        setState('asleep');
        stopBlink();
        show('asleep');
        return;
      }
      show('dizzy');
      say(lineOf('dropLines'), 2400);
      settleIn(1700, 'dizzy');
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
       in his sleep). Windows listed in quietPages wait to be asked. */
    let quietUntil = 0;
    K.on('open', (e) => {
      setTimeout(think, 650); // a new window may have landed on him
      if (!e.first || !e.app || quiet.indexOf(e.app) !== -1) return;
      if (state === 'asleep' || state === 'held' || Date.now() < quietUntil || Date.now() - lastSaid < 8000) return;
      const line = lineFor(e.app);
      if (line) setTimeout(() => { if (state !== 'asleep' && state !== 'held') speakOut(line, 3600); }, 700);
    });

    /* ---------- tricks and parties ----------
       Refresh (the desktop menu) gets a flip; a secret code gets the party
       hat and a little dance. With reduced motion he just beams. If a
       window is hiding him he pops out first, so nobody misses the show. */
    function perform(kind) {
      if (state === 'held') return;
      if (state === 'walk') stopWalk();
      if (state === 'asleep') wake();
      const go = () => {
        if (state === 'held') return;
        clearTimeout(moodTimer);
        rest();
        nextWander = Date.now() + 8000 + Math.random() * 6000;
        stopBlink();
        el.classList.remove('is-landing', 'is-settling', 'is-trick', 'is-party');
        bubble.setAttribute('role', 'status');
        if (kind === 'party') {
          setState('party');
          show('party');
          say(lineOf('partyLines'), 3400);
          settleIn(3600, 'party');
        } else {
          setState('happy');
          show('happy');
          say(lineOf('trickLines'), 2400);
          settleIn(1300, 'happy');
        }
        if (RM) return;
        void el.offsetWidth; // restart the move
        el.classList.add(kind === 'party' ? 'is-party' : 'is-trick');
      };
      if (state === 'idle' && coverNow().win > 0.45 && popOut(go)) return;
      go();
    }
    const speak = (text, ms) => {
      if (!text) return false;
      bubble.setAttribute('role', 'status');
      speakOut(text, ms || 3000);
      return true;
    };

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
    // A tab opened in the background may have no desktop yet: he finds his
    // spot once it has a size.
    let homed = desktop.clientWidth > 0 && desktop.clientHeight > 0;
    fitTouch();
    rest();
    scheduleBlink();
    // Old friends get a hello of their own (instead of the first window's line).
    if (welcome) {
      quietUntil = Date.now() + 9000;
      setTimeout(() => speakOut(lineOf('welcomeBack'), 3800, () => {
        if (state !== 'idle') return;
        stopBlink();
        show('wave');
        settleIn(1400, 'idle');
      }), 1500);
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
        if (walk) { walk.x = clamp(walk.x, a.minX, a.maxX); walk.y = clamp(walk.y, a.minY, a.maxY); }
        if (state !== 'held') place(clamp(pos.x, a.minX, a.maxX), clamp(pos.y, a.minY, a.maxY));
        fitTouch();
      }, 160);
    });
    // Phone home screen <-> desktop: each has its own spot.
    PHONE.addEventListener('change', () => {
      if (state === 'held') return;
      if (state === 'walk') { stopWalk(); setState('idle'); show('idle'); }
      const h = home();
      place(h.x, h.y);
      fitTouch();
    });

    return { openExe, trick: () => perform('trick'), party: () => perform('party'), speak };
  }
})();

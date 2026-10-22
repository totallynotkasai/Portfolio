/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - SOUND  (every blip, bonk and fanfare, made in the browser)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. Sound is off until a visitor turns it
   on (the speaker by the clock, or Sound in the Start menu), and the
   choice is kept in this browser (kasai:sound). Every sound is made here
   with Web Audio: oscillators, short envelopes and a little filtered
   noise, so there are no audio files to fetch.

   The rest of the site asks for a sound by name:
     K.sound.play('open', { step, gain, pan })
       step  how far up a rising chain (Star Drop's pops), 0 to 14
       gain  louder or softer than usual (1)
       pan   -1 (left) to 1 (right)
   It gives false when nothing played: sound is off, the browser hasn't
   been clicked, tapped or typed in yet (no sound is allowed before that),
   the tab is hidden, that sound played a moment ago, or there's no sound
   by that name.
   Also: K.sound.on, set(on), toggle() and hush() (silence, now).
   Turning it on or off fires K.emit('sound', { on }).
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const AC = window.AudioContext || window.webkitAudioContext;
  // No Web Audio: no K.sound, so no switch, and every game stays quiet.
  if (!K || !AC) return;

  const KEY = 'kasai:sound'; // { on }
  const MASTER = 0.5;        // the volume of everything
  const DUCK = 0.35;         // the everyday sounds, while an important one plays
  const MOST = 14;           // sounds playing at once
  const GAP = 35;            // ms: the same sound plays at most this often
  const TOP = 14;            // rising chains stop rising at this step
  // These turn the everyday ones down while they play.
  const IMPORTANT = { boot: true, moon: true, hurt: true, win: true, lose: true };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // A note's pitch from its number (60 is middle C, 69 the A above it).
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Step `step` up a pentatonic ladder from `base`: five notes an octave,
  // so a chain of them always sounds sweet, and it stops rising at TOP.
  const PENTATONIC = [0, 2, 4, 7, 9];
  const ladder = (base, step) => {
    const s = clamp(Math.round(Number(step) || 0), 0, TOP);
    return base * Math.pow(2, (12 * Math.floor(s / 5) + PENTATONIC[s % 5]) / 12);
  };

  let on = !!(K.store.get(KEY, null) || {}).on;
  let ctx = null;      // the AudioContext, once sound has been on and allowed
  let everyday = null; // the two channels: everyday sounds...
  let important = null; // ...and important ones (they duck the first)
  let duckEnd = 0;
  let noiseBuf = null;
  const voices = [];   // the sounds playing, oldest first
  const lastAt = {};   // when each sound last played (performance.now)

  /* ---------- the mixer ----------
     Each sound feeds its channel; both channels meet in a gentle
     compressor, so a pile of them never clips, then the master volume.
     The AudioContext is only made once sound is on and the visitor has
     clicked, tapped or typed: browsers allow no sound before that. */
  function wake() {
    if (!ctx) {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) {
        try { ctx = new AC(); } catch (err) { return null; }
      }
      const squash = ctx.createDynamicsCompressor();
      squash.threshold.value = -16;
      squash.knee.value = 12;
      squash.ratio.value = 4;
      squash.attack.value = 0.003;
      squash.release.value = 0.2;
      const master = ctx.createGain();
      master.gain.value = MASTER;
      everyday = ctx.createGain();
      important = ctx.createGain();
      everyday.connect(squash);
      important.connect(squash);
      squash.connect(master);
      master.connect(ctx.destination);
      // Older iPhones only let sound through once something has played
      // inside the tap: a silent sample does it.
      const blank = ctx.createBufferSource();
      blank.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      blank.connect(ctx.destination);
      blank.start(0);
    }
    if (ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {});
    return ctx;
  }

  // Saved as on: the first click, tap or key wakes it (and wakes it again
  // after a phone call or anything else that stopped it).
  const unlock = () => { if (on && !document.hidden && (!ctx || ctx.state !== 'running')) wake(); };
  ['pointerup', 'keydown', 'touchend'].forEach((type) => window.addEventListener(type, unlock, { capture: true, passive: true }));

  // A hidden tab goes quiet (and costs nothing); coming back picks up again.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { hush(); ctx.suspend().catch(() => {}); }
    else if (on) ctx.resume().catch(() => {});
  });

  // A volume stops changing where it is now, ready for a new change.
  const holdAt = (param, t) => {
    const now = param.value;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else param.cancelScheduledValues(t);
    param.setValueAtTime(now, t);
  };

  // An important sound turns the everyday channel down until it's done.
  function duck(len) {
    const t = ctx.currentTime;
    const until = Math.max(duckEnd, t + len);
    const g = everyday.gain;
    holdAt(g, t);
    g.linearRampToValueAtTime(DUCK, t + 0.04);
    g.setValueAtTime(DUCK, until);
    g.linearRampToValueAtTime(1, until + 0.35);
    duckEnd = until;
  }

  /* ---------- the parts every sound is made of ---------- */
  // One second of white noise, shared by every hiss.
  const noise = () => {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  };

  // How loud a part is over time: up to o.peak in o.a seconds, held for
  // o.hold, then dying away by o.dur.
  function env(v, t, o) {
    const g = ctx.createGain();
    const a = o.a || 0.004;
    const hold = o.hold || 0;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    if (hold) g.gain.setValueAtTime(o.peak, t + a + hold);
    g.gain.setTargetAtTime(0, t + a + hold, Math.max(0.005, (o.dur - a - hold) / 5));
    g.connect(v.out);
    return g;
  }

  // A part starts at t and stops at `stop`; the sound is done (and let go)
  // once all of its parts have stopped.
  function begin(v, src, t, stop, offset) {
    src.start(t, offset || 0);
    src.stop(stop);
    v.srcs.push(src);
    v.live++;
    v.end = Math.max(v.end, stop);
    src.onended = () => { if (--v.live <= 0) retire(v); };
  }

  // A pitch moving: from o.f, to o.to by o.glide seconds (or the whole
  // part), then on to o.then by its end.
  function bend(param, t, o) {
    param.setValueAtTime(o.f, t);
    if (o.to) param.exponentialRampToValueAtTime(o.to, t + (o.glide || o.dur));
    if (o.then) param.exponentialRampToValueAtTime(o.then, t + o.dur);
  }

  // A tone: o.type its wave (sine unless it says), o.f its pitch, o.at when
  // it starts (seconds into the sound), o.dur how long it rings, o.peak how
  // loud, o.lp a low-pass cutoff (it softens a square or a sawtooth),
  // o.detune in cents, o.vib a wobble in cents.
  function tone(v, o) {
    const t = v.t + (o.at || 0);
    const src = ctx.createOscillator();
    src.type = o.type || 'sine';
    bend(src.frequency, t, o);
    if (o.detune) src.detune.value = o.detune;
    let head = src;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      head.connect(f);
      head = f;
    }
    head.connect(env(v, t, o));
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = o.vib;
      lfo.connect(depth);
      depth.connect(src.detune);
      begin(v, lfo, t, t + o.dur + 0.02);
    }
    begin(v, src, t, t + o.dur + 0.02);
  }

  // A breath of noise through a filter: o.kind 'bandpass' (unless it says
  // 'highpass' or 'lowpass'), o.f its frequency (sweeping like a tone's),
  // o.q how narrow.
  function hiss(v, o) {
    const t = v.t + (o.at || 0);
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = o.kind || 'bandpass';
    bend(f.frequency, t, o);
    f.Q.value = o.q || 1;
    src.connect(f);
    f.connect(env(v, t, o));
    begin(v, src, t, t + o.dur + 0.02, Math.random() * 0.5);
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE SOUNDS  (each one a little recipe; o is what play() was given)
     ══════════════════════════════════════════════════════════════════════ */
  const SOUNDS = {
    /* ---------- the OS ---------- */
    // Restart and Power on: a warm chord blooming upwards, a glint on top.
    boot(v) {
      tone(v, { f: hz(48), dur: 1.4, peak: 0.11, a: 0.06 });
      [72, 76, 79, 84].forEach((m, k) => tone(v, { type: 'triangle', f: hz(m), at: k * 0.09, dur: 1.4 - k * 0.07, peak: 0.1, a: 0.02 }));
      tone(v, { f: hz(96), at: 0.36, dur: 0.8, peak: 0.035, a: 0.01 });
    },
    // Shut down: the chord coming back down, fading.
    shutdown(v) {
      [79, 76, 72, 67].forEach((m, k) => tone(v, { type: 'triangle', f: hz(m), at: k * 0.11, dur: k === 3 ? 1.1 : 0.45, peak: 0.1, a: 0.012 }));
      tone(v, { f: hz(43), at: 0.33, dur: 1.1, peak: 0.1, a: 0.05 });
    },
    // A window opens: a bubble rising. Closing, it sinks.
    open(v) {
      tone(v, { f: hz(79), to: hz(84), glide: 0.06, dur: 0.13, peak: 0.2 });
      hiss(v, { kind: 'highpass', f: 3500, dur: 0.02, peak: 0.03, a: 0.001 });
    },
    close(v) {
      tone(v, { f: hz(84), to: hz(77), glide: 0.07, dur: 0.12, peak: 0.17 });
    },
    // Into the taskbar on a swish going down; back out (or back from
    // maximised) going up.
    minimise(v) {
      hiss(v, { f: 2600, to: 700, dur: 0.18, peak: 0.28, q: 1.3, a: 0.02 });
      tone(v, { f: hz(76), to: hz(69), dur: 0.15, peak: 0.13 });
    },
    restore(v) {
      hiss(v, { f: 700, to: 2600, dur: 0.18, peak: 0.28, q: 1.3, a: 0.02 });
      tone(v, { f: hz(69), to: hz(76), dur: 0.15, peak: 0.13 });
    },
    // Maximised: two quick notes up a fifth.
    max(v) {
      tone(v, { type: 'triangle', f: hz(72), dur: 0.1, peak: 0.16 });
      tone(v, { type: 'triangle', f: hz(79), at: 0.065, dur: 0.14, peak: 0.16 });
    },
    // Snapped to half the desktop (or all of it): a click and a soft thunk.
    snap(v) {
      hiss(v, { kind: 'highpass', f: 2800, dur: 0.025, peak: 0.12, a: 0.001 });
      tone(v, { f: 240, to: 110, dur: 0.09, peak: 0.22 });
    },
    // The Start menu and the desktop menu: a tick.
    menu(v) {
      tone(v, { type: 'triangle', f: 1660, dur: 0.035, peak: 0.1, a: 0.002 });
    },
    // A dialog: a bell.
    alert(v) {
      tone(v, { f: hz(81), dur: 0.8, peak: 0.16, a: 0.003 });
      tone(v, { f: hz(81) * 2.76, dur: 0.3, peak: 0.035, a: 0.002 });
      tone(v, { f: hz(93), dur: 0.25, peak: 0.04, a: 0.002 });
    },
    // Petting the wizard: a boop, higher the happier he is (step: his hearts).
    pet(v, o) {
      const f = ladder(hz(72), o.step);
      tone(v, { f, to: f * 1.6, glide: 0.035, then: f * 1.25, dur: 0.14, peak: 0.2 });
    },
    // A party: a popper, then a fanfare.
    party(v) {
      hiss(v, { f: 1800, dur: 0.07, peak: 0.4, q: 0.8, a: 0.002 });
      [72, 76, 79, 84].forEach((m, k) => tone(v, { type: 'square', lp: 2400, f: hz(m), at: 0.04 + k * 0.065, dur: 0.12, peak: 0.07 }));
      [84, 88].forEach((m) => tone(v, { type: 'square', lp: 2400, f: hz(m), at: 0.3, dur: 0.55, peak: 0.06, hold: 0.12 }));
    },
    // Sound switched on.
    on(v) {
      tone(v, { f: hz(79), dur: 0.12, peak: 0.16 });
      tone(v, { f: hz(84), at: 0.08, dur: 0.2, peak: 0.16 });
    },

    /* ---------- the games ---------- */
    // A peg pops (Star Drop): each one along a shot a step up the ladder.
    peg(v, o) {
      const f = ladder(hz(67), o.step);
      tone(v, { type: 'triangle', f, dur: 0.13, peak: 0.18, a: 0.002 });
      tone(v, { f: f * 2, dur: 0.05, peak: 0.05, a: 0.001 });
    },
    // Something golden: a yellow peg, a lucky star, a star picked up.
    gold(v) {
      tone(v, { f: hz(88), dur: 0.4, peak: 0.13, a: 0.002 });
      tone(v, { f: hz(95), at: 0.05, dur: 0.35, peak: 0.08, a: 0.002 });
      tone(v, { f: hz(100), at: 0.1, dur: 0.25, peak: 0.04, a: 0.002 });
    },
    // The blue moon: a slow, shimmering chime (and, softly, its rising).
    moon(v) {
      tone(v, { f: hz(64), dur: 1.4, peak: 0.1, a: 0.04 });
      [88, 92, 95, 100].forEach((m, k) => {
        tone(v, { f: hz(m), at: k * 0.06, dur: 1.6 - k * 0.1, peak: 0.07, a: 0.01 });
        tone(v, { f: hz(m), detune: 9, at: k * 0.06 + 0.01, dur: 1.4 - k * 0.1, peak: 0.04, a: 0.02 });
      });
    },
    // What a shot came to, all at once (Star Drop with reduced motion).
    tally(v) {
      hiss(v, { kind: 'highpass', f: 4000, dur: 0.03, peak: 0.07, a: 0.001 });
      tone(v, { type: 'square', lp: 3000, f: hz(83), dur: 0.08, peak: 0.08 });
      tone(v, { type: 'square', lp: 3000, f: hz(88), at: 0.07, dur: 0.3, peak: 0.08 });
    },
    // A card on the pile: a papery slap, its note climbing with the streak (step).
    card(v, o) {
      hiss(v, { f: 1900, dur: 0.05, peak: 0.35, q: 0.9, a: 0.002 });
      tone(v, { type: 'triangle', f: ladder(hz(72), o.step), dur: 0.1, peak: 0.12, a: 0.002 });
    },
    // A card turning over, the image viewer's next picture, a star swapped: a swish.
    flip(v) {
      hiss(v, { f: 900, to: 3200, dur: 0.08, peak: 0.5, q: 1.4, a: 0.006 });
    },
    // Cards cascading in: a run of swishes, each a little higher.
    deal(v) {
      for (let k = 0; k < 6; k++) hiss(v, { f: 1200 + k * 220, to: 2600 + k * 300, at: k * 0.055, dur: 0.06, peak: 0.4, q: 1.4, a: 0.004 });
    },
    // Not allowed: two low buzzes.
    deny(v) {
      [0, 0.09].forEach((at) => tone(v, { type: 'square', lp: 900, f: 185, at, dur: 0.07, peak: 0.09, a: 0.003 }));
    },
    // A spell, a secret word, a program run: a quick run up the ladder
    // with a glitter of noise (step: where the run starts).
    cast(v, o) {
      const s = Number(o.step) || 0;
      for (let k = 0; k < 6; k++) tone(v, { f: ladder(hz(72), s + k), at: k * 0.04, dur: 0.2, peak: 0.07, a: 0.003 });
      hiss(v, { kind: 'highpass', f: 5000, at: 0.05, dur: 0.35, peak: 0.035, a: 0.05 });
    },
    // A hit lands: a bonk (step: a semitone higher for each).
    hit(v, o) {
      const f = 330 * Math.pow(2, (Number(o.step) || 0) / 12);
      tone(v, { type: 'triangle', f, to: f / 3, glide: 0.1, dur: 0.14, peak: 0.26, a: 0.002 });
      hiss(v, { kind: 'lowpass', f: 1400, dur: 0.03, peak: 0.12, a: 0.001 });
    },
    // A heart lost: a thump and an "ow".
    hurt(v) {
      tone(v, { f: 150, to: 60, dur: 0.16, peak: 0.28, a: 0.003 });
      tone(v, { type: 'sawtooth', lp: 1300, f: hz(64), to: hz(63), dur: 0.15, peak: 0.1, a: 0.005 });
      tone(v, { type: 'sawtooth', lp: 1100, f: hz(60), to: hz(58), at: 0.12, dur: 0.32, peak: 0.1, a: 0.008 });
    },
    // A heart back: a soft shimmer going up.
    heal(v) {
      [72, 76, 79].forEach((m, k) => tone(v, { f: hz(m), at: k * 0.07, dur: 0.32, peak: 0.1, a: 0.008 }));
      tone(v, { f: hz(84), at: 0.21, dur: 0.4, peak: 0.08, a: 0.008 });
    },
    // A choice made (an upgrade, a star or a charm, a program): pling.
    pick(v) {
      tone(v, { type: 'triangle', f: hz(81), dur: 0.1, peak: 0.15, a: 0.002 });
      tone(v, { type: 'triangle', f: hz(88), at: 0.06, dur: 0.22, peak: 0.15, a: 0.002 });
    },
    // A sleeping wizard woken: a snort, then a startled squeak.
    wake(v) {
      tone(v, { type: 'sawtooth', lp: 650, f: 85, to: 150, glide: 0.09, then: 75, dur: 0.26, peak: 0.2, a: 0.01 });
      hiss(v, { kind: 'lowpass', f: 900, dur: 0.2, peak: 0.16, a: 0.01 });
      tone(v, { f: 620, to: 940, at: 0.22, dur: 0.09, peak: 0.07 });
    },
    // A run won: a fanfare up to a held chord.
    win(v) {
      [67, 72, 76, 79].forEach((m, k) => tone(v, { type: 'square', lp: 2600, f: hz(m), at: k * 0.09, dur: 0.16, peak: 0.07 }));
      [79, 84, 88].forEach((m) => tone(v, { type: 'triangle', f: hz(m), at: 0.38, dur: 1.1, peak: 0.1, a: 0.01, hold: 0.25 }));
      tone(v, { f: hz(48), at: 0.38, dur: 1.0, peak: 0.1, a: 0.02, hold: 0.2 });
    },
    // A run lost: wah, wah, wah, wahhh.
    lose(v) {
      [67, 66, 65].forEach((m, k) => tone(v, { type: 'sawtooth', lp: 1000, f: hz(m), at: k * 0.26, dur: 0.24, peak: 0.17, a: 0.015 }));
      tone(v, { type: 'sawtooth', lp: 900, f: hz(64), at: 0.78, dur: 0.75, peak: 0.17, a: 0.015, hold: 0.3, vib: 25 });
    },
    // A new best: a sparkly run up, then a ding.
    best(v) {
      for (let k = 0; k < 5; k++) tone(v, { f: ladder(hz(79), k), at: k * 0.05, dur: 0.18, peak: 0.08, a: 0.003 });
      tone(v, { f: hz(100), at: 0.26, dur: 0.5, peak: 0.08, a: 0.003 });
      tone(v, { f: hz(95), at: 0.26, dur: 0.45, peak: 0.06, a: 0.003 });
    },
    // A tile cleared (Wizard Sweeper): a soft tick, higher along a cascade (step).
    tick(v, o) {
      tone(v, { f: ladder(hz(76), o.step), dur: 0.05, peak: 0.12, a: 0.002 });
      hiss(v, { kind: 'highpass', f: 3000, dur: 0.015, peak: 0.04, a: 0.001 });
    },
    // A star placed (Wizard Sweeper): pop.
    pop(v) {
      tone(v, { f: 520, to: 1150, glide: 0.05, dur: 0.09, peak: 0.2, a: 0.002 });
      hiss(v, { f: 2000, dur: 0.02, peak: 0.08, a: 0.001 });
    },
    // A level, a night or a floor cleared: a little jingle.
    clear(v) {
      [72, 76, 79].forEach((m, k) => tone(v, { type: 'triangle', f: hz(m), at: k * 0.08, dur: 0.16, peak: 0.13, a: 0.003 }));
      tone(v, { type: 'triangle', f: hz(84), at: 0.24, dur: 0.34, peak: 0.13, a: 0.003 });
    },
    // A hop (Not Rubbish): boing.
    hop(v) {
      tone(v, { f: 260, to: 820, glide: 0.11, then: 700, dur: 0.18, peak: 0.18 });
      tone(v, { type: 'triangle', f: 520, to: 1640, glide: 0.11, dur: 0.12, peak: 0.04 });
    },
    // The wizard teleports when he's called: a whoosh, and a glint where he lands.
    poof(v) {
      hiss(v, { f: 400, to: 3000, glide: 0.2, then: 900, dur: 0.42, peak: 0.45, q: 0.9, a: 0.03 });
      tone(v, { f: 1800, to: 2600, at: 0.18, dur: 0.14, peak: 0.05, a: 0.003 });
    },
    // A star leaves his hat (Star Drop): pew.
    drop(v) {
      tone(v, { f: 1400, to: 520, glide: 0.16, dur: 0.18, peak: 0.13, a: 0.003 });
      hiss(v, { kind: 'highpass', f: 3000, dur: 0.04, peak: 0.05, a: 0.002 });
    },
  };

  /* ---------- playing them ---------- */
  // Makes the sound `name` now. No more than MOST at once: the oldest
  // everyday sound gives way (an important one can take any place).
  function sound(name, o) {
    const make = SOUNDS[name];
    if (!make || !ctx) return false;
    o = o || {};
    const now = performance.now();
    if (now - (lastAt[name] || -Infinity) < GAP) return false;
    const imp = !!IMPORTANT[name];
    if (voices.length >= MOST && !steal(imp)) return false;
    lastAt[name] = now;
    const v = { imp, t: ctx.currentTime + 0.008, out: ctx.createGain(), pan: null, srcs: [], live: 0, end: 0 };
    v.out.gain.value = clamp(o.gain == null ? 1 : Number(o.gain) || 0, 0, 2);
    const bus = imp ? important : everyday;
    if (o.pan && ctx.createStereoPanner) {
      v.pan = ctx.createStereoPanner();
      v.pan.pan.value = clamp(Number(o.pan) || 0, -1, 1);
      v.out.connect(v.pan);
      v.pan.connect(bus);
    } else v.out.connect(bus);
    voices.push(v);
    try { make(v, o); } catch (err) { console.error(err); fade(v); return false; }
    if (imp) duck(v.end - ctx.currentTime);
    return true;
  }

  function steal(imp) {
    const v = voices.find((x) => !x.imp) || (imp ? voices[0] : null);
    if (!v) return false;
    fade(v);
    return true;
  }

  // Stops a sound at once, with a fade too short to hear but long enough
  // not to click.
  function fade(v) {
    const k = voices.indexOf(v);
    if (k !== -1) voices.splice(k, 1);
    const t = ctx.currentTime;
    const g = v.out.gain;
    holdAt(g, t);
    g.linearRampToValueAtTime(0, t + 0.02);
    v.srcs.forEach((src) => { try { src.stop(t + 0.03); } catch (e) { /* never started */ } });
    if (!v.live) retire(v);
  }

  function retire(v) {
    const k = voices.indexOf(v);
    if (k !== -1) voices.splice(k, 1);
    try {
      v.out.disconnect();
      if (v.pan) v.pan.disconnect();
    } catch (e) { /* already let go */ }
  }

  function play(name, o) {
    if (!on || !ctx || ctx.state !== 'running') return false;
    return sound(name, o);
  }

  // Silence, now (the everyday channel back to full).
  function hush() {
    if (!ctx) return;
    voices.slice().forEach(fade);
    const t = ctx.currentTime;
    holdAt(everyday.gain, t);
    everyday.gain.linearRampToValueAtTime(1, t + 0.02);
    duckEnd = 0;
  }

  // On or off: kept in this browser, and the switches hear about it. On is
  // always a click (the speaker or the Start menu), which allows the sound.
  // `other`: another tab switched it, so this one follows without a chime.
  function set(want, other) {
    want = !!want;
    if (want === on) return;
    on = want;
    if (!other) K.store.set(KEY, { on });
    if (on) {
      if (wake() && !other) sound('on'); // plays as soon as the browser starts the sound
    } else if (ctx) {
      hush();
      ctx.suspend().catch(() => {});
    }
    K.emit('sound', { on });
  }

  // Switched in another tab: this one follows (off goes quiet at once).
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) set(!!(K.store.get(KEY, null) || {}).on, true);
  });

  K.sound = {
    get on() { return on; },
    set,
    toggle: () => set(!on),
    play,
    hush,
  };
})();

/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - THE PET WIZARD  (lives on the desktop, behind the windows)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. Everything about him (his lines, his
   five drawn frames, how soon he naps) lives in content.js under "wizard".
   He blinks on his own, beams when petted, dozes off when ignored, and
   chats when a window opens. Pet him ten times for a surprise.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const C = K.C;

  K.pet = {
    init(layer) {
      const W = C.wizard;
      if (!layer || !W || !W.enabled || !W.image) return;
      const reduceMotion = K.REDUCE_MOTION;

      // Five hand-drawn expressions (idle / mid-blink / blink / happy / asleep).
      // Missing frames fall back to idle, and no frames at all to `image`.
      let frames = null;
      if (W.frames && W.frames.idle) {
        frames = {};
        ['idle', 'half', 'blink', 'happy', 'asleep'].forEach((k) => {
          frames[k] = K.webSrc(W.frames[k] || W.frames.idle);
        });
      }
      const startSrc = frames ? frames.idle : K.assetUrl(W.image);

      layer.innerHTML = `
        <div class="pet">
          <p class="pet-bubble" hidden></p>
          <button class="pet-sprite" type="button" aria-label="Pet the wizard">
            <img src="${K.esc(startSrc)}" alt="" decoding="async" draggable="false" />
          </button>
        </div>`;
      const btn = layer.querySelector('.pet-sprite');
      const bubble = layer.querySelector('.pet-bubble');
      const img = btn.querySelector('img');
      if (frames) Object.keys(frames).forEach((k) => { const pre = new Image(); pre.src = frames[k]; });
      const setFrame = (name) => { if (frames) img.src = frames[name] || frames.idle; };

      let bubbleTimer;
      let lastSaid = 0;
      const say = (text, ms) => {
        if (!text) return;
        bubble.textContent = text;
        bubble.hidden = false;
        lastSaid = Date.now();
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms || 2600);
      };

      // Mood: 'idle' (may blink), 'happy' (just petted) or 'asleep'.
      let mood = 'idle';
      let blinkTimer = null;
      const stopBlink = () => { clearTimeout(blinkTimer); blinkTimer = null; };
      const scheduleBlink = () => {
        if (!frames || reduceMotion) return;
        stopBlink();
        blinkTimer = setTimeout(blink, 2800 + Math.random() * 4200);
      };
      function blink() {
        if (mood !== 'idle') { scheduleBlink(); return; }
        setFrame('half');
        setTimeout(() => { if (mood === 'idle') setFrame('blink'); }, 80);
        setTimeout(() => { if (mood === 'idle') setFrame('half'); }, 170);
        setTimeout(() => { if (mood === 'idle') { setFrame('idle'); scheduleBlink(); } }, 250);
      }

      // He naps when ignored (sooner late at night); any pet wakes him.
      let sleepTimer;
      const sleep = () => { mood = 'asleep'; stopBlink(); btn.classList.add('asleep'); setFrame('asleep'); };
      const wake = () => { mood = 'idle'; btn.classList.remove('asleep'); setFrame('idle'); scheduleBlink(); };
      const rest = () => {
        if (mood === 'asleep') wake();
        clearTimeout(sleepTimer);
        const hour = new Date().getHours();
        const night = hour >= 22 || hour < 6;
        const after = Math.max(10, W.sleepAfter || 60) * (night ? 0.5 : 1);
        sleepTimer = setTimeout(sleep, after * 1000);
      };
      rest();
      scheduleBlink();

      // A line when a window opens (at most every 8 seconds, never in his
      // sleep). Windows listed in quietPages wait to be asked.
      const quiet = W.quietPages || [];
      const lineFor = (app) => {
        const lines = (W.lines || {})[app] || [];
        return lines.length ? lines[Math.floor(Math.random() * lines.length)] : '';
      };
      K.on('open', (e) => {
        if (!e.first || !e.app || quiet.indexOf(e.app) !== -1) return;
        if (mood === 'asleep' || Date.now() - lastSaid < 8000) return;
        setTimeout(() => say(lineFor(e.app), 3600), 700);
      });

      // The 10-pet reward: doodle rain (or a simple <3 under reduced motion).
      let happyTimer;
      let pets = 0;
      btn.addEventListener('click', () => {
        // After the first pet, what he says is read out too.
        bubble.setAttribute('role', 'status');
        const wasAsleep = mood === 'asleep';
        rest();
        if (wasAsleep) { say('...huh? oh. hello again.'); return; }
        pets++;
        btn.classList.remove('petted');
        void btn.offsetWidth; // restart the squish
        btn.classList.add('petted');
        mood = 'happy';
        stopBlink();
        setFrame('happy');
        clearTimeout(happyTimer);
        happyTimer = setTimeout(() => {
          if (mood === 'happy') { mood = 'idle'; setFrame('idle'); scheduleBlink(); }
        }, 900);
        if (pets % 10 === 0) {
          if (K.doodleRain()) say('DOODLE RAIN!!!', 4000);
          else say('<3', 2000);
          return;
        }
        const pl = W.petLines || [];
        if (pl.length) say(pl[(pets - 1) % pl.length], 1600);
      });
      btn.addEventListener('animationend', (e) => {
        if (e.animationName === 'pet-squish') btn.classList.remove('petted');
      });
    },
  };
})();

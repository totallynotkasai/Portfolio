/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - THE DESKTOP  (windows, icons, taskbar and Start menu)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. It builds the OS from the apps in
   apps.js and the words in content.js, then starts everything: the boot
   and shut down screens, the right-click desktop menu, the wallpaper
   picker, the sound switches and the secret codes live here too (the
   sounds themselves are made in sound.js). Each start-up step runs on
   its own, so one hiccup can't take the rest of the site down with it.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const C = K.C;
  const { esc, doodleIcon, navIcon, REDUCE_MOTION } = K;
  const $ = (s, root) => (root || document).querySelector(s);
  const $$ = (s, root) => Array.prototype.slice.call((root || document).querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const APPS = K.apps || {};
  // Windows inside an app that have an address of their own (About's CV
  // at /cv): they open over their app.
  const SUBS = K.subWindows || {};
  const os = $('#os');
  const desktop = $('#desktop');
  const layer = $('#windows');
  const taskbar = $('.taskbar');
  const live = $('#os-live');
  if (!os || !layer) return;

  // Phones get the home screen: one app at a time, full screen.
  const PHONE = window.matchMedia('(max-width: 760px)');
  const isPhone = () => PHONE.matches;

  const announce = (text) => {
    if (!live) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 40);
  };
  // A sound from sound.js (silent while sound is off). Restart closes and
  // opens windows behind the boot screen without a peep (`hushed`).
  let hushed = false;
  const sound = (name, o) => !hushed && !!K.sound && K.sound.play(name, o);
  const copyright = () => (C.site && C.site.copyright) || '© 2026 Andrew Worgan (Kasai). All rights reserved.';
  // A list of lines from content.js: a missing one uses the built-in lines,
  // an empty one means none.
  const textList = (v, fallback) => (Array.isArray(v)
    ? v.filter((s) => typeof s === 'string' && s.trim())
    : typeof v === 'string' ? (v.trim() ? [v] : []) : fallback);

  /* ══════════════════════════════════════════════════════════════════════
     ROUTES  (old page links still work: they open their window)
     ══════════════════════════════════════════════════════════════════════ */
  K.appFromPath = (url) => {
    let u;
    try { u = new URL(url, window.location.origin); } catch (e) { return null; }
    if (u.origin !== window.location.origin) return null;
    const path = u.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/about') return 'about';
    return Object.keys(APPS).find((id) => APPS[id].path === path)
      || Object.keys(SUBS).find((id) => SUBS[id].path === path) || null;
  };
  // An app, or a window with an address of its own: something open() takes by name.
  const named = (id) => !!id && !!(APPS[id] || SUBS[id]);

  /* ══════════════════════════════════════════════════════════════════════
     WINDOW MANAGER
     ══════════════════════════════════════════════════════════════════════ */
  const wins = new Map(); // id -> window
  const order = []; // open windows (minimised ones too), back to front
  let cascade = 0;
  let stairs = false; // Cascade lined the windows up from the top left
  const STAIRS = 8; // steps in its staircase before it starts again
  let tucked = null; // the windows Show desktop put away, back to front
  let openCount = 0;
  const MIN_SIZE = [320, 220]; // how small a window can be resized, unless its app says
  // Windows resize from every edge and corner, as well as by the grip.
  const EDGES = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];

  const appOf = (win) => (APPS[win.id] ? win.id : win.spec.parent || null);
  const front = () => {
    for (let i = order.length - 1; i >= 0; i--) {
      const w = wins.get(order[i]);
      if (w && !w.minimised) return w;
    }
    return null;
  };
  // When a finger last lifted, and until when taps inside windows are
  // ignored (see open).
  let lastTouch = -Infinity;
  let tapsFrom = 0;
  document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') lastTouch = performance.now(); }, true);
  layer.addEventListener('click', (e) => {
    if (performance.now() < tapsFrom) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  const specFor = (idOrSpec) => (typeof idOrSpec === 'string'
    ? (named(idOrSpec) ? Object.assign({ id: idOrSpec }, APPS[idOrSpec] || SUBS[idOrSpec]) : null)
    : idOrSpec);

  function build(spec) {
    const id = spec.id;
    const headingId = 'win-' + id + '-h';
    const head = typeof spec.head === 'function' ? spec.head() : spec.head;
    const el = document.createElement('section');
    el.className = 'win ' + (spec.colour || 'lavender');
    el.id = 'win-' + id;
    el.dataset.win = id;
    el.tabIndex = -1;
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="win-frame">
        <div class="os-bar win-bar">
          <span class="os-app" aria-hidden="true">${spec.icon ? navIcon(spec.icon) : doodleIcon(spec.doodle || 'folder')}</span>
          <span class="os-title">${esc(spec.file || spec.label)}</span>
          <span class="os-btns">
            <button class="os-btn os-min" type="button" aria-label="Minimise ${esc(spec.label)}">${doodleIcon('min')}</button>
            <button class="os-btn os-max" type="button" aria-label="Maximise ${esc(spec.label)}" aria-pressed="false">${doodleIcon('max')}</button>
            <button class="os-btn os-close" type="button" aria-label="Close ${esc(spec.label)}">${doodleIcon('close')}</button>
          </span>
        </div>
        ${head ? `<div class="win-head">
          ${head.address ? `<p class="win-address" aria-hidden="true">${doodleIcon('folder')}<span>${esc(head.address)}</span></p>` : ''}
          <h2 class="win-heading" id="${headingId}" tabindex="-1">${esc(head.heading || spec.label)}</h2>
          ${head.sub ? `<p class="win-sub">${esc(head.sub)}</p>` : ''}
        </div>` : ''}
        <div class="win-menu"></div>
        <div class="win-body"></div>
        <div class="win-status"></div>
        <span class="win-grip" aria-hidden="true"></span>
      </div>
      ${EDGES.map((edge) => `<span class="win-edge" data-edge="${edge}" aria-hidden="true"></span>`).join('')}`;
    layer.appendChild(el);

    const win = {
      id,
      spec,
      el,
      headingId,
      bar: $('.win-bar', el),
      menu: $('.win-menu', el),
      body: $('.win-body', el),
      status: $('.win-status', el),
      open: false,
      minimised: false,
      maximised: false,
      snap: null, // { side, was } while it fills half the desktop
      anim: null, // its animation, while one runs (see the motion helpers)
      rect: null,
      setStatus(html) { this.status.innerHTML = html || ''; this.status.hidden = !html; },
      setTitle(file) { $('.os-title', el).textContent = file; },
    };
    wins.set(id, win);
    try {
      if (spec.render) spec.render(win);
    } catch (err) {
      console.error(err);
      win.body.innerHTML = '<p class="win-error">This window had a hiccup. Close it and try again.</p>';
    }
    win.menu.hidden = !win.menu.innerHTML.trim();
    if (!win.status.innerHTML.trim()) win.status.hidden = true;
    // Named by its heading if it has one, otherwise by its label.
    if ($('#' + headingId, el)) el.setAttribute('aria-labelledby', headingId);
    else el.setAttribute('aria-label', spec.label);
    wireWindow(win);
    return win;
  }

  function setRect(win, r) {
    win.rect = r;
    win.el.style.left = Math.round(r.x) + 'px';
    win.el.style.top = Math.round(r.y) + 'px';
    win.el.style.width = Math.round(r.w) + 'px';
    win.el.style.height = Math.round(r.h) + 'px';
  }

  // Where a window first appears: centred in the free desktop (clear of the
  // icons on big screens), each new one a step down and right; a project or
  // document opens near the folder it came from. `keepCentre` refits the
  // image viewer around the middle it already has (the next picture).
  function place(win, keepCentre) {
    const area = layer.getBoundingClientRect();
    const W = area.width;
    const H = area.height;
    const spec = win.spec;
    // A tab opened in the background can have no size yet: park the window
    // and place it properly once the desktop has a size (see refit below).
    // So does one opened in the phone layout, where windows fill the screen:
    // a phone turned sideways (or a browser widened) places it afresh.
    win.unplaced = W < 120 || H < 120 || isPhone();
    if (win.unplaced) {
      const [w0, h0] = spec.size || [720, 520];
      setRect(win, { x: 8, y: 8, w: w0, h: h0 });
      return;
    }
    const iconRail = W >= 1000 ? 132 : 12;
    let w;
    let h;
    if (spec.fit) {
      // The image viewer: as big as the picture allows.
      const ratio = spec.fit.ratio || 1;
      const imgW = Math.min(Math.min(W - 48, 1400) - 32, (H - 24 - spec.fit.chrome) * ratio);
      w = Math.max(340, imgW + 32);
      h = Math.max(280, imgW / ratio + spec.fit.chrome);
    } else {
      [w, h] = spec.size || [720, 520];
      w = Math.min(w, W - iconRail - 12);
    }
    w = Math.min(w, W - 16);
    h = Math.min(h, H - 16);
    const step = keepCentre ? 0 : 26 * (cascade++ % (stairs ? STAIRS : 5));
    const parent = spec.parent && wins.get(spec.parent);
    let x;
    let y;
    if (spec.fit && keepCentre && win.rect) {
      x = win.rect.x + (win.rect.w - w) / 2;
      y = win.rect.y + (win.rect.h - h) / 2;
    } else if (spec.fit) {
      x = (W - w) / 2;
      y = (H - h) / 2;
    } else if (parent && parent.open && !parent.minimised && parent.rect) {
      x = parent.rect.x + 48 + step;
      y = parent.rect.y + 40 + step;
    } else if (stairs) {
      // After Cascade, new windows join its staircase.
      x = iconRail + step;
      y = 12 + step;
    } else {
      x = iconRail + Math.max(0, (W - iconRail - 12 - w) / 2) + step - 26;
      y = Math.max(12, (H - h) / 2 - 24) + step - 13;
    }
    setRect(win, { x: clamp(x, 8, W - w - 8), y: clamp(y, 8, H - h - 8), w, h });
  }

  // opts.from: what opened it (it grows out of that, and closing it hands
  // focus back). opts.at: a box on screen to grow out of instead (an item
  // in a menu that has just closed). opts.refit: a new picture in the
  // viewer, which refits it (around its middle with opts.keepCentre).
  // opts.push and opts.focus: false to leave the history or keyboard focus
  // alone.
  function open(idOrSpec, opts) {
    opts = opts || {};
    const spec = specFor(idOrSpec);
    if (!spec) return null;
    // Still shrinking away or closing: it turns round from where it is.
    const going = wins.get(spec.id);
    const midway = going && going.leaving ? boxOf(going.el) : null;
    if (midway) finishAnim(going);
    let win = wins.get(spec.id);
    if (!win) win = build(spec);
    else if (!APPS[spec.id]) win.spec = Object.assign(win.spec, spec);
    const first = !win.open;
    const back = !first && win.minimised;
    if ((first || back) && !opts.untuck) tucked = null; // Show windows has nothing left to bring back
    // Really opening, or coming back from the taskbar: one step in the
    // history (bringing an open window forward is none).
    const stepped = opts.push !== false && (first || back) && !win.ownsStep;
    // What it grows out of, measured before anything moves: whatever opened
    // it, or its own taskbar button when it comes back from there.
    const src = first || back ? midway || opts.at || rectOf(anchorOf(opts.from) || (back ? taskButton(win) : null)) : null;
    if (first) {
      win.open = true;
      win.openedAt = ++openCount; // its place along the taskbar
      win.minimised = false;
      order.push(win.id);
      win.el.hidden = false;
      place(win);
      announce(spec.label + ' opened');
    } else if (back) {
      win.minimised = false;
      win.el.hidden = false;
      // The viewer brought back for a new picture takes that picture's shape.
      if (opts.refit && spec.fit && !win.maximised && !win.snap) place(win, opts.keepCentre);
    } else if (opts.refit && spec.fit && !win.maximised && !win.snap) {
      glide(win, () => place(win, opts.keepCentre), resized);
    }
    if (opts.from && (first || opts.refit)) win.from = opts.from;
    if (stepped) win.ownsStep = true;
    focusWin(win, { push: stepped, focus: opts.focus !== false });
    if (spec.onShow) spec.onShow(win);
    if (first || back) grow(win, src); // after onShow, which may measure what's inside
    // A phone's tap that opened it: the second tap of a double-tap lands
    // inside it, so taps in there wait a moment.
    if ((first || back) && isPhone() && performance.now() - lastTouch < 600) tapsFrom = performance.now() + 350;
    if (first) sound('open', { pan: panOf(win) });
    else if (back) sound('restore', { pan: panOf(win) });
    K.emit('open', { id: win.id, app: appOf(win), first });
    return win;
  }

  // Where a window sits across the desktop, as a sound's place between the
  // left ear and the right (gently: no further than halfway).
  function panOf(win) {
    const W = layer.clientWidth;
    if (!win.rect || !W || win.maximised || isPhone()) return 0;
    return clamp(((win.rect.x + win.rect.w / 2) / W) * 2 - 1, -1, 1) * 0.5;
  }

  function focusWin(win, o) {
    o = o || {};
    const i = order.indexOf(win.id);
    if (i !== -1) order.splice(i, 1);
    order.push(win.id);
    restack();
    if (o.focus !== false) {
      const target = $('#' + win.headingId, win.el) || win.el;
      target.focus({ preventScroll: true });
    }
    sync(o.push);
  }

  let lastFront = null;
  function restack() {
    order.forEach((id, k) => { wins.get(id).el.style.zIndex = String(10 + k); });
    const f = front();
    wins.forEach((w) => w.el.classList.toggle('is-active', w === f));
    const id = f ? f.id : null;
    if (id !== lastFront) { lastFront = id; K.emit('windowfocus', { id }); }
  }

  /* ---------- motion ----------
     A window grows out of whatever opened it and shrinks into its taskbar
     button; maximising, restoring and snapping glide from one box to the
     next. Each window runs one animation at a time: a new one, a drag, a
     resize or the image viewer's view transition first jumps the running
     one to its end. Reduced motion skips them all, and phones minimise and
     close at once (Back closes their windows one after another). */
  const moving = () => !REDUCE_MOTION && typeof document.body.animate === 'function';
  // The image viewer's view transition is running: that's its animation.
  const viewing = () => document.documentElement.classList.contains('vt-viewer');

  // An element's box on screen, or null when none of it shows. Taskbar
  // buttons are cut to the strip they sit in, which hides the ones that
  // don't fit.
  function rectOf(el) {
    if (!el || !el.isConnected) return null;
    let { left, top, right, bottom } = el.getBoundingClientRect();
    const strip = el.closest('#task-windows');
    if (strip) {
      const s = strip.getBoundingClientRect();
      left = Math.max(left, s.left);
      top = Math.max(top, s.top);
      right = Math.min(right, s.right);
      bottom = Math.min(bottom, s.bottom);
    }
    return right - left >= 1 && bottom - top >= 1 ? { left, top, width: right - left, height: bottom - top } : null;
  }

  // What a window grows out of, and hands focus back to: the element that
  // opened it, the Start button for a link in the Start menu (closed by
  // then), or a hidden window's taskbar button for anything inside it.
  function anchorOf(el) {
    if (!el || !el.isConnected) return null;
    if (startMenu && startMenu.contains(el)) return startBtn;
    const box = el.closest('.win');
    const w = box && wins.get(box.dataset.win);
    if (w && (box.hidden || w.minimised)) return taskButton(w);
    return el.getClientRects().length ? el : null;
  }

  // Where a window shows right now, mid-animation too, and how faintly.
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, opacity: Number(getComputedStyle(el).opacity) };
  };
  // The transform that lays a window's box `r` over the box `s`: one even
  // scale, with the two middles together.
  const over = (s, r) => `translate(${s.left + s.width / 2 - r.left - r.width / 2}px, ${s.top + s.height / 2 - r.top - r.height / 2}px) ` +
    `scale(${clamp(Math.max(s.width / r.width, s.height / r.height), 0.06, 1)})`;

  // Growing out of the taskbar or shrinking into it, the desktop sits above
  // the taskbar, so the window can be seen doing it.
  let lifts = 0;
  const lift = (by) => { lifts = Math.max(0, lifts + by); os.classList.toggle('is-lifting', lifts > 0); };

  function animate(win, frames, timing, done) {
    finishAnim(win);
    const run = { a: win.el.animate(frames, timing), done };
    win.anim = run;
    run.a.finished.then(() => { if (win.anim === run) finishAnim(win); }, () => {});
  }
  // Jumps a window's animation to its end, and runs what was waiting for it.
  function finishAnim(win) {
    const run = win && win.anim;
    if (!run) return;
    win.anim = null;
    run.a.cancel();
    if (run.done) run.done();
  }

  // Opening, or coming back from the taskbar: it grows out of the box `src`,
  // or rises into place when there's none (a secret word, the address bar).
  function grow(win, src) {
    const r = win.el.getBoundingClientRect();
    if (!moving() || viewing() || !r.width || !r.height) return;
    if (!src) {
      animate(win, [{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      return;
    }
    lift(1);
    animate(win, [
      { transform: over(src, r), opacity: src.opacity == null ? 0 : src.opacity },
      { opacity: 1, offset: 0.3 },
      { transform: 'none', opacity: 1 },
    ], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }, () => lift(-1));
  }

  // Going away: it shrinks into `to` (its taskbar button) when that's on
  // screen, or drops and fades. `done` puts it away at the end.
  function leave(win, to, done) {
    finishAnim(win);
    const r = win.el.getBoundingClientRect();
    if (!moving() || isPhone() || !r.width || !r.height) { done(); return; }
    const dst = rectOf(to);
    win.leaving = true;
    win.el.classList.add('is-leaving');
    if (dst) lift(1);
    animate(win, dst
      ? [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.5 }, { transform: over(dst, r), opacity: 0 }]
      : [{ transform: 'none', opacity: 1 }, { transform: 'translateY(14px) scale(0.96)', opacity: 0 }],
    { duration: dst ? 200 : 140, easing: dst ? 'cubic-bezier(0.4, 0, 0.9, 0.6)' : 'ease-in', fill: 'forwards' }, () => {
      if (dst) lift(-1);
      win.leaving = false;
      win.el.classList.remove('is-leaving');
      done();
    });
  }

  // Glides squash what's inside for a moment. Set this to true and a flat
  // dashed outline glides instead, while the window jumps to its new box.
  const GLIDE_OUTLINE = false;

  // Maximise, restore, snaps and the viewer's refits: `change` gives the
  // window its new box at once, so what's inside reflows straight away, and
  // the frame glides there from the old one ("FLIP"). `then(win)` runs once
  // it has arrived.
  function glide(win, change, then) {
    const was = win.el.getBoundingClientRect();
    finishAnim(win);
    change();
    const now = win.el.getBoundingClientRect();
    const done = () => { if (then) then(win); };
    const same = ['left', 'top', 'width', 'height'].every((k) => Math.abs(was[k] - now[k]) < 1);
    if (!moving() || viewing() || same || !was.width || !now.width || !now.height) { done(); return; }
    if (GLIDE_OUTLINE) { ghost(win, was, now); done(); return; }
    animate(win, [
      { transform: `translate(${was.left + was.width / 2 - now.left - now.width / 2}px, ${was.top + was.height / 2 - now.top - now.height / 2}px) ` +
        `scale(${was.width / now.width}, ${was.height / now.height})` },
      { transform: 'none' },
    ], { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }, done);
  }
  function ghost(win, a, b) {
    const area = layer.getBoundingClientRect();
    const box = (r) => ({ left: `${r.left - area.left}px`, top: `${r.top - area.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const g = document.createElement('div');
    g.className = 'snap-preview is-ghost';
    g.setAttribute('aria-hidden', 'true');
    g.style.zIndex = String(Number(win.el.style.zIndex) + 1);
    layer.appendChild(g);
    g.animate([box(a), box(b)], { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' })
      .finished.catch(() => {}).then(() => g.remove());
  }

  // Where keyboard focus goes when a window steps away: back to what opened
  // it (see anchorOf), else its taskbar button, the window in front or the
  // first desktop icon.
  const returnFocus = (win) => {
    const next = front();
    const target = anchorOf(win.from)
      || taskButton(win)
      || (next && ($('#' + next.headingId, next.el) || next.el))
      || $('.desk-icon');
    if (target) target.focus({ preventScroll: true });
  };

  function minimise(win) {
    if (win.leaving) finishAnim(win); // already on its way out: that ends first
    if (!win.open || win.minimised) return;
    win.minimised = true;
    restack();
    sync(false);
    giveBack(win);
    const btn = taskButton(win);
    leave(win, btn, () => { win.el.hidden = true; }); // into its taskbar button
    if (btn && rectOf(btn)) btn.focus({ preventScroll: true }); // (only a button you can see)
    else returnFocus(win);
    sound('minimise', { pan: panOf(win) });
    announce(win.spec.label + ' minimised');
    K.emit('minimise', { id: win.id, app: appOf(win) });
  }

  // `quick` skips the little animation (Restart closes everything at once).
  function close(win, quick, fromTaskbar) {
    if (win.leaving) finishAnim(win);
    if (!win.open) return;
    const done = () => {
      if (!win.open) return;
      win.open = false;
      win.minimised = false;
      win.el.hidden = true;
      const i = order.indexOf(win.id);
      if (i !== -1) order.splice(i, 1);
      if (win.maximised) setMax(win, false);
      if (win.snap) setSnap(win, null);
      if (!order.length) stairs = false; // the next window opens in the middle again
      restack();
      sync(false);
      giveBack(win);
      if (win.spec.onClose) win.spec.onClose(win);
      if (fromTaskbar && front()) focusInto(front());
      else returnFocus(win);
      // Projects, documents and pictures are made fresh next time (Forward
      // makes them again from what they were).
      if (!APPS[win.id]) { closedSpecs.set(win.id, win.spec); win.el.remove(); wins.delete(win.id); }
      announce(win.spec.label + ' closed');
    };
    if (quick) { finishAnim(win); done(); return; }
    sound('close', { pan: panOf(win) });
    leave(win, null, done);
  }

  // Maximised or not, at once (toggleMax glides there).
  function setMax(win, on) {
    win.maximised = on;
    win.el.classList.toggle('is-max', on);
    const btn = $('.os-max', win.el);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', (on ? 'Restore ' : 'Maximise ') + win.spec.label);
    btn.innerHTML = doodleIcon(on ? 'restore' : 'max');
  }
  const resized = (win) => { if (win.spec.onResize) win.spec.onResize(win); };
  function toggleMax(win, force) {
    const on = typeof force === 'boolean' ? force : !win.maximised;
    if (on === win.maximised) return;
    glide(win, () => setMax(win, on), resized);
    sound(on ? 'max' : 'restore', { pan: panOf(win) });
  }

  /* ---------- snapping ----------
     A window dragged by its title bar to the left or right edge of the
     desktop can fill that half (when the half is wide enough for it), and
     to the top edge all of it. Side by side can also give it a tile: a
     box kept as fractions of the desktop (`box`), so it follows a resize. */
  const SNAP_EDGE = 8; // how near an edge the pointer comes
  const HALF = { w: 0.5, h: 1 };
  const halfOf = (side, area, box) => {
    if (side === 'tile') {
      // (Neighbouring tiles share their edges exactly.)
      const x = Math.round(box.x * area.width);
      const y = Math.round(box.y * area.height);
      return { x, y, w: Math.round((box.x + box.w) * area.width) - x, h: Math.round((box.y + box.h) * area.height) - y };
    }
    const mid = Math.round(area.width / 2);
    return side === 'left' ? { x: 0, y: 0, w: mid, h: area.height } : { x: mid, y: 0, w: area.width - mid, h: area.height };
  };
  // Whether a window has room in a half of the desktop (or in `box`, or in
  // the tile it has), at its smallest size.
  const halvesFit = (win, area, box) => {
    const min = win.spec.minSize || MIN_SIZE;
    box = box || (win.snap && win.snap.side === 'tile' ? win.snap.box : HALF);
    return Math.floor(area.width * box.w) >= min[0] && Math.floor(area.height * box.h) >= min[1];
  };
  // Snapped to a half or a tile (`side`, with the tile's `box`),
  // remembering its own box `was`, or not (null).
  function setSnap(win, side, was, box) {
    win.snap = side ? { side, was, box } : null;
    win.el.classList.toggle('is-snapped', !!side);
    if (side) setRect(win, halfOf(side, layer.getBoundingClientRect(), box));
  }
  // Where letting go would snap a window, with the pointer at (x, y) on the desktop.
  function snapZone(win, x, y, area) {
    if (halvesFit(win, area)) {
      if (x <= SNAP_EDGE) return 'left';
      if (x >= area.width - SNAP_EDGE) return 'right';
    }
    return y <= SNAP_EDGE ? 'max' : null;
  }
  // Letting go over an edge: half the desktop, or all of it. `was` is the
  // window's own box, for when it's dragged off again or restored.
  function snapTo(win, zone, was) {
    glide(win, () => {
      if (zone === 'max') { setRect(win, was); setMax(win, true); }
      else setSnap(win, zone, Object.assign({}, was));
    }, resized);
    sound('snap', { pan: panOf(win) });
  }
  // A dashed outline shows where, while the window is dragged.
  let preview = null;
  function showZone(win, zone, area) {
    if (!zone) { if (preview) preview.hidden = true; return; }
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'snap-preview';
      preview.setAttribute('aria-hidden', 'true');
      layer.prepend(preview); // under the window being dragged, over the rest
    }
    const r = zone === 'max' ? { x: 0, y: 0, w: area.width, h: area.height } : halfOf(zone, area);
    const fresh = preview.hidden || preview.dataset.zone !== zone;
    preview.dataset.zone = zone;
    preview.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;z-index:${win.el.style.zIndex}`;
    preview.hidden = false;
    if (fresh && moving()) {
      preview.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 140, easing: 'ease-out' });
    }
  }
  // How a window was before a gesture (Escape puts it back).
  const stateOf = (win) => ({ rect: Object.assign({}, win.rect), max: win.maximised, snap: win.snap });
  function putBack(win, st) {
    setMax(win, st.max);
    win.snap = st.snap;
    win.el.classList.toggle('is-snapped', !!st.snap);
    setRect(win, st.rect);
  }

  /* ---------- dragging and resizing ----------
     One pointer gesture at a time: its moves are drawn once a frame, and it
     ends when the pointer lets go (on.end gets 'up'), is lost ('cancel') or
     Escape is pressed ('escape', which puts things back). */
  function gesture(el, e, on) {
    const id = e.pointerId;
    let last = null;
    let frame = 0;
    let ended = false;
    const draw = () => { frame = 0; if (last) on.move(last); };
    const move = (ev) => {
      if (ev.pointerId !== id) return;
      last = { x: ev.clientX, y: ev.clientY };
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const stop = (how) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', lost);
      el.removeEventListener('lostpointercapture', lost);
      window.removeEventListener('keydown', key, true);
      if (how === 'up') draw(); // the last move counts
      if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
      on.end(how);
    };
    const up = (ev) => { if (ev.pointerId === id) stop('up'); };
    const lost = (ev) => { if (ev.pointerId === id) stop('cancel'); };
    const key = (ev) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      ev.stopPropagation(); // the window stays put rather than minimising
      stop('escape');
    };
    try { el.setPointerCapture(id); } catch (err) { /* that pointer has already gone */ }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', lost);
    el.addEventListener('lostpointercapture', lost);
    window.addEventListener('keydown', key, true);
  }

  // Resizing from an edge or a corner (`edge` is made of n, e, s and w; the
  // grip is se). The far sides stay put, and the window keeps to its
  // minimum size and to the desktop. A snapped window comes loose.
  const RESIZE_CURSORS = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse' };
  function resizeFrom(win, edge, e) {
    if (isPhone() || win.maximised || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    focusInto(win);
    finishAnim(win);
    const before = stateOf(win);
    setSnap(win, null);
    const area = layer.getBoundingClientRect();
    const r0 = Object.assign({}, win.rect);
    const min = win.spec.minSize || MIN_SIZE;
    const minW = Math.min(min[0], r0.w); // never made bigger than it is
    const minH = Math.min(min[1], r0.h);
    const sx = e.clientX;
    const sy = e.clientY;
    const has = (side) => edge.indexOf(side) !== -1;
    root.dataset.resizing = RESIZE_CURSORS[edge];
    gesture(e.currentTarget, e, {
      move(p) {
        const r = Object.assign({}, r0);
        if (has('e')) r.w = clamp(r0.w + p.x - sx, minW, Math.max(r0.w, area.width - r0.x - 4));
        if (has('s')) r.h = clamp(r0.h + p.y - sy, minH, Math.max(r0.h, area.height - r0.y - 4));
        if (has('w')) {
          r.x = clamp(r0.x + p.x - sx, Math.min(r0.x, 0), r0.x + r0.w - minW);
          r.w = r0.x + r0.w - r.x;
        }
        if (has('n')) {
          r.y = clamp(r0.y + p.y - sy, Math.min(r0.y, 0), r0.y + r0.h - minH);
          r.h = r0.y + r0.h - r.y;
        }
        setRect(win, r);
      },
      end(how) {
        delete root.dataset.resizing;
        if (how === 'escape') putBack(win, before);
        resized(win);
      },
    });
  }

  // Off the left edge, this much of a window stays on screen: part of the
  // title bar beside its buttons can still be grabbed.
  const KEEP_LEFT = 160;
  // Keyboard focus moves into a window whose title bar or edge is pressed
  // (unless it's in there already), so Escape and the keys go to it.
  function focusInto(win) {
    if (win.el.contains(document.activeElement)) return;
    ($('#' + win.headingId, win.el) || win.el).focus({ preventScroll: true });
  }

  function wireWindow(win) {
    const el = win.el;
    $('.os-min', el).addEventListener('click', () => minimise(win));
    $('.os-max', el).addEventListener('click', () => toggleMax(win));
    $('.os-close', el).addEventListener('click', () => close(win));
    // A click or Tab anywhere in a window brings it to the front.
    el.addEventListener('pointerdown', () => { if (front() !== win) focusWin(win, { focus: false, push: false }); }, true);
    el.addEventListener('focusin', () => { if (front() !== win && !win.minimised) focusWin(win, { focus: false, push: false }); });
    win.bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && !isPhone()) toggleMax(win); });

    // Drag by the title bar (not on phones). Near the left or right edge of
    // the desktop a dashed outline offers that half of it, at the top all of
    // it, and letting go there snaps the window. A maximised or snapped
    // window comes loose after 4px, back at its own size and held at the
    // same spot along its title bar.
    win.bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      focusInto(win);
      if (isPhone()) return;
      e.preventDefault();
      finishAnim(win);
      const area = layer.getBoundingClientRect();
      const box = win.el.getBoundingClientRect(); // as it shows, maximised too
      const sx = e.clientX;
      const sy = e.clientY;
      const before = stateOf(win);
      let r0 = before.rect;
      let loose = !win.maximised && !win.snap;
      let zone = null;
      os.classList.add('is-dragging');
      gesture(win.bar, e, {
        move(p) {
          if (!loose) {
            if (Math.hypot(p.x - sx, p.y - sy) < 4) return;
            loose = true;
            const was = win.snap ? win.snap.was : win.rect;
            // (Its own size, but never bigger than the desktop is now.)
            const own = { w: Math.min(was.w, area.width - 16), h: Math.min(was.h, area.height - 16) };
            r0 = { x: sx - area.left - ((sx - box.left) / box.width) * own.w, y: box.top - area.top, w: own.w, h: own.h };
            glide(win, () => { setMax(win, false); setSnap(win, null); setRect(win, r0); }, resized);
          }
          setRect(win, {
            x: clamp(r0.x + p.x - sx, KEEP_LEFT - r0.w, area.width - 90),
            y: clamp(r0.y + p.y - sy, 0, area.height - 44),
            w: r0.w,
            h: r0.h,
          });
          zone = snapZone(win, p.x - area.left, p.y - area.top, area);
          showZone(win, zone, area);
        },
        end(how) {
          os.classList.remove('is-dragging');
          showZone(win, null);
          if (how === 'escape') glide(win, () => putBack(win, before), resized);
          else if (how === 'up' && zone) snapTo(win, zone, r0);
        },
      });
    });

    // Resize by the grip in the bottom-right corner, or any edge or corner.
    $('.win-grip', el).addEventListener('pointerdown', (e) => resizeFrom(win, 'se', e));
    $$('.win-edge', el).forEach((h) => h.addEventListener('pointerdown', (e) => resizeFrom(win, h.dataset.edge, e)));
  }

  // Escape steps the window you're in out of the way (popovers and dialogs
  // close themselves first).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    try { if (document.querySelector(':popover-open')) return; } catch (err) { /* no popovers */ }
    if (document.querySelector('dialog[open]')) return;
    const inWin = document.activeElement && document.activeElement.closest && document.activeElement.closest('.win');
    const win = inWin ? wins.get(inWin.dataset.win) : (isPhone() ? front() : null);
    if (win) { e.preventDefault(); minimise(win); }
  });

  // Keep windows reachable when the browser window changes size (or a tab
  // that opened in the background is first shown).
  let resizeTimer;
  function refit() {
    if (isPhone()) { layoutDesktop(); return; } // phone windows fill the screen: their own sizes wait
    const area = layer.getBoundingClientRect();
    if (area.width < 120 || area.height < 120) return; // still no room to work with
    wins.forEach((w) => {
      if (!w.rect) return;
      if (w.unplaced) place(w);
      else if (w.snap && halvesFit(w, area)) setRect(w, halfOf(w.snap.side, area, w.snap.box)); // still filling its half or tile
      else {
        if (w.snap) { const own = w.snap.was; setSnap(w, null); setRect(w, own); } // no room for halves now
        const r = w.rect;
        const nw = Math.min(r.w, area.width - 16);
        const nh = Math.min(r.h, area.height - 16);
        setRect(w, { x: clamp(r.x, KEEP_LEFT - nw, area.width - 90), y: clamp(r.y, 0, area.height - 44), w: nw, h: nh });
      }
      if (w.open && !w.minimised && w.spec.onResize) w.spec.onResize(w);
    });
    layoutDesktop();
  }
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refit, 150);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Array.from(wins.values()).some((w) => w.unplaced)) refit();
  });

  /* ---------- tidying up (the desktop menu) ----------
     Cascade lines the windows up, Side by side shares the desktop out
     between them, and Show desktop puts them all in the taskbar (Show
     windows brings them back). */
  const showing = () => order.map((id) => wins.get(id)).filter((w) => w && w.open && !w.minimised);
  // A window's own box (not the half or tile it fills), within the desktop.
  const ownBox = (win, area) => {
    const r = win.snap ? win.snap.was : win.rect;
    return { x: r.x, y: r.y, w: Math.min(r.w, area.width - 16), h: Math.min(r.h, area.height - 16) };
  };

  // Every window at its own size, a step down and right of the one behind
  // it, from the top left (beside the icons).
  function cascadeWindows() {
    const ws = showing();
    if (!ws.length) return;
    const area = layer.getBoundingClientRect();
    const iconRail = area.width >= 1000 ? 132 : 12;
    ws.forEach((w, k) => {
      const r = ownBox(w, area);
      const step = 26 * (k % STAIRS);
      r.x = clamp(iconRail + step, 8, area.width - r.w - 8);
      r.y = clamp(12 + step, 8, area.height - r.h - 8);
      glide(w, () => { setMax(w, false); setSnap(w, null); setRect(w, r); }, resized);
    });
    cascade = ws.length;
    stairs = true;
    sound('snap');
    announce('Windows cascaded');
  }

  // Two windows take a half each, as dragging them to the edges does; more
  // share the desktop in columns, or in rows of up to three when the
  // columns would be too narrow for them. Left to right as they are now.
  function sideBySide() {
    const ws = showing().sort((a, b) => (a.rect.x + a.rect.w / 2) - (b.rect.x + b.rect.w / 2));
    if (ws.length < 2) return;
    const area = layer.getBoundingClientRect();
    const n = ws.length;
    let boxes;
    if (n === 2 && ws.every((w) => halvesFit(w, area, HALF))) boxes = ['left', 'right'];
    else {
      const minW = Math.max(...ws.map((w) => (w.spec.minSize || MIN_SIZE)[0]));
      let cols = n;
      if (area.width / n < minW) {
        cols = Math.min(3, n);
        while (cols > 1 && area.width / cols < minW) cols--;
      }
      const rows = Math.ceil(n / cols);
      boxes = ws.map((w, i) => {
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? n - cols * (rows - 1) : cols; // the last row shares its width out
        const col = i - row * cols;
        return { x: col / inRow, y: row / rows, w: 1 / inRow, h: 1 / rows };
      });
    }
    ws.forEach((w, i) => {
      const own = ownBox(w, area);
      const b = boxes[i];
      glide(w, () => {
        setMax(w, false);
        if (typeof b === 'string') setSnap(w, b, own);
        else setSnap(w, 'tile', own, b);
      }, resized);
    });
    sound('snap');
    announce('Windows side by side');
  }

  // Show desktop: every window into the taskbar, their history steps taken
  // off together (see dropSteps). Show windows: back in the same order.
  function showDesktop() {
    const ws = showing();
    if (!ws.length) return;
    ws.forEach((w) => minimise(w));
    tucked = ws.map((w) => w.id);
    announce('Showing the desktop');
  }
  function showWindows() {
    const ids = tucked || [];
    tucked = null;
    const ws = ids.map((id) => wins.get(id)).filter((w) => w && w.open && w.minimised);
    ws.forEach((w, k) => open(APPS[w.id] ? w.id : w.spec, { untuck: true, focus: k === ws.length - 1 }));
    if (ws.length) announce('Windows back');
  }
  const tuckedAway = () => !!tucked && tucked.some((id) => { const w = wins.get(id); return w && w.open && w.minimised; });

  K.wm = {
    open,
    close: (id, opts) => { const w = wins.get(id); if (w) close(w, false, opts && opts.fromTaskbar); },
    minimise: (id) => { const w = wins.get(id); if (w) minimise(w); },
    focus: (id) => { const w = wins.get(id); if (w) focusWin(w); },
    get: (id) => wins.get(id),
    front,
    // Every window animation jumps to its end (before the image viewer's
    // view transition takes its snapshots).
    settle: () => wins.forEach(finishAnim),
  };

  /* ══════════════════════════════════════════════════════════════════════
     TASKBAR, ADDRESS BAR AND TAB TITLE
     ══════════════════════════════════════════════════════════════════════ */
  // A window's button you can actually see: its icon in the phone dock, or
  // its own button in the taskbar on bigger screens.
  const taskButton = (win) => [
    $(`.task-btn[data-app="${win.id}"]`, taskbar),
    $(`.task-win[data-win="${win.id}"]`, taskbar),
  ].find((b) => b && b.getClientRects().length) || null;

  function syncTaskbar() {
    const f = front();
    // The phone dock: one icon per app, marked when its window is open.
    $$('.task-btn[data-app]', taskbar).forEach((b) => {
      const w = wins.get(b.dataset.app);
      b.classList.toggle('is-open', !!(w && w.open));
      b.classList.toggle('is-active', !!(w && w === f));
      if (w && w === f) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    // Bigger screens: a button for every open window, in the order opened.
    const list = $('#task-windows');
    if (!list) return;
    // A taskbar button with focus keeps it after the buttons are redrawn.
    const a = document.activeElement;
    const had = a && a.matches && a.matches('.task-win, .task-win-close') ? a.dataset.win : null;
    const hadClose = had && a.classList.contains('task-win-close');
    const shown = order.map((id) => wins.get(id)).filter(Boolean).sort((a, b) => a.openedAt - b.openedAt);
    list.innerHTML = shown.map((w) => `<li class="task-entry"><button class="task-win ${esc(w.spec.colour || 'lavender')}${w === f ? ' is-active' : ''}${w.minimised ? ' is-min' : ''}" type="button" data-win="${esc(w.id)}"${w === f ? ' aria-current="true"' : ''} title="${esc(w.spec.label)}">
          ${w.spec.icon ? navIcon(w.spec.icon) : doodleIcon(w.spec.doodle || 'folder')}<span class="task-label">${esc(w.spec.label)}${w.minimised ? '<span class="vh">, minimised</span>' : ''}</span>
        </button><button class="task-win-close" type="button" data-win="${esc(w.id)}" aria-label="Close ${esc(w.spec.label)} from taskbar" title="Close ${esc(w.spec.label)}">${doodleIcon('close')}</button></li>`).join('');
    fitTaskbar(list);
    const restore = had && $(`.${hadClose ? 'task-win-close' : 'task-win'}[data-win="${had}"]`, list);
    if (restore) restore.focus({ preventScroll: true });
  }

  // Too many buttons for the bar: icons only, then smaller icons.
  function fitTaskbar(list) {
    list = list || $('#task-windows');
    if (!list) return;
    list.classList.remove('is-crowded', 'is-packed', 'is-tight');
    const over = () => list.scrollWidth > list.clientWidth + 1;
    if (!list.children.length || !over()) return;
    list.classList.add('is-crowded');
    if (over()) list.classList.add('is-packed');
    if (over()) list.classList.add('is-tight'); // (and past that it scrolls)
  }
  // (Again whenever the strip itself changes size: the tray and the browser.)
  if (window.ResizeObserver && $('#task-windows')) new ResizeObserver(() => fitTaskbar()).observe($('#task-windows'));
  else window.addEventListener('resize', () => fitTaskbar());

  taskbar.addEventListener('click', (e) => {
    const closer = e.target.closest('.task-win-close');
    if (closer) {
      e.preventDefault();
      K.wm.close(closer.dataset.win, { fromTaskbar: true });
      return;
    }
    const b = e.target.closest('.task-btn[data-app], .task-win');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.app || b.dataset.win;
    const w = wins.get(id);
    if (w && w.open && w === front()) {
      if (performance.now() < tapsFrom) return; // the second tap of the double-tap that opened it
      minimise(w);
      return;
    }
    open(w && !APPS[id] ? w.spec : id, { from: b });
  });

  const routeOf = (win) => {
    if (win && SUBS[win.id]) return SUBS[win.id].path; // the CV: /cv
    const app = win && appOf(win);
    return app && APPS[app] ? APPS[app].path : null;
  };
  /* ---------- Back and Forward ----------
     One rule on computers and phones: every window you open is one step in
     the browser's history, and Back closes the window in front (Forward
     brings it back). A window owns its step (win.ownsStep) until it's
     closed or minimised, which takes a step off quietly; the windows a
     visit starts with own none. Back with nothing left to close keeps
     going, so the last Back leaves the site and no press is wasted. The
     address always follows the window in front. */
  let notFound = document.body.dataset.page === 'notfound';
  // How many steps into the site's history we are (so popstate can tell
  // Back from Forward). Kept in each entry, so it survives a reload.
  let depth = (history.state && history.state.n) || 0;
  let dropping = 0;   // steps to take off, gathered into one history.go
  const moves = [];   // our own history.go calls, still to arrive as popstate
  let pushLater = 0;  // steps to add once they have
  const undone = new Map(); // a step taken off -> the window to bring back on Forward
  const closedSpecs = new Map(); // projects, documents and pictures, once closed
  // Where the history really is: steps waiting to come off haven't yet.
  const at = () => depth + dropping + moves.reduce((s, k) => s + k, 0);
  const stateNow = (f, n) => ({ app: f ? appOf(f) : null, win: f ? f.id : null, n });

  function syncRoute(push) {
    const f = front();
    if (notFound && (!f || f.id === 'error')) return; // keep the unknown address until something opens
    notFound = false;
    // A window with no address of its own (pet.exe) keeps the current one;
    // just the desktop is the home address.
    const path = routeOf(f) || (f ? window.location.pathname : '/');
    if (push) {
      if (dropping > 0) { dropping--; depth++; } // a step about to come off is used again instead
      else if (moves.length) { pushLater++; return; } // after our own move lands
      else { depth++; history.pushState(stateNow(f, depth), '', path); return; }
    }
    history.replaceState(stateNow(f, at()), '', path);
  }

  // Takes `k` steps off quietly (a window closed or minimised by its own
  // button or Escape; Restart takes them all): one history.go for every
  // step taken off in the same moment, as back-to-back calls aren't
  // reliable. Never more steps than there are, so closing what a visit
  // started with never leaves the site.
  function dropSteps(k) {
    k = Math.min(k, depth);
    if (k <= 0) return;
    depth -= k;
    const first = !dropping;
    dropping += k;
    if (!first) return;
    setTimeout(() => {
      const n = dropping;
      dropping = 0;
      if (!n) return;
      moves.push(n);
      history.go(-n);
    }, 0);
  }
  // A window going away hands its step back (and Forward can bring it back).
  function giveBack(win) {
    if (!win.ownsStep) return;
    win.ownsStep = false;
    if (depth > 0) undone.set(depth, win.id);
    dropSteps(1);
  }

  const baseTitle = 'Andrew Worgan - Kasai OS';
  function syncTitle() {
    if (document.hidden) return;
    const f = front();
    const app = f && appOf(f);
    const label = f && SUBS[f.id] ? f.spec.label : app ? APPS[app].label : f ? f.spec.label : null;
    document.title = label ? `${label} - Andrew Worgan` : baseTitle;
  }

  function sync(push) {
    syncTaskbar();
    syncRoute(push);
    syncTitle();
  }

  // Bring back a window by id: an app or the CV, or a project, document or
  // picture (still open, or made again from what it was this visit).
  const reopen = (id) => {
    const w = id && wins.get(id);
    if (w && w.open) return open(APPS[id] ? id : w.spec, { push: false });
    if (named(id)) return open(id, { push: false });
    return id && closedSpecs.has(id) ? open(closedSpecs.get(id), { push: false }) : null;
  };
  // How many windows own a step; never more than there are steps.
  const owners = () => order.map((id) => wins.get(id)).filter((w) => w && w.ownsStep);

  window.addEventListener('popstate', (e) => {
    const st = e.state || {};
    const n = typeof st.n === 'number' ? st.n : 0;
    // One of our own quiet moves: the address follows the window in front.
    if (moves.length) {
      moves.shift();
      depth = n;
      for (; pushLater > 0 && !moves.length; pushLater--) syncRoute(true);
      syncRoute(false);
      return;
    }
    if (n < depth) {
      // Back: the window in front closes (one for each step gone back).
      let closed = 0;
      const showing = order.map((id) => wins.get(id)).filter((w) => w && w.open && !w.minimised && !w.leaving).reverse();
      for (let k = depth; k > n; k--) {
        const f = showing.shift();
        if (!f) break;
        undone.set(k, f.id);
        f.ownsStep = false;
        close(f);
        closed++;
      }
      depth = n;
      const own = owners();
      while (own.length > depth) own.shift().ownsStep = false;
      // Nothing left to close: keep going, so no press is wasted.
      if (!closed) { history.back(); return; }
    } else if (n > depth) {
      // Forward: the window Back closed comes back (after a reload, the step's own).
      for (let k = depth + 1; k <= n; k++) {
        const w = reopen(undone.get(k)) || reopen(st.win) || (named(st.app) ? open(st.app, { push: false }) : null)
          || (k === n && named(K.appFromPath(window.location.href)) ? open(K.appFromPath(window.location.href), { push: false }) : null);
        if (w) w.ownsStep = true;
      }
      depth = n;
    }
    sync(false);
  });


  /* ══════════════════════════════════════════════════════════════════════
     START MENU  (a native popover: click-away, Escape and focus for free)
     ══════════════════════════════════════════════════════════════════════ */
  const startMenu = $('#start-menu');
  const startBtn = $('.start-btn');
  const hasPopover = !!(startMenu && typeof startMenu.showPopover === 'function');
  const hideStart = () => {
    if (!startMenu) return;
    if (hasPopover) { try { startMenu.hidePopover(); } catch (e) { /* already closed */ } }
    else { startMenu.hidden = true; startBtn.setAttribute('aria-expanded', 'false'); }
  };
  K.hideStart = hideStart;

  function buildStart() {
    if (!startMenu) return;
    const a = C.about || {};
    const avatar = a.photo ? `<img src="${esc(K.webSrc(a.photo))}" alt="" />` : doodleIcon('camera');
    // The same icons as the tray, drawn as masks in the text colour, in one
    // row after Email me.
    const socials = $$('.tray .social-link').map((s) => {
      const img = s.querySelector('img');
      const ico = img
        ? `<span class="social-ico" aria-hidden="true" style="--ico: url(&quot;${esc(img.getAttribute('src'))}&quot;)"></span>`
        : doodleIcon('globe');
      const name = esc(s.getAttribute('aria-label') || 'Link');
      return `<li><a class="start-social" href="${esc(s.href)}" target="_blank" rel="noopener" title="${name}">${ico}<span class="vh">${name}</span></a></li>`;
    }).join('');
    // The subheading's *highlight* marks only make sense in the About window.
    const tagline = String(a.subheading || '').replace(/\*([^*]+)\*/g, '$1');
    startMenu.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="start-panel">
        <div class="start-head">
          <span class="start-avatar">${avatar}</span>
          <span class="start-who"><strong>Andrew Worgan</strong><span>${esc(tagline)}</span></span>
        </div>
        <nav aria-label="Apps"><ul class="start-apps">
          ${Object.keys(APPS).map((id) => `<li><a class="start-app" href="${esc(APPS[id].path)}" data-app="${id}">${navIcon(APPS[id].icon)}${esc(APPS[id].label)}</a></li>`).join('')}
        </ul></nav>
        <ul class="start-links">
          ${a.email ? `<li class="start-email"><a href="mailto:${esc(a.email)}">${doodleIcon('mail')}Email me</a></li>` : ''}
          ${socials}
        </ul>
        <ul class="start-system" aria-label="System">
          ${K.pet && C.wizard && C.wizard.enabled ? `<li><button type="button" data-pet-exe>${doodleIcon('hat')}pet.exe</button></li>` : ''}
          <li><button type="button" data-sys="wallpaper">${doodleIcon('palette')}Wallpaper</button></li>
          ${K.sound ? `<li><button type="button" data-sound aria-pressed="false">${soundLook(false)}</button></li>` : ''}
          <li><button type="button" data-sys="restart">${doodleIcon('refresh')}Restart</button></li>
          <li><button type="button" data-sys="shutdown">${doodleIcon('power')}Shut down</button></li>
        </ul>
        <div class="start-foot">
          <p>${esc(copyright())}</p>
          <button type="button" data-sys="about">${doodleIcon('info')}About Kasai OS</button>
        </div>
      </div>`;
    if (!hasPopover) {
      // Older browsers: a plain toggle instead of the popover.
      startMenu.hidden = true;
      startBtn.removeAttribute('popovertarget');
      startBtn.setAttribute('aria-expanded', 'false');
      startBtn.setAttribute('aria-controls', 'start-menu');
      startBtn.addEventListener('click', () => {
        startMenu.hidden = !startMenu.hidden;
        startBtn.setAttribute('aria-expanded', String(!startMenu.hidden));
        if (!startMenu.hidden) sound('menu');
      });
      document.addEventListener('click', (e) => { if (!e.target.closest('.start-btn, #start-menu')) hideStart(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !startMenu.hidden) { hideStart(); startBtn.focus(); } });
    } else startMenu.addEventListener('toggle', (e) => { if (e.newState === 'open') sound('menu'); });
    // Restored from the back/forward cache: never come back with it open.
    window.addEventListener('pageshow', (e) => { if (e.persisted) hideStart(); });
    // pet.exe (the wizard's own little window, pet.js), Wallpaper, Restart,
    // Shut down and About Kasai OS. Sound switches on or off and leaves the
    // menu open.
    startMenu.addEventListener('click', (e) => {
      if (e.target.closest('[data-sound]')) { K.sound.toggle(); return; }
      const b = e.target.closest('[data-pet-exe], [data-sys]');
      if (!b) return;
      hideStart();
      const act = b.dataset.sys;
      if (!act) K.pet.openExe({ from: startBtn });
      else if (act === 'wallpaper') openWallpaper({ from: startBtn });
      else if (act === 'restart') restart();
      else if (act === 'shutdown') shutDown();
      else if (act === 'about') aboutKasaiOS();
    });
  }

  // Links that open windows (the Start menu, buttons inside windows, About's My CV).
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[data-app]');
    if (!a || !named(a.dataset.app)) return;
    e.preventDefault();
    hideStart();
    open(a.dataset.app, { from: a });
  });

  /* ══════════════════════════════════════════════════════════════════════
     THE DESKTOP  (icons you can drag about)
     ══════════════════════════════════════════════════════════════════════
     Positions are kept per visitor as fractions of the desktop, so they
     survive a different window size. Phones use a tidy grid instead. */
  // (Checked: only spots that are two sensible fractions of the desktop
  // are kept; the wizard keeps his here too.)
  const saved = () => {
    const raw = K.store.get('kasai:desktop', null);
    const items = raw && typeof raw === 'object' && raw.items && typeof raw.items === 'object' ? raw.items : {};
    const out = {};
    Object.keys(items).forEach((k) => {
      const s = items[k];
      if (Array.isArray(s) && s.length === 2 && s.every((v) => Number.isFinite(v) && v > -1 && v < 2)) out[k] = s;
    });
    return out;
  };
  const remember = (id, el) => {
    const items = saved();
    const d = desktop.getBoundingClientRect();
    items[id] = [Number((el.offsetLeft / d.width).toFixed(4)), Number((el.offsetTop / d.height).toFixed(4))];
    K.store.set('kasai:desktop', { items });
  };

  // Where the icons sit until they're moved: in columns down the left.
  function layoutDesktop() {
    const phone = isPhone();
    desktop.classList.toggle('is-free', !phone);
    const d = desktop.getBoundingClientRect();
    const items = phone ? {} : saved();
    // The icons grow with the window (style.css), so their slots do too.
    const first = $('#desk-icons > li');
    const slot = first ? first.offsetHeight + 8 : 96;
    const col = first ? first.offsetWidth + 12 : 96;
    const perColumn = Math.max(1, Math.floor((d.height - 16) / slot));
    const lis = $$('#desk-icons > li');
    if (phone) { lis.forEach((li) => { li.style.left = li.style.top = ''; }); return; }
    // Icons that were moved go where they were put (on the 8px grid), the
    // rest into their columns; one that would land on another (spots kept
    // on a bigger screen) takes the next free slot instead.
    const placed = [];
    const clash = (x, y, w, h) => placed.some((r) => x < r.x + r.w && r.x < x + w && y < r.y + r.h && r.y < y + h);
    const spot = (el, x, y) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      x = clamp(Math.round(x / 8) * 8, 4, d.width - w - 4);
      y = clamp(Math.round(y / 8) * 8, 4, d.height - h - 4);
      for (let k = 0; clash(x, y, w, h) && k < lis.length * 2; k++) {
        x = clamp(12 + Math.floor(k / perColumn) * col, 4, d.width - w - 4);
        y = clamp(12 + (k % perColumn) * slot, 4, d.height - h - 4);
      }
      placed.push({ x, y, w, h });
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    };
    const moved = lis.filter((li) => items[li.dataset.dragId]);
    moved.forEach((li) => { const s = items[li.dataset.dragId]; spot(li, s[0] * d.width, s[1] * d.height); });
    lis.forEach((li, i) => {
      if (!items[li.dataset.dragId]) spot(li, 12 + Math.floor(i / perColumn) * col, 12 + (i % perColumn) * slot);
    });
  }

  // Drag with a mouse or pen (a few pixels first, so clicks still click).
  function draggable(li) {
    li.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.pointerType === 'touch' || isPhone()) return;
      const sx = e.clientX;
      const sy = e.clientY;
      const x0 = li.offsetLeft;
      const y0 = li.offsetTop;
      const d = desktop.getBoundingClientRect();
      let dragging = false;
      const move = (ev) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 5) return;
          dragging = true;
          li.classList.add('is-dragging');
        }
        li.style.left = clamp(Math.round((x0 + dx) / 8) * 8, 4, d.width - li.offsetWidth - 4) + 'px';
        li.style.top = clamp(Math.round((y0 + dy) / 8) * 8, 4, d.height - li.offsetHeight - 4) + 'px';
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!dragging) return;
        li.classList.remove('is-dragging');
        // Swallow the click that ends a drag.
        const target = li.firstElementChild;
        target.dataset.dragged = '1';
        setTimeout(() => { delete target.dataset.dragged; }, 0);
        remember(li.dataset.dragId, li);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
    // A dragged link mustn't follow its href.
    li.addEventListener('click', (e) => {
      if (li.firstElementChild.dataset.dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  // A <use> of another file can't be reached by the page's CSS, so the
  // desktop icons get their drawing copied in, letting their parts animate on
  // hover (style.css). Until it arrives, or if it fails, the <use> stays.
  function inlineDeskIcons() {
    $$('.desk-ico svg.nav-icon').forEach((svg) => {
      const use = svg.querySelector('use');
      const href = use && use.getAttribute('href');
      if (!href) return;
      // The built page stamps each icon's address with its version, so a
      // copy the browser kept is always the current drawing (with the named
      // parts the animations need).
      fetch(href.split('#')[0]).then((r) => (r.ok ? r.text() : Promise.reject())).then((text) => {
        const symbol = new DOMParser().parseFromString(text, 'image/svg+xml').getElementById('icon');
        if (!symbol) return;
        const drawn = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const { name, value } of symbol.attributes) if (name !== 'id') drawn.setAttribute(name, value);
        drawn.setAttribute('class', 'nav-icon is-inline');
        drawn.setAttribute('aria-hidden', 'true');
        drawn.append(...[...symbol.childNodes].map((n) => document.importNode(n, true)));
        svg.replaceWith(drawn);
      }).catch(() => {});
    });
  }

  // Calling the wizard over (pet.js): a double-click on an empty bit of the
  // desktop, or a double-tap on a phone's home screen (style.css stops a
  // double-tap zooming in there). A long press still opens the desktop menu.
  function wireSummon() {
    const empty = (t) => !t.closest('.desk-icon, .desk-pet');
    const call = (x, y) => { if (K.pet && K.pet.summon) K.pet.summon(x, y); };
    let lastType = 'mouse';
    let finger = null; // a finger on the desktop: { id, x, y, at }
    let tap = null;    // the quick tap before it, waiting for a second
    desktop.addEventListener('pointerdown', (e) => {
      lastType = e.pointerType || 'mouse';
      finger = e.pointerType === 'touch' && e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp } : null;
    });
    desktop.addEventListener('pointercancel', () => { finger = null; tap = null; });
    desktop.addEventListener('pointerup', (e) => {
      const f = finger;
      finger = null;
      if (!f || e.pointerId !== f.id) return;
      // A tap: quick and still (not a swipe, a scroll or a long press).
      if (e.timeStamp - f.at > 300 || Math.hypot(e.clientX - f.x, e.clientY - f.y) > 12 || !empty(e.target)) { tap = null; return; }
      if (tap && e.timeStamp - tap.at < 350 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 32) {
        tap = null;
        call(e.clientX, e.clientY);
      } else tap = { x: e.clientX, y: e.clientY, at: e.timeStamp };
    });
    // Mice and pens (a touch screen's own double-tap is counted above).
    desktop.addEventListener('dblclick', (e) => {
      if (lastType !== 'touch' && empty(e.target)) call(e.clientX, e.clientY);
    });
  }

  let deskSel = null; // which icon is selected (the desktop menu uses it too)
  function wireDesktop() {
    const icons = $('#desk-icons');
    if (icons) {
      $$('#desk-icons > li').forEach((li) => {
        li.dataset.dragId = 'icon-' + $('.desk-icon', li).dataset.app;
      });
      deskSel = K.openable(icons, '.desk-icon', (el) => open(el.dataset.app, { from: el }));
      desktop.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.desk-icon')) deskSel.clear();
      });
    }
    $$('#desk-icons > li').forEach(draggable);
    wireSummon();
    inlineDeskIcons();
    layoutDesktop();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutDesktop);
    PHONE.addEventListener('change', () => {
      layoutDesktop();
      const f = front();
      sync(false);
      if (f && f.spec.onResize) f.spec.onResize(f);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     SMALL THINGS  (clock, sound, tray icons, tab title, console hello, dialogs)
     ══════════════════════════════════════════════════════════════════════ */
  function wireClock() {
    const clock = $('#tray-clock');
    if (!clock) return;
    const tick = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      clock.setAttribute('datetime', now.toISOString());
      clock.title = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };
    tick();
    setInterval(tick, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }

  // Sound (sound.js makes every sound; it's off until it's switched on).
  // Two switches, a speaker beside the clock (not on phones) and Sound in
  // the Start menu's bottom row, kept in step by the 'sound' event.
  // A switch's insides: the speaker, crossed out while it's off, and its name.
  function soundLook(on, iconOnly) {
    return doodleIcon(on ? 'sound' : 'mute') + (iconOnly ? '<span class="vh">Sound</span>' : 'Sound');
  }
  function wireSound() {
    if (!K.sound) return;
    const tray = document.createElement('button');
    tray.className = 'tray-sound';
    tray.type = 'button';
    tray.dataset.sound = '';
    const clock = $('#tray-clock');
    if (clock) clock.before(tray);
    else taskbar.appendChild(tray);
    tray.addEventListener('click', () => K.sound.toggle());
    const draw = () => {
      const on = K.sound.on;
      $$('[data-sound]').forEach((b) => {
        b.setAttribute('aria-pressed', String(on));
        b.title = on ? 'Sound: on' : 'Sound: off';
        b.innerHTML = soundLook(on, b === tray);
      });
    };
    draw();
    K.on('sound', (e) => {
      draw();
      announce(e.on ? 'Sound on' : 'Sound off');
    });
  }

  // The tray's social icons become CSS masks so they always take the text
  // colour; if this never runs, the original images just stay.
  function colorizeSocials() {
    $$('.social-link img').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const span = document.createElement('span');
      span.className = 'social-ico';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--ico', `url("${src}")`);
      img.replaceWith(span);
    });
  }

  // The tab title changes when you wander off (site.awayTitle in content.js).
  function wireAwayTitle() {
    const away = C.site && C.site.awayTitle;
    if (!away) return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) document.title = away;
      else syncTitle();
    });
  }

  // A hello for anyone who opens DevTools (site.consoleMsg in content.js).
  function consoleEgg() {
    const msg = C.site && C.site.consoleMsg;
    if (!msg) return;
    try {
      console.log('%c    /\\\n   /* \\\n  (o  o)\n   \\__/\n\n' + msg,
        'font-family:monospace;background:#FEF6FE;color:#161A2E;padding:10px 14px;' +
        'border:2px solid #161A2E;border-radius:10px;line-height:1.7;display:inline-block;');
    } catch (err) { /* consoles can be weird; never break the page over a joke */ }
  }

  // A small Kasai OS dialog (native <dialog>: focus trap and Escape for free).
  // Resolves with the index of the button pressed. `body` (markup made here,
  // already escaped) replaces the usual icon and message.
  K.dialog = ({ title, icon, message, body, buttons, colour, role }) => new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'os-dialog ' + (colour || 'yellow');
    d.setAttribute('role', role || 'alertdialog');
    d.setAttribute('aria-labelledby', 'os-dialog-title');
    d.setAttribute('aria-describedby', 'os-dialog-msg');
    d.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="os-dialog-frame">
        <div class="os-bar"><span class="os-app" aria-hidden="true">${doodleIcon(icon || 'alert')}</span>
          <span class="os-title" id="os-dialog-title">${esc(title || 'Kasai OS')}</span></div>
        ${body ? `<div id="os-dialog-msg">${body}</div>` : `<div class="os-dialog-body">
          <span class="os-dialog-icon" aria-hidden="true">${doodleIcon(icon || 'alert')}</span>
          <p id="os-dialog-msg">${esc(message || '')}</p>
        </div>`}
        <p class="os-dialog-buttons">${(buttons || ['OK']).map((b, i) => `<button class="os-button" type="button" value="${i}">${esc(b)}</button>`).join('')}</p>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (b) d.close(b.value);
    });
    d.addEventListener('close', () => { resolve(d.returnValue); d.remove(); });
    d.showModal();
    sound('alert');
  });

  /* ══════════════════════════════════════════════════════════════════════
     404  (an error dialog on the desktop)
     ══════════════════════════════════════════════════════════════════════ */
  function openNotFound() {
    const W = C.wizard || {};
    const lines = (W.lines && W.lines.notfound) || [];
    const line = lines.length ? lines[Math.floor(Math.random() * lines.length)] : '';
    const sprite = W.frames && W.frames.asleep ? K.webSrc(W.frames.asleep) : '';
    let cameFromHere = false;
    try { cameFromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (e) { /* no referrer */ }
    open({
      id: 'error',
      label: 'Page not found',
      file: 'kasai.exe',
      colour: 'pink',
      doodle: 'alert',
      size: [520, 300],
      render(win) {
        win.body.innerHTML = `
          <div class="error-box">
            ${sprite ? `<img class="error-wizard" src="${esc(sprite)}" alt="" />` : `<span class="os-dialog-icon">${doodleIcon('alert')}</span>`}
            <div>
              <h2 id="${win.headingId}" tabindex="-1">Page not found (404)</h2>
              <p>Kasai OS can't find anything at <code>${esc(window.location.pathname)}</code>.</p>
              ${line ? `<p class="error-line">The wizard says: "${esc(line)}"</p>` : ''}
              <p class="error-actions">
                <a class="os-button" href="/" data-app="about">Open About</a>
                ${cameFromHere ? '<button class="os-button" type="button" data-back>Go back</button>' : ''}
              </p>
            </div>
          </div>`;
        const back = $('[data-back]', win.body);
        if (back) back.addEventListener('click', () => history.back());
      },
    }, { push: false, focus: false });
  }

  /* ══════════════════════════════════════════════════════════════════════
     BOOT, RESTART AND SHUT DOWN
     ══════════════════════════════════════════════════════════════════════
     The boot screen plays on the first page of a visit (head.js decides
     that before anything is drawn), on Start > Restart and when the power
     comes back on after Shut down. It takes under a second; any key or
     click skips it, and with reduced motion it never plays. Its lines come
     from os.bootLines in content.js. */
  const root = document.documentElement;
  const BOOT_LINES = ['Loading doodles...', 'Waking the wizard...', 'Shuffling the spell cards...', 'Kasai OS is ready.'];
  const BOOT_MS = 700; // the bar fills and the lines appear, then it fades away
  let bootRun = null; // the boot screen, while it's up

  // o.fadeIn: fade in first (Restart). o.behind: set the desktop up while
  // it's hidden. o.done: once the boot screen has gone.
  function playBoot(o) {
    o = o || {};
    if (bootRun) return;
    const el = document.createElement('div');
    el.className = 'boot';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="boot-inner">
        <img class="boot-logo" src="/assets/ui/favicon.png" alt="" />
        <p class="boot-name">Kasai OS</p>
        <span class="boot-bar"><span class="boot-fill"></span></span>
        <ul class="boot-lines"></ul>
      </div>`;
    document.body.appendChild(el);
    const fill = $('.boot-fill', el);
    const list = $('.boot-lines', el);
    const lines = textList(C.os && C.os.bootLines, BOOT_LINES);
    const timers = [];
    let setUp = false;
    let ended = false;
    const behind = () => {
      if (setUp) return;
      setUp = true;
      if (o.behind) o.behind();
    };
    const end = (quick) => {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
      behind();
      root.classList.remove('booting');
      const gone = () => { el.remove(); bootRun = null; if (o.done) o.done(); };
      if (!el.animate) { gone(); return; }
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: quick ? 120 : 180, easing: 'ease-out', fill: 'forwards' })
        .finished.then(gone, gone);
    };
    // Any key (not Shift, Ctrl and friends on their own) or click skips it.
    const skip = (e) => {
      if (e.type === 'keydown' && /^(Shift|Control|Alt|AltGraph|Meta|CapsLock|Fn)$/.test(e.key)) return;
      // The key that skips it does nothing else (Escape doesn't minimise
      // the window it opened, letters don't count towards a secret word).
      if (e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); }
      end(true);
    };
    const run = () => {
      if (ended) return;
      behind();
      if (fill.animate) fill.animate([{ width: '0%' }, { width: '100%' }], { duration: BOOT_MS - 40, easing: 'steps(12, end)', fill: 'forwards' });
      const gap = lines.length > 1 ? (BOOT_MS - 120) / (lines.length - 1) : 0;
      lines.forEach((text, i) => timers.push(setTimeout(() => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="boot-ok">OK</span>${esc(text)}`;
        list.appendChild(li);
        if (list.children.length > 5) list.firstElementChild.remove();
      }, 40 + i * gap)));
      timers.push(setTimeout(() => end(false), BOOT_MS));
    };
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    bootRun = { end };
    if (o.fadeIn && el.animate) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' }).finished.then(run, run);
    } else run();
  }

  // Behind the boot screen, every window closes and the desktop starts the
  // way a visit does: About open (phones: the home screen). Quietly: the
  // start-up chime has it covered.
  function freshStart() {
    hushed = true;
    try {
      order.slice().reverse().forEach((id) => { const w = wins.get(id); if (w) close(w, true); });
      notFound = false;
      cascade = 0;
      if (isPhone()) sync(false);
      else open('about', { push: false, focus: false });
    } finally {
      hushed = false;
    }
  }
  // Then focus lands where a visitor starts: the window in front, or the
  // first icon.
  function settle() {
    const f = front();
    const target = f ? ($('#' + f.headingId, f.el) || f.el) : $('.desk-icon');
    if (target) target.focus({ preventScroll: true });
    announce('Kasai OS restarted');
  }

  // The start-up chime plays on Restart and Power on (a first visit's boot
  // screen is silent: browsers allow no sound before a click).
  function restart() {
    hideStart();
    closeMenu();
    if (bootRun) return;
    sound('boot');
    if (REDUCE_MOTION) { freshStart(); settle(); return; }
    playBoot({ fadeIn: true, behind: freshStart, done: settle });
  }

  // Shut down: the screen fades to navy, the wizard sleeps, and the power
  // button (or Escape) boots it back up.
  function shutDown() {
    hideStart();
    closeMenu();
    if (bootRun || $('dialog.shutdown')) return;
    const asleep = K.pet && K.pet.frame ? K.pet.frame('asleep') : '';
    const d = document.createElement('dialog');
    d.className = 'shutdown';
    d.setAttribute('aria-labelledby', 'shutdown-msg');
    d.innerHTML = `
      <img class="shutdown-pic${asleep ? '' : ' is-logo'}" src="${esc(asleep || '/assets/ui/favicon.png')}" alt="" />
      <p class="shutdown-msg" id="shutdown-msg">It's now safe to turn off your computer.</p>
      <button class="shutdown-power" type="button">${doodleIcon('power')}<span>Power on</span></button>`;
    document.body.appendChild(d);
    const power = $('.shutdown-power', d);
    let on = false;
    const powerOn = () => {
      if (on) return;
      on = true;
      sound('boot');
      if (REDUCE_MOTION) { d.close(); freshStart(); settle(); return; }
      playBoot({ behind: freshStart, done: settle }); // waits under the shutdown screen until it closes
      d.close();
    };
    power.addEventListener('click', powerOn);
    d.addEventListener('cancel', (e) => { e.preventDefault(); powerOn(); });
    // Some browsers close it on Escape without asking: that powers on too.
    d.addEventListener('close', () => { powerOn(); d.remove(); });
    d.showModal();
    power.focus();
    sound('shutdown');
    if (!REDUCE_MOTION && d.animate) d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-in-out' });
  }

  /* ══════════════════════════════════════════════════════════════════════
     WALLPAPER  (Start > Wallpaper, or Change wallpaper on the desktop menu)
     ══════════════════════════════════════════════════════════════════════
     Saved in kasai:wallpaper; head.js puts it back before anything is
     drawn, so it never flashes. Lavender grid is the default. */
  const WALL_COLOURS = [['lavender', 'Lavender'], ['blue', 'Blue'], ['yellow', 'Yellow'], ['teal', 'Teal'],
    ['pink', 'Pink'], ['navy', 'Navy'], ['blush', 'Blush']];
  const WALL_PATTERNS = [['dots', 'Dots'], ['grid', 'Grid'], ['stars', 'Stars'], ['checker', 'Checker'], ['waves', 'Waves'], ['plain', 'Plain']];
  // Light or dark (head.js applies it): Auto follows the computer.
  const MODES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
  const modeNow = () => (window.KasaiTheme ? window.KasaiTheme.get() : 'auto');
  const wallNow = () => ({ colour: root.getAttribute('data-wall') || 'lavender', pattern: root.getAttribute('data-pattern') || 'grid' });
  const wallName = (w) => `${(WALL_COLOURS.find((c) => c[0] === w.colour) || [0, w.colour])[1]}, ${w.pattern}`;

  // Light to dark (or back) in a circle that grows out of the Mode chip
  // picked, as a view transition. At once with reduced motion, without
  // view transitions, or when the screen won't change (Auto already
  // matching).
  let wipeVT = null;
  function wipeTo(mode, chip) {
    const set = () => window.KasaiTheme.set(mode);
    const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const change = (dark ? 'dark' : 'light') !== root.getAttribute('data-theme');
    if (!change || REDUCE_MOTION || !document.startViewTransition || !chip) { set(); return; }
    K.wm.settle(); // no window caught mid-animation in the snapshots
    const r = chip.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const far = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--wipe-x', Math.round(x) + 'px');
    root.style.setProperty('--wipe-y', Math.round(y) + 'px');
    root.style.setProperty('--wipe-r', Math.ceil(far) + 'px');
    root.classList.add('vt-theme');
    const vt = document.startViewTransition(set);
    wipeVT = vt;
    vt.finished.catch(() => {}).then(() => {
      if (wipeVT !== vt) return; // a newer one took over
      wipeVT = null;
      root.classList.remove('vt-theme');
      ['--wipe-x', '--wipe-y', '--wipe-r'].forEach((p) => root.style.removeProperty(p));
    });
  }

  function openWallpaper(opts) {
    open({
      id: 'wallpaper',
      label: 'Wallpaper',
      file: 'wallpaper.exe',
      colour: 'blue',
      doodle: 'palette',
      size: [480, 720],
      minSize: [320, 420],
      render(win) {
        const now = Object.assign(wallNow(), { mode: modeNow() });
        const choice = (name, id, label, look) => `
          <label class="wall-choice">
            <input class="vh" type="radio" name="${name}" value="${id}"${now[name] === id ? ' checked' : ''} />
            ${look}<span class="wall-label">${esc(label)}</span>
          </label>`;
        win.body.innerHTML = `
          <form class="wall" action="#">
            <h2 class="vh" id="${win.headingId}" tabindex="-1">Wallpaper</h2>
            <div class="wall-monitor" aria-hidden="true">
              <div class="wall-screen"><span class="wall-icons"><i></i><i></i><i></i></span><span class="wall-window"></span></div>
              <span class="wall-stand"></span>
            </div>
            <fieldset class="wall-set">
              <legend>Colour</legend>
              <div class="wall-options">${WALL_COLOURS.map(([id, label]) =>
                choice('colour', id, label, `<span class="wall-chip${id === 'navy' ? ' is-dark' : ''}" data-chip="${id}" style="--chip: var(--wall-${id})">${doodleIcon('check')}</span>`)).join('')}</div>
            </fieldset>
            <fieldset class="wall-set">
              <legend>Pattern</legend>
              <div class="wall-options">${WALL_PATTERNS.map(([id, label]) =>
                choice('pattern', id, label, `<span class="wall-chip wall-tile is-${id}">${doodleIcon('check')}</span>`)).join('')}</div>
            </fieldset>
            <fieldset class="wall-set">
              <legend>Mode</legend>
              <div class="wall-options">${MODES.map(([id, label]) =>
                choice('mode', id, label, `<span class="wall-chip wall-mode is-${id}">${doodleIcon('check')}</span>`)).join('')}</div>
            </fieldset>
            <fieldset class="wall-set">
              <legend>Opening icons and files</legend>
              <label class="wall-click-choice"><input type="checkbox" name="singleClick"${K.singleClick ? ' checked' : ''} />Open with a single click</label>
              <p class="wall-click-hint">Double-click is the default. Touch and keyboard controls stay the same.</p>
            </fieldset>
            <p class="wall-actions"><button class="os-button" type="button" data-reset>${doodleIcon('refresh')}Back to lavender grid</button></p>
          </form>`;
        const form = $('form', win.body);
        const status = () => win.setStatus(`<span>${esc(wallName(wallNow()))}</span><span class="status-hint">Remembered in this browser</span>`);
        form.addEventListener('submit', (e) => e.preventDefault());
        form.addEventListener('change', (e) => {
          if (e.target.name === 'singleClick') {
            K.setSingleClick(e.target.checked);
            announce(K.singleClick ? 'Icons and files open with a single click' : 'Icons and files open with a double-click');
            return;
          }
          if (e.target.name === 'mode') {
            const mode = e.target.value;
            if (window.KasaiTheme) wipeTo(mode, e.target.nextElementSibling);
            if (mode === 'auto') K.store.del('kasai:theme');
            else K.store.set('kasai:theme', { mode });
            announce(mode === 'auto' ? 'Light or dark, as your computer is' : `${mode === 'dark' ? 'Dark' : 'Light'} mode`);
            return;
          }
          const colour = (form.querySelector('[name="colour"]:checked') || {}).value || 'lavender';
          const pattern = (form.querySelector('[name="pattern"]:checked') || {}).value || 'grid';
          root.setAttribute('data-wall', colour);
          root.setAttribute('data-pattern', pattern);
          K.store.set('kasai:wallpaper', { colour, pattern });
          status();
        });
        $('[data-reset]', form).addEventListener('click', () => {
          root.removeAttribute('data-wall');
          root.removeAttribute('data-pattern');
          K.store.del('kasai:wallpaper');
          form.querySelector('[name="colour"][value="lavender"]').checked = true;
          form.querySelector('[name="pattern"][value="grid"]').checked = true;
          status();
          announce('Wallpaper back to lavender grid');
        });
        status();
      },
    }, { from: opts && opts.from, at: opts && opts.at });
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE DESKTOP MENU  (right-click the desktop, Shift+F10 or the menu key;
     a long press on a phone's home screen)
     ══════════════════════════════════════════════════════════════════════
     Arrow keys, Home and End move about it, a letter jumps to its item,
     Enter picks one, Escape or Tab closes it. On an icon it starts with
     Open. Windows keep the browser's own menu (for copying and links). */
  const MENU_ITEMS = [
    ['open', 'Open'], ['-', 'open'],
    ['refresh', 'Refresh', 'refresh'], ['folder', 'New folder', 'folder'], ['-'],
    ['wallpaper', 'Change wallpaper', 'palette'], ['sort', 'Sort icons', 'sort'], ['-'],
    ['cascade', 'Cascade windows', 'cascade'], ['tile', 'Side by side', 'tile'], ['desktop', 'Show desktop', 'desktop'], ['-', 'wins'],
    ['about', 'About Kasai OS', 'info'],
  ];
  // Phones show one window at a time, full screen: these don't apply there.
  const WINDOW_ACTS = ['cascade', 'tile', 'desktop'];
  const hasPopoverApi = typeof HTMLElement !== 'undefined' && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  let menu = null; // { el, panel, icon, back } once it's been opened
  const menuOpen = () => !!menu && (hasPopoverApi ? menu.el.matches(':popover-open') : !menu.el.hidden);
  const menuItems = () => $$('[role="menuitem"]', menu.panel).filter((b) => !b.hidden);

  function buildMenu() {
    const el = document.createElement('div');
    el.className = 'desk-menu';
    // A "manual" popover (on top of everything) that closes itself: the
    // browser's own light dismiss would shut it as a long press lifts.
    if (hasPopoverApi) el.setAttribute('popover', 'manual');
    else el.hidden = true;
    el.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="desk-menu-panel" role="menu" aria-label="Desktop" tabindex="-1">
        ${MENU_ITEMS.map(([act, label, icon]) => (act === '-'
          ? `<div class="desk-menu-sep" role="separator"${label ? ` data-sep="${label}"` : ''}></div>`
          : `<button type="button" role="menuitem" tabindex="-1" data-act="${act}">${icon ? doodleIcon(icon) : ''}<span>${esc(label)}</span></button>`)).join('')}
      </div>`;
    document.body.appendChild(el);
    const panel = $('.desk-menu-panel', el);
    const m = { el, panel, icon: null, back: null };

    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      const icon = m.icon;
      const back = m.back;
      const at = b.getBoundingClientRect(); // a window opened from here grows out of it
      closeMenu(true);
      runMenu(b.dataset.act, icon, back, at);
    });
    // The mouse and the keyboard share one highlight.
    panel.addEventListener('pointermove', (e) => {
      const b = e.target.closest('[role="menuitem"]');
      if (b && document.activeElement !== b) b.focus({ preventScroll: true });
    });
    panel.addEventListener('keydown', (e) => {
      const items = menuItems();
      const i = items.indexOf(document.activeElement);
      let to = null;
      if (e.key === 'ArrowDown') to = items[i < 0 ? 0 : (i + 1) % items.length];
      else if (e.key === 'ArrowUp') to = items[i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length];
      else if (e.key === 'Home') to = items[0];
      else if (e.key === 'End') to = items[items.length - 1];
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); closeMenu(true); return; }
      else if (e.key.length === 1 && /\S/.test(e.key)) {
        // A letter jumps to the next item starting with it.
        const k = e.key.toLowerCase();
        const from = i < 0 ? -1 : i;
        to = items.slice(from + 1).concat(items.slice(0, from + 1)).find((b) => b.textContent.trim().toLowerCase().startsWith(k)) || null;
        if (!to) return;
      } else return;
      e.preventDefault();
      if (to) to.focus({ preventScroll: true });
    });
    // A press anywhere else, or the browser window losing focus or changing
    // size, closes it.
    document.addEventListener('pointerdown', (e) => { if (menuOpen() && !el.contains(e.target)) closeMenu(false); }, true);
    window.addEventListener('blur', () => closeMenu(false));
    window.addEventListener('resize', () => closeMenu(false));
    return m;
  }

  function refocus(m) {
    const back = m.back;
    if (back && document.contains(back) && back.getClientRects().length) back.focus({ preventScroll: true });
    else if (m.el.contains(document.activeElement)) document.activeElement.blur();
  }

  function openMenu(x, y, o) {
    menu = menu || buildMenu();
    const { el, panel } = menu;
    menu.icon = o.icon || null;
    const active = document.activeElement;
    menu.back = active && active !== document.body && !el.contains(active) ? active : null;
    const openItem = $('[data-act="open"]', panel);
    openItem.hidden = $('[data-sep="open"]', panel).hidden = !menu.icon;
    if (menu.icon) {
      const app = APPS[menu.icon.dataset.app];
      openItem.innerHTML = `${navIcon(app.icon)}<span>Open ${esc(app.label)}</span>`;
    }
    $('[data-act="sort"]', panel).hidden = isPhone(); // a phone's home screen is always in order
    // The window items: hidden on phones, greyed out with nothing to tidy.
    const n = showing().length;
    const away = !n && tuckedAway();
    const dsk = $('[data-act="desktop"]', panel);
    $('span', dsk).textContent = away ? 'Show windows' : 'Show desktop';
    WINDOW_ACTS.forEach((act) => {
      const b = $(`[data-act="${act}"]`, panel);
      b.hidden = isPhone();
      const off = act === 'tile' ? n < 2 : act === 'desktop' ? !n && !away : !n;
      if (off) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
    });
    $('[data-sep="wins"]', panel).hidden = isPhone();
    el.style.left = '0px';
    el.style.top = '0px';
    if (hasPopoverApi) { if (!el.matches(':popover-open')) el.showPopover(); } else el.hidden = false;
    sound('menu');
    // Keep it on screen: it opens left of the pointer or above it if it must.
    const r = panel.getBoundingClientRect();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const left = x + r.width > W - 8 ? Math.max(8, x - r.width) : x;
    const top = y + r.height > H - 8 ? Math.max(8, (y - r.height >= 8 ? y - r.height : H - 8 - r.height)) : y;
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    // From the keyboard the first item is highlighted; from a mouse, nothing yet.
    (o.keyboard ? menuItems()[0] : panel).focus({ preventScroll: true });
  }

  function closeMenu(restore) {
    if (!menuOpen()) return;
    const had = menu.el.contains(document.activeElement);
    if (hasPopoverApi) { try { menu.el.hidePopover(); } catch (e) { /* already closed */ } } else menu.el.hidden = true;
    if (had) {
      if (restore) refocus(menu);
      else document.activeElement.blur();
    }
  }

  function runMenu(act, icon, back, at) {
    if (act === 'open' && icon) open(icon.dataset.app, { from: icon });
    else if (act === 'refresh') refreshDesktop();
    else if (act === 'folder') newFolder();
    else if (act === 'wallpaper') openWallpaper({ from: back, at });
    else if (act === 'sort') sortIcons();
    else if (act === 'cascade') cascadeWindows();
    else if (act === 'tile') sideBySide();
    else if (act === 'desktop') { if (showing().length) showDesktop(); else showWindows(); }
    else if (act === 'about') aboutKasaiOS();
  }

  // Refresh: the icons jiggle and the wizard does a trick.
  function refreshDesktop() {
    layoutDesktop();
    $$('.desk-icon').forEach((icon, i) => {
      icon.classList.remove('is-jiggling');
      icon.style.setProperty('--jiggle-delay', i * 45 + 'ms');
      void icon.offsetWidth; // restart the jiggle
      icon.classList.add('is-jiggling');
      setTimeout(() => { icon.classList.remove('is-jiggling'); icon.style.removeProperty('--jiggle-delay'); }, 700 + i * 45);
    });
    if (K.pet && K.pet.trick) K.pet.trick();
    announce('Desktop refreshed');
  }

  // New folder: a joke (os.newFolder in content.js).
  const NEW_FOLDER = 'New folder (2) already exists. So does New folder (3). Kasai OS is staging an intervention.';
  function newFolder() {
    const line = C.os && typeof C.os.newFolder === 'string' && C.os.newFolder.trim();
    K.dialog({ title: 'New folder', icon: 'folder', message: line || NEW_FOLDER, buttons: ['Fair enough'] });
  }

  // Sort icons: back into their columns, their dragged-to spots forgotten
  // (the wizard keeps his).
  function sortIcons() {
    const items = saved();
    Object.keys(items).forEach((k) => { if (k.indexOf('icon-') === 0) delete items[k]; });
    K.store.set('kasai:desktop', { items });
    const lis = $$('#desk-icons > li');
    const was = lis.map((li) => li.getBoundingClientRect());
    layoutDesktop();
    if (!REDUCE_MOTION) {
      lis.forEach((li, i) => {
        const now = li.getBoundingClientRect();
        const dx = was[i].left - now.left;
        const dy = was[i].top - now.top;
        if ((dx || dy) && li.animate) {
          li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 480, delay: i * 30, easing: 'cubic-bezier(0.3, 1.25, 0.5, 1)', fill: 'backwards' });
        }
      });
    }
    announce('Icons sorted');
  }

  // About Kasai OS: the version and the credits (os.version and os.credits
  // in content.js).
  const CREDITS = ['Made by Andrew Worgan (Kasai).', 'Pet wizard drawn by Andrew, petted by you.', 'Hand-built in vanilla HTML, CSS and JavaScript.'];
  function aboutKasaiOS() {
    const O = C.os || {};
    const version = String(O.version == null ? '' : O.version).trim() || '1.0';
    const credits = textList(O.credits, CREDITS);
    K.dialog({
      title: 'About Kasai OS',
      icon: 'info',
      colour: 'lavender',
      role: 'dialog',
      body: `<div class="about-os">
          <img class="about-os-logo" src="/assets/ui/favicon.png" alt="" />
          <div>
            <p class="about-os-name">Kasai OS</p>
            <p class="about-os-version">Version ${esc(version)}</p>
            ${credits.length ? `<ul class="about-os-credits">${credits.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
            <p class="about-os-copy">${esc(copyright())}</p>
          </div>
        </div>`,
      buttons: ['OK'],
    });
  }

  function wireDeskMenu() {
    const onDesk = (t) => !!t && (t === document.body || t === root || desktop.contains(t));
    let keyAt = 0;
    let keyTimer = 0;
    const openAt = (target, point) => {
      const icon = target.closest ? target.closest('.desk-icon') : null;
      if (icon && deskSel) deskSel.select(icon);
      let x;
      let y;
      if (point) ({ x, y } = point);
      else if (icon || desktop.contains(target)) {
        const r = (icon || target).getBoundingClientRect();
        x = r.left + Math.min(28, r.width / 2);
        y = r.bottom - 6;
      } else {
        const d = desktop.getBoundingClientRect();
        x = d.left + d.width * 0.4;
        y = d.top + d.height * 0.3;
      }
      openMenu(x, y, { icon, keyboard: !point });
    };

    document.addEventListener('contextmenu', (e) => {
      if (menu && menu.el.contains(e.target)) { e.preventDefault(); return; } // never the browser's menu on ours
      if (e.defaultPrevented || bootRun || !onDesk(e.target)) return;
      e.preventDefault();
      clearTimeout(keyTimer);
      if (Date.now() - keyAt < 1000) openAt(document.activeElement && onDesk(document.activeElement) ? document.activeElement : e.target, null);
      else openAt(e.target, { x: e.clientX, y: e.clientY });
    });
    // Shift+F10 and the menu key: browsers follow these with a contextmenu
    // event (above); if one doesn't, the menu opens anyway.
    document.addEventListener('keydown', (e) => {
      if (!(e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) return;
      if (!onDesk(document.activeElement || document.body) || bootRun) return;
      keyAt = Date.now();
      clearTimeout(keyTimer);
      keyTimer = setTimeout(() => { if (!menuOpen()) openAt(document.activeElement || document.body, null); }, 400);
    });

    // Touch screens: a long press on the desktop itself (icons and the
    // wizard have their own long presses).
    let press = null;
    const letGo = (e) => { if (press && (!e || e.pointerId === press.id)) { clearTimeout(press.timer); press = null; } };
    desktop.addEventListener('pointerdown', (e) => {
      letGo();
      if (e.pointerType !== 'touch' || !e.isPrimary || e.target.closest('.desk-icon, .pet')) return;
      const p = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target };
      p.timer = setTimeout(() => {
        if (press !== p) return;
        press = null;
        if (menuOpen()) return;
        openAt(p.target, { x: p.x, y: p.y });
        // Lifting that finger can fire a click under it, which mustn't pick an item.
        const lift = (ev) => {
          if (ev.pointerId !== p.id) return;
          document.removeEventListener('pointerup', lift, true);
          document.removeEventListener('pointercancel', lift, true);
          if (ev.type !== 'pointerup') return;
          const swallow = (c) => { c.preventDefault(); c.stopPropagation(); };
          document.addEventListener('click', swallow, true);
          setTimeout(() => document.removeEventListener('click', swallow, true), 80);
        };
        document.addEventListener('pointerup', lift, true);
        document.addEventListener('pointercancel', lift, true);
      }, 550);
      press = p;
    });
    desktop.addEventListener('pointermove', (e) => {
      if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) letGo(e);
    });
    desktop.addEventListener('pointerup', letGo);
    desktop.addEventListener('pointercancel', letGo);
  }

  /* ══════════════════════════════════════════════════════════════════════
     SECRET CODES
     ══════════════════════════════════════════════════════════════════════
     Typed anywhere but a text box: "wizard" (a party for the wizard),
     "kasai" (doodle rain), "sweep", "rubbish", "stardrop" and
     "solitaire" (the games), or the Konami code (up up down down left
     right left right B A: the whole party). Phones have no keyboard, so
     the home screen takes the Konami code as swipes. */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const petHere = () => !!(K.pet && $('#desk-pet .pet'));
  const SECRETS = {
    wizard() {
      if (petHere()) K.pet.party();
      else K.doodleRain();
      return 'a party for the wizard';
    },
    kasai() {
      // With reduced motion there's no rain, so the wizard describes it.
      if (!K.doodleRain() && petHere()) K.pet.say('*imagine doodles raining down*');
      return 'doodle rain';
    },
    sweep() {
      if (K.openSweeper) K.openSweeper();
      return 'Wizard Sweeper';
    },
    rubbish() {
      if (K.openGame) K.openGame('rubbish');
      return 'Not Rubbish';
    },
    stardrop() {
      if (K.openGame) K.openGame('stardrop');
      return 'Star Drop';
    },
    solitaire() {
      if (K.openGame) K.openGame('solitaire');
      return 'Spell Solitaire';
    },
    konami() {
      K.doodleRain();
      if (petHere()) K.pet.party();
      return 'the Konami code';
    },
  };
  const secret = (name) => {
    sound('cast');
    announce('Secret found: ' + SECRETS[name]());
  };
  const endsWith = (list, tail) => list.length >= tail.length && tail.every((k, i) => k === list[list.length - tail.length + i]);

  function wireSecrets() {
    let keys = [];
    let lastKey = 0;
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || !e.key) return;
      const t = e.target;
      // Never while someone is typing in a box, or with a dialog up.
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if (bootRun || $('dialog[open]')) return;
      const now = Date.now();
      if (now - lastKey > 3000) keys = [];
      lastKey = now;
      keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (keys.length > 12) keys.shift();
      if (endsWith(keys, KONAMI)) { keys = []; secret('konami'); return; }
      let typed = '';
      for (let i = keys.length - 1; i >= 0 && keys[i].length === 1; i--) typed = keys[i] + typed;
      const word = ['wizard', 'kasai', 'sweep', 'rubbish', 'stardrop', 'solitaire'].find((w) => typed.endsWith(w));
      if (word) { keys = []; secret(word); }
    });

    // Phones: swipe up, up, down, down, left, right, left, right on the
    // home screen (not on the wizard: that's carrying him).
    let touch = null;
    let swipes = [];
    let lastSwipe = 0;
    desktop.addEventListener('touchstart', (e) => {
      const p = e.touches[0];
      touch = e.touches.length === 1 && !e.target.closest('.pet') ? { x: p.clientX, y: p.clientY, at: Date.now() } : null;
    }, { passive: true });
    desktop.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
    desktop.addEventListener('touchend', (e) => {
      if (!touch) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - touch.x;
      const dy = p.clientY - touch.y;
      const quick = Date.now() - touch.at < 800;
      touch = null;
      if (!quick || Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
      const now = Date.now();
      if (now - lastSwipe > 3000) swipes = [];
      lastSwipe = now;
      swipes.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
      if (swipes.length > 8) swipes.shift();
      if (endsWith(swipes, KONAMI.slice(0, 8))) { swipes = []; secret('konami'); }
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════════════════
     START-UP
     ══════════════════════════════════════════════════════════════════════ */
  function startRoute() {
    if (notFound) { openNotFound(); return; }
    let first = K.appFromPath(window.location.href);
    // Phones start on the home screen unless the link asked for a window.
    if (isPhone() && first === 'about' && /^\/(about)?$/.test(window.location.pathname)) first = null;
    history.replaceState({ app: first, win: first, n: depth }, '', window.location.pathname + window.location.search);
    // The CV's address opens About too, under it.
    const under = first && SUBS[first] && SUBS[first].parent;
    if (under) open(under, { push: false, focus: false });
    if (first) open(first, { push: false, focus: false });
    else sync(false);
  }

  // The skip link jumps to the window in front (or the desktop icons).
  function wireSkipLink() {
    const skip = $('.skip-link');
    if (!skip) return;
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      const f = front();
      const target = f ? ($('#' + f.headingId, f.el) || f.el) : $('.desk-icon');
      if (target) target.focus();
    });
  }

  // The first page of a visit: head.js has already covered the screen, and
  // the boot screen plays over the desktop that's just been built.
  function startBoot() {
    if (!root.classList.contains('booting')) return;
    try {
      if (REDUCE_MOTION) root.classList.remove('booting');
      else playBoot();
    } catch (err) {
      root.classList.remove('booting'); // never leave the screen covered
      throw err;
    }
  }

  [
    ['desktop', wireDesktop],
    ['windows', () => Object.keys(APPS).forEach((id) => { if (!wins.get(id)) build(Object.assign({ id }, APPS[id])); })],
    ['start menu', buildStart],
    ['tray', colorizeSocials],
    ['clock', wireClock],
    ['sound switches', wireSound],
    ['pet', () => { if (K.pet) K.pet.init($('#desk-pet')); }],
    ['first window', startRoute],
    ['skip link', wireSkipLink],
    ['desktop menu', wireDeskMenu],
    ['secret codes', wireSecrets],
    ['doodle trail', K.wireTrail],
    ['tab title', wireAwayTitle],
    ['console', consoleEgg],
    ['boot screen', startBoot],
  ].forEach(([name, step]) => {
    try { step(); } catch (err) { console.error('Kasai OS: the ' + name + ' step failed', err); }
  });
})();

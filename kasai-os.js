/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - THE DESKTOP  (windows, icons, taskbar and Start menu)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. It builds the OS from the apps in
   apps.js and the words in content.js, then starts everything. Each start-
   up step runs on its own, so one hiccup can't take the rest of the site
   down with it.
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

  /* ══════════════════════════════════════════════════════════════════════
     ROUTES  (old page links still work: they open their window)
     ══════════════════════════════════════════════════════════════════════ */
  K.appFromPath = (url) => {
    let u;
    try { u = new URL(url, window.location.origin); } catch (e) { return null; }
    if (u.origin !== window.location.origin) return null;
    const path = u.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/about') return 'about';
    return Object.keys(APPS).find((id) => APPS[id].path === path) || null;
  };

  /* ══════════════════════════════════════════════════════════════════════
     WINDOW MANAGER
     ══════════════════════════════════════════════════════════════════════ */
  const wins = new Map(); // id -> window
  const order = []; // open windows (minimised ones too), back to front
  let cascade = 0;

  const appOf = (win) => (APPS[win.id] ? win.id : win.spec.parent || null);
  const front = () => {
    for (let i = order.length - 1; i >= 0; i--) {
      const w = wins.get(order[i]);
      if (w && !w.minimised) return w;
    }
    return null;
  };
  const specFor = (idOrSpec) => (typeof idOrSpec === 'string'
    ? (APPS[idOrSpec] ? Object.assign({ id: idOrSpec }, APPS[idOrSpec]) : null)
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
          <span class="os-stripes" aria-hidden="true"></span>
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
      </div>`;
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
  // icons and sticky notes on big screens), each new one a step down and
  // right; a project or document opens near the folder it came from.
  function place(win) {
    const area = layer.getBoundingClientRect();
    const W = area.width;
    const H = area.height;
    const spec = win.spec;
    const iconRail = W >= 1000 ? 132 : 12;
    const notesRail = W >= 1280 && $('#desk-notes') && $('#desk-notes').childElementCount ? 236 : 12;
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
      // Fit between the icons and the sticky notes when there's room for it.
      const room = W - iconRail - notesRail;
      w = Math.min(w, room >= 640 ? room : W - iconRail - 12);
    }
    w = Math.min(w, W - 16);
    h = Math.min(h, H - 16);
    const step = 26 * (cascade++ % 5);
    const parent = spec.parent && wins.get(spec.parent);
    let x;
    let y;
    if (spec.fit) {
      x = (W - w) / 2;
      y = (H - h) / 2;
    } else if (parent && parent.open && !parent.minimised && parent.rect) {
      x = parent.rect.x + 48 + step;
      y = parent.rect.y + 40 + step;
    } else {
      x = iconRail + Math.max(0, (W - iconRail - notesRail - w) / 2) + step - 26;
      y = Math.max(12, (H - h) / 2 - 24) + step - 13;
    }
    setRect(win, { x: clamp(x, 8, W - w - 8), y: clamp(y, 8, H - h - 8), w, h });
  }

  function open(idOrSpec, opts) {
    opts = opts || {};
    const spec = specFor(idOrSpec);
    if (!spec) return null;
    let win = wins.get(spec.id);
    if (!win) win = build(spec);
    else if (!APPS[spec.id]) win.spec = Object.assign(win.spec, spec);
    const first = !win.open;
    if (first) {
      win.open = true;
      win.minimised = false;
      order.push(win.id);
      win.el.hidden = false;
      place(win);
      animateIn(win);
      announce(spec.label + ' opened');
    } else if (win.minimised) {
      win.minimised = false;
      win.el.hidden = false;
      animateIn(win);
    } else if (opts.refit && spec.fit && !win.maximised) {
      place(win); // a new picture in the viewer: refit and recentre
    }
    if (opts.from) win.from = opts.from;
    focusWin(win, { push: opts.push !== false, focus: opts.focus !== false });
    if (spec.onShow) spec.onShow(win);
    K.emit('open', { id: win.id, app: appOf(win), first });
    return win;
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

  function restack() {
    order.forEach((id, k) => { wins.get(id).el.style.zIndex = String(10 + k); });
    const f = front();
    wins.forEach((w) => w.el.classList.toggle('is-active', w === f));
  }

  function hideWin(win, done) {
    if (REDUCE_MOTION || !win.el.animate || isPhone()) { done(); return; }
    const anim = win.el.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(14px) scale(0.96)' }],
      { duration: 140, easing: 'ease-in', fill: 'forwards' });
    anim.finished.then(() => { done(); anim.cancel(); }).catch(done);
  }

  function animateIn(win) {
    if (REDUCE_MOTION || !win.el.animate || document.documentElement.classList.contains('vt-viewer')) return;
    win.el.animate(
      [{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
      { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }

  // Where keyboard focus goes when a window steps away.
  const returnFocus = (win) => {
    const next = front();
    const target = (win.from && document.contains(win.from) && !win.from.closest('[hidden]') && win.from)
      || taskButton(win)
      || (next && ($('#' + next.headingId, next.el) || next.el))
      || $('.desk-icon');
    if (target) target.focus({ preventScroll: true });
  };

  function minimise(win) {
    if (!win.open || win.minimised) return;
    hideWin(win, () => {
      win.minimised = true;
      win.el.hidden = true;
      restack();
      sync(false);
      const btn = taskButton(win);
      if (btn) btn.focus({ preventScroll: true });
      else returnFocus(win);
    });
  }

  function close(win) {
    if (!win.open) return;
    hideWin(win, () => {
      win.open = false;
      win.minimised = false;
      win.el.hidden = true;
      const i = order.indexOf(win.id);
      if (i !== -1) order.splice(i, 1);
      if (win.maximised) toggleMax(win, false);
      restack();
      sync(false);
      if (win.spec.onClose) win.spec.onClose(win);
      returnFocus(win);
      // Projects, documents and pictures are made fresh next time.
      if (!APPS[win.id]) { win.el.remove(); wins.delete(win.id); }
      announce(win.spec.label + ' closed');
    });
  }

  function toggleMax(win, force) {
    const on = typeof force === 'boolean' ? force : !win.maximised;
    win.maximised = on;
    win.el.classList.toggle('is-max', on);
    const btn = $('.os-max', win.el);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', (on ? 'Restore ' : 'Maximise ') + win.spec.label);
    btn.innerHTML = doodleIcon(on ? 'restore' : 'max');
    if (win.spec.onResize) setTimeout(() => win.spec.onResize(win), 60);
  }

  function wireWindow(win) {
    const el = win.el;
    $('.os-min', el).addEventListener('click', () => minimise(win));
    $('.os-max', el).addEventListener('click', () => toggleMax(win));
    $('.os-close', el).addEventListener('click', () => closeOrBack(win));
    // A click or Tab anywhere in a window brings it to the front.
    el.addEventListener('pointerdown', () => { if (front() !== win) focusWin(win, { focus: false, push: false }); }, true);
    el.addEventListener('focusin', () => { if (front() !== win && !win.minimised) focusWin(win, { focus: false, push: false }); });
    win.bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && !isPhone()) toggleMax(win); });

    // Drag by the title bar.
    win.bar.addEventListener('pointerdown', (e) => {
      if (isPhone() || win.maximised || e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      const area = layer.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const r0 = Object.assign({}, win.rect);
      win.bar.setPointerCapture(e.pointerId);
      os.classList.add('is-dragging');
      const move = (ev) => setRect(win, {
        x: clamp(r0.x + ev.clientX - sx, 90 - r0.w, area.width - 90),
        y: clamp(r0.y + ev.clientY - sy, 0, area.height - 44),
        w: r0.w,
        h: r0.h,
      });
      const up = () => {
        os.classList.remove('is-dragging');
        win.bar.removeEventListener('pointermove', move);
        win.bar.removeEventListener('pointerup', up);
        win.bar.removeEventListener('pointercancel', up);
      };
      win.bar.addEventListener('pointermove', move);
      win.bar.addEventListener('pointerup', up);
      win.bar.addEventListener('pointercancel', up);
    });

    // Resize from the bottom-right corner.
    const grip = $('.win-grip', el);
    grip.addEventListener('pointerdown', (e) => {
      if (isPhone() || win.maximised || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const area = layer.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const r0 = Object.assign({}, win.rect);
      const min = win.spec.minSize || [320, 220];
      grip.setPointerCapture(e.pointerId);
      os.classList.add('is-resizing');
      const move = (ev) => setRect(win, {
        x: r0.x,
        y: r0.y,
        w: clamp(r0.w + ev.clientX - sx, min[0], area.width - r0.x - 4),
        h: clamp(r0.h + ev.clientY - sy, min[1], area.height - r0.y - 4),
      });
      const up = () => {
        os.classList.remove('is-resizing');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        if (win.spec.onResize) win.spec.onResize(win);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
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

  // Keep windows reachable when the browser window changes size.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const area = layer.getBoundingClientRect();
      wins.forEach((w) => {
        if (!w.rect) return;
        const r = w.rect;
        const nw = Math.min(r.w, area.width - 16);
        const nh = Math.min(r.h, area.height - 16);
        setRect(w, { x: clamp(r.x, 8 - nw + 90, area.width - 90), y: clamp(r.y, 0, area.height - 44), w: nw, h: nh });
        if (w.open && !w.minimised && w.spec.onResize) w.spec.onResize(w);
      });
      layoutDesktop();
    }, 150);
  });

  K.wm = {
    open,
    close: (id) => { const w = wins.get(id); if (w) close(w); },
    minimise: (id) => { const w = wins.get(id); if (w) minimise(w); },
    focus: (id) => { const w = wins.get(id); if (w) focusWin(w); },
    get: (id) => wins.get(id),
    front,
  };

  /* ══════════════════════════════════════════════════════════════════════
     TASKBAR, ADDRESS BAR AND TAB TITLE
     ══════════════════════════════════════════════════════════════════════ */
  const taskButton = (win) =>
    $(`.task-btn[data-app="${win.id}"]`, taskbar) || $(`.task-win[data-win="${win.id}"]`, taskbar);

  function syncTaskbar() {
    const f = front();
    $$('.task-btn[data-app]', taskbar).forEach((b) => {
      const w = wins.get(b.dataset.app);
      b.classList.toggle('is-open', !!(w && w.open));
      b.classList.toggle('is-active', !!(w && w === f));
      if (w && w === f) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    // Any other open windows (a project, a document, the viewer, a game).
    const list = $('#task-windows');
    if (!list) return;
    const had = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.win : null;
    list.innerHTML = order.filter((id) => !APPS[id]).map((id) => {
      const w = wins.get(id);
      return `<li><button class="task-win ${esc(w.spec.colour || 'lavender')}${w === f ? ' is-active' : ''}${w.minimised ? ' is-min' : ''}" type="button" data-win="${esc(id)}">
          ${w.spec.icon ? navIcon(w.spec.icon) : doodleIcon(w.spec.doodle || 'folder')}<span class="task-label">${esc(w.spec.label)}</span>
        </button></li>`;
    }).join('');
    if (had && $(`.task-win[data-win="${had}"]`, list)) $(`.task-win[data-win="${had}"]`, list).focus({ preventScroll: true });
  }

  taskbar.addEventListener('click', (e) => {
    const b = e.target.closest('.task-btn[data-app], .task-win');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.app || b.dataset.win;
    const w = wins.get(id);
    if (w && w.open && w === front()) { minimise(w); return; }
    open(w && !APPS[id] ? w.spec : id, { from: b });
  });

  const routeOf = (win) => {
    const app = win && appOf(win);
    return app && APPS[app] ? APPS[app].path : null;
  };
  let notFound = document.body.dataset.page === 'notfound';
  // How many steps into the site's history we are (so popstate can tell
  // Back from Forward). Kept in each entry, so it survives a reload.
  let depth = (history.state && history.state.n) || 0;
  function syncRoute(push) {
    const f = front();
    if (notFound && (!f || f.id === 'error')) return; // keep the unknown address until something opens
    const path = routeOf(f) || (isPhone() && !f ? '/' : null);
    if (!path) return; // just the desktop: leave the address alone
    notFound = false;
    const state = { app: f ? appOf(f) : null, win: f ? f.id : null, n: depth };
    // Desktops add a step when the address changes. Phones add one for every
    // window, so the phone's Back button always steps out of the one you see.
    const was = history.state || {};
    const changed = isPhone() ? state.win !== (was.win || null) : path !== window.location.pathname;
    if (push && changed) {
      state.n = ++depth;
      history.pushState(state, '', path);
    } else history.replaceState(state, '', path);
  }

  const baseTitle = 'Andrew Worgan - Kasai OS';
  function syncTitle() {
    if (document.hidden) return;
    const f = front();
    const app = f && appOf(f);
    const label = app ? APPS[app].label : f ? f.spec.label : null;
    document.title = label ? `${label} - Andrew Worgan` : baseTitle;
  }

  function sync(push) {
    syncTaskbar();
    syncRoute(push);
    syncTitle();
  }

  // Bring back a window by id: an app, or a project/document still open.
  const reopen = (id) => {
    const w = id && wins.get(id);
    if (w && w.open) return open(APPS[id] ? id : w.spec, { push: false });
    return id && APPS[id] ? open(id, { push: false }) : null;
  };

  // Back and Forward. Desktops move between windows; phones close the
  // window you're looking at (Back) or bring it back again (Forward).
  window.addEventListener('popstate', (e) => {
    const st = e.state || {};
    const back = typeof st.n !== 'number' || st.n < depth;
    depth = typeof st.n === 'number' ? st.n : 0;
    if (isPhone()) {
      if (!back) { reopen(st.win); return; }
      const f = front();
      if (f && f.id !== st.win) close(f);
      if (st.win) { const g = front(); if (!g || g.id !== st.win) reopen(st.win); return; }
      // Back at the home screen: tuck away anything still showing.
      for (let g = front(); g; g = front()) minimise(g);
      return;
    }
    if (st.win && reopen(st.win)) return;
    const target = st.app || K.appFromPath(window.location.href);
    if (target && APPS[target]) open(target, { push: false });
  });

  // The close button. On phones each window is a step in the history, so
  // closing it is the same as pressing Back (and keeps the two in step).
  function closeOrBack(win) {
    const st = history.state || {};
    if (isPhone() && st.win === win.id && st.n > 0) history.back();
    else close(win);
  }

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
    // The same icons as the tray, drawn as masks in the text colour.
    const socials = $$('.tray .social-link').map((s) => {
      const img = s.querySelector('img');
      const ico = img
        ? `<span class="social-ico" aria-hidden="true" style="--ico: url(&quot;${esc(img.getAttribute('src'))}&quot;)"></span>`
        : doodleIcon('globe');
      return `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${ico}${esc(s.getAttribute('aria-label') || 'Link')}</a></li>`;
    }).join('');
    startMenu.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="start-panel">
        <div class="start-head">
          <span class="start-avatar">${avatar}</span>
          <span class="start-who"><strong>Andrew Worgan</strong><span>${esc(a.subheading || '')}</span></span>
        </div>
        <nav aria-label="Apps"><ul class="start-apps">
          ${Object.keys(APPS).map((id) => `<li><a class="start-app" href="${esc(APPS[id].path)}" data-app="${id}">${navIcon(APPS[id].icon)}${esc(APPS[id].label)}</a></li>`).join('')}
        </ul></nav>
        <ul class="start-links">
          ${a.email ? `<li><a href="mailto:${esc(a.email)}">${doodleIcon('mail')}Email me</a></li>` : ''}
          ${socials}
        </ul>
        <p class="start-foot">${esc((C.site && C.site.copyright) || '© 2026 Andrew Worgan (Kasai). All rights reserved.')}</p>
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
      });
      document.addEventListener('click', (e) => { if (!e.target.closest('.start-btn, #start-menu')) hideStart(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !startMenu.hidden) { hideStart(); startBtn.focus(); } });
    }
    // Restored from the back/forward cache: never come back with it open.
    window.addEventListener('pageshow', (e) => { if (e.persisted) hideStart(); });
  }

  // Links that open windows (sticky notes, Start menu, buttons in windows).
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[data-app]');
    if (!a || !APPS[a.dataset.app]) return;
    e.preventDefault();
    hideStart();
    open(a.dataset.app, { from: a });
  });

  /* ══════════════════════════════════════════════════════════════════════
     THE DESKTOP  (icons and sticky notes you can drag about)
     ══════════════════════════════════════════════════════════════════════
     Positions are kept per visitor as fractions of the desktop, so they
     survive a different window size. Phones use a tidy grid instead. */
  const saved = () => (K.store.get('kasai:desktop', { items: {} }).items || {});
  const remember = (id, el) => {
    const items = saved();
    const d = desktop.getBoundingClientRect();
    items[id] = [Number((el.offsetLeft / d.width).toFixed(4)), Number((el.offsetTop / d.height).toFixed(4))];
    K.store.set('kasai:desktop', { items });
  };

  // Where everything sits until it's moved: icons down the left, notes down
  // the right.
  function layoutDesktop() {
    const phone = isPhone();
    desktop.classList.toggle('is-free', !phone);
    const d = desktop.getBoundingClientRect();
    const items = phone ? {} : saved();
    const put = (el, id, x, y) => {
      if (phone) { el.style.left = el.style.top = ''; return; }
      const s = items[id];
      const px = s ? s[0] * d.width : x;
      const py = s ? s[1] * d.height : y;
      el.style.left = clamp(px, 4, d.width - el.offsetWidth - 4) + 'px';
      el.style.top = clamp(py, 4, d.height - el.offsetHeight - 4) + 'px';
    };
    const slot = 96;
    const perColumn = Math.max(1, Math.floor((d.height - 16) / slot));
    $$('#desk-icons > li').forEach((li, i) => {
      put(li, li.dataset.dragId, 12 + Math.floor(i / perColumn) * 96, 12 + (i % perColumn) * slot);
    });
    // Notes stack down the right; on short screens they overlap like a pile.
    const notes = $$('#desk-notes .notes-board > li');
    const heights = notes.map((li) => li.offsetHeight);
    const total = heights.reduce((sum, h) => sum + h + 18, -18);
    const squeeze = notes.length > 1 ? Math.max(0, (total - (d.height - 60)) / (notes.length - 1)) : 0;
    let noteY = 44;
    notes.forEach((li, i) => {
      put(li, li.dataset.dragId, d.width - 222 - (i % 2) * 10, noteY);
      noteY += heights[i] + 18 - squeeze;
    });
    const title = $('#desk-notes .notes-title');
    if (title) title.style.display = phone ? '' : 'none';
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

  function wireDesktop() {
    const icons = $('#desk-icons');
    if (icons) {
      $$('#desk-icons > li').forEach((li) => {
        li.dataset.dragId = 'icon-' + $('.desk-icon', li).dataset.app;
      });
      const sel = K.openable(icons, '.desk-icon', (el) => open(el.dataset.app, { from: el }));
      desktop.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.desk-icon')) sel.clear();
      });
    }
    if (K.renderNotes) K.renderNotes($('#desk-notes'));
    $$('#desk-icons > li, #desk-notes .notes-board > li').forEach(draggable);
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
     SMALL THINGS  (clock, tray icons, tab title, console hello, dialogs)
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
  // Resolves with the index of the button pressed.
  K.dialog = ({ title, icon, message, buttons, colour }) => new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'os-dialog ' + (colour || 'yellow');
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'os-dialog-title');
    d.setAttribute('aria-describedby', 'os-dialog-msg');
    d.innerHTML = `
      <span class="os-shadow" aria-hidden="true"></span>
      <div class="os-dialog-frame">
        <div class="os-bar"><span class="os-app" aria-hidden="true">${doodleIcon(icon || 'alert')}</span>
          <span class="os-title" id="os-dialog-title">${esc(title || 'Kasai OS')}</span><span class="os-stripes" aria-hidden="true"></span></div>
        <div class="os-dialog-body">
          <span class="os-dialog-icon" aria-hidden="true">${doodleIcon(icon || 'alert')}</span>
          <p id="os-dialog-msg">${esc(message || '')}</p>
        </div>
        <p class="os-dialog-buttons">${(buttons || ['OK']).map((b, i) => `<button class="os-button" type="button" value="${i}">${esc(b)}</button>`).join('')}</p>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (b) d.close(b.value);
    });
    d.addEventListener('close', () => { resolve(d.returnValue); d.remove(); });
    d.showModal();
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
     START-UP
     ══════════════════════════════════════════════════════════════════════ */
  function startRoute() {
    if (notFound) { openNotFound(); return; }
    let first = K.appFromPath(window.location.href);
    // Phones start on the home screen unless the link asked for a window.
    if (isPhone() && first === 'about' && /^\/(about)?$/.test(window.location.pathname)) first = null;
    history.replaceState({ app: first, win: first, n: depth }, '', window.location.pathname + window.location.search);
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

  [
    ['desktop', wireDesktop],
    ['windows', () => Object.keys(APPS).forEach((id) => { if (!wins.get(id)) build(Object.assign({ id }, APPS[id])); })],
    ['start menu', buildStart],
    ['tray', colorizeSocials],
    ['clock', wireClock],
    ['pet', () => { if (K.pet) K.pet.init($('#desk-pet')); }],
    ['first window', startRoute],
    ['skip link', wireSkipLink],
    ['doodle trail', K.wireTrail],
    ['tab title', wireAwayTitle],
    ['console', consoleEgg],
  ].forEach(([name, step]) => {
    try { step(); } catch (err) { console.error('Kasai OS: the ' + name + ' step failed', err); }
  });
})();

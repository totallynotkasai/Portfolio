/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - CORE  (helpers shared by every other script)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. Everything on the site comes from
   content.js. The scripts load in this order:
     head.js        before anything is drawn: the saved wallpaper, and
                    whether this visit starts with the boot screen
     generated/manifest.js  made by the build: image sizes and the art list
     content.js     the words and pictures (the only file you edit)
     kasai-core.js  these shared helpers
     sound.js       every sound (off until a visitor turns it on)
     apps.js        what each window shows
     pet.js         the wizard who lives on the desktop
     kasai-os.js    the desktop, windows, taskbar and Start menu (starts it all)
   and later, only once someone opens that game (from the Games window):
     sweeper.js     Wizard Sweeper
     rubbish.js     Not Rubbish
     stardrop.js    Star Drop
     solitaire.js   Spell Solitaire
   or paint.exe (from the Trash):
     paint.js       paint.exe
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const C = window.CONTENT || {};
  // Made by the build step (build/build.mjs): small WebP copies of every image
  // with their sizes and colours, plus every artwork found in assets/art.
  const GEN = window.GENERATED || {};
  const K = (window.Kasai = window.Kasai || {});
  K.C = C;
  K.GEN = GEN;
  K.REDUCE_MOTION = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  K.ACCENTS = ['lavender', 'blue', 'teal', 'yellow', 'pink'];

  /* ---------- tiny event hub (windows opening, the pet listening) ---------- */
  const listeners = {};
  K.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
  K.emit = (name, data) => {
    (listeners[name] || []).forEach((fn) => {
      try { fn(data); } catch (err) { console.error(err); }
    });
  };

  /* ---------- image paths ----------
     content.js paths look like 'assets/art/x.png'; they're made absolute. */
  const assetKey = (p) => String(p || '').replace(/^\/+/, '');
  const assetUrl = (p) => (!p || /^(https?:|data:|\/)/.test(p) ? p || '' : '/' + p);
  const imgInfo = (p) => (GEN.images || {})[assetKey(p)];
  K.assetKey = assetKey;
  K.assetUrl = assetUrl;
  K.imgInfo = imgInfo;
  // The small copy for the page, the large one for the image viewer.
  K.webSrc = (p) => (imgInfo(p) ? imgInfo(p).web : assetUrl(p));
  K.largeSrc = (p) => (imgInfo(p) ? imgInfo(p).large || imgInfo(p).web : assetUrl(p));
  // Both copies with their widths, for an <img srcset>. Given the width the
  // picture is drawn at (its `sizes`), the browser fetches the small copy
  // when that's sharp enough and the large one for a big window or a
  // high-density screen. Empty when the build made only one copy.
  K.srcset = (p) => {
    const i = imgInfo(p);
    return i && i.large && i.lw > i.w ? `${i.web} ${i.w}w, ${i.large} ${i.lw}w` : '';
  };
  // The thumbnail and the small copy, for a picture drawn small (an art
  // card): standard screens fetch the thumbnail, high-density ones the small
  // copy. Empty when the build made no thumbnail.
  K.thumbSrcset = (p) => {
    const i = imgInfo(p);
    return i && i.thumb && i.tw < i.w ? `${i.thumb} ${i.tw}w, ${i.web} ${i.w}w` : '';
  };
  // Real width/height, so space is reserved before the image loads.
  K.dims = (p) => (imgInfo(p) ? ` width="${imgInfo(p).w}" height="${imgInfo(p).h}"` : '');

  // A typo'd image path shows this tidy graphic instead of a broken icon.
  // One capture-phase listener covers every current and future <img>.
  const IMG_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 18'>" +
    "<rect width='24' height='18' fill='#F0ECFC'/>" +
    "<rect x='3' y='3' width='18' height='12' rx='1.5' fill='none' stroke='#AE9DF3' stroke-width='1.2'/>" +
    "<circle cx='8.5' cy='7.5' r='1.7' fill='#AE9DF3'/>" +
    "<path d='M4.5 14.5 L10 8.5 L13 11.5 L16.5 7.5 L19.5 14.5 Z' fill='#AE9DF3'/>" +
    '</svg>'
  );
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = IMG_PLACEHOLDER;
    }
  }, true);

  /* ---------- text ---------- */
  // Escape text so stray < > & or quotes can't break the layout.
  K.esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Escape, then turn *word* into a yellow marker highlight.
  K.highlight = (s) => K.esc(s).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
  K.accent = (a) => (K.ACCENTS.indexOf(a) !== -1 ? a : 'lavender');
  K.plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  K.pad2 = (n) => String(n).padStart(2, '0');
  // "Dilettantes in the Interim" -> "dilettantes-in-the-interim"
  K.slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';

  /* ---------- colour ---------- */
  K.HEX = /^#[0-9a-f]{6}$/i;
  const luminance = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255]
      .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const INK_L = luminance('#161A2E');
  // Ink or white text, whichever reads better on a colour.
  K.textOn = (hex) => {
    if (!K.HEX.test(hex)) return 'var(--ink)';
    const l = luminance(hex);
    return (l + 0.05) / (INK_L + 0.05) >= 1.05 / (l + 0.05) ? 'var(--ink)' : 'var(--white)';
  };
  // A colour words can sit on at 4.5:1 or better: a middling one, where
  // neither ink nor white quite reads, is darkened a touch until white does.
  K.readable = (hex) => {
    if (!K.HEX.test(hex)) return hex;
    let [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
    const out = () => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    for (let k = 0; k < 20; k++) {
      const l = luminance(out());
      if (Math.max((l + 0.05) / (INK_L + 0.05), 1.05 / (l + 0.05)) >= 4.5) break;
      [r, g, b] = [r * 0.97, g * 0.97, b * 0.97];
    }
    return out();
  };

  /* ---------- icons ----------
     Single-colour line doodles (they take the text colour), used across the
     OS. No emoji anywhere on the site: these stand in for them. */
  const DOODLE_ICONS = {
    pencil: '<path d="M4 20l1.2-4.5L15.5 5.2a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.5 18.8 4 20z"/>',
    quill: '<path d="M20 4c-6 0-11 4-13 10l-2 6 6-2c6-2 10-7 9-14z"/><path d="M5 19 15 9"/>',
    hammer: '<path d="M3 21l8-8"/><path d="M11 7l4-4 6 6-4 4-6-6z"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2v14"/>',
    sprout: '<path d="M12 21v-7"/><path d="M12 14c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 14c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5z"/>',
    controller: '<rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M8 10.5v4M6 12.5h4"/><path d="M15.5 11.5h.01M18 13.5h.01"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4c0-4.5-4-8.2-9-8.2z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/><path d="M10 10l-1.5 1.5L10 13M14 10l1.5 1.5L14 13"/>',
    cap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c3 2.2 8 2.2 11 0v-4.5"/><path d="M21.5 9.5V15"/>',
    ribbon: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
    folder: '<path d="M3 7h6l2 2h10v10H3z"/>',
    fork: '<circle cx="6" cy="5" r="2.2"/><circle cx="18" cy="5" r="2.2"/><circle cx="12" cy="19" r="2.2"/><path d="M6 7.2v1.3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.2M12 11.5v5.3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="M4 18l5.5-5.5 3.5 3.5 2.5-2.5L20 18"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
    star: '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/>',
    heart: '<path d="M12 19.5s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.1a4.2 4.2 0 0 1 7.5 2.3c0 5.5-7.5 10.1-7.5 10.1z"/>',
    hat: '<path d="M7.6 15.4 12 2.8l4.4 12.6"/><path d="M3 17.6c0-1.3 4-2.3 9-2.3s9 1 9 2.3-4 2.3-9 2.3-9-1-9-2.3z"/><path d="M11.9 9.6h.2"/>',
    power: '<path d="M12 3.5v8"/><path d="M7.2 6.6a7 7 0 1 0 9.6 0"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M18.6 3.2v4.3h-4.3"/>',
    sort: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    min: '<path d="M6 17h12"/>',
    max: '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
    restore: '<rect x="4.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M8.5 8.5V5.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3"/>',
    close: '<path d="M7 7l10 10M17 7 7 17"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    printer: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14.5h10v6H7z"/>',
    // The sound switch: a speaker with its sound waves, or crossed out (the
    // speaker is the first path, so it can be filled in).
    sound: '<path d="M3.5 9.2h3.6l5-4.4v14.4l-5-4.4H3.5z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.4 6.3a8.2 8.2 0 0 1 0 11.4"/>',
    mute: '<path d="M3.5 9.2h3.6l5-4.4v14.4l-5-4.4H3.5z"/><path d="M15.5 9.5l5.5 5.5M21 9.5l-5.5 5.5"/>',
    // A cup with a base: give it a fill (the Games window's is yellow) and
    // the cup and base fill in, the handles stay lines.
    trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 5.8H4.6v1.4a3.4 3.4 0 0 0 3 3.4M17 5.8h2.4v1.4a3.4 3.4 0 0 1-3 3.4" fill="none"/><path d="M12 13.5V17"/><path d="M8.6 17h6.8l.9 3.5H7.7z"/>',
  };
  K.DOODLE_ICONS = DOODLE_ICONS;
  // An unknown name falls back to the pencil, so a typo never breaks a page.
  K.doodleIcon = (name, cls) =>
    `<svg class="doodle${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DOODLE_ICONS[name] || DOODLE_ICONS.pencil}</svg>`;
  // The two-colour app icons (one file each in assets/ui/nav-icons/), each
  // with the version the build gave its file, so a new drawing is a new
  // address that browsers fetch straight away.
  K.navIcon = (name) => {
    const v = (GEN.versions || {})[`assets/ui/nav-icons/${name}.svg`];
    return `<svg class="nav-icon" aria-hidden="true"><use href="/assets/ui/nav-icons/${K.esc(name)}.svg${v ? '?v=' + v : ''}#icon"/></svg>`;
  };
  // Link arrow that nudges right on hover (see .card-arrow in style.css).
  K.ARROW =
    '<svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // Flat doodle shapes (sparkle, star, heart, flower, outline star), shared by
  // the doodle rain and the doodle trail.
  const DOODLES = [
    '<path d="M12 2c.8 5.2 4.8 9.2 10 10-5.2.8-9.2 4.8-10 10-.8-5.2-4.8-9.2-10-10 5.2-.8 9.2-4.8 10-10z"/>',
    '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
    '<path d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 9 2.3C21 15 12 20.5 12 20.5z"/>',
    '<circle cx="12" cy="6.5" r="4"/><circle cx="17.5" cy="10.5" r="4"/><circle cx="15.4" cy="17" r="4"/><circle cx="8.6" cy="17" r="4"/><circle cx="6.5" cy="10.5" r="4"/>',
    '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
  ];
  K.doodleSvg = (i) => `<svg viewBox="0 0 24 24" fill="currentColor">${DOODLES[i % DOODLES.length]}</svg>`;

  /* ---------- storage ----------
     One safe place for everything the OS remembers. Values are JSON with a
     version (v: 1); anything unreadable, blocked (private windows) or from
     an older version just gives the fallback. */
  const area = (session) => (session ? window.sessionStorage : window.localStorage);
  K.store = {
    get(key, fallback, session) {
      try {
        const v = JSON.parse(area(session).getItem(key));
        return v && v.v === 1 ? v : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value, session) {
      try { area(session).setItem(key, JSON.stringify(Object.assign({}, value, { v: 1 }))); } catch (e) { /* blocked */ }
    },
    del(key, session) {
      try { area(session).removeItem(key); } catch (e) { /* blocked */ }
    },
    // Change some fields and keep the rest (a game's best run, its trophy...).
    merge(key, fields, session) {
      K.store.set(key, Object.assign({}, K.store.get(key, null, session) || {}, fields), session);
    },
  };

  /* ---------- trophies ----------
     A game earns its trophy the first time a run of it is completed (won).
     The win is kept in the game's own store (kasai:sweeper, kasai:rubbish,
     kasai:stardrop) as  won: { at, times },  and a best run saved as won
     from before trophies existed counts too. The Games window shows each
     trophy on its game's file and hears about new ones ('trophy' event). */
  const SHOWN_KEY = 'kasai:trophies'; // { shown: { id: true } }: trophies that have popped in once
  const gameStore = (id) => K.store.get('kasai:' + id, null) || {};
  K.trophy = {
    has(id) {
      const s = gameStore(id);
      return !!(s.won || (s.best && s.best.won));
    },
    award(id) {
      const won = gameStore(id).won || {};
      K.store.merge('kasai:' + id, { won: { at: won.at || Date.now(), times: (won.times || 0) + 1 } });
      K.emit('trophy', { id });
    },
    // Earned, but not yet seen popping in on the Games window.
    fresh(id) {
      return K.trophy.has(id) && !((K.store.get(SHOWN_KEY, null) || {}).shown || {})[id];
    },
    seen(id) {
      const shown = Object.assign({}, (K.store.get(SHOWN_KEY, null) || {}).shown);
      shown[id] = true;
      K.store.set(SHOWN_KEY, { shown });
    },
  };

  /* ---------- empty folders ----------
     The friendly line comes from site.emptyStates in content.js. The
     "add one in content.js" reminder only shows on your own computer. */
  K.folderEmpty = (icon, key) => {
    const line = (C.site && C.site.emptyStates && C.site.emptyStates[key]) || '';
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    return `<div class="folder-empty">
        <span class="folder-empty-icon">${K.doodleIcon(icon)}</span>
        <p class="folder-empty-title">This folder is empty</p>
        ${line ? `<p>${K.esc(line)}</p>` : ''}
        ${local ? '<p class="folder-empty-hint">Only you can see this line: add one in <code>content.js</code>.</p>' : ''}
      </div>`;
  };

  /* ---------- select, then open ----------
     Desktop icons and the files inside windows behave like a real desktop:
     one click selects, a double-click opens. A tap (touch screens) or
     Enter/Space (keyboard) opens straight away. */
  K.openable = (box, selector, onOpen) => {
    let lastPointer = 'mouse';
    box.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
    const select = (el) => {
      box.querySelectorAll(selector).forEach((x) => x.classList.toggle('is-selected', x === el));
    };
    box.addEventListener('click', (e) => {
      const el = e.target.closest(selector);
      if (!el || !box.contains(el)) return;
      e.preventDefault();
      if (el.dataset.dragged) { delete el.dataset.dragged; return; } // that was a drag, not a click
      // A touch tap opens at once (nothing stays highlighted, like a phone).
      if (lastPointer === 'touch' && e.detail !== 0) { select(null); onOpen(el); return; }
      select(el);
      if (e.detail === 0) onOpen(el); // Enter or Space
    });
    box.addEventListener('dblclick', (e) => {
      const el = e.target.closest(selector);
      if (!el || !box.contains(el) || lastPointer === 'touch') return;
      e.preventDefault();
      onOpen(el);
    });
    return { select, clear: () => select(null) };
  };

  // The status-bar hint for things you open, worded for a mouse
  // ("Double-click to open") or a touch screen ("Tap to open").
  K.hint = (mouse, touch) =>
    `<span class="status-hint"><span class="hint-mouse">${K.esc(mouse)}</span><span class="hint-touch">${K.esc(touch)}</span></span>`;

  /* ---------- the art list ----------
     The content.js `art` list merged with every file the build found in
     assets/art, in this order:
       1. content.js entries marked  pin: true
       2. files content.js doesn't mention, newest first (title from filename)
       3. the rest of the content.js entries, in their order
     A piece's tag is its subfolder (assets/art/Poster/...) unless content.js
     gives one. */
  K.ART = (() => {
    const found = {};
    (GEN.art || []).forEach((a) => { found[a.img] = a; });
    const listed = (C.art || []).map((it) =>
      Object.assign({}, it, { tag: it.tag != null ? it.tag : (found[assetKey(it.img)] || {}).tag || '' }));
    const mentioned = {};
    listed.forEach((it) => { mentioned[assetKey(it.img)] = mentioned[assetKey(it.full)] = true; });
    const fresh = (GEN.art || []).filter((a) => !mentioned[a.img]);
    return listed.filter((it) => it.pin).concat(fresh, listed.filter((it) => !it.pin));
  })();

  /* ---------- glide (filters and shuffle) ----------
     `order` re-appends the cards in a new order, `show(card)` decides which
     stay visible. With motion on, leaving cards shrink away, the rest glide
     from their old spot to their new one ("FLIP": measure, change, animate
     the difference) and newcomers pop in. Without it, the change just happens. */
  let glideRun = 0;
  const glideAnims = new Set();
  K.glide = (grid, { order, show }) => {
    const run = ++glideRun;
    glideAnims.forEach((a) => a.cancel()); // a fast second click starts clean
    glideAnims.clear();
    const kids = Array.prototype.slice.call(grid.children);
    const isShown = (el) => !el.classList.contains('filtered-out');
    const apply = () => {
      if (order) order.forEach((el) => grid.append(el));
      if (show) kids.forEach((el) => el.classList.toggle('filtered-out', !show(el)));
    };
    if (K.REDUCE_MOTION || !grid.animate) { apply(); return; }

    const track = (a) => { glideAnims.add(a); a.finished.catch(() => {}).then(() => glideAnims.delete(a)); return a; };
    const leaving = show ? kids.filter((el) => isShown(el) && !show(el)) : [];
    const outs = leaving.map((el) => track(el.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.8)' }],
      { duration: 180, easing: 'ease-in', fill: 'forwards' }
    )));

    Promise.all(outs.map((a) => a.finished)).then(() => {
      if (run !== glideRun) return;
      const before = new Map();
      kids.forEach((el) => {
        if (isShown(el) && leaving.indexOf(el) === -1) before.set(el, el.getBoundingClientRect());
      });
      apply();
      outs.forEach((a) => a.cancel()); // they're display:none now
      let fresh = 0;
      kids.forEach((el) => {
        if (!isShown(el)) return;
        const was = before.get(el);
        if (!was) {
          track(el.animate(
            [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none' }],
            { duration: 320, delay: 40 * Math.min(fresh++, 8), easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' }
          ));
          return;
        }
        const now = el.getBoundingClientRect();
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (!dx && !dy) return;
        track(el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 480, easing: 'cubic-bezier(0.3, 1.25, 0.5, 1)' }
        ));
      });
    }).catch(() => {}); // cancelled by a newer click
  };

  /* ---------- doodle rain and the doodle trail ----------
     The rain is a brief shower of flat doodles (the 10-pet reward). It also
     unlocks the trail: for the rest of the visit the mouse sheds doodles
     (sessionStorage, so it follows you around). Off under reduced motion. */
  K.doodleRain = (where) => {
    if (K.REDUCE_MOTION) return false;
    K.unlockTrail();
    const layer = document.createElement('div');
    layer.className = 'doodle-rain';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 22; i++) {
      const d = document.createElement('span');
      d.innerHTML = K.doodleSvg(i);
      d.style.left = (Math.random() * 100) + 'vw';
      d.style.animationDelay = (Math.random() * 0.9) + 's';
      d.style.animationDuration = (2 + Math.random() * 1.6) + 's';
      layer.appendChild(d);
    }
    (where || document.body).appendChild(layer);
    setTimeout(() => layer.remove(), 5000);
    return true;
  };

  const TRAIL_KEY = 'doodle-trail';
  let trailWired = false;
  K.unlockTrail = () => {
    try { sessionStorage.setItem(TRAIL_KEY, '1'); } catch (e) { /* private mode */ }
    K.wireTrail();
  };
  K.wireTrail = () => {
    let unlocked = false;
    try { unlocked = sessionStorage.getItem(TRAIL_KEY) === '1'; } catch (e) { /* private mode */ }
    if (trailWired || !unlocked || K.REDUCE_MOTION) return;
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    trailWired = true;
    const colours = ['var(--periwinkle)', 'var(--pink)', 'var(--teal)', 'var(--yellow)'];
    let lastX = -99, lastY = -99, count = 0, live = 0;
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || live >= 24) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 28) return;
      lastX = e.clientX; lastY = e.clientY;
      const d = document.createElement('span');
      d.className = 'doodle-trail';
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = K.doodleSvg(count);
      const size = 12 + Math.random() * 8;
      d.style.cssText =
        `translate:${e.clientX - size / 2}px ${e.clientY - size / 2}px;width:${size}px;height:${size}px;` +
        `color:${colours[count % colours.length]};` +
        `--dx:${(Math.random() * 20 - 10).toFixed(1)}px;--dy:${(10 + Math.random() * 18).toFixed(1)}px;` +
        `--rot:${Math.round(Math.random() * 240 - 120)}deg`;
      count++; live++;
      d.addEventListener('animationend', () => { d.remove(); live--; });
      document.body.appendChild(d);
    }, { passive: true });
  };

  /* ---------- the shake ----------
     A game's stage jolts from side to side for a moment when a heart is
     lost. Its keyframes (.is-shaking in style.css) move the separate
     translate property, so they never fight the stage's own transforms.
     None with reduced motion. */
  K.shake = (el) => {
    if (!el || K.REDUCE_MOTION) return;
    el.classList.remove('is-shaking');
    void el.offsetWidth; // another heart lost straight away shakes it again
    el.classList.add('is-shaking');
  };
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'stage-shake') e.target.classList.remove('is-shaking');
  });

  /* ---------- the rolling ticker ----------
     Clones the authored group enough times to fill the strip (an even
     number of copies) so translateX(-50%) never shows a gap. Called again
     whenever the strip changes size (its window opening or resizing). */
  K.setupMarquee = (container) => {
    const content = container && container.querySelector('.marquee-content');
    const firstGroup = content && content.querySelector('.marquee-group');
    if (!content || !firstGroup) return;
    const groupHTML = container.dataset.group || firstGroup.outerHTML; // the phrases you authored
    container.dataset.group = groupHTML;
    const SPEED = 70; // pixels per second - lower is slower
    content.innerHTML = groupHTML; // one copy, to measure
    const groupW = content.firstElementChild.getBoundingClientRect().width;
    if (!groupW) return; // not on screen yet
    const containerW = container.clientWidth || window.innerWidth;
    const half = Math.max(1, Math.ceil(containerW / groupW)); // copies to cover the strip
    content.innerHTML = new Array(half * 2).fill(groupHTML).join('');
    Array.prototype.forEach.call(content.children, (g, i) => {
      if (i > 0) g.setAttribute('aria-hidden', 'true'); // clones aren't read twice
    });
    content.style.animationDuration = Math.max(8, (half * groupW) / SPEED) + 's';
  };
})();

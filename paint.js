/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - PAINT  (paint.exe, hidden in the Trash)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. paint.exe's note in the Trash and
   what the pet wizard says about the pictures live in content.js under
   "paint". apps.js fetches this file the first time paint.exe opens, so
   the desktop never waits for it.

   An old paint program that still works: a 640x480 picture, a pencil, a
   brush (three sizes), a fill bucket and an eraser, the site's colours,
   undo and redo, Clear and Save. Every tool lays down hard-edged pixels,
   as the old paint programs did, so the bucket always fills right up to
   a line. The picture is shown at full size (or double, with room to
   spare) and crisp, or smaller to fit a small window. It stays in this
   tab when paint.exe closes, and Save downloads it as a PNG: nothing is
   ever sent anywhere.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  if (!K || K.paint) return;
  const C = K.C || {};
  const { esc, doodleIcon } = K;
  const P = C.paint || {};

  /* ---------- the program, in numbers ---------- */
  const W = 640;                 // the picture's size in pixels
  const H = 480;
  const UNDO_STEPS = 20;         // how far back Undo goes
  const FILE = 'kasai-paint.png'; // what Save calls the picture
  const SIZE_NAMES = ['small', 'medium', 'large'];
  // The tools: their keys, and (brush and eraser) their three sizes in pixels.
  const TOOLS = [
    { id: 'pencil', key: 'p', name: 'Pencil', icon: 'pencil' },
    { id: 'brush', key: 'b', name: 'Brush', icon: 'brush', sizes: [3, 7, 13] },
    { id: 'fill', key: 'f', name: 'Fill', icon: 'bucket' },
    { id: 'eraser', key: 'e', name: 'Eraser', icon: 'eraser', sizes: [8, 16, 28] },
  ];
  const toolOf = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];
  // The site's colours: the deep inks along the top row, the brights below.
  const COLOURS = [
    ['Ink', '#161A2E'], ['Grey ink', '#5F647F'], ['Lavender ink', '#5E46B8'], ['Blue ink', '#1F5FC0'],
    ['Teal ink', '#1B7466'], ['Yellow ink', '#8A6400'], ['Coral ink', '#BE2D18'], ['Pink ink', '#B03A70'],
    ['White', '#FFFFFF'], ['Grey', '#C5C8D6'], ['Lavender', '#AE9DF3'], ['Blue', '#65A1FB'],
    ['Teal', '#5AC8B6'], ['Yellow', '#FEDA74'], ['Coral', '#F98776'], ['Pink', '#FB9DC4'],
  ];
  // A colour as one of the picture's pixels (red, green, blue and alpha
  // bytes, read as one little-endian number).
  const pixel = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
  };
  const WHITE = pixel('#FFFFFF');

  /* ---------- the program's own doodles (they join the shared set) ---------- */
  const ICONS = {
    brush: '<path d="M20 4c-2.3 1.6-6.7 6-8.4 8.3l2 2C15.9 12.7 20.4 8.3 22 6z"/><path d="M11.2 13.3c-2.1 0-3.7 1.4-3.9 3.5-.1 1.5-1.1 2.5-2.8 3.2 3.4 1.1 7.3.2 8.3-3"/>',
    bucket: '<path d="M9 4.5 3.5 10l7.5 7.5L18 10.5z"/><path d="M3.5 10h14"/><path d="M20 13.5c1.1 1.5 1.7 2.6 1.7 3.4a1.7 1.7 0 0 1-3.4 0c0-.8.6-1.9 1.7-3.4z"/>',
    eraser: '<path d="M9 19.5 3.8 14.3 13.3 4.8l6.9 6.9-7.8 7.8z"/><path d="M8.6 9.5l6.9 6.9"/><path d="M9 19.5h11"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    floppy: '<path d="M4.5 4h12l3 3v13h-15z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!K.DOODLE_ICONS[k]) K.DOODLE_ICONS[k] = ICONS[k]; });

  /* ---------- what the wizard says (content.js, under "paint") ---------- */
  const RATE_LINES = {
    blank: ['a blank canvas. very brave.'],
    low: ['{score}/10. i can tell you tried.'],
    mid: ['{score}/10. that is going on my fridge.'],
    high: ['{score}/10! a masterpiece!'],
  };
  const pick = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : '');
  // A missing list uses the lines above; an empty one (or '') keeps him quiet.
  const linesOf = (v, fallback) => (Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x)
    : typeof v === 'string' ? (v ? [v] : []) : fallback);

  /* ══════════════════════════════════════════════════════════════════════
     THE PICTURE
     ══════════════════════════════════════════════════════════════════════
     One ImageData, kept for the visit (closing paint.exe keeps it), with
     `pix` looking at its pixels one whole number each. Every change marks
     the box it touched, and the canvas is redrawn there once a frame.
     Undo keeps, for each step, the box it changed as it was before. */
  let img = null;
  let pix = null;
  const undos = []; // { x, y, w, h, data }
  const redos = [];
  let tool = 'pencil';
  let size = 1;     // 0, 1 or 2: small, medium or large
  let colour = 0;   // its place in COLOURS
  let strokes = 0;  // lines drawn and areas filled (the wizard notices effort)
  let saved = false; // saved once: the title bar shows the file's name
  let view = null;  // the window's moving parts, while paint.exe is open
  let dirty = null; // the box changed since the canvas was last drawn: { x0, y0, x1, y1 }
  let stroke = null; // the line being drawn: { id, x, y, before, box }

  const blankPicture = () => {
    img = new ImageData(W, H);
    pix = new Uint32Array(img.data.buffer);
    pix.fill(WHITE);
  };

  // The box (x0, y0) to (x1, y1) has changed: mark it to be drawn (and as
  // part of the line being drawn).
  const touched = (x0, y0, x1, y1) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
    if (x0 > x1 || y0 > y1) return;
    const grow = (b) => (b
      ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) }
      : { x0, y0, x1, y1 });
    dirty = grow(dirty);
    if (stroke) stroke.box = grow(stroke.box);
    if (view && !view.raf) view.raf = requestAnimationFrame(redraw);
  };
  function redraw() {
    if (!view) return;
    view.raf = 0;
    if (!dirty) return;
    view.ctx.putImageData(img, 0, 0, dirty.x0, dirty.y0, dirty.x1 - dirty.x0 + 1, dirty.y1 - dirty.y0 + 1);
    dirty = null;
  }

  // A box of pixels copied out of `src` (the picture, or a copy of it).
  const grab = (src, x, y, w, h) => {
    const out = new Uint32Array(w * h);
    for (let r = 0; r < h; r++) out.set(src.subarray((y + r) * W + x, (y + r) * W + x + w), r * w);
    return out;
  };
  const putBack = (s) => {
    for (let r = 0; r < s.h; r++) pix.set(s.data.subarray(r * s.w, (r + 1) * s.w), (s.y + r) * W + s.x);
  };

  /* ---------- drawing ----------
     Rows of pixels set at once (pix.fill), clipped to the picture. */
  const span = (x0, x1, y, c) => {
    if (y < 0 || y >= H) return;
    x0 = Math.max(0, x0);
    x1 = Math.min(W - 1, x1);
    if (x0 <= x1) pix.fill(c, y * W + x0, y * W + x1 + 1);
  };
  // A round dab of the brush (d pixels across), or a square one (the eraser).
  const discs = {};
  const discOf = (d) => {
    if (!discs[d]) {
      const r = d / 2;
      discs[d] = [];
      for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.001);
        discs[d].push([dy, half]);
      }
    }
    return discs[d];
  };
  function dab(x, y) {
    const t = toolOf(tool);
    const c = tool === 'eraser' ? WHITE : pixel(COLOURS[colour][1]);
    if (tool === 'pencil') {
      if (x >= 0 && y >= 0 && x < W && y < H) pix[y * W + x] = c;
      touched(x, y, x, y);
    } else if (tool === 'eraser') {
      const d = t.sizes[size];
      const x0 = x - Math.floor(d / 2);
      const y0 = y - Math.floor(d / 2);
      for (let r = 0; r < d; r++) span(x0, x0 + d - 1, y0 + r, c);
      touched(x0, y0, x0 + d - 1, y0 + d - 1);
    } else {
      const d = t.sizes[size];
      discOf(d).forEach(([dy, half]) => span(x - half, x + half, y + dy, c));
      const r = Math.floor(d / 2);
      touched(x - r, y - r, x + r, y + r);
    }
  }
  // A line of dabs from where the pointer was to (x1, y1), with no gaps.
  function lineTo(x1, y1) {
    let x = stroke.x;
    let y = stroke.y;
    const dx = Math.abs(x1 - x);
    const dy = -Math.abs(y1 - y);
    const sx = x < x1 ? 1 : -1;
    const sy = y < y1 ? 1 : -1;
    let err = dx + dy;
    while (x !== x1 || y !== y1) {
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
      dab(x, y);
    }
    stroke.x = x1;
    stroke.y = y1;
  }

  // The fill bucket: every pixel joined to (x, y) that's the same colour
  // as it takes the new colour, one row at a time.
  function fillAt(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const c = pixel(COLOURS[colour][1]);
    const was = pix[y * W + x];
    if (was === c) return false;
    const before = pix.slice();
    const box = { x0: x, y0: y, x1: x, y1: y };
    const todo = [x, y];
    while (todo.length) {
      const ty = todo.pop();
      const tx = todo.pop();
      let i = ty * W + tx;
      if (pix[i] !== was) continue;
      let left = tx;
      while (left > 0 && pix[i - 1] === was) { left--; i--; }
      let up = false;
      let down = false;
      let cx = left;
      for (; cx < W && pix[i] === was; cx++, i++) {
        pix[i] = c;
        if (ty > 0) {
          const open = pix[i - W] === was;
          if (open && !up) todo.push(cx, ty - 1);
          up = open;
        }
        if (ty < H - 1) {
          const open = pix[i + W] === was;
          if (open && !down) todo.push(cx, ty + 1);
          down = open;
        }
      }
      box.x0 = Math.min(box.x0, left); box.x1 = Math.max(box.x1, cx - 1);
      box.y0 = Math.min(box.y0, ty); box.y1 = Math.max(box.y1, ty);
    }
    remember(box, before);
    touched(box.x0, box.y0, box.x1, box.y1);
    strokes++;
    return true;
  }

  /* ---------- undo and redo ---------- */
  // A step has changed `box`, which looked like `before` (a copy of the
  // whole picture) beforehand.
  function remember(box, before) {
    const w = box.x1 - box.x0 + 1;
    const h = box.y1 - box.y0 + 1;
    undos.push({ x: box.x0, y: box.y0, w, h, data: grab(before, box.x0, box.y0, w, h) });
    if (undos.length > UNDO_STEPS) undos.shift();
    redos.length = 0;
    syncMenu();
  }
  // Undo or redo: the box goes back to how it was, and how it is now is
  // kept on the other list.
  function step(from, to) {
    if (stroke) endStroke();
    const s = from.pop();
    if (!s) return false;
    const now = grab(pix, s.x, s.y, s.w, s.h);
    putBack(s);
    to.push({ x: s.x, y: s.y, w: s.w, h: s.h, data: now });
    touched(s.x, s.y, s.x + s.w - 1, s.y + s.h - 1);
    syncMenu();
    return true;
  }
  const undo = () => { if (step(undos, redos)) announce('Undone'); };
  const redo = () => { if (step(redos, undos)) announce('Redone'); };

  const isBlank = () => pix.every((v) => v === WHITE);
  function clear() {
    if (stroke) endStroke();
    if (isBlank()) { announce('The picture is already blank'); return; }
    K.dialog({
      title: 'Clear the picture',
      icon: 'alert',
      colour: 'pink',
      message: 'Start again on a blank page? Undo can still bring it back.',
      buttons: ['Clear it', 'Keep it'],
    }).then((v) => {
      if (v !== '0') return;
      remember({ x0: 0, y0: 0, x1: W - 1, y1: H - 1 }, pix.slice());
      pix.fill(WHITE);
      touched(0, 0, W - 1, H - 1);
      announce('Picture cleared');
    });
  }

  /* ---------- saving ----------
     The picture downloads as a PNG made right here in the browser, and the
     wizard on the desktop gives it a score. */
  function save() {
    if (!view) return;
    if (stroke) endStroke();
    redraw();
    const win = view.win;
    view.canvas.toBlob((blob) => {
      if (!blob) { announce("This browser couldn't save the picture"); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = FILE;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      saved = true;
      if (view && view.win === win) win.setTitle(`${FILE} - paint.exe`);
      announce(`Saved ${FILE}`, true);
      rate();
    }, 'image/png');
  }

  // His score out of 10: more of the page painted and more colours score
  // higher, and he's a bit unpredictable. Nothing at all: the blank line.
  function rate() {
    if (!K.pet || !K.pet.say) return;
    const counts = new Map();
    for (let i = 0; i < pix.length; i++) {
      const v = pix[i];
      if (v !== WHITE) counts.set(v, (counts.get(v) || 0) + 1);
    }
    let painted = 0;
    let colours = 0;
    counts.forEach((n) => { painted += n; if (n >= 40) colours++; });
    const cover = painted / pix.length;
    let band = 'blank';
    let score = 0;
    if (painted >= 30) {
      score = 2 + Math.min(4, colours) + (cover > 0.03 ? 1 : 0) + (cover > 0.15 ? 1 : 0) + (cover > 0.4 ? 1 : 0) +
        (strokes > 12 ? 1 : 0) + Math.round(Math.random() * 2 - 1);
      score = Math.max(1, Math.min(10, score));
      band = score <= 4 ? 'low' : score <= 7 ? 'mid' : 'high';
    }
    const line = pick(linesOf((P.rateLines || {})[band], RATE_LINES[band])).replace(/\{score\}/g, String(score));
    if (line) setTimeout(() => K.pet.say(line, 3600), 400);
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE WINDOW
     ══════════════════════════════════════════════════════════════════════
     apps.js opens the window and hands it over here: the menu bar (Undo,
     Redo, Clear, Save PNG), the tools down the left, the picture in the
     middle and the colours along the bottom. */
  function mount(win) {
    if (view) unmount(view.win);
    if (!img) blankPicture();
    const root = document.createElement('div');
    root.className = 'pt';
    root.innerHTML = `
      <div class="pt-main">
        <div class="pt-tools" role="group" aria-label="Tools">
          ${TOOLS.map((t) => `<button class="pt-tool" type="button" data-tool="${t.id}" aria-pressed="false" title="${t.name} (${t.key.toUpperCase()})">${doodleIcon(t.icon)}<span class="vh">${t.name}</span></button>`).join('')}
          <div class="pt-sizes" role="group" aria-label="Size">
            ${SIZE_NAMES.map((s, i) => `<button class="pt-size" type="button" data-size="${i}" aria-pressed="false" title="${s[0].toUpperCase() + s.slice(1)} ([ and ])"><i style="--d:${4 + i * 5}px"></i><span class="vh">${s}</span></button>`).join('')}
          </div>
        </div>
        <div class="pt-work" data-work>
          <div class="pt-paper" data-paper>
            <canvas class="pt-canvas" width="${W}" height="${H}" tabindex="-1" role="img" aria-label="Your picture, ${W} by ${H} pixels"></canvas>
          </div>
        </div>
      </div>
      <div class="pt-colours">
        <span class="pt-current" aria-hidden="true" data-current></span>
        <div class="pt-swatches" role="group" aria-label="Colours">
          ${COLOURS.map(([name, hex], i) => `<button class="pt-swatch" type="button" data-colour="${i}" aria-pressed="false" title="${esc(name)}" style="--s:${hex}"><span class="vh">${esc(name)}</span></button>`).join('')}
        </div>
      </div>
      <p class="vh" role="status" data-live></p>`;
    const old = win.body.querySelector('.pt-loading, .pt');
    if (old) old.replaceWith(root);
    else win.body.appendChild(root);
    win.menu.innerHTML = `
      <div class="gm-menu pt-menu" role="group" aria-label="Picture">
        <button type="button" data-act="undo">${doodleIcon('undo')}Undo</button>
        <button type="button" data-act="redo">${doodleIcon('redo')}Redo</button>
        <button type="button" data-act="clear">${doodleIcon('page')}Clear</button>
        <button type="button" data-act="save">${doodleIcon('floppy')}Save PNG</button>
      </div>`;
    win.menu.hidden = false;
    if (saved) win.setTitle(`${FILE} - paint.exe`);
    win.setStatus(`<span class="pt-said" data-said></span><span class="pt-pos" data-pos></span>` +
      K.hint('P, B, F and E pick a tool; [ and ] its size', 'Pick a tool and a colour, then draw'));
    const q = (s) => root.querySelector(s);
    const canvas = q('canvas');
    view = {
      win,
      canvas,
      ctx: canvas.getContext('2d'),
      work: q('[data-work]'),
      paper: q('[data-paper]'),
      sizes: q('.pt-sizes'),
      current: q('[data-current]'),
      live: q('[data-live]'),
      said: win.status.querySelector('[data-said]'),
      pos: win.status.querySelector('[data-pos]'),
      raf: 0,
      sayTimer: 0,
    };
    view.ctx.putImageData(img, 0, 0);
    dirty = null;
    wire(view, root);
    syncTools();
    syncMenu();
    fit();
  }

  function unmount(win) {
    if (!view || (win && view.win !== win)) return;
    if (stroke) endStroke();
    cancelAnimationFrame(view.raf);
    clearTimeout(view.sayTimer);
    if (view.ro) view.ro.disconnect();
    window.removeEventListener('resize', fit);
    view = null;
  }

  // The picture as big as the window allows: whole steps (full size, or
  // double) while it fits, so every pixel stays a crisp square, and
  // smaller only when it must (then smoothed, so thin lines don't vanish).
  function fit() {
    if (!view) return;
    const margin = view.work.clientWidth < 420 ? 14 : 28; // a phone keeps more of its width for the picture
    const room = Math.min((view.work.clientWidth - margin) / W, (view.work.clientHeight - margin) / H);
    if (!(room > 0)) return;
    const scale = room >= 2 ? 2 : room >= 1 ? 1 : room;
    view.paper.style.width = Math.floor(W * scale) + 'px';
    view.paper.style.height = Math.floor(H * scale) + 'px';
    view.canvas.classList.toggle('is-smooth', scale * (window.devicePixelRatio || 1) < 1);
  }

  // Where a pointer is on the picture, in its own pixels.
  const at = (e) => {
    const r = view.canvas.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) * W) / r.width), y: Math.floor(((e.clientY - r.top) * H) / r.height) };
  };

  function wire(v, root) {
    const canvas = v.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (stroke || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      canvas.focus({ preventScroll: true }); // so the keys work straight away
      const p = at(e);
      if (tool === 'fill') { fillAt(p.x, p.y); return; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* that pointer has already gone */ }
      stroke = { id: e.pointerId, x: p.x, y: p.y, before: pix.slice(), box: null };
      dab(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = at(e);
      v.pos.textContent = p.x >= 0 && p.y >= 0 && p.x < W && p.y < H ? `${p.x}, ${p.y}px` : '';
      if (!stroke || e.pointerId !== stroke.id) return;
      const all = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (all.length ? all : [e]).forEach((ev) => { const q = at(ev); lineTo(q.x, q.y); });
    });
    const up = (e) => { if (stroke && e.pointerId === stroke.id) endStroke(); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('pointerleave', () => { v.pos.textContent = ''; });

    // Tools, sizes and colours are picked as soon as they're pressed (a
    // finger lifted fast off a stroke can cost the next tap its click), and
    // by a click with no press before it (the keyboard, a screen reader).
    const PICKS = '.pt-tool, .pt-size, .pt-swatch';
    const pickFrom = (b) => {
      if (b.dataset.tool) pickTool(b.dataset.tool);
      else if (b.dataset.size) pickSize(Number(b.dataset.size));
      else pickColour(Number(b.dataset.colour));
    };
    let pressed = null;
    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest(PICKS);
      pressed = b && e.isPrimary && !(e.pointerType === 'mouse' && e.button !== 0) ? b : null;
      if (pressed) pickFrom(pressed);
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest(PICKS);
      if (!b) return;
      if (e.detail !== 0 && b === pressed) { pressed = null; return; } // already picked when pressed
      pickFrom(b);
    });
    v.win.menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      ({ undo, redo, clear, save })[b.dataset.act]();
    });
    v.win.el.addEventListener('keydown', onKey);
    if (window.ResizeObserver) {
      v.ro = new ResizeObserver(fit);
      v.ro.observe(v.work);
    }
    window.addEventListener('resize', fit);
  }

  function endStroke() {
    const s = stroke;
    stroke = null;
    if (!s || !s.box) return;
    remember(s.box, s.before);
    strokes++;
  }

  // P, B, F and E pick a tool, [ and ] its size; Ctrl+Z undoes, Ctrl+Y (or
  // Ctrl+Shift+Z) redoes and Ctrl+S saves.
  function onKey(e) {
    if (!view || e.defaultPrevented || e.altKey || e.isComposing || document.querySelector('dialog[open]')) return;
    const k = (e.key || '').toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z' && !e.shiftKey) undo();
      else if (k === 'y' || (k === 'z' && e.shiftKey)) redo();
      else if (k === 's') save();
      else return;
      e.preventDefault();
      return;
    }
    const t = TOOLS.find((x) => x.key === k);
    if (t) pickTool(t.id);
    else if (e.key === '[') pickSize(size - 1);
    else if (e.key === ']') pickSize(size + 1);
    else return;
    e.preventDefault();
  }

  function pickTool(id) {
    if (stroke) endStroke();
    tool = toolOf(id).id;
    syncTools();
    announce(toolName());
  }
  function pickSize(i) {
    const next = Math.max(0, Math.min(2, i));
    if (next === size || !toolOf(tool).sizes) return;
    size = next;
    syncTools();
    announce(toolName());
  }
  function pickColour(i) {
    colour = Math.max(0, Math.min(COLOURS.length - 1, i));
    syncTools();
    announce(COLOURS[colour][0]);
  }
  const toolName = () => {
    const t = toolOf(tool);
    return t.sizes ? `${t.name}, ${SIZE_NAMES[size]}` : t.name;
  };

  function syncTools() {
    if (!view) return;
    const t = toolOf(tool);
    const box = view.win.body;
    box.querySelectorAll('.pt-tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    box.querySelectorAll('.pt-size').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.size) === size)));
    box.querySelectorAll('.pt-swatch').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.colour) === colour)));
    view.sizes.classList.toggle('is-off', !t.sizes);
    view.sizes.classList.toggle('is-square', tool === 'eraser');
    view.current.style.setProperty('--s', COLOURS[colour][1]);
    view.current.title = COLOURS[colour][0];
    view.said.textContent = toolName();
  }
  // Undo and Redo grey out when there's nothing to take back or bring
  // back, but stay focusable, so the keyboard never loses its place.
  function syncMenu() {
    if (!view) return;
    const m = view.win.menu;
    [['undo', undos], ['redo', redos]].forEach(([act, list]) => {
      const b = m.querySelector(`[data-act="${act}"]`);
      if (b) b.setAttribute('aria-disabled', String(!list.length));
    });
  }

  // Read out to screen readers; `show` also puts it in the status bar for a moment.
  function announce(text, show) {
    if (!view) return;
    view.live.textContent = '';
    setTimeout(() => { if (view) view.live.textContent = text; }, 40);
    if (!show) return;
    view.said.textContent = text;
    clearTimeout(view.sayTimer);
    view.sayTimer = setTimeout(() => { if (view) view.said.textContent = toolName(); }, 2600);
  }

  K.paint = { mount, unmount };
})();

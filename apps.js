/* ════════════════════════════════════════════════════════════════════════
   KASAI OS - APPS  (what each window shows)
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file: every word and picture comes from
   content.js. Each app below fills its window; kasai-os.js draws the
   windows themselves, the desktop and the taskbar.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K = window.Kasai;
  const C = K.C;
  const { esc, highlight, accent, plural, pad2, slug, doodleIcon, webSrc, largeSrc, srcset, thumbSrcset, dims, imgInfo, HEX, textOn } = K;

  // Each window's heading and line can be changed in content.js (os.windows).
  const copy = (id, fallback) => Object.assign({}, fallback, ((C.os && C.os.windows) || {})[id] || {});

  /* ══════════════════════════════════════════════════════════════════════
     THE IMAGE VIEWER  (art, certificates and the Trash all open in it)
     ══════════════════════════════════════════════════════════════════════
     Opens on any element with data-full (the big picture). Optional extras:
     data-img (the picture's path in content.js, for its copies and size),
     data-file (title bar name), data-caption, data-colors ("#hex #hex").
     Opened from inside a box marked data-viewer-set (the art binder, the
     certificates, the Trash) it steps through that box's other pictures
     too, round and round: its arrow buttons, Left and Right (Home and End
     for the first and last), or a swipe. */
  // An opener's big picture, every copy of it and its full size.
  const picOf = (t) => {
    const path = t.getAttribute('data-img');
    const info = imgInfo(path) || {};
    return { src: t.getAttribute('data-full'), set: srcset(path), w: info.lw || info.w, h: info.lh || info.h };
  };

  // Big pictures fetched on hover, ready for the click. With a srcset the
  // browser picks the copy for `sizes`, the width it will be drawn at.
  const fullCache = new Map();
  const warm = (pic, sizes) => {
    const key = pic.src + ' ' + sizes;
    if (!fullCache.has(key)) {
      const pre = new Image();
      if (pic.set) { pre.sizes = sizes; pre.srcset = pic.set; }
      pre.src = pic.src;
      fullCache.set(key, pre);
    }
    return fullCache.get(key);
  };
  // Before the click, the biggest the viewer could draw the picture on this
  // desktop, so the copy fetched ahead is never too small.
  const roomFor = (pic) => {
    const d = document.getElementById('windows');
    return pic.w && d ? Math.floor(Math.min(pic.w, d.clientWidth, (d.clientHeight * pic.w) / pic.h)) + 'px' : '';
  };
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-full]');
    if (t) { const pic = picOf(t); warm(pic, roomFor(pic)); }
  }, { passive: true });

  // The picture is drawn as big as the viewer allows, never past its own
  // size. Its width is set here (the height follows), and `sizes` passes it
  // on, so the browser fetches a copy with enough pixels for this screen.
  const fitViewer = (win) => {
    const img = win.body.querySelector('.viewer-img');
    const box = img && img.parentElement;
    const w = img && Number(img.getAttribute('width'));
    const h = img && Number(img.getAttribute('height'));
    if (!w || !h || !box.clientWidth) return;
    const edge = img.offsetWidth - img.clientWidth; // its border, both sides
    const fit = Math.max(1, Math.floor(Math.min(w, box.clientWidth - edge, ((box.clientHeight - edge) * w) / h)));
    img.style.width = fit + edge + 'px';
    img.sizes = fit + 'px';
  };

  // The pictures it steps through: the ones showing in the set the picture
  // came from, read each time, so the Art filter and Shuffle count. Anything
  // without a big picture (a file that isn't one) is skipped.
  const setOf = (t) => {
    const box = t.closest('[data-viewer-set]');
    return box ? Array.prototype.filter.call(box.querySelectorAll('[data-full]'), (el) =>
      el.closest('[data-viewer-set]') === box && !el.closest('.filtered-out')) : [t];
  };
  const altOf = (t) => { const thumb = t.querySelector('img'); return (thumb && thumb.alt) || t.getAttribute('data-caption') || ''; };
  const fileOf = (t) => t.getAttribute('data-file') || altOf(t) || 'picture.png';
  // A gallery item has one canonical viewer entry on its front. Return
  // focus to its visible View control if the card has since been flipped.
  const viewerOpener = (t) => {
    const card = t.matches('.art-card-view') && t.closest('.art-card.is-flipped');
    return card ? card.querySelector('[data-art-view]') : t;
  };

  // The viewer window, sized for the picture `t` opens.
  const viewerSpec = (t) => {
    const pic = picOf(t);
    const thumb = t.querySelector('img');
    return {
      id: 'viewer',
      label: 'Image viewer',
      file: fileOf(t),
      colour: 'lavender',
      doodle: 'image',
      // Big enough for the picture (its own shape, even before its
      // thumbnail has loaded), never bigger than the desktop.
      fit: { ratio: pic.w ? pic.w / pic.h : thumb && thumb.naturalWidth ? thumb.naturalWidth / thumb.naturalHeight : 1, chrome: 112 },
      render(w) {
        w.body.classList.add('viewer-body');
        w.body.innerHTML = `<div class="viewer-canvas">
            <img class="viewer-img" alt="" />
            <button class="viewer-step is-prev" type="button" aria-label="Previous picture" hidden>${doodleIcon('back')}</button>
            <button class="viewer-step is-next" type="button" aria-label="Next picture" hidden>${doodleIcon('next')}</button>
          </div>
          <p class="viewer-said vh" role="status" aria-live="polite"></p>`;
        wireSteps(w);
      },
      onShow: fitViewer, // back from the taskbar
      onResize: fitViewer, // maximised, restored, resized or a new screen size
    };
  };

  // Puts the picture `t` opens in the viewer: its name, colours and place in
  // its set, then the picture itself (the small copy at once, the big one
  // once it's ready). A step also reads out where it landed.
  const fill = (win, t, stepped) => {
    const pic = picOf(t);
    const thumb = t.querySelector('img');
    const alt = altOf(t);
    const colors = (t.getAttribute('data-colors') || '').split(/\s+/).filter((c) => HEX.test(c));
    const list = setOf(t);
    const at = list.indexOf(t);
    const where = list.length > 1 && at !== -1 ? `${at + 1} of ${list.length}` : '';
    win.pic = t;
    win.body.querySelectorAll('.viewer-step').forEach((b) => { b.hidden = list.length < 2; });
    const img = win.body.querySelector('.viewer-img');
    delete img.dataset.fallback; // each picture gets its own broken-file fallback
    img.alt = alt;
    win.setTitle(fileOf(t));
    win.setStatus(
      (where ? `<span class="viewer-count">${where}</span>` : '') +
      (colors.length ? `<span class="viewer-swatches">${colors.map((c) => `<i style="--s:${c}"></i><code>${c}</code>`).join('')}</span>` : '') +
      `<span class="viewer-caption">${esc(t.getAttribute('data-caption') || alt)}</span>`);
    if (stepped) {
      const said = win.body.querySelector('.viewer-said');
      said.textContent = '';
      setTimeout(() => { said.textContent = where ? `${alt}, ${where}` : alt; }, 40);
    }
    // Sized once the status bar is filled in, as it changes the room left.
    ['srcset', 'sizes', 'width', 'height'].forEach((a) => img.removeAttribute(a)); // the last picture's
    img.style.width = '';
    const sized = (w, h) => { img.setAttribute('width', w); img.setAttribute('height', h); fitViewer(win); };
    if (pic.w) sized(pic.w, pic.h);
    const pre = warm(pic, img.sizes);
    const big = () => {
      if (!pic.w && pre.naturalWidth) sized(pre.naturalWidth, pre.naturalHeight);
      if (pic.set) img.srcset = pic.set;
      else img.src = pic.src;
    };
    if (stepped && pre.complete && pre.naturalWidth) big(); // fetched ahead by the last step
    else {
      // Show the small copy at once (already loaded), then swap in the big one.
      img.src = (thumb && (thumb.currentSrc || thumb.src)) || pic.src;
      (pre.decode ? pre.decode() : Promise.resolve()).catch(() => {}).then(() => {
        if (img.isConnected && win.pic === t) big(); // not closed, or moved on to another picture
      });
    }
    // The pictures either side, fetched ahead of the next step.
    if (where) {
      [list[(at + 1) % list.length], list[(at + list.length - 1) % list.length]].forEach((n) => {
        const p = picOf(n);
        warm(p, roomFor(p));
      });
    }
    return img;
  };

  let viewerVT = null; // the view transition opening the viewer, while it runs

  // One picture along the set (`by` is 1 or -1, round and round), or to its
  // first or last. The window refits around its middle, gliding.
  const stepViewer = (win, by) => {
    const cur = win.pic;
    if (!cur || !cur.isConnected) return;
    const list = setOf(cur);
    if (list.length < 2) return;
    let i = list.indexOf(cur);
    if (by === 'first') i = 0;
    else if (by === 'last') i = list.length - 1;
    else if (i !== -1) i = (i + by + list.length) % list.length;
    else {
      // The one showing was filtered away meanwhile: go on from where it sat.
      const after = list.findIndex((el) => cur.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      i = by > 0 ? Math.max(0, after) : ((after === -1 ? list.length : after) + list.length - 1) % list.length;
    }
    const t = list[i];
    if (t === cur) return;
    if (viewerVT) viewerVT.skipTransition(); // still opening: that ends first
    // A swish, from the side it's heading for.
    if (K.sound) K.sound.play('flip', { pan: by === -1 || by === 'first' ? -0.35 : 0.35 });
    // Closing the viewer takes focus back to the picture's card or file.
    fill(K.wm.open(viewerSpec(t), { refit: true, keepCentre: true, from: viewerOpener(t), focus: false, push: false }), t, true);
  };

  const STEP_KEYS = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' };
  const wireSteps = (win) => {
    win.body.querySelector('.is-prev').addEventListener('click', () => stepViewer(win, -1));
    win.body.querySelector('.is-next').addEventListener('click', () => stepViewer(win, 1));
    win.el.addEventListener('keydown', (e) => {
      const by = STEP_KEYS[e.key];
      if (!by || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      stepViewer(win, by);
    });
    // A quick sideways swipe on a touch screen (the picture lets the browser
    // keep up and down, and pinching to zoom).
    const canvas = win.body.querySelector('.viewer-canvas');
    let swipe = null;
    canvas.addEventListener('pointerdown', (e) => {
      swipe = e.pointerType !== 'mouse' && e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp } : null;
    });
    canvas.addEventListener('pointercancel', () => { swipe = null; });
    canvas.addEventListener('pointerup', (e) => {
      const s = swipe;
      swipe = null;
      if (!s || e.pointerId !== s.id || e.timeStamp - s.at > 700) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) stepViewer(win, dx < 0 ? 1 : -1);
    });
  };

  K.openViewer = (t) => {
    const thumb = t.querySelector('img');
    // Closing it takes focus back to the card or file.
    const show = () => fill(K.wm.open(viewerSpec(t), { refit: true, from: viewerOpener(t) }), t);

    // The picture grows out of its card (a same-page view transition);
    // browsers without one simply open the window.
    if (K.REDUCE_MOTION || !document.startViewTransition || !thumb || !thumb.complete || t.closest('[hidden]')) { show(); return; }
    K.wm.settle(); // no window caught mid-animation in its snapshots
    thumb.style.viewTransitionName = 'viewer-art';
    document.documentElement.classList.add('vt-viewer');
    const vt = document.startViewTransition(() => {
      thumb.style.viewTransitionName = '';
      show().style.viewTransitionName = 'viewer-art';
    });
    viewerVT = vt;
    vt.finished.catch(() => {}).then(() => {
      if (viewerVT !== vt) return; // a newer one took over
      viewerVT = null;
      document.documentElement.classList.remove('vt-viewer');
      const img = document.querySelector('.viewer-img');
      if (img) img.style.viewTransitionName = '';
    });
  };

  /* ══════════════════════════════════════════════════════════════════════
     ABOUT
     ══════════════════════════════════════════════════════════════════════ */
  const DEFAULT_TICKER = ['Digital illustration', 'Graphic design', 'Web design', 'Creative writing', 'IT', 'QA', 'Automation'];

  const about = {
    label: 'About',
    colour: 'yellow',
    icon: 'about',
    path: '/',
    size: [1000, 625],
    render(win) {
      const a = C.about || {};
      const ticker = Array.isArray(a.ticker) ? a.ticker : DEFAULT_TICKER;
      const photo = a.photo
        ? `<img src="${esc(webSrc(a.photo))}"${dims(a.photo)} alt="${esc(a.photoAlt || 'Photo')}" />`
        : `<span class="about-photo-empty">${doodleIcon('camera')}</span>`;
      const linked = (text) => (a.workLinks || []).reduce((html, link) =>
        html.split(esc(link.text)).join(`<a class="about-work-link" href="${esc(link.href)}" data-app="${esc(link.app)}">${esc(link.text)}</a>`), esc(text));
      const paras = (a.paragraphs || []).map((p) => `<p>${linked(p)}</p>`).join('');
      const tickerHidden = !!(K.store.get('kasai:ticker', null) || {}).hidden;
      // My CV opens the CV's window (a real link to /cv, so it can be opened in a new tab too).
      const cv = C.cv ? `<a class="os-button" href="${CV.path}" data-app="cv">${doodleIcon('doc')}My CV</a>` : '';
      win.body.innerHTML = `
        ${ticker.length ? `<div class="about-ticker${tickerHidden ? ' is-collapsed' : ''}"><div class="ticker" id="about-ticker-strip" role="marquee" aria-label="What I do"${tickerHidden ? ' hidden' : ''}>
          <div class="marquee-content"><ul class="marquee-group">${ticker.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
        </div><button class="ticker-toggle" type="button" aria-controls="about-ticker-strip" aria-expanded="${!tickerHidden}" aria-label="${tickerHidden ? 'Show' : 'Hide'} skills ticker" title="${tickerHidden ? 'Show' : 'Hide'} skills ticker"><span aria-hidden="true">^</span></button></div>` : ''}
        <div class="about">
          <div class="about-main">
            <h2 class="about-greeting" id="${win.headingId}" tabindex="-1">${highlight(a.heading || 'Hello')}</h2>
            ${a.subheading ? `<p class="about-subheading">${highlight(a.subheading)}</p>` : ''}
            <div class="about-text">${paras}</div>
            ${a.contactLine ? `<p class="about-contact-line">${esc(a.contactLine)}</p>` : ''}
            ${a.email || cv ? `<p class="about-contact">
              ${a.email ? `<a class="os-button" href="mailto:${esc(a.email)}">${doodleIcon('mail')}Email me</a>` : ''}
              ${cv}
              ${a.email ? `<span class="about-email">${esc(a.email).replace('@', '<wbr>@')}</span>` : ''}
            </p>` : ''}
          </div>
          <figure class="about-photo">${photo}</figure>
        </div>`;
      const toggle = win.body.querySelector('.ticker-toggle');
      if (toggle) toggle.addEventListener('click', () => {
        const strip = win.body.querySelector('.ticker');
        strip.hidden = !strip.hidden;
        toggle.parentElement.classList.toggle('is-collapsed', strip.hidden);
        toggle.setAttribute('aria-expanded', String(!strip.hidden));
        const label = `${strip.hidden ? 'Show' : 'Hide'} skills ticker`;
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        K.store.set('kasai:ticker', { hidden: strip.hidden });
        if (!strip.hidden) K.setupMarquee(strip);
      });
      win.setStatus(a.signoff ? esc(a.signoff) : '');
    },
    // The ticker measures itself once the window is actually on screen.
    onShow(win) { K.setupMarquee(win.body.querySelector('.ticker')); },
    onResize(win) { K.setupMarquee(win.body.querySelector('.ticker')); },
  };

  /* ══════════════════════════════════════════════════════════════════════
     THE CV  (About's My CV button, or the /cv address)
     ══════════════════════════════════════════════════════════════════════
     A sheet of paper, filled from "cv" in content.js: the contact line,
     then a section each for the profile, jobs, education, skills and
     interests. Its menu bar prints it or saves it as a PDF, and only the
     page prints. The contact email is the site's (about.email). */
  const CV_HEADINGS = { profile: 'Personal Profile', jobs: 'Employment History', education: 'Education', skills: 'Technical Skills and Certification', interests: 'Hobbies & Interests' };
  const listOf = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
  // "https://www.linkedin.com/in/andrew-worgan/" -> "linkedin.com/in/andrew-worgan"
  const bare = (url) => String(url || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '');

  const cvPage = (cv, headingId) => {
    const h = Object.assign({}, CV_HEADINGS, cv.headings || {});
    const email = (C.about || {}).email;
    const contact = [
      cv.place ? `<li>${esc(cv.place)}</li>` : '',
      email ? `<li><a href="mailto:${esc(email)}">${esc(email)}</a></li>` : '',
      cv.linkedin ? `<li><a href="${esc(cv.linkedin)}" target="_blank" rel="noopener">${esc(bare(cv.linkedin))}</a></li>` : '',
      cv.website ? `<li><a href="${esc(cv.website)}">${esc(bare(cv.website))}</a></li>` : '',
    ].join('');
    const section = (key, inner) => (inner
      ? `<section class="cv-sec"><h3 class="cv-h"><span>${esc(h[key])}</span></h3>${inner}</section>` : '');
    const points = (list) => (listOf(list).length
      ? `<ul class="cv-points">${listOf(list).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '');
    // A job or a school: its name and role on the left, its dates (and
    // where) on the right, then its bullet points.
    const item = (name, role, when, list) => `
      <div class="cv-item">
        <div class="cv-item-head">
          <div class="cv-item-what"><h4 class="cv-item-name">${esc(name)}</h4>${role ? `<p class="cv-item-role">${esc(role)}</p>` : ''}</div>
          ${when.length ? `<p class="cv-item-when">${when.map((w) => `<span>${esc(w)}</span>`).join('')}</p>` : ''}
        </div>
        ${points(list)}
      </div>`;
    const jobs = listOf(cv.jobs).map((j) => item(j.place, j.role, [j.dates, j.where].filter(Boolean), j.points)).join('');
    const schools = listOf(cv.education).map((s) => item(s.place, s.what, [s.dates].filter(Boolean), s.points)).join('');
    const certs = listOf(cv.certificates).map((c) => `
      <li><span class="cv-cert-name">${doodleIcon('ribbon')}<span>${esc(c.name)}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span></span>${c.from ? `<span class="cv-cert-from">${esc(c.from)}</span>` : ''}</li>`).join('');
    const skills = listOf(cv.skills).map((s) => `
      <div><dt>${esc(s.name)}</dt><dd>${listOf(s.chips).length
        ? `<ul class="cv-chips">${listOf(s.chips).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}${s.note ? `<p>${esc(s.note)}</p>` : ''}</dd></div>`).join('');
    return `
      <article class="cv-page">
        <header class="cv-head">
          <h2 class="cv-name" id="${headingId}" tabindex="-1">${esc(cv.name || 'Andrew Worgan')}<span class="vh">: CV</span></h2>
          ${contact ? `<ul class="cv-contact">${contact}</ul>` : ''}
        </header>
        ${section('profile', cv.profile ? `<p class="cv-text">${esc(cv.profile)}</p>` : '')}
        ${section('jobs', jobs)}
        ${section('education', schools)}
        ${section('skills', (certs ? `<ul class="cv-certs">${certs}</ul>` : '') + (skills ? `<dl class="cv-skills">${skills}</dl>` : ''))}
        ${section('interests', cv.interests ? `<p class="cv-text">${esc(cv.interests)}</p>` : '')}
        ${cv.references ? `<p class="cv-refs">${esc(cv.references)}</p>` : ''}
      </article>`;
  };

  // Printing (the menu bar's button, or Ctrl+P with the CV in front): a copy
  // of the page goes on a sheet of its own, the print rules in style.css
  // show nothing else, and a saved PDF is named after the file.
  let sheet = null;
  let titleWas = '';
  const cvPrinting = () => {
    const f = K.wm && K.wm.front();
    const page = f && f.id === 'cv' && f.body.querySelector('.cv-page');
    if (!page || sheet) return;
    sheet = document.createElement('div');
    sheet.className = 'cv-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    const copy = page.cloneNode(true);
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    sheet.appendChild(copy);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('is-printing-cv');
    titleWas = document.title;
    document.title = CV.file.replace(/\.\w+$/, '');
  };
  const cvPrinted = () => {
    if (!sheet) return;
    sheet.remove();
    sheet = null;
    document.documentElement.classList.remove('is-printing-cv');
    document.title = titleWas;
  };
  window.addEventListener('beforeprint', cvPrinting);
  window.addEventListener('afterprint', cvPrinted);

  const CV = {
    parent: 'about',
    label: 'CV',
    file: `${(C.cv && C.cv.name) || 'Andrew Worgan'} CV.doc`,
    colour: 'yellow',
    doodle: 'doc',
    path: '/cv',
    size: [720, 760],
    minSize: [320, 300],
    render(win) {
      const cv = C.cv || {};
      win.body.classList.add('cv-body');
      win.body.innerHTML = cvPage(cv, win.headingId);
      win.menu.innerHTML = `<div class="win-toolbar"><button class="os-button" type="button" data-print>${doodleIcon('printer')}Print or save as PDF</button></div>`;
      win.menu.querySelector('[data-print]').addEventListener('click', () => { cvPrinting(); window.print(); });
      // Ways to get in touch, always in reach at the foot of the window.
      const email = (C.about || {}).email;
      const links = (email ? `<a href="mailto:${esc(email)}">Email me</a>` : '') +
        (cv.linkedin ? `<a href="${esc(cv.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : '');
      const keys = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd+P' : 'Ctrl+P';
      win.setStatus(`<span class="hint-mouse">${keys} prints just the CV</span>${links ? `<span class="os-links">${links}</span>` : ''}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     CODING  (the projects folder, and a window per project)
     ══════════════════════════════════════════════════════════════════════
     The title bar shows a file name: `window` in content.js, or the title
     up to any " - " with an extension that fits its tags (.apk Android,
     .html web, .exe otherwise). The tech stack is the menu bar; an
     "In Progress" tag becomes the status. */
  const STATUS_TAG = /^(in progress|wip|work in progress)$/i;
  const windowName = (p) => {
    if (p.window) return String(p.window);
    const tags = (p.tags || []).join(' ').toLowerCase();
    const ext = /android|kotlin|compose/.test(tags) ? 'apk'
      : /electron|windows|desktop/.test(tags) ? 'exe'
        : /html|css|javascript|web/.test(tags) ? 'html' : 'exe';
    const base = String(p.tab || String(p.title || 'project').split(/\s+-\s+/)[0])
      .trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    return (base || 'project') + '.' + ext;
  };
  const fileIcon = (file) => (/\.apk$/.test(file) ? 'phone' : /\.html?$/.test(file) ? 'globe' : 'laptop');
  const projectParts = (p) => {
    const parts = String(p.title || 'Untitled project').split(/\s+-\s+/);
    const tags = p.tags || [];
    return {
      name: parts[0],
      sub: parts.slice(1).join(' - '),
      file: windowName(p),
      techs: tags.filter((t) => !STATUS_TAG.test(t)),
      busy: tags.some((t) => STATUS_TAG.test(t)),
    };
  };
  const statusLed = (busy, status) =>
    `<span class="os-led${busy ? ' is-busy' : ''}" aria-hidden="true"></span>${esc(status || (busy ? 'In progress' : 'Publicly released'))}`;

  // A project's screenshot fills its window's width, cropped to 16:10, so the
  // copy it needs changes with the window. `sizes` is the width the picture
  // is drawn at, cropped edges included; once the small copy would be
  // stretched (a big window, a high-density screen) the browser fetches the
  // large one.
  const sizeShot = (win) => {
    const img = win.body.querySelector('img.os-shot[srcset]');
    if (!img || !img.clientWidth) return;
    const ratio = img.getAttribute('width') / img.getAttribute('height');
    img.sizes = Math.ceil(Math.max(img.clientWidth, img.clientHeight * ratio)) + 'px';
  };

  const openProject = (p, from) => {
    const { name, sub, file, techs, busy } = projectParts(p);
    K.wm.open({
      id: 'project-' + slug(name),
      parent: 'coding',
      label: name,
      file,
      colour: accent(p.accent || 'blue'),
      doodle: fileIcon(file),
      size: [560, 660],
      render(win) {
        if (techs.length) {
          win.menu.innerHTML = `<p class="os-menu"><span class="vh">Built with: </span>${techs.map((t) => `<span>${esc(t)}</span>`).join('')}</p>`;
        }
        // sizes starts as the window's width; sizeShot corrects it once the
        // window is on screen, before the lazy picture loads.
        const set = p.img ? srcset(p.img) : '';
        // A click (or Enter, Space, a tap) opens the whole uncropped picture.
        const shot = p.img
          ? `<button class="os-shot-open" type="button" data-full="${esc(largeSrc(p.img))}" data-img="${esc(p.img)}"` +
            ` data-file="${esc(slug(name) + '.png')}" data-caption="${esc(p.title || name)}" aria-label="View the ${esc(name)} screenshot full size">` +
            `<img class="os-shot" src="${esc(webSrc(p.img))}"${set ? ` srcset="${esc(set)}" sizes="560px"` : ''}${dims(p.img)} alt="${esc(p.title || '')}" loading="lazy" decoding="async" draggable="false" /></button>`
          : `<div class="os-shot">${doodleIcon('laptop')}</div>`;
        // Someone else's project I've built on: a GitHub-style "Forked from" line.
        const fork = p.forkOf && p.forkOf.label
          ? `<p class="os-fork">${doodleIcon('fork')}Forked from ${p.forkOf.url
            ? `<a href="${esc(p.forkOf.url)}" target="_blank" rel="noopener">${esc(p.forkOf.label)}</a>`
            : esc(p.forkOf.label)}</p>`
          : '';
        win.body.innerHTML = `
          <div class="os-body">
            ${shot}
            <h2 class="os-name" id="${win.headingId}" tabindex="-1">${esc(name)}</h2>
            <p class="os-path">C:\\Kasai\\Projects\\${esc(name)}${sub ? ` &middot; ${esc(sub)}` : ''}</p>
            ${fork}
            ${p.benefit ? `<p class="project-benefit">${esc(p.benefit)}</p>` : ''}
            <p class="os-desc">${esc(p.desc || '')}</p>
            ${p.aiAssisted ? '<p class="project-assistance">Created with AI assistance.</p>' : ''}
            ${(p.caseStudy || []).map((section) => `<section class="project-story"><h3>${esc(section.heading)}</h3><p>${esc(section.text)}</p></section>`).join('')}
          </div>`;
        const links = (p.links || []).filter((l) => l && l.label)
          .map((l) => `<a href="${esc(l.url || '#')}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
        win.setStatus(`<span class="os-state">${statusLed(busy, p.status)}</span>${links ? `<span class="os-links">${links}</span>` : ''}`);
        const open = win.body.querySelector('.os-shot-open');
        if (open) open.addEventListener('click', () => K.openViewer(open));
      },
      onShow: sizeShot,
      onResize: sizeShot, // maximised, restored, resized or a new screen size
    }, { from });
  };

  const coding = {
    label: 'Coding',
    colour: 'blue',
    icon: 'coding',
    path: '/coding_projects',
    size: [900, 640],
    head: () => copy('coding', { address: 'C:\\Kasai\\Projects', heading: 'Projects', sub: "Apps, experiments & tools I've built." }),
    render(win) {
      const items = C.coding || [];
      if (!items.length) {
        win.body.innerHTML = K.folderEmpty('laptop', 'coding');
        win.setStatus('0 projects');
        return;
      }
      win.body.innerHTML = `<ul class="folder-grid folder-grid--projects">${items.map((p, i) => {
        const { name, sub, file, busy } = projectParts(p);
        const thumb = p.img
          ? `<img src="${esc(webSrc(p.img))}"${dims(p.img)} alt="" loading="lazy" decoding="async" draggable="false" />`
          : doodleIcon(fileIcon(file));
        return `<li><button class="file-tile project-tile ${accent(p.accent || 'blue')}" type="button" data-i="${i}">
            <span class="tile-thumb">${thumb}</span>
            <span class="tile-name">${esc(name)}</span>
            ${sub ? `<span class="tile-sub">${esc(sub)}</span>` : ''}
            ${p.benefit ? `<span class="tile-benefit">${esc(p.benefit)}</span>` : ''}
            <span class="tile-meta"><span class="tile-file">${esc(file)}</span><span class="tile-state">${statusLed(busy, p.status)}</span></span>
          </button></li>`;
      }).join('')}</ul>`;
      K.openable(win.body, '.file-tile', (el) => openProject(items[Number(el.dataset.i)], el));
      win.setStatus(`${plural(items.length, 'project')}${K.hint('Double-click a project to open it', 'Tap a project to open it')}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     ART  (a binder where every piece is a spell card)
     ══════════════════════════════════════════════════════════════════════
     Each card's frame takes the artwork's most visible colour and its type
     strip the second (picked by the build, or `frame:` / `chip:` in
     content.js). Wide pieces get a sideways card, two columns wide. */
  const ART = K.ART;
  const artSets = () => ART.reduce((tags, it) => (it.tag && tags.indexOf(it.tag) === -1 ? tags.concat(it.tag) : tags), []);
  const binderStatus = (shown) => (shown === ART.length
    ? `${plural(ART.length, 'card')} in ${plural(artSets().length, 'set')}`
    : `Showing ${shown} of ${plural(ART.length, 'card')}`);
  // "Final Valen" -> "final-valen.png", the name in the viewer's title bar.
  const artFileName = (it) => {
    const ext = (String(it.img || '').match(/\.(\w+)$/) || [0, 'png'])[1].toLowerCase();
    return slug(it.title) + '.' + ext;
  };

  const artDetails = (it) => {
    const d = it.details || {};
    const text = (s) => typeof s === 'string' ? s.trim() : '';
    const paragraphs = (Array.isArray(d.paragraphs) ? d.paragraphs : []).map(text).filter(Boolean);
    const process = (Array.isArray(d.process) ? d.process : []).filter((p) => p && text(p.img));
    const meta = [text(d.medium), text(d.year)].filter(Boolean).join(' · ');
    return { paragraphs, process, meta, exists: !!(meta || paragraphs.length || process.length) };
  };

  const artBack = (it, details) => {
    const title = it.title || 'Untitled';
    const process = details.process.map((p, i) => {
      const set = thumbSrcset(p.img);
      return `<figure class="art-process-image">
        <button type="button" class="art-process-view" data-full="${esc(largeSrc(p.img))}" data-img="${esc(p.img)}" data-file="${esc(artFileName({ img: p.img, title: title + ' process ' + (i + 1) }))}" data-caption="${esc(p.caption || '')}" aria-label="View process image ${i + 1}: ${esc(p.alt || title)}">
          <img src="${esc(webSrc(p.img))}"${set ? ` srcset="${esc(set)}" sizes="240px"` : ''}${dims(p.img)} alt="${esc(p.alt || '')}" loading="lazy" decoding="async" draggable="false" />
        </button>${p.caption && p.caption.trim() ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
      </figure>`;
    }).join('');
    return `<div class="art-card-face art-card-back" data-art-back hidden inert>
      <span class="art-card-name">${esc(title)}</span>
      <div class="art-card-notes" tabindex="0" role="region" aria-label="About ${esc(title)}">
        ${details.meta ? `<p class="art-card-meta">${esc(details.meta)}</p>` : ''}
        ${details.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${process ? `<div class="art-process" data-viewer-set aria-label="Process images for ${esc(title)}">${process}</div>` : ''}
      </div>
      <div class="art-card-actions">
        ${it.img ? `<button type="button" data-art-view aria-label="View ${esc(title)} full size">View artwork</button>` : ''}
        <button type="button" data-art-flip aria-label="Back to front of ${esc(title)}">Back to front</button>
      </div>
    </div>`;
  };

  const artCard = (it, i, n) => {
    const info = imgInfo(it.img) || {};
    const picked = info.colors || [];
    const frame = K.readable(HEX.test(it.frame) ? it.frame : picked[0]); // (its set name and number sit on it)
    const chip = HEX.test(it.chip) ? it.chip : picked[1];
    let style = `--tilt:${[-2, 1.6, -0.8, 2.2, -1.4, 0.9][i % 6]}deg;`;
    if (frame) style += `--frame:${frame};--frame-ink:${textOn(frame)};`;
    if (chip) style += `--chip:${chip};--chip-ink:${textOn(chip)};`;
    const wide = info.w && info.h && info.w / info.h >= 1.25;
    // A card is 168 to about 260px wide (a wide one two columns), half a
    // phone each or one column on the narrowest phones.
    const set = thumbSrcset(it.img);
    const sizes = wide ? '(max-width: 760px) 92vw, 540px' : '(max-width: 380px) 92vw, (max-width: 760px) 46vw, 260px';
    const title = it.title || 'Untitled';
    const details = artDetails(it);
    const viewer = it.img
      ? ` data-full="${esc(largeSrc(it.full || it.img))}" data-img="${esc(it.full || it.img)}" data-file="${esc(artFileName(it))}"` +
        ` data-colors="${esc(picked.join(' '))}" data-caption="${esc(title + (it.tag ? ' · ' + it.tag : ''))}"` +
        ` aria-label="View ${esc(title)} full size"`
      : '';
    return `
      <figure class="art-card${wide ? ' is-wide' : ''}${details.exists ? ' has-details' : ''}" style="${style}" data-tag="${esc(it.tag || '')}">
        <div class="art-card-tilt">
          <div class="art-card-face" data-art-front>
            <${it.img ? 'button type="button"' : 'div'} class="art-card-view"${viewer}>
            <span class="art-card-name">${esc(title)}</span>
            <span class="art-card-window">${it.img
              ? `<img src="${esc(webSrc(it.img))}"${set ? ` srcset="${esc(set)}" sizes="${sizes}"` : ''}${dims(it.img)} alt="${esc(title)}" loading="lazy" decoding="async" draggable="false" />`
              : doodleIcon('palette')}<span class="art-card-view-label">View artwork</span></span>
            <span class="art-card-type"><span>${esc(it.tag || 'Art')}</span><img src="/assets/ui/favicon.png" alt="" /></span>
            <span class="art-card-foot" aria-hidden="true"><span>${pad2(i + 1)}/${pad2(n)}</span><span>Kasai</span></span>
            </${it.img ? 'button' : 'div'}>
            ${details.exists ? `<button type="button" class="art-card-flip" data-art-flip aria-label="About ${esc(title)}: flip card">About this piece</button>` : ''}
            <span class="art-card-glint" aria-hidden="true"></span>
          </div>
          ${details.exists ? artBack(it, details) : ''}
        </div>
      </figure>`;
  };

  const flipArtCard = (card, back, focus = false) => {
    const front = card.querySelector('[data-art-front]');
    const reverse = card.querySelector('[data-art-back]');
    if (!reverse) return;
    card.classList.toggle('is-flipped', back);
    [front, reverse].forEach((face, i) => {
      face.hidden = i === (back ? 0 : 1);
      face.inert = face.hidden;
    });
    if (focus) (back ? reverse : front).querySelector('[data-art-flip]').focus({ preventScroll: true });
  };

  // Cards lean towards the mouse, and the foil glint follows it across.
  const tiltCard = (card) => {
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', (px * 16).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-py * 13).toFixed(2) + 'deg');
      card.style.setProperty('--gx', (px * 140 + 15).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  };

  const art = {
    label: 'Art',
    colour: 'lavender',
    icon: 'art',
    path: '/illustrations_and_graphics',
    size: [1080, 720],
    head: () => copy('art', { heading: 'Illustration & Design', sub: 'Drawings, characters & design work. Pick a card to see it full size.' }),
    render(win) {
      win.body.classList.add('binder-mat');
      if (!ART.length) {
        win.body.innerHTML = K.folderEmpty('palette', 'art');
        win.setStatus('0 cards');
        return;
      }
      win.body.innerHTML = `<div class="card-grid" data-viewer-set>${ART.map((it, i) => artCard(it, i, ART.length)).join('')}</div>`;
      const grid = win.body.querySelector('.card-grid');
      if (!K.REDUCE_MOTION) grid.querySelectorAll('.art-card').forEach(tiltCard);
      K.openable(grid, '.art-card-view[data-full]', K.openViewer);
      grid.addEventListener('click', (e) => {
        const flip = e.target.closest('[data-art-flip]');
        const card = e.target.closest('.art-card');
        if (flip) flipArtCard(card, !card.classList.contains('is-flipped'), true);
        const view = e.target.closest('[data-art-view]');
        if (view) K.openViewer(card.querySelector('.art-card-view'));
        const process = e.target.closest('.art-process-view');
        if (process) K.openViewer(process);
      });
      const status = (shown) => `<span class="binder-status">${esc(binderStatus(shown))}</span>${K.hint('Double-click artwork to view it', 'Tap artwork to view it')}`;
      win.setStatus(status(ART.length));

      // The menu bar: one item per category plus Shuffle. Filtering toggles a
      // class (no re-render), so each card's wiring survives.
      const tags = artSets();
      if (tags.length < 2) return; // no point filtering one category
      win.menu.innerHTML = `<div class="binder-menu" role="group" aria-label="Filter artwork by category">
          <button type="button" data-tag="*" aria-pressed="true">All</button>
          ${tags.map((t) => `<button type="button" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}
          <button type="button" class="binder-shuffle" data-shuffle>${doodleIcon('dice')}Shuffle</button>
          <span class="vh" role="status"></span>
        </div>`;
      const bar = win.menu.firstElementChild;
      const said = bar.querySelector('[role="status"]');
      bar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.hasAttribute('data-shuffle')) {
          const cards = Array.prototype.slice.call(grid.children);
          for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
          }
          K.glide(grid, { order: cards });
          said.textContent = 'Artwork shuffled';
          return;
        }
        const tag = btn.getAttribute('data-tag');
        bar.querySelectorAll('[data-tag]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const match = (card) => tag === '*' || card.getAttribute('data-tag') === tag;
        Array.from(grid.children).filter((card) => !match(card)).forEach((card) => {
          if (card.contains(document.activeElement)) btn.focus();
          flipArtCard(card, false);
        });
        K.glide(grid, { show: match });
        const shown = Array.prototype.filter.call(grid.children, match).length;
        said.textContent = 'Showing ' + shown + ' of ' + grid.children.length + ' pieces';
        win.setStatus(status(shown));
      });
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     WRITING  (documents, and a notepad window per piece)
     ══════════════════════════════════════════════════════════════════════ */
  const openDoc = (w, from) => {
    const title = w.title || 'Untitled';
    const hasLink = w.url && w.url !== '#';
    K.wm.open({
      id: 'doc-' + slug(title),
      parent: 'writing',
      label: title,
      file: slug(title) + '.txt',
      colour: accent(w.accent || 'teal'),
      doodle: 'quill',
      size: w.chapters && w.chapters.length ? [740, 760] : [600, 360],
      render(win) {
        win.body.classList.add('paper-body');
        if (w.chapters && w.chapters.length) win.body.classList.add('story-body');
        if (w.chapters && w.chapters.length) {
          win.menu.innerHTML = `<nav class="story-nav win-toolbar" aria-label="Chapters">${w.chapters.map((chapter, i) => `<button class="os-button" type="button" data-chapter="${i}">${esc(chapter.title)}</button>`).join('')}</nav>`;
          win.menu.addEventListener('click', (e) => {
            const button = e.target.closest('[data-chapter]');
            if (!button) return;
            const heading = win.body.querySelectorAll('.story-chapter h3')[Number(button.dataset.chapter)];
            if (heading) {
              heading.scrollIntoView({ block: 'start' });
              heading.focus({ preventScroll: true });
            }
          });
        }
        win.body.innerHTML = `
          <article class="paper">
            <span class="paper-hole" aria-hidden="true"></span>
            ${w.stamp ? `<span class="paper-stamp">${esc(w.stamp)}</span>` : ''}
            ${w.date ? `<p class="paper-date">${esc(w.date)}</p>` : ''}
            <h2 class="paper-title" id="${win.headingId}" tabindex="-1">${esc(title)}</h2>
            ${w.excerpt ? `<p class="paper-excerpt">${esc(w.excerpt)}</p>` : ''}
            ${(w.chapters || []).map((chapter) => `<section class="story-chapter"><h3 tabindex="-1">${esc(chapter.title)}</h3>${chapter.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('')}
          </article>`;
        win.setStatus(hasLink
          ? `<span>${esc(w.status || '')}</span><span class="os-links"><a href="${esc(w.url)}"${/^https?:/i.test(w.url) ? ' target="_blank" rel="noopener"' : ''}>Read it</a></span>`
          : `<span class="os-state">${doodleIcon('quill')}${esc(w.status || 'Coming soon')}</span>`);
      },
    }, { from });
  };

  const writing = {
    label: 'Writing',
    colour: 'teal',
    icon: 'writing',
    path: '/writing',
    size: [780, Math.min(600, 290 + (C.writing || []).length * 72)],
    head: () => copy('writing', { address: 'C:\\Kasai\\Documents', heading: 'Drafts & Complete Works', sub: 'Web novels, stories & creative writing.' }),
    render(win) {
      const items = C.writing || [];
      if (!items.length) {
        win.body.innerHTML = K.folderEmpty('quill', 'writing');
        win.setStatus('0 documents');
        return;
      }
      win.body.innerHTML = `
        <div class="file-list">
          <p class="file-list-head" aria-hidden="true"><span>Name</span><span>Status</span><span>Date</span></p>
          <ul>${items.map((w, i) => `
            <li><button class="file-row" type="button" data-i="${i}">
              <span class="file-row-name">${doodleIcon('doc')}${esc(w.title || 'Untitled')}</span>
              <span class="file-row-status">${esc(w.status || (w.url ? 'Finished' : ''))}</span>
              <span class="file-row-date">${esc(w.date || '')}</span>
            </button></li>`).join('')}
          </ul>
        </div>`;
      K.openable(win.body, '.file-row', (el) => openDoc(items[Number(el.dataset.i)], el));
      win.setStatus(`${plural(items.length, 'document')}${K.hint('Double-click to open', 'Tap to open')}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     CERTIFICATES  (a folder of certificate files)
     ══════════════════════════════════════════════════════════════════════ */
  const certificates = {
    label: 'Certificates',
    colour: 'pink',
    icon: 'certificates',
    path: '/certificates',
    size: [780, 520],
    head: () => copy('certificates', { address: 'C:\\Kasai\\Certificates', heading: 'Certificates', sub: 'Courses, certifications & professional development.' }),
    render(win) {
      const items = C.certificates || [];
      if (!items.length) {
        win.body.innerHTML = K.folderEmpty('cap', 'certificates');
        win.setStatus('0 items');
        return;
      }
      win.body.innerHTML = `<ul class="folder-grid" data-viewer-set>${items.map((c) => {
        const title = c.title || 'Certificate';
        const meta = [c.issuer, c.date].filter(Boolean).map(esc).join(' · ');
        // The tile opens the scan; the credential link sits beside it, never inside.
        const tile = c.img
          ? `<button class="file-tile cert-tile ${accent(c.accent || 'pink')}" type="button" data-full="${esc(largeSrc(c.img))}" data-img="${esc(c.img)}"
               data-file="${esc(slug(title))}.png" data-caption="${esc(title + (meta ? ' · ' + [c.issuer, c.date].filter(Boolean).join(' · ') : ''))}">
               <span class="tile-thumb"><img src="${esc(webSrc(c.img))}"${dims(c.img)} alt="${esc(title)}" loading="lazy" decoding="async" draggable="false" /></span>
               <span class="tile-name">${esc(title)}</span>${meta ? `<span class="tile-sub">${meta}</span>` : ''}
             </button>`
          : `<div class="file-tile cert-tile ${accent(c.accent || 'pink')}">
               <span class="tile-thumb tile-thumb--icon">${doodleIcon(c.icon || 'cap')}</span>
               <span class="tile-name">${esc(title)}</span>${meta ? `<span class="tile-sub">${meta}</span>` : ''}
             </div>`;
        return `<li class="cert-file">${tile}${c.link
          ? `<a class="cert-credential" href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.linkLabel || 'View credential')} ${K.ARROW}</a>` : ''}</li>`;
      }).join('')}</ul>`;
      K.openable(win.body, 'button.cert-tile', (el) => K.openViewer(el));
      win.setStatus(`${plural(items.length, 'item')}${K.hint('Double-click to view', 'Tap to view')}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     GAMES  (a folder: Wizard Sweeper, Not Rubbish, Star Drop and Spell Solitaire)
     ══════════════════════════════════════════════════════════════════════
     Each game is its own script, fetched the first time it opens so the
     desktop never waits for it. The build stamps the addresses below with
     a version (like the page's own script links), so a returning visitor
     never gets a stale copy of a game. `pose` is the pet wizard's drawing
     on the game's file; `prefix` names its window's classes. */
  const GAMES = {
    sweeper: {
      label: 'Wizard Sweeper', file: 'sweeper.exe', colour: 'ink', size: [600, 680], minSize: [340, 420],
      sub: "Don't wake the wizards", genre: 'Minesweeper roguelike', pose: 'asleep', script: '/sweeper.js', prefix: 'sw',
    },
    rubbish: {
      label: 'Not Rubbish', file: 'rubbish.exe', colour: 'grey', size: [560, 760], minSize: [340, 480],
      sub: 'Climb out of the Trash', genre: 'Turn-based dungeon escape', pose: 'hurt', script: '/rubbish.js', prefix: 'gm',
    },
    stardrop: {
      label: 'Star Drop', file: 'stardrop.exe', colour: 'blue', size: [560, 760], minSize: [340, 480],
      sub: 'Chase off his nightmares', genre: 'Pegboard battler', pose: 'aim', script: '/stardrop.js', prefix: 'gm',
    },
    solitaire: {
      label: 'Spell Solitaire', file: 'solitaire.exe', colour: 'lavender', size: [900, 680], minSize: [520, 500],
      sub: 'Chain spells up the peaks', genre: 'TriPeaks solitaire', pose: 'cards', script: '/solitaire.js', prefix: 'gm',
    },
  };
  const wizardPose = (name) => {
    if (K.pet && K.pet.frame) return K.pet.frame(name);
    const frames = (C.wizard && C.wizard.frames) || {};
    return frames[name] ? webSrc(frames[name]) : frames.idle ? webSrc(frames.idle) : '';
  };
  // A script fetched the first time its window opens (a game, paint.exe);
  // it sets Kasai[name] to its { mount, unmount }.
  const loads = {};
  const loadScript = (name, src) => {
    if (K[name]) return Promise.resolve(K[name]);
    loads[name] = loads[name] || new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => (K[name] ? resolve(K[name]) : reject(new Error(`${src} loaded but did not start`)));
      s.onerror = () => { s.remove(); reject(new Error(`${src} did not load`)); };
      document.head.appendChild(s);
    }).catch((err) => { loads[name] = null; throw err; });
    return loads[name];
  };
  // A window whose insides come with a script: a loading note (o.pic, a
  // picture above "Loading..."; o.wait, its class) until the script is
  // here, then its mount(win). If it can't be fetched, a Try again button.
  const fillLater = (win, o) => {
    win.body.innerHTML = `<h2 class="vh" id="${win.headingId}" tabindex="-1">${esc(o.label)}</h2>
      <div class="${o.wait}" role="status"></div>`;
    const wait = win.body.querySelector('.' + o.wait);
    const start = () => {
      wait.innerHTML = `${o.pic()}<p>Loading ${esc(o.label)}...</p>`;
      loadScript(o.name, o.script).then((app) => { if (wait.isConnected) app.mount(win); }).catch((err) => {
        console.error(err);
        if (!wait.isConnected) return; // the window was closed meanwhile
        wait.innerHTML = `<p>${esc(o.what)} didn't load. Check your connection, then try again.</p>
          <button class="os-button" type="button">Try again</button>`;
        wait.querySelector('button').addEventListener('click', start);
      });
    };
    start();
  };
  const openGame = (id, from) => {
    const g = GAMES[id];
    if (!g) return;
    K.wm.open({
      id,
      parent: 'games',
      label: g.label,
      file: g.file,
      colour: g.colour,
      doodle: 'controller',
      size: g.size,
      minSize: g.minSize,
      render(win) {
        win.body.classList.add(`${g.prefix}-body`);
        fillLater(win, {
          name: id,
          script: g.script,
          label: g.label,
          wait: `${g.prefix}-loading`,
          pic: () => { const pic = wizardPose(g.pose); return pic ? `<img src="${esc(pic)}" alt="" />` : ''; },
          what: 'The game',
        });
      },
      // Closing keeps the run where it was, ready for next time.
      onClose(win) { if (K[id]) K[id].unmount(win); },
    }, { from });
  };
  K.openGame = openGame;
  K.openSweeper = (from) => openGame('sweeper', from); // a secret code opens it too (kasai-os.js)

  // A trophy in the corner of a game's picture, once a run of it has been
  // completed: Andrew's drawing if content.js has one (os.windows.games
  // .trophy), or a doodle cup on a sticker. It pops in the first time it's
  // seen (style.css), and K.trophy remembers that it has. Screen readers
  // hear it after the game's name (trophyWords, at the end of the file).
  const trophyHtml = (id) => {
    if (!K.trophy.has(id)) return '';
    const art = String(copy('games', {}).trophy || '').trim();
    const pic = art ? `<img src="${esc(webSrc(art))}" alt="" draggable="false" decoding="async" />` : doodleIcon('trophy');
    return `<span class="tile-trophy${art ? ' has-art' : ''}${K.trophy.fresh(id) ? ' is-new' : ''}" data-trophy="${id}" title="Run completed" aria-hidden="true">${pic}</span>`;
  };
  const trophyWords = (id) => (K.trophy.has(id) ? '<span class="vh">Run completed</span>' : '');

  const games = {
    label: 'Games',
    colour: 'coral',
    icon: 'games',
    path: '/games',
    size: [700, 510], // room for the genre descriptions below the four games
    head: () => copy('games', { heading: 'Games', sub: 'Things to play when you should be working.' }),
    render(win) {
      const ids = Object.keys(GAMES);
      win.body.innerHTML = `<ul class="folder-grid">${ids.map((id) => {
        const g = GAMES[id];
        const pic = wizardPose(g.pose);
        return `
          <li><button class="file-tile game-tile" type="button" data-game="${id}">
            <span class="tile-thumb tile-thumb--sprite ${g.colour}">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy" decoding="async" draggable="false" />` : doodleIcon('controller')}${trophyHtml(id)}</span>
            <span class="tile-name">${esc(g.label)}</span>
            <span class="tile-sub">${esc(g.sub)}</span><span class="tile-genre">${esc(g.genre)}</span>${trophyWords(id)}
          </button></li>`;
      }).join('')}</ul>`;
      K.openable(win.body, '.file-tile', (el) => openGame(el.dataset.game, el));
      win.setStatus(`${plural(ids.length, 'game')}${K.hint('Double-click to play', 'Tap to play')}`);
      // A run completed while this window's about (it always is, hidden or
      // not): the trophy turns up on that game's file straight away.
      K.on('trophy', (e) => {
        const tile = win.body.querySelector(`[data-game="${e.id}"]`);
        if (!tile || tile.querySelector('.tile-trophy')) return;
        tile.querySelector('.tile-thumb').insertAdjacentHTML('beforeend', trophyHtml(e.id));
        tile.insertAdjacentHTML('beforeend', trophyWords(e.id));
      });
      win.body.addEventListener('animationend', (e) => {
        const t = e.target.closest('.tile-trophy.is-new');
        if (!t) return;
        t.classList.remove('is-new');
        K.trophy.seen(t.dataset.trophy);
      });
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     PAINT  (paint.exe, the one file in the Trash that isn't a design)
     ══════════════════════════════════════════════════════════════════════
     paint.js arrives the first time it opens. Its file in the Trash shows
     Andrew's drawing once content.js has one (paint.drawing); until then a
     tiny paint window, made of the OS's own chrome, stands in. */
  const PAINT = C.paint || {};
  const PAINT_SCRIPT = '/paint.js';
  const paintTile = () => {
    const art = String(PAINT.drawing || '').trim();
    const note = typeof PAINT.note === 'string' ? PAINT.note : 'Old paint program. Still works.';
    const pic = art
      ? `<img src="${esc(webSrc(art))}" alt="" draggable="false" decoding="async" />`
      : `<span class="paint-mini pink">
          <span class="paint-mini-bar"><i></i><i></i><i></i></span>
          <span class="paint-mini-tools"><i></i><i></i><i></i><i></i></span>
          <span class="paint-mini-canvas">${doodleIcon('palette')}</span>
          <span class="paint-mini-colours"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </span>`;
    return `
      <li><button class="file-tile recycle-tile paint-tile" type="button" data-paint>
        <span class="tile-thumb paint-thumb${art ? ' has-art' : ''}">${pic}</span>
        <span class="tile-name">paint.exe</span>
        ${note ? `<span class="tile-sub">${esc(note)}</span>` : ''}
      </button></li>`;
  };
  const openPaint = (from) => {
    K.wm.open({
      id: 'paint',
      parent: 'trash',
      label: 'paint.exe',
      file: 'untitled - paint.exe',
      colour: 'pink',
      doodle: 'palette',
      size: [780, 700],
      minSize: [340, 440],
      render(win) {
        win.body.classList.add('pt-body');
        fillLater(win, {
          name: 'paint',
          script: PAINT_SCRIPT,
          label: 'paint.exe',
          wait: 'pt-loading',
          pic: () => doodleIcon('palette'),
          what: 'paint.exe',
        });
      },
      // Closing keeps the picture for next time (this visit).
      onClose(win) { if (K.paint) K.paint.unmount(win); },
    }, { from });
  };

  /* ══════════════════════════════════════════════════════════════════════
     TRASH  (the Recycle Bin: retired designs, never actually deleted)
     ══════════════════════════════════════════════════════════════════════
     Any screenshot dropped into assets/recycle/ shows up here, named after
     its file; a date in brackets, like "(June 2026)", sorts them. paint.exe
     sits after them. */
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const recycled = () => Object.keys((K.GEN && K.GEN.images) || {})
    .filter((k) => k.indexOf('assets/recycle/') === 0)
    .map((k) => {
      const name = k.split('/').pop().replace(/\.\w+$/, '');
      const m = name.match(/\(([a-z]+)\w*\s+(\d{4})\)/i);
      const when = m ? Number(m[2]) * 12 + Math.max(0, MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())) : 0;
      return { img: k, name, when };
    })
    .sort((a, b) => a.when - b.when || a.name.localeCompare(b.name));

  const trash = {
    label: 'Trash',
    colour: 'grey',
    icon: 'trash',
    path: '/trash',
    size: [820, 560],
    head: () => copy('trash', { heading: 'Recycle Bin', sub: "Old designs Andrew couldn't bring himself to delete." }),
    render(win) {
      const files = recycled();
      const items = files.length + 1; // and paint.exe
      win.menu.innerHTML = `<div class="win-toolbar"><button class="os-button" type="button" data-empty>${doodleIcon('alert')}Empty Recycle Bin</button></div>`;
      // The image viewer steps through the pictures only (paint.exe has none).
      win.body.innerHTML = `<ul class="folder-grid folder-grid--projects" data-viewer-set>${files.map((f) => `
          <li><button class="file-tile recycle-tile" type="button" data-full="${esc(largeSrc(f.img))}" data-img="${esc(f.img)}"
              data-file="${esc(slug(f.name))}.png" data-caption="${esc(f.name)}">
            <span class="tile-thumb"><img src="${esc(webSrc(f.img))}"${dims(f.img)} alt="${esc(f.name)}" loading="lazy" decoding="async" draggable="false" /></span>
            <span class="tile-name">${esc(f.name)}</span>
          </button></li>`).join('')}${paintTile()}</ul>`;
      K.openable(win.body, '.file-tile', (el) => (el.hasAttribute('data-paint') ? openPaint(el) : K.openViewer(el)));
      // A pointer on paint.exe starts fetching it, ready for the double-click.
      win.body.querySelector('[data-paint]').addEventListener('pointerenter', () => {
        loadScript('paint', PAINT_SCRIPT).catch(() => {}); // a failure shows (with Try again) when it opens
      }, { once: true });
      win.setStatus(`${plural(items, 'item')}${K.hint('Double-click to look back', 'Tap to look back')}`);
      win.menu.querySelector('[data-empty]').addEventListener('click', () => {
        K.dialog({
          title: 'Empty Recycle Bin',
          icon: 'alert',
          message: `Permanently delete ${plural(items, 'item')}? Andrew is sentimental about these.`,
          buttons: ['Keep them', 'Keep them'],
        }).then(() => win.setStatus(`${plural(items, 'item')}<span class="status-hint">Nothing was deleted. Obviously.</span>`));
      });
    },
  };

  K.apps = { about, coding, art, writing, certificates, games, trash };
  // Windows inside an app with an address of their own (kasai-os.js routes them).
  K.subWindows = { cv: CV };
})();

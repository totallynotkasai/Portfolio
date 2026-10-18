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
  const { esc, highlight, accent, plural, pad2, slug, doodleIcon, webSrc, largeSrc, dims, imgInfo, HEX, textOn } = K;

  // Each window's heading and line can be changed in content.js (os.windows).
  const copy = (id, fallback) => Object.assign({}, fallback, ((C.os && C.os.windows) || {})[id] || {});

  /* ══════════════════════════════════════════════════════════════════════
     THE IMAGE VIEWER  (art, certificates and the Trash all open in it)
     ══════════════════════════════════════════════════════════════════════
     Opens on any element with data-full (the big picture). Optional extras:
     data-file (title bar name), data-caption, data-colors ("#hex #hex"). */
  let fullCache = new Map(); // big pictures fetched on hover, ready for the click
  const warm = (src) => {
    if (!fullCache.has(src)) { const pre = new Image(); pre.src = src; fullCache.set(src, pre); }
    return fullCache.get(src);
  };
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-full]');
    if (t) warm(t.getAttribute('data-full'));
  }, { passive: true });

  K.openViewer = (t) => {
    const src = t.getAttribute('data-full');
    const thumb = t.querySelector('img');
    const alt = (thumb && thumb.alt) || t.getAttribute('data-caption') || '';
    const colors = (t.getAttribute('data-colors') || '').split(/\s+/).filter((c) => HEX.test(c));
    const ratio = thumb && thumb.naturalWidth ? thumb.naturalWidth / thumb.naturalHeight : 1;

    const show = () => {
      const win = K.wm.open({
        id: 'viewer',
        label: 'Image viewer',
        file: t.getAttribute('data-file') || alt || 'picture.png',
        colour: 'lavender',
        doodle: 'image',
        // Big enough for the picture, never bigger than the desktop.
        fit: { ratio, chrome: 112 },
        render(w) {
          w.body.classList.add('viewer-body');
          w.body.innerHTML = '<div class="viewer-canvas"><img class="viewer-img" alt="" /></div>';
        },
      }, { refit: true, from: t }); // closing it takes focus back to the card or file
      const img = win.body.querySelector('.viewer-img');
      delete img.dataset.fallback; // each picture gets its own broken-file fallback
      img.alt = alt;
      // Show the small copy at once (already loaded), then swap in the big one.
      img.src = (thumb && (thumb.currentSrc || thumb.src)) || src;
      const pre = warm(src);
      (pre.decode ? pre.decode() : Promise.resolve()).catch(() => {}).then(() => {
        if (win.body.contains(img) && img.alt === alt) img.src = src;
      });
      win.setTitle(t.getAttribute('data-file') || alt || 'picture.png');
      win.setStatus(
        (colors.length ? `<span class="viewer-swatches">${colors.map((c) => `<i style="--s:${c}"></i><code>${c}</code>`).join('')}</span>` : '') +
        `<span class="viewer-caption">${esc(t.getAttribute('data-caption') || alt)}</span>`);
      return img;
    };

    // The picture grows out of its card (a same-page view transition);
    // browsers without one simply open the window.
    if (K.REDUCE_MOTION || !document.startViewTransition || !thumb || !thumb.complete) { show(); return; }
    thumb.style.viewTransitionName = 'viewer-art';
    document.documentElement.classList.add('vt-viewer');
    const vt = document.startViewTransition(() => {
      thumb.style.viewTransitionName = '';
      const img = show();
      img.style.viewTransitionName = 'viewer-art';
    });
    vt.finished.catch(() => {}).then(() => {
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
    size: [860, 690],
    render(win) {
      const a = C.about || {};
      const ticker = Array.isArray(a.ticker) ? a.ticker : DEFAULT_TICKER;
      const photo = a.photo
        ? `<img src="${esc(webSrc(a.photo))}"${dims(a.photo)} alt="${esc(a.photoAlt || 'Photo')}" />`
        : `<span class="about-photo-empty">${doodleIcon('camera')}</span>`;
      const paras = (a.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('');
      win.body.innerHTML = `
        ${ticker.length ? `<div class="ticker" role="marquee" aria-label="What I do">
          <div class="marquee-content"><ul class="marquee-group">${ticker.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
        </div>` : ''}
        <div class="about">
          <div class="about-main">
            <h2 class="about-greeting" id="${win.headingId}" tabindex="-1">${highlight(a.heading || 'Hello')}</h2>
            ${a.subheading ? `<p class="about-subheading">${highlight(a.subheading)}</p>` : ''}
            <div class="about-text">${paras}</div>
            ${a.email ? `<p class="about-contact">
              <a class="os-button" href="mailto:${esc(a.email)}">${doodleIcon('mail')}Email me</a>
              <span class="about-email">${esc(a.email).replace('@', '<wbr>@')}</span>
            </p>` : ''}
          </div>
          <figure class="about-photo">
            <figcaption class="mini-bar"><span class="os-app" aria-hidden="true">${doodleIcon('image')}</span>me.png</figcaption>
            ${photo}
          </figure>
        </div>`;
      win.setStatus(a.signoff ? esc(a.signoff) : '');
    },
    // The ticker measures itself once the window is actually on screen.
    onShow(win) { K.setupMarquee(win.body.querySelector('.ticker')); },
    onResize(win) { K.setupMarquee(win.body.querySelector('.ticker')); },
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
  const statusLed = (busy) =>
    `<span class="os-led${busy ? ' is-busy' : ''}" aria-hidden="true"></span>${busy ? 'In progress' : 'Ready'}`;

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
        const shot = p.img
          ? `<img class="os-shot" src="${esc(webSrc(p.img))}"${dims(p.img)} alt="${esc(p.title || '')}" loading="lazy" decoding="async" draggable="false" />`
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
            <p class="os-desc">${esc(p.desc || '')}</p>
          </div>`;
        const links = (p.links || []).filter((l) => l && l.label)
          .map((l) => `<a href="${esc(l.url || '#')}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
        win.setStatus(`<span class="os-state">${statusLed(busy)}</span>${links ? `<span class="os-links">${links}</span>` : ''}`);
      },
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
            <span class="tile-meta"><span class="tile-file">${esc(file)}</span><span class="tile-state">${statusLed(busy)}</span></span>
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

  const artCard = (it, i, n) => {
    const info = imgInfo(it.img) || {};
    const picked = info.colors || [];
    const frame = HEX.test(it.frame) ? it.frame : picked[0];
    const chip = HEX.test(it.chip) ? it.chip : picked[1];
    let style = `--tilt:${[-2, 1.6, -0.8, 2.2, -1.4, 0.9][i % 6]}deg;`;
    if (frame) style += `--frame:${frame};--frame-ink:${textOn(frame)};`;
    if (chip) style += `--chip:${chip};--chip-ink:${textOn(chip)};`;
    const wide = info.w && info.h && info.w / info.h >= 1.25;
    const title = it.title || 'Untitled';
    const viewer = it.img
      ? ` data-full="${esc(largeSrc(it.full || it.img))}" data-file="${esc(artFileName(it))}"` +
        ` data-colors="${esc(picked.join(' '))}" data-caption="${esc(title + (it.tag ? ' · ' + it.tag : ''))}"` +
        ` tabindex="0" role="button" aria-label="View ${esc(title)} full size"`
      : '';
    return `
      <figure class="art-card${wide ? ' is-wide' : ''}" style="${style}" data-tag="${esc(it.tag || '')}"${viewer}>
        <div class="art-card-tilt">
          <div class="art-card-face">
            <span class="art-card-name">${esc(title)}</span>
            <div class="art-card-window">${it.img
              ? `<img src="${esc(webSrc(it.img))}"${dims(it.img)} alt="${esc(title)}" loading="lazy" decoding="async" draggable="false" />`
              : doodleIcon('palette')}</div>
            <p class="art-card-type"><span>${esc(it.tag || 'Art')}</span><img src="/assets/ui/favicon.png" alt="" /></p>
            <p class="art-card-foot" aria-hidden="true"><span>${pad2(i + 1)}/${pad2(n)}</span><span>Kasai</span></p>
            <span class="art-card-glint" aria-hidden="true"></span>
          </div>
        </div>
      </figure>`;
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
      win.body.innerHTML = `<div class="card-grid">${ART.map((it, i) => artCard(it, i, ART.length)).join('')}</div>`;
      const grid = win.body.querySelector('.card-grid');
      if (!K.REDUCE_MOTION) grid.querySelectorAll('.art-card').forEach(tiltCard);
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('[data-full]');
        if (card) K.openViewer(card);
      });
      grid.addEventListener('keydown', (e) => {
        const card = e.target.closest('[data-full]');
        if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); K.openViewer(card); }
      });
      win.setStatus(`<span class="binder-status">${esc(binderStatus(ART.length))}</span>`);

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
        K.glide(grid, { show: match });
        const shown = Array.prototype.filter.call(grid.children, match).length;
        said.textContent = 'Showing ' + shown + ' of ' + grid.children.length + ' pieces';
        win.setStatus(`<span class="binder-status">${esc(binderStatus(shown))}</span>`);
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
      size: [600, 400],
      render(win) {
        win.body.classList.add('paper-body');
        win.body.innerHTML = `
          <article class="paper">
            <span class="paper-hole" aria-hidden="true"></span>
            ${w.stamp ? `<span class="paper-stamp">${esc(w.stamp)}</span>` : ''}
            ${w.date ? `<p class="paper-date">${esc(w.date)}</p>` : ''}
            <h2 class="paper-title" id="${win.headingId}" tabindex="-1">${esc(title)}</h2>
            ${w.excerpt ? `<p class="paper-excerpt">${esc(w.excerpt)}</p>` : ''}
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
    size: [780, 520],
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
      win.body.innerHTML = `<ul class="folder-grid">${items.map((c) => {
        const title = c.title || 'Certificate';
        const meta = [c.issuer, c.date].filter(Boolean).map(esc).join(' · ');
        // The tile opens the scan; the credential link sits beside it, never inside.
        const tile = c.img
          ? `<button class="file-tile cert-tile ${accent(c.accent || 'pink')}" type="button" data-full="${esc(largeSrc(c.img))}"
               data-file="${esc(slug(title))}.png" data-caption="${esc(title + (meta ? ' · ' + [c.issuer, c.date].filter(Boolean).join(' · ') : ''))}">
               <span class="tile-thumb"><img src="${esc(webSrc(c.img))}"${dims(c.img)} alt="${esc(title)}" loading="lazy" decoding="async" draggable="false" /></span>
               <span class="tile-name">${esc(title)}</span>${meta ? `<span class="tile-sub">${meta}</span>` : ''}
             </button>`
          : `<div class="file-tile cert-tile ${accent(c.accent || 'pink')}">
               <span class="tile-thumb tile-thumb--icon">${doodleIcon(c.icon || 'cap')}</span>
               <span class="tile-name">${esc(title)}</span>${meta ? `<span class="tile-sub">${meta}</span>` : ''}
             </div>`;
        return `<li class="cert-file">${tile}${c.link
          ? `<a class="cert-credential" href="${esc(c.link)}" target="_blank" rel="noopener">View credential ${K.ARROW}</a>` : ''}</li>`;
      }).join('')}</ul>`;
      K.openable(win.body, 'button.cert-tile', (el) => K.openViewer(el));
      win.setStatus(`${plural(items.length, 'item')}${K.hint('Double-click to view', 'Tap to view')}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     GAMES  (a folder; Wizard Sweeper lives here)
     ══════════════════════════════════════════════════════════════════════
     The game is its own script, sweeper.js, fetched the first time it
     opens so the desktop never waits for it. The build stamps the address
     below with a version (like the page's own script links), so a
     returning visitor never gets a stale copy of the game. */
  const sleepyWizard = () => {
    if (K.pet && K.pet.frame) return K.pet.frame('asleep');
    const frames = (C.wizard && C.wizard.frames) || {};
    return frames.asleep ? webSrc(frames.asleep) : '';
  };
  let sweeperLoad = null;
  const loadSweeper = () => {
    if (K.sweeper) return Promise.resolve(K.sweeper);
    sweeperLoad = sweeperLoad || new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/sweeper.js';
      s.onload = () => (K.sweeper ? resolve(K.sweeper) : reject(new Error('sweeper.js loaded but did not start')));
      s.onerror = () => { s.remove(); reject(new Error('sweeper.js did not load')); };
      document.head.appendChild(s);
    }).catch((err) => { sweeperLoad = null; throw err; });
    return sweeperLoad;
  };
  const openSweeper = (from) => {
    K.wm.open({
      id: 'sweeper',
      parent: 'games',
      label: 'Wizard Sweeper',
      file: 'sweeper.exe',
      colour: 'ink',
      doodle: 'controller',
      size: [600, 680],
      minSize: [340, 420],
      render(win) {
        win.body.classList.add('sw-body');
        win.body.innerHTML = `<h2 class="vh" id="${win.headingId}" tabindex="-1">Wizard Sweeper</h2>
          <div class="sw-loading" role="status"></div>`;
        const wait = win.body.querySelector('.sw-loading');
        const start = () => {
          const pic = sleepyWizard();
          wait.innerHTML = `${pic ? `<img src="${esc(pic)}" alt="" />` : ''}<p>Loading Wizard Sweeper...</p>`;
          loadSweeper().then((game) => { if (wait.isConnected) game.mount(win); }).catch((err) => {
            console.error(err);
            if (!wait.isConnected) return; // the window was closed meanwhile
            wait.innerHTML = `<p>The game didn't load. Check your connection, then try again.</p>
              <button class="os-button" type="button">Try again</button>`;
            wait.querySelector('button').addEventListener('click', start);
          });
        };
        start();
      },
      // Closing keeps the run where it was, ready for next time.
      onClose(win) { if (K.sweeper) K.sweeper.unmount(win); },
    }, { from });
  };
  K.openSweeper = openSweeper; // a secret code opens it too (kasai-os.js)

  const games = {
    label: 'Games',
    colour: 'coral',
    icon: 'games',
    path: '/games',
    size: [620, 440],
    head: () => copy('games', { heading: 'Games', sub: 'Things to play when you should be working.' }),
    render(win) {
      win.body.innerHTML = `<ul class="folder-grid">
          <li><button class="file-tile game-tile" type="button" data-game="sweeper">
            <span class="tile-thumb tile-thumb--sprite">${sleepyWizard() ? `<img src="${esc(sleepyWizard())}" alt="" draggable="false" />` : doodleIcon('controller')}</span>
            <span class="tile-name">Wizard Sweeper</span>
            <span class="tile-sub">Don't wake the wizards</span>
          </button></li>
        </ul>`;
      K.openable(win.body, '.file-tile', (el) => openSweeper(el));
      win.setStatus(`1 game${K.hint('Double-click to play', 'Tap to play')}`);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     TRASH  (the Recycle Bin: retired designs, never actually deleted)
     ══════════════════════════════════════════════════════════════════════
     Any screenshot dropped into assets/recycle/ shows up here, named after
     its file; a date in brackets, like "(June 2026)", sorts them. */
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
      if (!files.length) {
        win.body.innerHTML = K.folderEmpty('folder', 'trash');
        win.setStatus('0 items');
        return;
      }
      win.menu.innerHTML = `<div class="win-toolbar"><button class="os-button" type="button" data-empty>${doodleIcon('alert')}Empty Recycle Bin</button></div>`;
      win.body.innerHTML = `<ul class="folder-grid folder-grid--projects">${files.map((f) => `
          <li><button class="file-tile recycle-tile" type="button" data-full="${esc(largeSrc(f.img))}"
              data-file="${esc(slug(f.name))}.png" data-caption="${esc(f.name)}">
            <span class="tile-thumb"><img src="${esc(webSrc(f.img))}"${dims(f.img)} alt="${esc(f.name)}" loading="lazy" decoding="async" draggable="false" /></span>
            <span class="tile-name">${esc(f.name)}</span>
          </button></li>`).join('')}</ul>`;
      K.openable(win.body, '.file-tile', (el) => K.openViewer(el));
      win.setStatus(`${plural(files.length, 'item')}${K.hint('Double-click to look back', 'Tap to look back')}`);
      win.menu.querySelector('[data-empty]').addEventListener('click', () => {
        K.dialog({
          title: 'Empty Recycle Bin',
          icon: 'alert',
          message: `Permanently delete ${plural(files.length, 'item')}? Andrew is sentimental about these.`,
          buttons: ['Keep them', 'Keep them'],
        }).then(() => win.setStatus(`${plural(files.length, 'item')}<span class="status-hint">Nothing was deleted. Obviously.</span>`));
      });
    },
  };

  K.apps = { about, coding, art, writing, certificates, games, trash };
})();

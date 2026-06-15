/* ════════════════════════════════════════════════════════════════════════
   Andrew Worgan PORTFOLIO — RENDERER + BEHAVIOURS
   ════════════════════════════════════════════════════════════════════════
   You do NOT need to edit this file. It reads everything from content.js and
   builds the pages, then wires up the menu, animations and image lightbox.
   To change what's on the site, edit  content.js  instead.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const C = window.CONTENT || {};
  const ACCENTS = ['lavender', 'blue', 'teal', 'yellow', 'pink'];

  // Placeholder shown if an image filename in content.js doesn't match a file,
  // so a typo gives a tidy graphic instead of a broken-image icon.
  window.__imgPH = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 18'>" +
    "<rect width='24' height='18' fill='#ECEEFC'/>" +
    "<rect x='3' y='3' width='18' height='12' rx='1.5' fill='none' stroke='#9DA5F3' stroke-width='1.2'/>" +
    "<circle cx='8.5' cy='7.5' r='1.7' fill='#9DA5F3'/>" +
    "<path d='M4.5 14.5 L10 8.5 L13 11.5 L16.5 7.5 L19.5 14.5 Z' fill='#9DA5F3'/>" +
    "</svg>"
  );
  // Swap any broken image for the placeholder above. One capture-phase listener
  // covers every current and future <img> (error events don't bubble), and keeps
  // the markup free of inline onerror attributes (CSP-friendly).
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = window.__imgPH;
    }
  }, true);

  /* ---------- tiny helpers ---------- */
  const $ = (sel) => document.querySelector(sel);

  // Escape text so stray < > & or quotes can't break the layout.
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Escape, then turn *word* into a yellow highlight.
  const highlight = (s) =>
    esc(s).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');

  const accent = (a) => (ACCENTS.indexOf(a) !== -1 ? a : 'lavender');

  // Which page are we on? Used for per-page wizard lines and empty-state copy.
  const PAGE_KEYS = {
    'index.html': 'index', '': 'index',
    'coding_projects.html': 'coding',
    'illustrations_and_graphics.html': 'art',
    'writing.html': 'writing',
    'certificates.html': 'certificates',
    '404.html': 'notfound',
  };
  const pageKey = () => {
    const file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    return PAGE_KEYS[file] || 'notfound';
  };

  // Show a helpful empty-state when a list has no items yet. The friendly
  // line comes from site.emptyStates in content.js (falls back to a default).
  const emptyState = (icon, what, key) => {
    const line = (C.site && C.site.emptyStates && C.site.emptyStates[key]) || '';
    return `<div class="empty-state">
       <div class="empty-state-icon">${icon}</div>
       <h3>Nothing here yet</h3>
       ${line ? `<p>${esc(line)}</p>` : ''}
       <p>Add your first ${esc(what)} in <code>content.js</code> and refresh.</p>
     </div>`;
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDERERS  (each only runs if its container is on the current page)
     ══════════════════════════════════════════════════════════════════════ */

  function renderAbout() {
    const hero = $('#about-hero');
    if (!hero || !C.about) return;
    const a = C.about;

    const photo = a.photo
      ? `<img class="about-photo" src="${esc(a.photo)}" alt="${esc(a.photoAlt || a.name || 'Photo')}" />`
      : `<div class="about-photo-placeholder">📷</div>`;

    const paras = (a.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('');
    const emailLine = a.email
      ? `<p>For inquiries: <a class="about-email" href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>`
      : '';

    hero.innerHTML = `
      <div class="about-head">
        ${a.eyebrow ? `<span class="about-eyebrow">${esc(a.eyebrow)}</span>` : ''}
        <h1 class="about-greeting">${highlight(a.heading || '')}</h1>
        ${a.subheading ? `<p class="about-subheading">${highlight(a.subheading)}</p>` : ''}
      </div>
      <div class="about-text">
        ${paras}
        ${emailLine}
      </div>
      <div class="about-photo-wrapper">${photo}</div>`;

    // "Other Pages" — chips that link to the rest of the site, each tinted
    // with its destination page's accent colour on hover.
    const pagesBox = $('#about-skills');
    if (pagesBox && (a.pages || []).length) {
      pagesBox.innerHTML = `
        ${a.pagesHeading ? `<h2 class="skills-heading">${esc(a.pagesHeading)}</h2>` : ''}
        <div class="skills-grid">
          ${a.pages
          .map((p) => `<a class="skill-tag ${accent(p.accent)}" href="${esc(p.url || '#')}">${esc(p.label || '')}</a>`)
          .join('')}
        </div>`;
    }

    // Sign-off (with an optional little wizard waving goodbye)
    const signoff = $('#about-signoff');
    if (signoff && a.signoff) {
      signoff.innerHTML = `<p>${esc(a.signoff)} ${a.signoffDoodle ? `<span class="doodle">${esc(a.signoffDoodle)}</span>` : ''
        }</p>
      ${a.signoffImg ? `<img class="signoff-wizard" src="${esc(a.signoffImg)}" alt="${esc(a.signoffImgAlt || '')}" loading="lazy" decoding="async" />` : ''}`;
    }
  }

  // Hand-drawn-style line icons for the "Currently…" card. Single colour
  // (currentColor) and chunky round strokes to match the 2.5px ink borders.
  const DOODLE_ICONS = {
    pencil: '<path d="M4 20l1.2-4.5L15.5 5.2a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.5 18.8 4 20z"/>',
    quill: '<path d="M20 4c-6 0-11 4-13 10l-2 6 6-2c6-2 10-7 9-14z"/><path d="M5 19 15 9"/>',
    hammer: '<path d="M3 21l8-8"/><path d="M11 7l4-4 6 6-4 4-6-6z"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2v14"/>',
    sprout: '<path d="M12 21v-7"/><path d="M12 14c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 14c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5z"/>',
    controller: '<rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M8 10.5v4M6 12.5h4"/><path d="M15.5 11.5h.01M18 13.5h.01"/>',
  };
  const doodleIcon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DOODLE_ICONS[name] || DOODLE_ICONS.pencil
    }</svg>`;

  // "Currently…" life-status card on the About page (about.currently).
  function renderCurrently() {
    const box = $('#about-currently');
    if (!box || !C.about) return;
    const items = C.about.currently || [];
    if (!items.length) return;
    box.innerHTML = `
      <div class="currently-card animate-on-scroll">
        <h2 class="currently-heading">${esc(C.about.currentlyHeading || 'Currently…')}</h2>
        <ul class="currently-list">
          ${items.map((it) => `
            <li>
              <span class="currently-icon">${doodleIcon(it.icon)}</span>
              <span class="currently-label">${esc(it.label || '')}</span>
              <span class="currently-value">${esc(it.value || '')}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  function renderArt() {
    const grid = $('#art-grid');
    if (!grid) return;
    const items = C.art || [];
    if (!items.length) { grid.innerHTML = emptyState('🎨', 'artwork', 'art'); return; }

    grid.innerHTML = items.map((it) => {
      const media = it.img
        ? `<div class="gallery-item-img"><img src="${esc(it.img)}" alt="${esc(it.title || '')}" loading="lazy" decoding="async" /></div>`
        : `<div class="gallery-item-img" style="display:flex;align-items:center;justify-content:center;font-size:2.6rem;">🎨</div>`;
      const full = it.full || it.img; // optional hi-res original for the lightbox
      return `
        <figure class="gallery-item animate-on-scroll" data-tag="${esc(it.tag || '')}"${it.img ? ` data-full="${esc(full)}" tabindex="0" role="button" aria-label="View ${esc(it.title || 'artwork')} full size"` : ''}>
          ${media}
          <figcaption class="gallery-item-cap">
            <h3>${esc(it.title || 'Untitled')}</h3>
            ${it.tag ? `<p>${esc(it.tag)}</p>` : ''}
          </figcaption>
        </figure>`;
    }).join('');
  }

  function renderCoding() {
    const grid = $('#coding-grid');
    if (!grid) return;
    const items = C.coding || [];
    if (!items.length) { grid.innerHTML = emptyState('💻', 'project', 'coding'); return; }

    grid.innerHTML = items.map((p) => {
      const img = p.img
        ? `<img class="project-card-image" src="${esc(p.img)}" alt="${esc(p.title || '')}" loading="lazy" decoding="async" />`
        : `<div class="project-card-image">💻</div>`;
      const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
      const links = (p.links || [])
        .filter((l) => l && l.label)
        .map((l) => `<a href="${esc(l.url || '#')}" target="_blank" rel="noopener">${esc(l.label)} →</a>`)
        .join('');
      return `
        <article class="project-card animate-on-scroll">
          ${img}
          <div class="project-card-body">
            <h3 class="project-card-title">${esc(p.title || 'Untitled project')}</h3>
            <p class="project-card-desc">${esc(p.desc || '')}</p>
            ${tags ? `<div class="project-card-tags">${tags}</div>` : ''}
            ${links ? `<div class="project-card-links">${links}</div>` : ''}
          </div>
        </article>`;
    }).join('');
  }

  function renderWriting() {
    const list = $('#writing-list');
    if (!list) return;
    const items = C.writing || [];
    if (!items.length) { list.innerHTML = emptyState('✍️', 'piece of writing', 'writing'); return; }

    // A card is only a link when it has a real destination — '#' or an empty
    // url renders as a plain card with a "coming soon" note instead of a dead click.
    list.innerHTML = items.map((w) => {
      const hasLink = w.url && w.url !== '#';
      const inner = `
        <span class="writing-card-accent ${accent(w.accent)}"></span>
        <div class="writing-card-content">
          ${w.date ? `<div class="writing-card-date">${esc(w.date)}</div>` : ''}
          <h3 class="writing-card-title">${esc(w.title || 'Untitled')}</h3>
          ${w.excerpt ? `<p class="writing-card-excerpt">${esc(w.excerpt)}</p>` : ''}
          <span class="read-more">${hasLink ? 'Read more →' : esc(w.status || 'Coming soon ✍️')}</span>
        </div>`;
      return hasLink
        ? `<a href="${esc(w.url)}" class="writing-card animate-on-scroll"${/^https?:/.test(w.url) ? ' target="_blank" rel="noopener"' : ''
        }>${inner}</a>`
        : `<div class="writing-card animate-on-scroll">${inner}</div>`;
    }).join('');
  }

  function renderCerts() {
    const grid = $('#cert-grid');
    if (!grid) return;
    const items = C.certificates || [];
    if (!items.length) { grid.innerHTML = emptyState('🎓', 'certificate', 'certificates'); return; }

    grid.innerHTML = items.map((c) => {
      const media = c.img
        ? `<div class="cert-thumb"><img src="${esc(c.img)}" alt="${esc(c.title || 'Certificate')}" loading="lazy" decoding="async" /></div>`
        : `<div class="cert-badge ${accent(c.accent)}">${esc(c.emoji || '🎓')}</div>`;
      const link = c.link
        ? `<a class="cert-link" href="${esc(c.link)}" target="_blank" rel="noopener">View credential →</a>`
        : '';
      return `
        <figure class="cert-card animate-on-scroll"${c.img ? ` data-full="${esc(c.img)}" tabindex="0" role="button" aria-label="View ${esc(c.title || 'certificate')} full size"` : ''}>
          ${media}
          <figcaption class="cert-info">
            <h3>${esc(c.title || 'Certificate')}</h3>
            ${c.issuer ? `<p>${esc(c.issuer)}</p>` : ''}
            ${c.date ? `<p class="cert-date">${esc(c.date)}</p>` : ''}
            ${link}
          </figcaption>
        </figure>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════════════
     BEHAVIOURS
     ══════════════════════════════════════════════════════════════════════ */

  function wireMobileNav() {
    const hamburger = $('.hamburger');
    const mobileNav = $('.mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
      mobileNav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach((link) =>
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
  }

  function markActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === current || (current === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  function wireScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => obs.observe(el));
  }

  // One lightbox for the whole site; opens on any element with [data-full].
  // Built on the native <dialog>: showModal() gives us the focus trap, Escape
  // handling, aria-modal semantics and the ::backdrop layer for free.
  function wireLightbox() {
    const triggers = document.querySelectorAll('[data-full]');
    if (!triggers.length) return;

    let box = $('#lightbox');
    if (!box) {
      box = document.createElement('dialog');
      box.className = 'lightbox';
      box.id = 'lightbox';
      box.setAttribute('aria-label', 'Image viewer');
      box.innerHTML =
        '<button class="lightbox-close" aria-label="Close">&times;</button>' +
        '<img id="lightbox-img" src="" alt="" />' +
        '<p class="lightbox-cap" id="lightbox-cap"></p>';
      document.body.appendChild(box);
    }
    const img = box.querySelector('#lightbox-img');
    const cap = box.querySelector('#lightbox-cap');
    const closeBtn = box.querySelector('.lightbox-close');

    const open = (src, alt) => {
      img.src = src; img.alt = alt || '';
      cap.textContent = alt || '';
      box.showModal();
      document.body.style.overflow = 'hidden';
    };

    triggers.forEach((t) => {
      t.style.cursor = "url('assets/ui/Pet Wizard Cursor default Hover OwO.png') 6 4, zoom-in";
      const fire = () => open(t.getAttribute('data-full'), t.querySelector('img')?.alt);
      t.addEventListener('click', fire);
      t.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
      });
    });
    closeBtn.addEventListener('click', () => box.close());
    // Click on the backdrop (outside the image/caption) closes too.
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
    // Single cleanup point — runs for Esc, close button and backdrop alike.
    box.addEventListener('close', () => {
      document.body.style.overflow = '';
      img.src = '';
    });
  }

  // Seamless rolling marquee: clone the authored group enough times to fill
  // the screen (an even number of copies) so translateX(-50%) never shows a gap.
  function setupMarquee() {
    document.querySelectorAll('.marquee-container').forEach((container) => {
      const content = container.querySelector('.marquee-content');
      const firstGroup = content && content.querySelector('.marquee-group');
      if (!content || !firstGroup) return;

      const groupHTML = firstGroup.outerHTML; // the phrases you authored
      const SPEED = 70; // pixels per second — lower is slower

      const build = () => {
        content.innerHTML = groupHTML; // one copy, to measure
        const groupW = content.firstElementChild.getBoundingClientRect().width;
        if (!groupW) return;
        const containerW = container.clientWidth || window.innerWidth;
        const half = Math.max(1, Math.ceil(containerW / groupW)); // copies to cover one screen
        const total = half * 2; // even => -50% lands on an identical copy

        content.innerHTML = new Array(total).fill(groupHTML).join('');
        Array.prototype.forEach.call(content.children, (g, i) => {
          if (i > 0) g.setAttribute('aria-hidden', 'true'); // clones aren't read twice
        });
        content.style.animationDuration = Math.max(8, (half * groupW) / SPEED) + 's';
      };

      build();
      // Re-measure once webfonts have loaded (their width differs from the fallback).
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(build, 200);
      });
    });
  }

  // Recolour the footer social icons via CSS mask so they always match the
  // palette. Each <img> becomes a <span> filled with currentColor; if this
  // never runs (JS off), the original <img> just stays as-is.
  function colorizeSocials() {
    document.querySelectorAll('.social-link img').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const span = document.createElement('span');
      span.className = 'social-ico';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--ico', `url("${src}")`);
      img.replaceWith(span);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     PERSONALITY & SIGNATURE FEATURES
     ══════════════════════════════════════════════════════════════════════ */

  // Filter chips + shuffle button above the art gallery, derived from the
  // unique `tag` values in content.js. Filtering toggles a class (no
  // re-render), so the lightbox wiring on each card survives untouched.
  function renderArtFilters() {
    const grid = $('#art-grid');
    if (!grid) return;
    const tags = [];
    (C.art || []).forEach((it) => {
      if (it.tag && tags.indexOf(it.tag) === -1) tags.push(it.tag);
    });
    if (tags.length < 2) return; // no point filtering one category

    const bar = document.createElement('div');
    bar.className = 'gallery-filters';
    bar.setAttribute('aria-label', 'Filter artwork by category');
    // Art page leans periwinkle — its chips skip the blue accent.
    const chipAccents = ['lavender', 'pink', 'teal', 'yellow'];
    bar.innerHTML =
      `<button class="skill-tag filter-chip lavender" data-tag="*" aria-pressed="true">All</button>` +
      tags.map((t, i) =>
        `<button class="skill-tag filter-chip ${chipAccents[i % chipAccents.length]}" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`
      ).join('') +
      `<button class="skill-tag filter-chip yellow" data-shuffle>🎲 Shuffle</button>` +
      `<span class="vh" role="status"></span>`;
    grid.parentElement.insertBefore(bar, grid);

    const status = bar.querySelector('[role="status"]');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // 🎲 Shuffle — reorder the existing DOM nodes (listeners survive).
      if (btn.hasAttribute('data-shuffle')) {
        const items = Array.prototype.slice.call(grid.children);
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = items[i]; items[i] = items[j]; items[j] = tmp;
        }
        items.forEach((el) => grid.append(el));
        status.textContent = 'Artwork shuffled';
        return;
      }

      // Category chips
      const tag = btn.getAttribute('data-tag');
      bar.querySelectorAll('[data-tag]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b === btn))
      );
      let shown = 0;
      Array.prototype.forEach.call(grid.children, (fig) => {
        const match = tag === '*' || fig.getAttribute('data-tag') === tag;
        fig.classList.toggle('filtered-out', !match);
        if (match) { shown++; fig.classList.add('visible'); }
      });
      status.textContent = 'Showing ' + shown + ' of ' + grid.children.length + ' pieces';
    });
  }

  // Small voice line under the footer (site.footerTagline in content.js).
  function renderFooterTagline() {
    const text = C.site && C.site.footerTagline;
    const inner = $('.footer-inner');
    if (!text || !inner) return;
    const p = document.createElement('p');
    p.className = 'footer-tagline';
    p.textContent = text;
    inner.insertAdjacentElement('afterend', p);
  }

  // A hello for anyone who opens DevTools (site.consoleMsg in content.js).
  function consoleEgg() {
    const msg = C.site && C.site.consoleMsg;
    if (!msg) return;
    try {
      console.log(
        '%c' +
        '    /\\\n' +
        '   /★ \\\n' +
        '  (o  o)\n' +
        '   \\__/\n\n' + msg,
        'font-family:monospace;background:#FEF6FE;color:#161A2E;padding:10px 14px;' +
        'border:2px solid #161A2E;border-radius:10px;line-height:1.7;display:inline-block;'
      );
    } catch (err) { /* consoles can be weird; never break the page over a joke */ }
  }

  // Tab title changes when you wander off (site.awayTitle), restored on return.
  function wireAwayTitle() {
    const away = C.site && C.site.awayTitle;
    if (!away) return;
    const original = document.title;
    document.addEventListener('visibilitychange', () => {
      document.title = document.hidden ? away : original;
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // THE PET WIZARD — resident mascot, bottom-right. Pet him. Go on.
  // All of his data (lines, frames, sleep timing) lives in content.js.
  // When content.js provides a 5-frame expression set he blinks, beams when
  // petted, and dozes off; otherwise he falls back to the single CSS image.
  // ─────────────────────────────────────────────────────────────────────
  function wireWizard() {
    const W = C.wizard;
    if (!W || !W.enabled || !W.image) return;
    const key = pageKey();
    const reduceMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Five hand-drawn expressions (idle / mid-blink / blink / happy / asleep).
    // Absent or incomplete → he just uses the single fallback image.
    const frames = (W.frames && W.frames.idle) ? W.frames : null;
    const startSrc = frames ? frames.idle : W.image;

    const buddy = document.createElement('div');
    buddy.className = 'wizard-buddy';
    buddy.innerHTML =
      '<div class="wizard-bubble" role="status" hidden></div>' +
      '<button class="wizard-sprite' + (frames ? ' wizard-sprite--frames' : '') +
      '" type="button" aria-label="Pet the wizard">' +
      `<img src="${esc(startSrc)}" alt="" decoding="async" />` +
      // The asleep frame has its own drawn-in "zzz", so the text badge is
      // only needed for the single-image fallback.
      (frames ? '' : '<span class="wizard-zzz" aria-hidden="true">zzz…</span>') +
      '</button>';
    document.body.appendChild(buddy);

    const btn = buddy.querySelector('.wizard-sprite');
    const bubble = buddy.querySelector('.wizard-bubble');
    const img = btn.querySelector('img');

    // Preload every frame so expression swaps never flash.
    if (frames) {
      Object.keys(frames).forEach((k) => { const pre = new Image(); pre.src = frames[k]; });
    }
    const setFrame = (name) => { if (frames) img.src = frames[name] || frames.idle; };

    let bubbleTimer;
    const say = (text, ms) => {
      if (!text) return;
      bubble.textContent = text;
      bubble.hidden = false;
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms || 2500);
    };

    // ── Expression state: 'idle' (may blink), 'happy' (just petted), 'asleep'.
    let mood = 'idle';

    // Idle blink — half-close → shut → half-open → open, on a loose timer.
    // Skipped under reduced motion (he simply keeps his eyes open).
    let blinkTimer = null;
    const stopBlink = () => { clearTimeout(blinkTimer); blinkTimer = null; };
    const scheduleBlink = () => {
      if (!frames || reduceMotion) return;
      stopBlink();
      blinkTimer = setTimeout(doBlink, 2800 + Math.random() * 4200);
    };
    function doBlink() {
      if (mood !== 'idle') { scheduleBlink(); return; }
      setFrame('half');
      setTimeout(() => { if (mood === 'idle') setFrame('blink'); }, 80);
      setTimeout(() => { if (mood === 'idle') setFrame('half'); }, 170);
      setTimeout(() => { if (mood === 'idle') { setFrame('idle'); scheduleBlink(); } }, 250);
    }

    // ── Sleep / wake. Falls asleep when ignored; any interaction wakes him.
    let sleepTimer;
    const sleep = () => {
      mood = 'asleep';
      stopBlink();
      btn.classList.add('asleep');
      setFrame('asleep');
    };
    const wake = () => {
      mood = 'idle';
      btn.classList.remove('asleep');
      setFrame('idle');
      scheduleBlink();
    };
    const rest = () => {
      if (mood === 'asleep') wake();
      clearTimeout(sleepTimer);
      sleepTimer = setTimeout(sleep, Math.max(10, W.sleepAfter || 60) * 1000);
    };
    rest();
    scheduleBlink();

    // Per-page greeting — except on "quiet" pages, where he waits to be asked.
    const lines = (W.lines || {})[key] || [];
    const quiet = (W.quietPages || []).indexOf(key) !== -1;
    if (lines.length && !quiet) {
      setTimeout(() => say(lines[Math.floor(Math.random() * lines.length)], 4000), 1200);
    }

    // The 10-pet reward: a brief flat-colour doodle rain. Under reduced
    // motion it becomes a simple ♥ in the bubble instead.
    const rain = () => {
      if (reduceMotion) { say('♥', 2000); return; }
      const chars = ['✦', '★', '♥', '✿', '☆'];
      const layer = document.createElement('div');
      layer.className = 'doodle-rain';
      layer.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 22; i++) {
        const d = document.createElement('span');
        d.textContent = chars[i % chars.length];
        d.style.left = (Math.random() * 100) + 'vw';
        d.style.animationDelay = (Math.random() * 0.9) + 's';
        d.style.animationDuration = (2 + Math.random() * 1.6) + 's';
        layer.appendChild(d);
      }
      document.body.appendChild(layer);
      setTimeout(() => layer.remove(), 5000);
    };

    let happyTimer;
    let pets = 0;
    btn.addEventListener('click', () => {
      const wasAsleep = mood === 'asleep';
      rest();
      if (wasAsleep) { say('…huh? oh. hello again.'); return; }

      pets++;
      btn.classList.remove('petted');
      void btn.offsetWidth; // restart the squish animation
      btn.classList.add('petted');

      // Beam for a moment, then settle back into the idle (blinking) loop.
      mood = 'happy';
      stopBlink();
      setFrame('happy');
      clearTimeout(happyTimer);
      happyTimer = setTimeout(() => {
        if (mood === 'happy') { mood = 'idle'; setFrame('idle'); scheduleBlink(); }
      }, 900);

      if (pets % 10 === 0) { say('DOODLE RAIN!!!', 4000); rain(); return; }
      // On quiet pages the first click delivers the page line instead.
      if (quiet && pets === 1 && lines.length) { say(lines[0], 3500); return; }
      const pl = W.petLines || [];
      if (pl.length) say(pl[(pets - 1) % pl.length], 1600);
    });
    btn.addEventListener('animationend', (e) => {
      if (e.animationName === 'wizard-squish') btn.classList.remove('petted');
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Build content from content.js
    renderAbout();
    renderCurrently();
    renderArt();
    renderArtFilters();
    renderCoding();
    renderWriting();
    renderCerts();
    renderFooterTagline();
    // 2) Wire interactions (after the content exists in the DOM)
    wireMobileNav();
    markActiveNav();
    wireScrollAnimations();
    wireLightbox();
    setupMarquee();
    colorizeSocials();
    wireWizard();
    wireAwayTitle();
    consoleEgg();
  });
})();

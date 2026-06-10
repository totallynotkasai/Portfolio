/* ════════════════════════════════════════════════════════════════════════
   KASAI PORTFOLIO — RENDERER + BEHAVIOURS
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

  // Show a helpful empty-state when a list has no items yet.
  const emptyState = (icon, what) =>
    `<div class="empty-state">
       <div class="empty-state-icon">${icon}</div>
       <h3>Nothing here yet</h3>
       <p>Add your first ${esc(what)} in <code>content.js</code> and refresh.</p>
     </div>`;

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

    // Sign-off
    const signoff = $('#about-signoff');
    if (signoff && a.signoff) {
      signoff.innerHTML = `<p>${esc(a.signoff)} ${
        a.signoffDoodle ? `<span class="doodle">${esc(a.signoffDoodle)}</span>` : ''
      }</p>`;
    }
  }

  function renderArt() {
    const grid = $('#art-grid');
    if (!grid) return;
    const items = C.art || [];
    if (!items.length) { grid.innerHTML = emptyState('🎨', 'artwork'); return; }

    grid.innerHTML = items.map((it) => {
      const media = it.img
        ? `<div class="gallery-item-img"><img src="${esc(it.img)}" alt="${esc(it.title || '')}" loading="lazy" decoding="async" /></div>`
        : `<div class="gallery-item-img" style="display:flex;align-items:center;justify-content:center;font-size:2.6rem;">🎨</div>`;
      const full = it.full || it.img; // optional hi-res original for the lightbox
      return `
        <figure class="gallery-item animate-on-scroll"${it.img ? ` data-full="${esc(full)}" tabindex="0" role="button" aria-label="View ${esc(it.title || 'artwork')} full size"` : ''}>
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
    if (!items.length) { grid.innerHTML = emptyState('💻', 'project'); return; }

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
    if (!items.length) { list.innerHTML = emptyState('✍️', 'piece of writing'); return; }

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
        ? `<a href="${esc(w.url)}" class="writing-card animate-on-scroll"${
            /^https?:/.test(w.url) ? ' target="_blank" rel="noopener"' : ''
          }>${inner}</a>`
        : `<div class="writing-card animate-on-scroll">${inner}</div>`;
    }).join('');
  }

  function renderCerts() {
    const grid = $('#cert-grid');
    if (!grid) return;
    const items = C.certificates || [];
    if (!items.length) { grid.innerHTML = emptyState('🎓', 'certificate'); return; }

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

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Build content from content.js
    renderAbout();
    renderArt();
    renderCoding();
    renderWriting();
    renderCerts();
    // 2) Wire interactions (after the content exists in the DOM)
    wireMobileNav();
    markActiveNav();
    wireScrollAnimations();
    wireLightbox();
    setupMarquee();
    colorizeSocials();
  });
})();

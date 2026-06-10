# Portfolio Panel Critique — Kasai / Andrew Worgan

> Reviewed June 2026 by a three-persona panel: **Creative Director (CD)**, **UI/UX Researcher (UX)**, and **Senior Frontend Developer (Dev)**.
> Scope: all five pages reviewed in source *and* rendered in a browser at desktop (1280px) and mobile (375px) widths. Console verified clean. Contrast ratios computed from your actual hex values. Cursor PNGs measured.

---

## 1. The Good — keep all of this

### Creative Director
- **The flat "pop" design system is real, and it's disciplined.** Hard-offset shadows (`--pop: 4px 4px 0 var(--ink)`), 2.5px ink borders, chunky radii, and a strict 5-accent palette with *zero* gradients. This reads as one person's hand, not a template. That's exactly what "bold and creative but functional" should look like.
- **Colour *is* your navigation metaphor.** Each page owns an accent (blue = Coding, lavender = Art, teal = Writing, pink = Certificates), echoed in the banner chip, the wave divider, and — the cleverest touch — the "Other Pages" chips on the About page that light up in their *destination's* colour on hover. That's genuine information design, not decoration.
- **The homepage hero is the strongest moment on the site.** Rotated "About me" chip, yellow `*highlight*` on your name, tilted photo that straightens on hover. It's confident and warm. The marquee gives it energy without a single frame of scroll-jacking.
- **Personality without friction.** Pet Wizard cursor, rotating brand mark, the `〰` wave language repeated from marquee to dividers. Memorable, fast, never in the way.

### UI/UX Researcher
- **Flat information architecture done right.** Five top-level pages, sticky header, pill-shaped active states. A recruiter can jump from an art gallery to a GitHub link in one click — the exact test a multi-disciplinary portfolio must pass.
- **You did accessibility work most hobby sites skip entirely:** `prefers-reduced-motion` kills the marquee and scroll animations, `:focus-visible` has an on-brand 3px blue ring, gallery/cert tiles are keyboard-operable (`tabindex="0"`, Enter/Space, `role="button"`, `aria-label`), Escape closes the lightbox, marquee clones get `aria-hidden`.
- **No friction traps.** No long intros, no autoplay sound, no scroll hijacking, sub-600ms animations. Hover pauses the marquee. This is "playful" implemented correctly.

### Senior Frontend Developer
- **`content.js` is a thoughtful mini-CMS.** One file, plain-English instructions, `esc()` HTML-escaping on every interpolation (you escaped XSS by *default* — most juniors don't), graceful empty states, and an SVG placeholder for broken image paths. The "you never touch the HTML" promise is mostly kept.
- **The JS is clean.** Strict-mode IIFE, render functions that no-op when their container is absent (one script, five pages, no dead work), `IntersectionObserver` with `unobserve` after firing, debounced marquee rebuild on resize, `loading="lazy"` + `decoding="async"` on every dynamic image, font-load-aware marquee re-measurement via `document.fonts.ready`. Zero console errors.
- **The CSS is a real design-token system** — custom properties for colour, type scale (`clamp()`), spacing, radii, shadows; Grid `auto-fill/minmax` for every collection. Scalable and modern.

**Panel consensus:** the foundation is genuinely good. Nothing below requires a rethink — it's finishing work.

---

## 2. The Critique

### 🔴 CRITICAL

**C1 — Placeholder content is live.** *(CD + UX)*
The Certificates page renders "**Your First Certificate / Issuer / Platform / MONTH YEAR**" to every visitor. The web novel card links to `#` (a dead click). Both coding projects ship the 💻 placeholder block and link to your GitHub *profile*, not their repos. For a portfolio, fake or dead trust signals are worse than fewer sections — a recruiter who clicks one `#` link stops clicking. **This single issue outweighs everything else in this document.**

**C2 — Massive unoptimised images.** *(Dev)*
`IMG_20250924_3201.png` (your About photo, the LCP element of the landing page) is **2.3 MB**. `assisted existence.png` is **1.27 MB**. No WebP/AVIF, no `srcset`. On hotel Wi-Fi or 4G, your strongest page feels broken. Target: the entire homepage under ~500 KB.

**C3 — Contrast failures (WCAG AA).** *(UX)*
Measured from your tokens:
- `--ink-muted` `#7E8198` on white ≈ **3.8:1** — fails the 4.5:1 minimum, and you use it at your *smallest* size (0.75rem uppercase: gallery tags, cert dates, writing dates).
- White text on `--blue` `#65A1FB` ≈ **2.6:1** — fails badly. Affects `.btn-primary`, the blue banner chip on the Coding page, and `.skill-tag.blue:hover`.

**C4 — No version control, no deploy story.** *(Dev)*
The folder isn't a git repo. Your "This Portfolio" card tells visitors you hand-built the site — but there's no public repo to prove it, and no host serving it. For a portfolio, **the repo is part of the portfolio.**

### 🟡 MODERATE

**M1 — Sub-pages lose the boldness.** *(CD)*
The homepage stacks marquee + hero + highlight + chips. The inner pages are a big centred title and one or two cards adrift in blush-coloured whitespace. The "bold" vibe drops off exactly where the work lives. (You've chosen to keep the marquee homepage-only — fine, it keeps the landing special — so the inner pages need their *own* devices: accent-tinted banner blocks, a tilted doodle sticker beside each H1. Snippets in §3.10.)

**M2 — JS-only content = blank link previews and a no-JS blind spot.** *(Dev)*
All five `<main>`s are built by JS. Google renders JS fine, but **there are no Open Graph / Twitter meta tags**, so pasting your link into LinkedIn, Discord, or iMessage shows a bare URL — and LinkedIn is the #1 referrer a portfolio gets. No-JS visitors (and some crawlers) see empty pages with no fallback message.

**M3 — Lightbox accessibility gaps.** *(UX)*
Escape works, but focus never moves into the lightbox, isn't trapped, and the page behind stays in the accessibility tree (no `aria-modal`/`inert`). There's also no caption and no prev/next. The native `<dialog>` element fixes the semantics for free (§3.6).

**M4 — The gallery crops your art.** *(CD)*
`.gallery-item-img` forces `aspect-ratio: 1/1` + `object-fit: cover`. Any portrait or wide piece gets amputated at thumbnail level — the level where a client decides whether to click. An illustrator's grid should respect the artwork's own proportions; uneven card heights are a feature (Niv's site does exactly this). *(You've confirmed this change — snippet in §3.7.)*

**M5 — The header/footer are hand-duplicated five times, and they've already drifted.** *(Dev)*
Desktop nav says "**Art**", mobile nav says "**Illustrations**". `index.html` hardcodes `class="active"` while `markActiveNav()` *also* sets it — two sources of truth. Every future nav change is five edits. (You don't need a framework for this — see §3.11 and the framework verdict.)

**M6 — Custom cursor: no hotspot, and it covers text.** *(UX)*
The cursor PNGs are 48×48 with no hotspot coordinates, so the *click point is the top-left corner of the image* — users are clicking with the edge of the wizard, and at 48px it obscures small targets like nav pills. It also replaces the I-beam over body text, which subtly damages the feeling of precision. Keep the wizard — just give it a hotspot and give prose its caret back (§3.8).

**M7 — Hamburger button announces nothing.** *(UX)*
No `aria-expanded`, no `aria-controls`. A screen-reader user can't tell the menu opened (§3.9).

### 🟢 MINOR

| # | Issue |
|---|---|
| m1 | `@import` for Inter *inside* style.css delays all rendering — move to `<link>` + `preconnect` in each `<head>` (§3.11). |
| m2 | Certificates page: pink banner, **yellow** wave divider — every other page matches its accent. Chip says "Learning" while the nav says "Certificates". |
| m3 | Writing page H1 "My Web Novels" vs subtitle "Stories, articles & creative writing" — pick the wider or narrower scope, not both. |
| m4 | `style="padding-top: var(--space-lg)"` is inlined on every sub-page — make it a `.section--tight` class. |
| m5 | Stale comment in style.css: "Fredoka = chunky, rounded, playful display face" — but the import is Inter and the display face is Arial Rounded MT Bold. Comments that lie are worse than no comments. |
| m6 | `wireSmoothAnchors()` is dead code — no `href="#…"` links exist on any page, and its hardcoded `- 90` doesn't match `--header-h: 78px`. CSS can do the whole job. |
| m7 | Inline `onerror="…"` attributes block you from ever adding a Content-Security-Policy. Attach the handler in JS instead. |
| m8 | favicon.png is 61 KB and 251×277 (not square) — browsers want square; ship 32/180/512 sizes. |
| m9 | Art, certs, cursors, and icons all live at the project root next to the code. An `assets/art/`, `assets/certs/`, `assets/ui/` split keeps the "drop the image in this folder" instruction sane at 30+ images. |
| m10 | The footer's `border-top: 2.5px solid var(--ink)` is invisible — ink on ink. Use periwinkle for an actual grounding line. |

### Panel verdicts

> **CD:** "Bold? Yes — on the homepage. The inner pages are a beautiful frame with almost no painting in it yet. Your bottleneck is not style, it's *content*: real certificates, real screenshots, real links. Fill the frame."
>
> **UX:** "Near-zero friction and genuine a11y effort — rare combination. Finish the job: fix the two contrast tokens, give the lightbox real dialog semantics, give the wizard a hotspot."
>
> **Dev:** "Cleanest hand-rolled vanilla stack I've reviewed in a while. Now behave like a senior about everything *around* the code: git repo, image budget, OG tags, kill the 5× duplication. **Do not add a framework** — React/Vue here would weaken your story; the hand-built one-file CMS *is* the flex. If duplication ever truly hurts, Eleventy (a build-time templater) is the ceiling. For 'more interactive', use platform features: `<dialog>`, View Transitions, scroll-driven animations — all progressive enhancements that cost 0 KB of runtime."

---

## 3. Actionable Refinements

Suggested order: **1 → 2 → 3 → 4 → 5** (the critical pass, ~an afternoon), then the rest as you like.

### 3.1 Contrast fixes — 4 lines *(fixes C3)*

```css
/* style.css :root — was #7E8198 (3.8:1, fails AA) */
--ink-muted: #5E6175;   /* ≈ 5.6:1 on white — passes AA */
```

White-on-blue fails at 2.6:1; ink-on-blue passes at ≈ 7:1 and honestly suits the flat-pop look better:

```css
.btn-primary { background: var(--blue); color: var(--ink); }
.page-banner.blue .banner-chip { background: var(--blue); color: var(--ink); }
.skill-tag.blue:hover { background: var(--blue); color: var(--ink); }
```

### 3.2 Image optimisation *(fixes C2)*

Easiest: drag each big image into [squoosh.app](https://squoosh.app) → WebP, quality ~80, resize longest edge to 1200px (1600px for the lightbox originals if you want). Or with `cwebp`:

```powershell
cwebp -q 80 -resize 800 0 "IMG_20250924_3201.png" -o "assets/about-photo.webp"
cwebp -q 82 -resize 1200 0 "assisted existence.png" -o "assets/art/assisted-existence.webp"
```

Then update the filenames in `content.js`. Expected result: ~3.5 MB → ~250–350 KB across the site. If you keep full-res originals for the lightbox, you'd add a `full:` field per art item and pass it to `data-full` in `renderArt()` — thumbnail loads the small file, click loads the big one.

### 3.3 Content honesty pass *(fixes C1 — highest value-per-minute on this list)*

In `content.js`:

```js
certificates: [
  // Empty list = the site shows its (nicely designed) empty state,
  // which is more honest than a fake card. Re-add when you have a real one:
  // { img: 'assets/certs/comptia-aplus.png', title: 'CompTIA A+',
  //   issuer: 'CompTIA', date: 'March 2026',
  //   link: 'https://www.credly.com/badges/…', accent: 'pink' },
],
```

- Point each coding project's link at the **actual repo** (`https://github.com/LittleKasai/filo`), not the profile.
- Add real screenshots to both project cards — even a cropped editor screenshot beats the 💻 block.
- The `#` writing link: until the novel is hosted somewhere, drop the `url` and render it as "Coming soon". One-line tweak in `renderWriting()`:

```js
// renderWriting(): only make it a link when there's a real destination
const isLink = w.url && w.url !== '#';
// use <a …> when isLink, otherwise <div class="writing-card">,
// and swap "Read more →" for "Re-write in progress ✍️"
```

### 3.4 OG / Twitter meta + no-JS fallback *(fixes M2)*

In every `<head>` (adjust title/description per page):

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Kasai — Andrew Worgan" />
<meta property="og:description" content="IT professional & hobbyist artist — coding projects, illustration, writing & certifications." />
<meta property="og:image" content="https://YOUR-DOMAIN/Logo Coloured.png" />
<meta name="twitter:card" content="summary_large_image" />
```

And just inside `<body>`:

```html
<noscript>
  <p style="padding:2rem;text-align:center;">
    This site needs JavaScript to show its content — or just email me:
    <a href="mailto:andrew.worgan@yahoo.co.uk">andrew.worgan@yahoo.co.uk</a>
  </p>
</noscript>
```

### 3.5 git + free hosting *(fixes C4)*

```powershell
cd "C:\Users\andre\My Files\Projects\Coding Projects\Portfolio"
git init
git add .
git commit -m "Initial commit: portfolio site"
# create repo "portfolio" on github.com/LittleKasai, then:
git remote add origin https://github.com/LittleKasai/portfolio.git
git push -u origin main
```

Then GitHub repo → Settings → Pages → deploy from `main` → site lives at `littlekasai.github.io/portfolio`. Update the "This Portfolio" card to link to the repo — now the card proves itself.

### 3.6 Lightbox → native `<dialog>` *(fixes M3)*

`showModal()` gives you focus trapping, Escape handling, `aria-modal`, and backdrop for free. Replace the lightbox creation in `wireLightbox()`:

```js
let box = $('#lightbox');
if (!box) {
  box = document.createElement('dialog');
  box.className = 'lightbox';
  box.id = 'lightbox';
  box.innerHTML =
    '<button class="lightbox-close" aria-label="Close">&times;</button>' +
    '<img id="lightbox-img" src="" alt="" />' +
    '<p id="lightbox-cap" class="lightbox-cap"></p>';
  document.body.appendChild(box);
}
const cap = box.querySelector('#lightbox-cap');

const open = (src, alt) => {
  img.src = src; img.alt = alt || '';
  cap.textContent = alt || '';
  box.showModal();                       // focus trap + Esc + aria-modal, free
  document.body.style.overflow = 'hidden';
};
const close = () => {
  box.close();
  document.body.style.overflow = '';
  img.src = '';
};
// keep: trigger wiring, closeBtn.addEventListener('click', close)
// replace the backdrop-click handler with:
box.addEventListener('click', (e) => { if (e.target === box) close(); });
box.addEventListener('close', () => { document.body.style.overflow = ''; });
// delete the document-level Escape listener — <dialog> handles it
```

CSS (replace the old `.lightbox` positioning):

```css
.lightbox {                       /* <dialog> centres itself */
  border: none; background: transparent; padding: 0;
  max-width: 92vw;
}
.lightbox::backdrop { background: var(--overlay); }
.lightbox-cap {
  margin-top: 0.6rem; text-align: center;
  font-family: var(--font-display); color: var(--white);
}
```

### 3.7 Natural-aspect-ratio gallery *(fixes M4 — confirmed direction)*

```css
.gallery-item-img {
  width: 100%;
  /* aspect-ratio: 1 / 1;  ← delete */
  overflow: hidden;
  background: var(--periwinkle-tint);
  border-bottom: 2.5px solid var(--ink);
}
.gallery-item-img img {
  width: 100%;
  height: auto;                /* was 100% + cover — cropped the art */
  object-fit: contain;
  transition: transform var(--transition-slow);
}
.gallery-grid { align-items: start; }   /* uneven heights sit naturally */
```

Cards now run uneven heights like Niv's gallery — the grid still aligns columns, and no artwork gets amputated. (Optional later: a CSS-columns masonry variant if the height variance gets extreme.)

### 3.8 Cursor hotspot + text caret *(fixes M6)*

The wizard's "tip" needs declared coordinates (tune `6 4` to where the wizard's point actually is in the 48×48 image), and prose should get the normal caret back:

```css
body { cursor: url('Pet Wizard Cursor OwO.png') 6 4, auto; }
a:hover, button {
  cursor: url('Pet Wizard Cursor default Hover OwO.png') 6 4, pointer;
}
p, h1, h2, h3, h4, li, blockquote { cursor: auto; }
```

And in `wireLightbox()`, add the same `6 4` to the inline zoom-cursor string.

### 3.9 Hamburger ARIA state *(fixes M7)*

```html
<button class="hamburger" id="hamburger" aria-label="Menu"
        aria-expanded="false" aria-controls="mobile-nav">
```

```js
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  mobileNav.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
```

### 3.10 Bring boldness to the sub-pages — without the marquee *(fixes M1)*

Two flat, on-system devices:

**a) Accent-tinted banner blocks** — the page banner becomes a colour moment instead of blush-on-blush:

```css
.page-banner { border-bottom: 2.5px solid var(--ink); }
.page-banner.blue     { background: var(--blue-tint); }
.page-banner.lavender { background: var(--periwinkle-tint); }
.page-banner.teal     { background: #E0F5F1; }   /* add --teal-tint to :root */
.page-banner.pink     { background: #FEEAF3; }   /* add --pink-tint to :root */
```

**b) A tilted doodle sticker beside each H1** — same language as your About chip:

```html
<h1>Projects <span class="h1-doodle" aria-hidden="true">💻</span></h1>
```

```css
.h1-doodle {
  display: inline-block; font-size: 0.55em;
  transform: rotate(8deg) translateY(-0.35em);
  padding: 0.12em 0.3em; background: var(--white);
  border: var(--border); border-radius: var(--radius-md);
  box-shadow: var(--pop);
}
```

Also: unify the nav label — pick "**Art**" in *both* desktop and mobile nav (mobile currently says "Illustrations").

### 3.11 Minor sweep checklist

```html
<!-- m1: in every <head>, replace the CSS @import -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

```css
/* m4: replace the inline padding-top on sub-pages */
.section--tight { padding-top: var(--space-lg); }

/* m6: delete wireSmoothAnchors() from script.js; this covers future #anchors */
:target, section[id] { scroll-margin-top: calc(var(--header-h) + 12px); }

/* m2: pink wave for the Certificates page (same SVG, stroke %23FB9DC4) */
.wave-divider.pink { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='22' viewBox='0 0 44 22'%3E%3Cpath d='M0 11 Q 11 -1 22 11 T 44 11' fill='none' stroke='%23FB9DC4' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E"); }

/* m10: visible footer grounding line */
.site-footer { border-top: 2.5px solid var(--periwinkle); }
```

```js
// m7: replace the inline ONERR attribute — drop ${ONERR} from templates and add once at boot:
document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && !e.target.dataset.fallback) {
    e.target.dataset.fallback = '1';
    e.target.src = window.__imgPH;
  }
}, true);   // capture: error events don't bubble
```

Plus: fix the "Fredoka" comment in style.css (m5), settle the Writing H1 (m3), match the Certificates chip label to the nav (m2), export a square favicon set (m8), and move images into `assets/` subfolders, updating paths in `content.js` (m9).

### Framework verdict (you asked)

**Stay vanilla.** For this site, a framework adds build complexity and subtracts from the story — "hand-built static site with a one-file content system" is a better senior-engineering signal than "another React portfolio". The interactive sparkle you want is already in the platform: `<dialog>` (§3.6), the **View Transitions API** for playful cross-page morphs (~5 lines, progressive enhancement), and **CSS scroll-driven animations** to replace the IntersectionObserver eventually. The one future exception: if hand-syncing five headers keeps biting you (it already did — M5), **Eleventy** templates the shared chrome at build time with zero runtime cost. That's the ceiling; nothing heavier earns its keep here.

---

*Everything in §2 was verified against the live render, not just the source: contrast ratios computed from your hex tokens, cursor files measured at 48×48, console confirmed clean, and all five pages screenshotted at desktop and mobile widths.*

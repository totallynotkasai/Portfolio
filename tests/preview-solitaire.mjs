// Local-only sample states. Generated files live in ignored dist/qa and
// are removed by the next production build; production has no debug API.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const out = new URL('dist/qa/', root);
await mkdir(out, { recursive: true });
const source = await readFile(new URL('solitaire.js', root), 'utf8');
const marker = 'K.solitaire = { mount, unmount };';
if (!source.includes(marker)) throw new Error('Solitaire preview entry point changed.');
const hook = `
  const stored = K.store;
  let sampleScores = {};
  K.store = { ...stored,
    get(key, fallback) { return key === STORE_KEY ? sampleScores : stored.get(key, fallback); },
    merge(key, fields) { if (key === STORE_KEY) Object.assign(sampleScores, fields); else stored.merge(key, fields); }
  };
  function sample(scenario) {
    if (run) run.recorded = true;
    newRun(415);
    clearTimeout(view.poseTimer);
    view.posed = '';
    view.help = false;
    view.scry = null;
    view.peek = false;
    if (scenario.startsWith('layout-')) {
      const id = Number(scenario.slice(7));
      Object.assign(run.spells, { wild: 2, fireball: 2, echo: 2, rewind: 2, moonlight: 1, scry: 2, undraw: 2, nudge: 2, dispel: 2 });
      run.next = prepareDeal({ n: 4, target: 1050, curses: LAYOUTS[id].sealGroups.length ? ['seal', 'hex'] : ['hex', 'toll'], hex: 1, layout: id });
      startDeal();
    } else if (scenario === 'last-card') {
      const d = run.deal, tip = layoutOf(d).tips[0].slot, card = d.slots[tip];
      const under = range(52).find((c) => Math.abs(rankOf(c) - rankOf(card)) === 1);
      const stock = range(52).find((c) => c !== card && c !== under);
      d.slots.fill(-1); d.slots[tip] = card; d.up.fill(true);
      d.pile = range(52).filter((c) => c !== card && c !== stock && c !== under).concat(under);
      Object.assign(d, { stock: [stock], score: 430, target: 700, peaks: 2 });
    } else if (['double', 'book', 'exhausted', 'last-reward', 'final', 'later-final'].includes(scenario)) {
      if (scenario === 'book') run.have.spellbook = 1;
      if (scenario === 'exhausted' || scenario === 'last-reward') {
        SPELL_IDS.forEach((id) => { run.spells[id] = mostOf(id); });
        CHARM_IDS.forEach((id) => { run.have[id] = CHARMS[id].most || 1; });
        run.hearts = run.max = 5;
        if (scenario === 'last-reward') run.spells.wild = 1;
      }
      if (scenario === 'later-final') run.mode = 'endless';
      Object.assign(run.deal, { n: scenario === 'final' ? 7 : scenario === 'later-final' ? 14 : 1,
        score: 680, target: 700, stock: [10] });
      run.deal.slots.fill(-1);
      endDeal(true);
    } else if (scenario === 'reward-preview') {
      run.deal.score = 900; endDeal(false);
    } else if (scenario !== 'new') {
      Object.assign(run, { mode: 'endless', n: 9, score: 6380, hearts: 2.5, longest: 10 });
      Object.assign(run.have, { kindred: 1, clover: 1, hearth: 1 });
      Object.assign(run.spells, { nudge: 2, dispel: 2, wild: 1, undraw: 1 });
      run.next = prepareDeal({ n: 9, target: 1870, curses: ['hex', 'toll'], hex: 1,
        layout: scenario === 'terraces' ? 2 : scenario === 'peaks' ? 0 : 1 });
      startDeal();
      Object.assign(run.deal, { score: 620, streak: 10, best: 10 });
      if (scenario.startsWith('glow')) run.deal.streak = Number(scenario.slice(4));
      if (scenario === 'half') {
        run.hearts = 3;
        Object.assign(run.deal, { target: 5000, score: 1200, stock: [], peaks: 3 });
        run.deal.slots.fill(-1);
        endDeal(true);
      } else if (scenario === 'charms' || scenario === 'spells') {
        if (scenario === 'charms') { run.have.clover = 0; run.have.hearth = 0; }
        run.deal.score = run.deal.target;
        endDeal(false);
      }
    }
    show([]);
    syncCard(false);
    primeFaces();
  }
  K.solitaire = { mount(win) { mount(win); if (!run) sample('layout-3'); }, unmount };
  const controls = document.createElement('nav');
  controls.className = 'solitaire-preview-controls';
  controls.setAttribute('aria-label', 'Local preview scenarios');
  const scenarios = [['double','Double rewards'], ['last-card','Play stock-bonus sweep'], ['book','Spellbook rewards'], ['last-reward','Last eligible reward'],
    ['exhausted','Exhausted rewards'], ['final','Won Final'], ['later-final','Endless Final'],
    ['new','New game'], ...LAYOUTS.map((l, i) => ['layout-'+i, l.name]), ['reward-preview','Single reward'],
    ['glow0','Streak 0'],['glow5','Streak 5'],['glow10','Streak 10'],['glow15','Streak 15'],
    ['half','Half-heart loss'],['charms','Charms'],['spells','Spells']];
  controls.innerHTML = '<strong>' + (RM ? 'Reduced motion fixture' : 'Isolated seeded review') + '</strong><span>Seed 415, real deck; sample scores are not saved.</span>' + scenarios.map(([id,label]) =>
    '<button type="button" data-scenario="'+id+'">'+label+'</button>').join('');
  controls.addEventListener('click', (e) => { const btn=e.target.closest('[data-scenario]'); if(btn && view) sample(btn.dataset.scenario); });
  document.body.appendChild(controls);
  const zoom = document.createElement('button');
  zoom.type = 'button'; zoom.textContent = 'CSS zoom 200%';
  zoom.addEventListener('click', () => {
    const on = document.documentElement.style.zoom !== '2';
    document.documentElement.style.zoom = on ? '2' : '';
    zoom.textContent = on ? 'CSS zoom 100%' : 'CSS zoom 200%';
  });
  controls.appendChild(zoom);
  const theme = document.createElement('button');
  theme.type = 'button'; theme.textContent = 'Toggle review theme';
  theme.addEventListener('click', () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; });
  controls.appendChild(theme);
  const inspect = document.createElement('button');
  inspect.type = 'button'; inspect.textContent = 'Inspect review state';
  const diagnostic = document.createElement('pre');
  diagnostic.className = 'solitaire-review-state';
  diagnostic.setAttribute('aria-label', 'Isolated review state');
  diagnostic.hidden = true;
  inspect.addEventListener('click', () => {
    if (!diagnostic.hidden) { diagnostic.hidden = true; return; }
    const b = run.reward, p = b && b.prepared;
    diagnostic.hidden = false;
    diagnostic.textContent = JSON.stringify({ step: run.step, seed: run.seed, score: run.score, n: run.n,
      break: b && { id: b.id, total: b.total, remaining: b.remaining, chosen: b.chosen, offer: b.offer, status: b.status },
      prepared: p && { id: p.id, version: p.rulesVersion, layout: p.layoutDefinition.id, deck: p.deck, resources: p.resources, charges: p.charges },
      live: { definition: run.deal.definition.id, table: run.deal.slots, pile: run.deal.pile, stock: run.deal.stock,
        charges: run.deal.charges, spells: run.spells, have: run.have, extra: run.extra }
    }, null, 2);
  });
  controls.appendChild(inspect); document.body.appendChild(diagnostic);
  K.openGame('solitaire');
`;
const reviewSource = source.replace('const RM = K.REDUCE_MOTION;', `const RM = K.REDUCE_MOTION || window.__SOLITAIRE_REVIEW_REDUCED__;
  if (RM) document.documentElement.classList.add('ss-preview-reduced');`);
await writeFile(new URL('solitaire-preview.js', out), reviewSource.replace(marker, hook));
let html = await readFile(new URL('about.html', root), 'utf8');
await writeFile(new URL('preferences.js', out), "window.__SOLITAIRE_REVIEW_REDUCED__ = new URL(location.href).searchParams.get('motion') === 'reduce';");
html = html.replace('<script src="/head.js">', '<script src="/dist/qa/preferences.js"></script><script src="/head.js">');
html = html.replace('</head>', '<link rel="stylesheet" href="/dist/qa/preview.css" /></head>')
  .replace('</body>', '<script src="/dist/qa/solitaire-preview.js"></script></body>');
// All portfolio scripts are deferred. Run the preview after them.
html = html.replace('<script src="/dist/qa/solitaire-preview.js">', '<script src="/dist/qa/solitaire-preview.js" defer>');
await writeFile(new URL('solitaire.html', out), html);
await writeFile(new URL('preview.css', out), `
.solitaire-preview-controls { position:fixed; inset:0 0 auto; z-index:99999; display:flex; flex-wrap:nowrap; overflow-x:auto; white-space:nowrap; align-items:center; gap:6px; padding:4px 8px; background:var(--surface); border-bottom:var(--border); font-size:12px; }
.os { top:48px !important; }
.ss-preview-reduced .ss *, .ss-preview-reduced #win-solitaire { animation:none !important; transition:none !important; }
.solitaire-preview-controls strong { margin-right:4px; }
.solitaire-preview-controls span { margin-right:12px; }
.solitaire-preview-controls button { padding:4px 8px; border:2px solid var(--ink); border-radius:6px; background:var(--yellow-tint); cursor:pointer; }
.solitaire-preview-controls button:focus-visible { outline:3px solid var(--periwinkle); }
.solitaire-review-state { position:fixed; inset:60px 8px auto auto; max-height:45vh; max-width:80vw; overflow:auto; z-index:99998; background:var(--surface); border:2px solid var(--ink); padding:8px; font-size:10px; pointer-events:none; }
@media (max-width:600px) { .solitaire-preview-controls { gap:4px; padding:4px; font-size:10px; } .solitaire-preview-controls span { display:none; } .solitaire-preview-controls button { padding:2px 4px; } }
`);
console.log('Solitaire sample preview: http://localhost:4321/dist/qa/solitaire');

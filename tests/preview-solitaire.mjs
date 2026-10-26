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
    if (scenario !== 'new') {
      Object.assign(run, { mode: 'endless', n: 9, score: 6380, hearts: 2.5, longest: 10 });
      Object.assign(run.have, { kindred: 1, clover: 1, hearth: 1 });
      Object.assign(run.spells, { nudge: 2, dispel: 2, wild: 1, undraw: 1 });
      run.next = { n: 9, target: 1870, curses: ['hex', 'toll'], hex: 1,
        layout: scenario === 'terraces' ? 2 : scenario === 'peaks' ? 0 : 1 };
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
        run.deal.over = true;
        run.deal.reached = true;
        run.step = 'pick';
        run.next = planOf(10);
        run.offer = scenario === 'charms' ? ['clover', 'hearth', 'dispel'] : ['nudge', 'dispel', 'clover'];
      }
    }
    show([]);
    syncCard(false);
    primeFaces();
  }
  K.solitaire = { mount(win) { mount(win); sample('gate'); }, unmount };
  const controls = document.createElement('nav');
  controls.className = 'solitaire-preview-controls';
  controls.setAttribute('aria-label', 'Local preview scenarios');
  const scenarios = [['new','New game'],['peaks','Three Peaks'],['gate','Starlit Gate'],['terraces','Terraces'],
    ['glow0','Streak 0'],['glow5','Streak 5'],['glow10','Streak 10'],['glow15','Streak 15'],
    ['half','Half-heart loss'],['charms','Charms'],['spells','Spells']];
  controls.innerHTML = '<strong>Local preview</strong><span>Sample scores are not saved.</span>' + scenarios.map(([id,label]) =>
    '<button type="button" data-scenario="'+id+'">'+label+'</button>').join('');
  controls.addEventListener('click', (e) => { const btn=e.target.closest('button'); if(btn && view) sample(btn.dataset.scenario); });
  document.body.appendChild(controls);
  K.openGame('solitaire');
`;
await writeFile(new URL('solitaire-preview.js', out), source.replace(marker, hook));
let html = await readFile(new URL('about.html', root), 'utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="/dist/qa/preview.css" /></head>')
  .replace('</body>', '<script src="/dist/qa/solitaire-preview.js"></script></body>');
// All portfolio scripts are deferred. Run the preview after them.
html = html.replace('<script src="/dist/qa/solitaire-preview.js">', '<script src="/dist/qa/solitaire-preview.js" defer>');
await writeFile(new URL('solitaire.html', out), html);
await writeFile(new URL('preview.css', out), `
.solitaire-preview-controls { position:fixed; inset:0 0 auto; z-index:99999; display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 12px; background:var(--surface); border-bottom:var(--border); font-size:12px; }
.solitaire-preview-controls strong { margin-right:4px; }
.solitaire-preview-controls span { margin-right:12px; }
.solitaire-preview-controls button { padding:4px 8px; border:2px solid var(--ink); border-radius:6px; background:var(--yellow-tint); cursor:pointer; }
.solitaire-preview-controls button:focus-visible { outline:3px solid var(--periwinkle); }
@media (max-width:600px) { .solitaire-preview-controls { gap:4px; padding:4px; font-size:10px; } .solitaire-preview-controls span { display:none; } .solitaire-preview-controls button { padding:2px 4px; } }
`);
console.log('Solitaire sample preview: http://localhost:4321/dist/qa/solitaire');

// Reproducible matched-deck comparison, never imported by the production app.
// node tests/measure-solitaire.mjs [seeds=400]
import { game, deal } from './helpers/solitaire.mjs';
const seeds = Number(process.argv[2] || 400);
const g = game();
const output = [];
for (const profile of ['plain', 'equipped', 'seal']) {
  for (let layout = 0; layout < g.LAYOUTS.length; layout++) {
    const l = g.LAYOUTS[layout];
    if (profile === 'seal' && !l.sealGroups.length) continue;
    const sum = { score: 0, chain: 0, sweep: 0, target: 0, peaks: 0, played: 0, frontier: 0, moves: 0, samples: 0, peakAt: 0, peakEvents: 0 };
    for (let seed = 1; seed <= seeds; seed++) {
      g.run.recorded = true; g.newRun(seed);
      if (profile === 'equipped') {
        Object.assign(g.run.have, { ember: 1, twin: 1, kindred: 1, clover: 1, crystal: 1, deck: 1 });
        for (const id of Object.keys(g.SPELLS)) g.run.spells[id] = 1;
      }
      const d = deal(g, layout, profile === 'seal' ? ['seal'] : profile === 'equipped' ? ['hex', 'toll'] : [], profile === 'equipped' ? 7 : 4);
      d.target = profile === 'equipped' ? 1600 : 1050;
      let turns = 0, played = 0;
      const utility = (i) => {
        const released = l.slots[i].under.filter((j) => d.slots[j] >= 0 && l.slots[j].over.every((k) => k === i || d.slots[k] < 0)).length;
        // Only exposed ranks enter the policy. Covered ranks are not read.
        const rank = d.slots[i] % 13;
        const next = g.opens(d).filter((j) => j !== i && [1, 12].includes(Math.abs(d.slots[j] % 13 - rank))).length;
        return released * 3 + next * 2 + (l.tips.some((t) => t.slot === i) ? 2 : 0);
      };
      const best = (list) => Array.from(list).sort((a, b) => utility(b) - utility(a) || a - b)[0];
      while (!d.over && turns++ < 180) {
        const moves = g.movesOf();
        sum.frontier += g.opens(d).length; sum.moves += moves.length; sum.samples++;
        let ev;
        if (moves.length) { ev = g.play(best(moves)); played++; }
        else if (d.charges.dispel && d.curses.length) ev = g.cast('dispel', d.curses.includes('hex') ? 'hex' : d.curses[0]);
        else if (d.charges.nudge && g.opens(d).some((i) => [0, 2, 11].includes(Math.abs(d.slots[i] % 13 - g.pileFace(d) % 13)))) {
          const rank = g.pileFace(d) % 13;
          const plus = g.opens(d).some((i) => [1, 12].includes(Math.abs(d.slots[i] % 13 - (rank + 1) % 13)));
          ev = g.cast('nudge', plus ? 1 : -1);
        } else if (d.charges.echo && d.stock.length) ev = g.cast('echo');
        else if (d.stock.length || d.refills && d.pile.length > 1) ev = g.draw(false);
        else if (d.charges.wild && g.opens(d).length) { ev = g.cast('wild', best(g.opens(d))); played++; }
        else if (d.charges.fireball && g.opens(d).length) ev = g.cast('fireball', best(g.opens(d)));
        else { g.endDeal(false); break; }
        for (const e of ev || []) if (e.t === 'peak') { sum.peakAt += played; sum.peakEvents++; }
      }
      if (!d.over) throw new Error(`Policy failed to terminate: ${l.name}, seed ${seed}`);
      sum.score += d.score; sum.chain += d.best; sum.sweep += +d.swept;
      sum.target += +(d.reached || d.score >= d.target); sum.peaks += d.peaks; sum.played += played;
    }
    const round = (v) => Math.round(v * 100) / 100;
    output.push({ profile, layout: l.name, tips: l.tips.length, initial: l.slots.filter((s) => !s.over.length).length,
      frontier: round(sum.frontier / sum.samples), moves: round(sum.moves / sum.samples), longest: round(sum.chain / seeds),
      peaks: round(sum.peaks / seeds), peaksPer100Plays: round(sum.peaks / sum.played * 100), meanPeakPlayIndex: round(sum.peakAt / sum.peakEvents),
      score: round(sum.score / seeds), sweepPct: round(sum.sweep / seeds * 100), targetPct: round(sum.target / seeds * 100) });
  }
}
const selection = { deals: 0, layouts: {}, peakCounts: {}, incompatibleSeal: 0, immediateRepeats: 0 };
for (let seed = 1; seed <= 100; seed++) {
  g.run.recorded = true; g.newRun(seed);
  for (let n = 2; n <= 51; n++) {
    const p = g.planOf(n), l = g.LAYOUTS[p.layout];
    selection.deals++;
    selection.layouts[l.name] = (selection.layouts[l.name] || 0) + 1;
    selection.peakCounts[l.tips.length] = (selection.peakCounts[l.tips.length] || 0) + 1;
    selection.incompatibleSeal += +(p.curses.includes('seal') && !l.sealGroups.length);
    selection.immediateRepeats += +(p.layout === g.run.deal.layout);
    g.run.next = p; g.startDeal();
  }
}
console.log(JSON.stringify({ seeds, policy: 'exposed-card structural greedy; no search, hidden-rank peeking or rerolls', output, selection }, null, 2));

# Phase 4 Solitaire layout review — 27 October 2026

Implemented on the existing `codex/content-expansion` checkout. The recorded Phase 3 baseline is 48 tests. This phase changes layout foundations, selection and presentation; targets, deck size, stock economy, spells, charms, settlement, reward count and persistence conventions retain their existing rules. Phases 5–7 and 9 have not been implemented. Hat to Hat remains separate.

## Layouts and rule boundaries

| Layout | Peaks | Cards in successive levels | Initial open frontier | Seal |
| --- | ---: | --- | ---: | --- |
| Three Peaks | 3 | 3, 6, 9, 10 | 10 | Original central three cards; West/East Peak guards |
| Starlit Gate | 3 | 3, 6, 8, 11 | 11 | Original central three cards; West/East Peak guards |
| Terraces | 3 | 3, 6, 10, 9 | 9 | Original central three cards; West/East Peak guards |
| Crown | 1 | 1, 9, 9, 9 | 9 | Ineligible |
| Crescent | 2 | 2, 8, 9, 9 | 9 | Ineligible |
| Forked Paths | 4 | 4, 6, 9, 9 | 9 | West Central Summit; West/East Summit guards |
| Five Towers | 5 | 5, 6, 8, 8, 1 | 8 | West Central Tower; West/East Tower guards |

All have 28 table slots, a 52-card deck, one opening pile card and 23 initial stock cards before Moths. The existing Moths reduction and Second Deck refill remain intact. Existing coordinates and coverage are preserved for all three familiar layouts. Five Towers has one deeper western route; seven other cards are exposed above its final level, so depth does not imply a single bottom-only frontier.

Each descriptor has a stable ID, coordinates, explicit `over` adjacency, derived inverse `under`, named tip slot IDs, width, depth, row spacing and optional Seal groups. Validation rejects duplicate coordinates, wrong dimensions/IDs, incorrect or duplicate tips, invalid inverse edges, cycles and unreachable/orphan cards. It proves each guard's coverage path avoids every lock, then structurally removes the whole board with all locks active to detect combined deadlocks. Guards must be two distinct named unsealed tips; a lock group must contain a protected tip. A regression permutes all slot IDs, including tips and guards, to prove rules do not depend on tips occupying slots 0–4.

`removeCard(deal, slot, charms, action)` is an isolated deterministic transition used by real Play, Wild and Fireball. It validates legality, snapshots the supplied deal, applies card/streak scoring, uncovers cards, awards peaks, releases Seal and records reaching the target. It mutates only that deal. Scoring accepts explicit charms; graph queries and keyboard navigation accept a deal. Clone/live replay is tested. Run-level resources, randomness, other spells, settlement and persistence still use the existing live orchestration. This is a foundation for future search, not a contract solver or an immutable next-deal system.

Peak awards are 100 for each non-final tip and 250 for the final remaining tip. Totals are 250 / 350 / 450 / 550 / 650; Twin Peaks doubles every award. Sweep settlement still requires all 28 cards removed. Rewind restores score, streak, peak count, locks and board state while retaining seen faces and spent charges; Undraw retains its existing bottom-of-stock/Toll/streak convention.

Layout is selected before compatible curses. Deal one remains Three Peaks with no spells/curses. Later deals choose among all seven layouts without an immediate layout repeat. Early cursed deals retain three distinct curses; unsupported Seal is replaced from the compatible unused pool. Final pairs still exclude Broken Circle + Moths. Endless single curses avoid immediately repeating the previous single curse. Changes necessarily alter later historical seed outcomes; identical seeds remain reproducible under these rules.

## Reproducible measurements

Run `node tests/measure-solitaire.mjs 400`. Raw results are tracked in `tests/solitaire-measurements.json`. The script uses seeds 1–400 with identical table/pile/stock orders across layouts, real rule actions and no hidden-rank peeking, rerolls or solution search. It favors structural releases, exposed rank continuations and tips. This is one deliberately simple policy, not a winning-probability oracle.

There are **7,600 controlled deals**: seven layouts × 400 for plain and equipped profiles, plus five Seal-compatible layouts × 400. Separate selection checks cover 5,000 planned deals (seeds 1–100, deals 2–51). Means include failed deals. Scores include ordinary peak/stock settlement, exclude the run-completion bonus, and target success respects the existing sticky reached-target flag. Frontier and moves are sampled before each action, including draws; longest is mean best scored streak per deal. Peaks/100 plays includes Wild plays and peak awards earned by Fireball.

### Plain: no spells/charms/curses; target 1,050

| Layout | Mean frontier | Mean legal moves | Best streak | Peaks/deal | Peaks/100 plays | Mean score | Sweeps | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Three Peaks | 4.92 | 0.86 | 6.48 | 2.24 | 8.39 | 985.75 | 46.00% | 43.25% |
| Starlit Gate | 5.01 | 0.87 | 6.82 | 2.30 | 8.53 | 1,023.95 | 46.25% | 46.25% |
| Terraces | 4.99 | 0.87 | 6.82 | 2.29 | 8.51 | 1,030.40 | 50.25% | 49.25% |
| Crown | 4.99 | 0.87 | 6.66 | 0.50 | 1.84 | 843.73 | 49.50% | 25.25% |
| Crescent | 4.88 | 0.85 | 6.50 | 1.26 | 4.73 | 890.58 | 46.50% | 33.00% |
| Forked Paths | 4.74 | 0.83 | 6.41 | 3.02 | 11.42 | 1,044.63 | 45.00% | 49.25% |
| Five Towers | 4.60 | 0.80 | 6.14 | 3.86 | 14.66 | 1,090.05 | 41.00% | 49.00% |

### Equipped: target 1,600; Hex + Toll

One of each spell is available; Ember, Twin Peaks, Kindred, Clover, Crystal Ball and Second Deck are owned. The policy uses Dispel, Nudge, Echo, Wild and Fireball, with an existing refill when needed. It does not strategically exploit Scry, Moonlight, Rewind or Undraw. Providing resources is not a claim of optimal use of all nine spells.

| Layout | Frontier | Moves | Best streak | Peaks/100 plays | Mean score | Sweeps | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Three Peaks | 4.61 | 0.77 | 8.11 | 10.67 | 2,060.71 | 98.50% | 87.25% |
| Starlit Gate | 4.71 | 0.78 | 8.54 | 10.72 | 2,118.69 | 100.00% | 87.75% |
| Terraces | 4.74 | 0.79 | 8.26 | 10.67 | 2,092.85 | 98.00% | 88.50% |
| Crown | 4.73 | 0.80 | 8.36 | 3.57 | 1,751.68 | 100.00% | 57.00% |
| Crescent | 4.58 | 0.77 | 8.05 | 7.14 | 1,861.18 | 99.75% | 72.75% |
| Forked Paths | 4.43 | 0.74 | 7.87 | 14.27 | 2,208.68 | 98.75% | 94.50% |
| Five Towers | 4.27 | 0.72 | 7.32 | 17.80 | 2,332.20 | 97.75% | 97.50% |

### Seal only: no spells/charms; target 1,050

| Layout | Frontier | Moves | Best streak | Peaks/100 plays | Mean score | Sweeps | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Three Peaks | 4.54 | 0.79 | 6.21 | 6.14 | 759.03 | 13.00% | 12.25% |
| Starlit Gate | 4.55 | 0.79 | 6.41 | 6.15 | 763.60 | 11.25% | 12.50% |
| Terraces | 4.51 | 0.78 | 6.39 | 6.05 | 760.83 | 11.25% | 14.00% |
| Forked Paths | 4.64 | 0.82 | 6.40 | 10.30 | 969.63 | 33.00% | 37.50% |
| Five Towers | 4.48 | 0.78 | 6.10 | 13.23 | 995.10 | 26.75% | 37.25% |

These are structural locks with legal release paths, not promises that every rank deal is winnable. The preserved three-card reference Seal is substantially harsher than the new single-tip groups without spell support.

### Revision and interpretation

The first Forked Paths graph (4, 4, 6, 7, 7) and Five Towers graph (5, 5, 6, 6, 6) were rejected. At 400 plain matched seeds, they averaged streaks 5.50 / 5.13, sweeps 22% / 15.25%, and scores 799.68 / 782.25. Their frequent awards did not compensate sufficiently for narrow deep routes. The revised graphs broaden the frontier and shorten most routes while retaining Five Towers' deeper western route. New separated levels and explicit connection lines also avoid a misleading physical-overlap silhouette.

The final prototypes support the intended broad-front versus frequent-peak tradeoff. Crown has longer measured chains and more sweeps than Five Towers, but fewer peak points and lower target success. Five Towers scores more, especially with Twin Peaks, while retaining a chain/sweep disadvantage. No layout leads every measured property across all profiles. Fewer peaks do **not** automatically mean longer streaks: Starlit Gate and Terraces exceed Crown's plain-chain mean, and Crescent is close to Three Peaks. These small mean differences are not a causal proof about peak count.

Targets and reward rules have not been handicapped per layout. Crown's lower target success is an explicit consequence of the approved lower peak total. Broader tuning belongs with later enchantment/reward changes and additional play evidence; these results do not justify silently normalizing peak totals or implementing double rewards early.

The 5,000 selection deals produced counts 1/2/3/4/5 at **691 / 729 / 2,126 / 716 / 738** (13.82 / 14.58 / 42.52 / 14.32 / 14.76%). There were **zero immediate layout repeats and zero incompatible Seals**. Three peaks is more common because the three preserved layouts each remain in the equally weighted seven-layout pool; adjacent deals may share a peak count while changing layout.

## Browser and interaction review

The isolated generator is `node tests/preview-solitaire.mjs`. It writes disposable files only into `dist/qa/`, uses real seed 415 and real shuffled cards, supplies clearly labelled review resources, and isolates score storage. Its toolbar has no production counterpart. `?motion=reduce` captures a fixture preference before normal app navigation, disables JavaScript effects and CSS transitions/animations, and labels that mode. CSS zoom and theme buttons alter only the review page. The final production build removes the generated fixtures.

Actual in-app browser interactions exercised all five counts at **1280×800, 390×844 and 320×740**. All seven layouts were visually reviewed on desktop. They covered legal plays/draws, Home/End/Left/Right, vertical movement on the five-level graph, focus-driven board scrolling, ranks and suit symbols, numbered tip badges, Hex edges, Seal markers and the expandable spatial-name/guard legend. An all-nine-spell loadout exposed a 320px dock problem; compact labelled icon/charge controls fixed it. Covered Moonlight faces now place both rank and suit in their visible strip, and lock markers reserve their own space. The original coverage graphs remain unchanged.

All five counts were played through ordinary stock exhaustion/settlement in the real phone UI with seed 415; this simple first-legal-card play deliberately left spells unused. Additional phone interactions cast Wild and Fireball through keyboard targeting, Rewind each, Echo then Undraw, Dispel Seal, Scry with a keyboard swap (9 Leaves ahead of 8 Moons), Nudge upward to 2 Moons, and Moonlight. Spent charges, restoration, pile rank/suit and the removal of G/Seal instructions were observed. Real between-deal screens showed the correct next peak count, miniature graph and spatial tip names. Single-pick settlement remains unchanged; final/endless settlement and stock-bonus qualification have rule regressions.

New graphs use non-overlapping rows with a line for every legal blocking edge. Measured browser card rectangles and SVG view boxes placed all endpoints within **0.03px on desktop / 0.02px at 320px**, across 43 Crown, 42 Crescent, 40 Forked Paths and 39 Five Towers edges. Connections disappear when either endpoint leaves. This checks actual geometry in addition to graph validation.

Light and dark themes were reviewed. All five counts accepted keyboard movement, a legal play and a draw at a **640×400 CSS viewport** (the layout space corresponding to 200% on 1280×800), and at an explicit **200% CSS zoom** fixture (72px rendered cards from a 36px minimum). A short-height collapse found during this check was fixed with a minimum game height and scrolling inside the window. Board scrolling begins at the exposed frontier after the dock becomes visible. Narrow boards pan horizontally, and short/high-zoom windows scroll vertically; ranks are kept readable instead of shrinking everything into one silhouette. The tip-name legend expands on demand so long guard names do not consume the play area.

Review-toolbar clicks initially dispatched undefined scenarios for the new theme/zoom buttons; the development-only handler was corrected to require `data-scenario`. Final fresh-page diagnostics and production diagnostics are recorded in the canonical checklist after the final build.

## Verification limits

- Browser play was agent-directed and partly scripted. No separate human playtest or Andrew's subjective geometry approval is claimed.
- Phone sizes are viewport overrides, not physical handsets. Pointer clicks and keyboard checks do not establish physical touch/swipe feel, hardware zoom or screen-reader usability.
- Reduced motion used a labelled JS/CSS fixture, not an OS preference toggle. It exercises the existing reduced-motion action paths; native interruption was not reverified.
- Native browser access timed out waiting for computer-use approval before a native zoom action could occur. CSS zoom and equivalent viewport checks are concrete separate checks, not a claim that native browser zoom was verified.
- The deterministic greedy policy is reproducible but not optimal, and the profiles do not represent every run's resource history or future double rewards/enchantments/contracts. No probability-of-solvability claim is made.
- On narrow/short views, the whole graph is intentionally scrollable. Every card and control is reachable; all 28 cards, all names and all nine spells are not promised to fit simultaneously.

These are technical verification limits, not a request for another scope approval or authorization to start Phase 5.

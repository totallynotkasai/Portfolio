# Phase 5 Solitaire rewards and prepared deals — 27 October 2026

Completed on the existing `codex/content-expansion` checkout after clean commit `4d4e9f4`. This continuation ends after Phase 5. No contracts, enchantments, solver, score-record migration, music integration or Phase 9 integration were added. Art/writing content and the accepted Starweave concept remain unchanged; Hat to Hat remains separate.

## Settlement and resources

Settlement still runs once per live deal (`over` guards it). It awards ordinary leftover-stock points before deciding whether the target was made, retains the sticky reached-target convention after Toll, and preserves healing, Hearthstone, half-heart under-target sweeps, full-heart unswept misses and Final Deal bonuses/losses. A sweep still means all 28 table cards removed. A settled sweep that made its target grants two selections; every other continuing result grants one, and terminal losses grant none.

Each break holds an independent prospective loadout. The first choice updates it before generating a new second offer. Exact chosen reward IDs are excluded for the rest of that break, including repeatable spells and charms. Two spell candidates plus one charm remain the preferred offer shape, with fallback filling and fewer than three candidates when necessary. Hearts stop at five; charms retain their own maxima; spell totals stop at three (Moonlight one).

Spellbook reserves a random eligible temporary charge at sweep settlement, separately from both selections. The reserved charge counts toward the upcoming charge cap when filtering rewards. For example, permanent Wild 1 plus temporary Wild 1 may still gain one permanent upgrade, resulting in Wild 3 on the next deal and Wild 2 thereafter. Moonlight with a reserved charge cannot receive another Moonlight charge that deal. If every spell is capped, the book reports no available temporary charge. It never spends a reward slot, silently overflows a cap, or causes a permanent charge to be lost. Buying Spellbook after a sweep does not retroactively grant a charge.

Permanent upgrades, Potion healing and charm ownership commit with Deal; until then the screen shows locked prospective choices and upcoming charges/hearts. Banking or replacing the run does not apply that prospective loadout. No scoring target was changed as a balance adjustment.

## Break state machine

| State | Retained data and permitted transition |
| --- | --- |
| `waiting` | A won seven-deal run retains its earned total, remaining count and resources. Keep dealing, with this break's ID, opens the first offer once. |
| `choosing` | Retain the current offer, total/remaining selections, distinct chosen IDs, skipped count and prospective resources. Pick or Skip must match both break ID and current remaining count. Skip is permitted only for an empty eligible offer. |
| `ready` | All selections are resolved. Resources and the actual prepared deal are frozen. Only the visible Deal action can start it. |
| `started` | Deal has consumed that definition once. Old picks, Continue, Skip and Deal callbacks have no effect. |
| `abandoned` | End Run banks the already settled score and invalidates pending resources. A new run creates fresh state; break IDs are never reused within the page. |

Every offer survives redraw, Help/Back, minimise and close/reopen as module state. Every new selection receives a fresh ordinal; replaying a button from the previous selection cannot select a newly offered ID. Continue and Deal carry break IDs too. Double-click continuation and held Enter/Space are rejected; ordinary keyboard/pointer selection remains available. Focus moves to the first fresh reward or Skip, then Deal, and scrolls immediately with a 12px margin on small screens.

At the first won Final, the existing completed-run recording still occurs before endless continuation. Continue opens the retained entitlement rather than constructing a new one. Endless Finals (including deals 14 and 21) grant the same one/two entitlement directly in endless mode. Settled scores/bonuses are never added again when banking, continuing, redrawing or committing the next deal.

## Immutable deal definition

Only after the final selection/Skip does `lockRewards` select a compatible layout/curse plan and prepare its actual deck. Preparation deeply freezes:

- Definition ID and `solitaire-peaks-rewards-v1` rules identity, plus the post-preparation RNG state for later deterministic rule replay.
- Layout ID/index and a full snapshot of coordinates, coverage/inverse edges, named tips, dimensions and safe Seal groups.
- The shuffled 52-card order, 28 table occurrences, opening pile, stock order and the Moths' eaten cards when applicable.
- Deal number/target, compatible curses and Hex suit.
- Final permanent spell/charm resources, temporary charges, hearts/max, effective capped charges and Second Deck refills.

The next-layout diagram and spatial-name text alternative use this definition. The visible Deal action clones mutable play arrays/resources from it; it neither shuffles nor advances the RNG. The live deal retains its immutable definition, and rules/rendering use its captured layout metadata. Subsequent draws, spell use, refills and undo mutate ordinary live state, leaving the definition intact. Even the teaching deal is prepared before starting. No contract/search behavior is present.

## Verification and reproduction

Starting baseline: 59/59 tests and a successful production build with no content warnings. Final: **71/71 tests** and a successful `npm run build`, 37 source images, 106 variants, 19 artworks, no content warnings. `git diff --check` passes.

Twelve new tests in `tests/solitaire-rewards.test.mjs` cover settlement boundaries, a real final-card play whose stock bonus qualifies, 80 seeded fresh-offer breaks, distinct IDs, caps, one/zero eligible selections, Spellbook reservation and expiry, stale callbacks/selection ordinals, repeated settlement/Deal/Continue, held keyboard/double-click handlers, interrupted window cleanup/redraw, Finals 7/14/21, banking/new-run paths, visible progress/gating and deep-frozen exact definition consumption across 35 seeds. The cleanup regression uses a minimal view fixture; the browser checks below exercise actual window mounting/reopening. The existing layout resource/final-flow regressions now assert sequential choices plus explicit Deal. The layout measurement helper only adapts to the preparation/start split; the Phase 4 measurements were not rerun or replaced.

For an isolated local browser review:

1. Run `node tests/preview-solitaire.mjs`, then use the source server (`npm run dev`, normally port 4321).
2. Open `/dist/qa/solitaire`; append `?motion=reduce` for the labelled JS/CSS preference fixture.
3. The toolbar supplies Double rewards, Play stock-bonus sweep, Spellbook rewards, Last eligible reward, Exhausted rewards, Won Final, Endless Final and Single reward, alongside the preserved layout scenarios. Score storage is isolated. These are synthetic settlement/resource setups using the production rules and real UI, not natural-play success-rate evidence.
4. Inspect review state displays the retained break, definition/deck/loadout, RNG and live resources as a read-only visible diagnostic. Click it again to hide. Compare before/after reopen or Deal. The normal app may change its route to `/games`; reopen the full fixture URL after code changes to load the new fixture script.
5. Run `npm run build` after reviewing to remove disposable `dist/qa/` pages, then `npm test` so packaging checks inspect clean production output. The reusable generator and tests are outside production packaging.

Actual in-app browser checks used **1280×800, 390×844 and 320×740**:

- Enter/Space picks, newly focused second offers with distinct IDs, disabled Deal before completion, focused/reachable Deal afterward, and one-choice outcomes that still require Deal.
- Double-click on the first choice retained the second selection. Double-click on Keep dealing opened one unspent two-choice break; Deal started once.
- Close/reopen retained a pending second offer and a ready immutable definition. Help/Back retained byte-equivalent review diagnostics. Before/after Deal comparisons matched all 28 table IDs, opening pile, full stock order, charges, definition ID and RNG state.
- Spellbook Dispel plus permanent Dispel produced two upcoming charges independently of both selections; Potion raised upcoming hearts to four. A final eligible Wild choice produced an empty second offer with a reason/Skip. Fully exhausted pools remained usable and capped.
- Won Final continued into deal eight with its retained two choices. Endless Final provided choices before deal 15. Rules additionally cover unswept one-choice Finals, terminal losses, repeated bonuses and banking.
- A real final-card play on the isolated 430-point setup earned 10 card points and the final 250-point peak, then 20 stock points, reaching 710/700. Closing immediately during settlement and reopening retained Reward 1 of 2 and a single 710-point settlement.
- Light/dark views and a labelled reduced-motion fixture were inspected. The 320px focused Deal button stayed inside its scrolling overlay with its margin; computed animation was `none`, transition `0s`, and there was no document horizontal overflow. No review browser warning/error entries were observed.

Production build output excludes `qa/`, `design-lab/` and review script references. The actual built site opens Three Peaks with 23 stock/no spells, preserves a draw through close/reopen and minimise/restore, and starts without a live run after reload. No review toolbar or browser warning/error entries appeared. The canonical plan records the same final smoke check.

## Limits and persistence

The module-level live run survives window close/reopen only. No live-run autosave exists after reload, and no new save format or score-record migration was introduced; existing completed/banked bests remain under the same storage key.

Browser play was agent-directed, partly scripted, and used viewport overrides. It does not establish physical touch/swipe feel, a human balance playtest, native browser zoom, screen-reader usability or an OS reduced-motion toggle. The reduced-motion fixture exercises JavaScript and CSS paths explicitly. No new claim is made about all seeds being solvable, optimal balance, future contracts, enchantments or music integration. Phase 4's separate historical geometry/zoom limits remain applicable.

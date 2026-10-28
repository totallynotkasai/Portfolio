# Phase 6 Solitaire enchantments, Inspect and contracts — 28 October 2026

Implemented in the existing clean `codex/content-expansion` checkout after Phase 5 commit `2567eef`, under Andrew's explicit new Phase 6 authorisation. No branch/worktree switch, push, merge, deployment, Hat to Hat restoration, Phase 7 music integration or Phase 9 integration. Earlier art/writing and accepted Starweave sources remain unchanged.

## Enchantment prototype

Enchantments belong to initial table occurrences, never card identities in the stock. Deal one has none. Deal two introduces one Treasure, three one Double Points, four one Double Streak. Later deals have Treasure plus Double Points on odd deals or Double Streak on even deals. There are at most two occurrences and one Double Streak; two placements cannot lie on the same covering path. Placement consumes preparation RNG once and is frozen with the actual deck/resources. This is a conservative initial frequency, not a final balance conclusion.

Ordinary streak scoring still applies Hex first, then Ember's point offset and Kindred. Clover pays 50 only when that play's scoring streak is an exact multiple of five. Treasure adds a flat 40 at streak five or higher. Double Points adds one more copy of normal card points, excluding Clover, peaks, stock and contract awards. Double Streak scores normally, then doubles the carried streak; the boost pays no Clover or crossed-milestone award and invents no further card/peak plays. The wizard announces the highest newly crossed milestone once for that play. A Hex play still resets before scoring/boosting. A draw resets the boost unless Echo preserves it.

Example with Ember, Kindred and Clover, starting on Ace of Flames at streak four:

| Play | Card calculation | Separate addition | Result | Carried streak |
| --- | --- | --- | --- | --- |
| 2 Flames / Treasure | 10 × (5 + 1) × 2 = 120 | Clover 50 + Treasure 40 | 210 | 5 |
| 3 Flames / Double Points | 10 × (6 + 1) × 2 × 2 | none | 280 | 6 |
| 4 Flames / Double Streak | 10 × (7 + 1) × 2 | none | 160 | 14 |

The next ordinary play would score at 15, with Clover paid for that actual play. Rewind of the third play returns to 490 points/streak six and restores its enchantment. Replaying it cannot accumulate net points through undo. This deliberately combined synthetic example exceeds production's frequency cap so all effects can be reviewed together; the page labels it accordingly.

Normal play and Wild trigger enchantments. Fireball consumes/destroys one without triggering it while retaining ordinary coverage/peak effects. Rewind snapshots enchantments, score, streak, best streak, first-peak progress and last scoring explanation; seen faces and real charge spending remain. Undraw restores the carried streak, Toll, pile-rank and previous undo stack under its existing bottom-of-stock/refill convention. Moonlight reveals badges without unlocking Seal or triggering effects. Second Deck handles ordinary numeric card IDs; the removed occurrence's enchantment cannot return with a recycled card.

Each scoring explanation now includes the actual Ember/Kindred arithmetic, multiplier, separate Clover/Treasure and carried streak. Peak and stock awards remain explicitly separate. Final-card boosts update longest scoring streak without adding imaginary plays.

## Presentation and Inspect

Hex keeps a dashed frame and a persistent purple hex ribbon. Seal retains a square padlock and numbered guard tips/spatial names. Beneficial badges are round and sit above the right corner, separately from harmful markers. An early browser version obscured ranks at small sizes; it was corrected before delivery. The lock, Hex marker, enchantment badge, rank/suit and outer spell targeting ring can coexist.

The named global curse strip remains visible. Toll's draw control names its 15-point cost, Moths names reduced stock and its stock explanation, and Broken Circle explains the disabled A/K connection on the pile. Global curses do not falsely mark every card as individually cursed. The expandable compact legend names Playable, Covered, Sealed, Hexed, Enchanted, combinations and targeting rings.

Hover/title, focus, accessible card labels and the explicit **Inspect cards (no play)** selector share `inspectWords`. The selector includes covered positions without leaking their rank or enchantment. Moonlight can reveal a covered enchanted/Hexed/locked face while the lock persists. Inspect's keyboard events cannot invoke play/draw/spell hotkeys. The selector and explanation stay in sync with hover/focus. Inspect is a native labelled control rather than a second card-play target.

Dark/light contrast, mobile rank/suit readability and focus were reviewed. Another early browser issue used the fixed ink colour on a dark surface; Inspect/status/scoring now use the theme's text colour. The table has a minimum scrollable board area; notes and expanded Inspect can scroll. The phone draw control reserves a bounded width, keeping nine spell controls usable. A contract's short status line includes its goal/progress, provisional/settled state and run bonus, with the full explanation in its accessible label/title.

## Exact-deal contract proofs

No offers for deals one–three. Completing deal three resolves all reward selections, then freezes the actual deal-four definition/resources/enchantments before checking contracts. Endless deals use the same boundary and pipeline.

All five objectives and bonuses follow the canonical plan: Long Thread 8/+75; named Chosen Peak first/+75; sweep with five stock/+100; sweep with at most one real charge spent/+100; sticky main-target success with a retained named charge/+75. Chosen Peak excludes single-tip and Seal definitions. Five in Reserve excludes Moths and Second Deck ownership. Light Touch/Keep a Spark require a genuinely present charge (including a real temporary Spellbook charge) and an actual legal spell use along a prefix of the successful replayed route. An unusable owned Dispel on an un-cursed deal does not qualify.

`dealState` constructs both live and proof boards. `transition` temporarily installs a private synchronous simulation context and dispatches the production `play`, `draw`, `cast` and `reorder` functions, restoring the live context before every yield. The rules for all nine spells, Scry permutations, Nudge choices, Dispel choices, Rewind/Undraw snapshots, information casts, coverage/Seal, Hex, scoring multipliers, first-peak order and deterministic Second Deck shuffle are shared. `completeBoard` shares terminal stock/target arithmetic. Only subsequent run rewards/hearts/records are outside simulation; those cannot alter the objective's deal outcome.

Default search limits are **5,000 successor nodes, 32 retained frontier states, 180 actions per route, yielding every 12 successors or 8ms, and 2.5 seconds wall time**. A deterministic heuristic prefers table progress/scoring and conserves casts. Candidate preference rotates using already pinned deck/deal data, without spending RNG. The visited set hashes full dynamic state including history/RNG/resources/progress; a collision can only suppress a route. The node/beam/depth limits make this deliberately incomplete: valid contracts may be missed. There is no solvability-rate claim.

Every proposed terminal witness is replayed from scratch through the same transition functions. Its goal and charge usability are checked again. Only that proof can become an offer. The proof is deeply frozen with the definition ID, `solitaire-enchanted-contracts-v2` identity, candidate and actions. Unknown mechanics/errors, no witness, exhausted budget, timeout or cancellation safely yield no contract. A timeout during verification also suppresses the offer. No deck is rerolled, no target reduced and no ownership filter is presented as proof.

The screen stays interactive during search. **Deal is immediately available to proceed without a contract**, cancelling the pending search. If a proof arrives first, Deal waits for explicit Accept/Skip; either decision preserves the pinned resources/deck. With no proof the screen says **No contract for this deal**. Async completion preserves appropriate reward-screen focus. Search may finish while Help is open or the window closed; the result stays in module memory and appears on return without restarting/redealing. Starting/replacing/banking invalidates stale results. Break IDs and existing selection ordinals still reject stale/double/held actions.

Contract bonuses settle once into run score, after ordinary deal scoring; they cannot rescue a target or change reward qualification/hearts. A completed losing deal can pay achieved Long Thread/Chosen Peak while retaining ordinary heart/Final consequences. Unfinished banking/abandonment never pays. Rewind restores first-peak failure and board-derived best; all charge spending, including information and undo, remains counted for Light Touch. Bonuses are provisional until settlement.

## Persistence

Inspection confirmed that module state survives window close/reopen but no live-run autosave survives reload. No migration or new live-save format was invented. New best/endless/longest records use **`kasai:solitaire:enchanted-contracts-v2`**, with the rules identity in score records. The existing **`kasai:solitaire`** bests/longest remain unchanged and are labelled as previous-rule records in Help. The shared `K.trophy` service still reads/awards `kasai:solitaire.won` (including old `best.won` compatibility), preserving all trophies.

## Verification and reproduction

Starting baseline: **71/71 tests** and a successful production build. Final Phase 6: **89/89 tests**, successful `npm run build` without content warnings (**37 images, 106 variants, 19 artworks**), and `git diff --check` passing. Existing art/writing/viewer/interaction/accepted music-model tests pass.

The 18 new tests cover exact multiplier/charm/Hex/Wild arithmetic; Fireball; final-card target/stock/peak boundaries; Rewind/Undraw/Echo/Toll; occurrence introductions/frequency/spacing and Second Deck; hidden/combined Inspect; all structural/resource exclusions; real seeded deterministic search and replay; illegal/old witnesses; cancellation/timeouts/budget/unsupported fallback; unusable Dispel; all five terminal objective witnesses; first-peak failure undo and every charge count; losing-deal/one-time/unfinished settlement; locked reward resources and interruption; start-during-search cancellation; and separate persistence with legacy trophies untouched. Full witness/live comparisons exercise **all nine spells, Scry reorder, refills/RNG, all enchantments and a complete sweep on every layout**. Earlier regressions retain sequential rewards, caps/exhaustion, Spellbook independence, all variable layouts, Final/endless and stale/repeated action coverage.

For isolated browser review, run `node tests/preview-solitaire.mjs` then `npm run dev` and open `/dist/qa/solitaire`. The toolbar supplies **Synthetic enchantment example**, **Pinned contract example** (a real fixed seed-415 deck in a synthetic break), and **Zero-budget fallback**, alongside prior reward/layout cases. Use `?motion=reduce` for the labelled JS/CSS preference fixture. Scores are isolated, including legacy trophy storage. Production exposes no debug API. Run the production build afterwards to remove `dist/qa/`.

Actual in-app browser interactions used **1280×800, 390×844 and 320×740**. They exercised the arithmetic chain (210/280/160, carried 7→14), Rewind back to 490/streak six, combined covered Hex/Seal/Double Streak Inspect without score changes, Inspect keyboard hotkey isolation, light/dark, spell controls, Accept via Enter, Deal via Space, Skip, and a byte-identical accepted break/definition through actual close/reopen. The zero-node-budget case visibly enabled Deal with “No contract for this deal”. Won Final double-click continuation retained Reward 1 of 2; double-clicking a reward retained Reward 2, then a distinct second choice locked Wild/Fireball for deal eight. Help/Back during its search retained that prepared Crown and reached the no-offer fallback with focused Deal. No browser warning/error entries were observed.

The **640×400** equivalent 200% viewport had no document horizontal overflow and kept Inspect reachable by scrolling/focus. A separate CSS-zoom fixture at 200% was inspected: text/control scaling works, but CSS zoom does not reproduce native browser viewport/layout changes and can extend the desktop window beyond the viewport. It is not claimed as successful native zoom verification. Short/narrow views intentionally scroll to keep card ranks legible; all controls/cards need not fit simultaneously.

Disposable review pages were removed by the final build and excluded by packaging tests. The actual `dist/` site served separately at port 4322 opened the teaching Three Peaks with 23 stock, no spells/enchantments/contract and no review toolbar. Drawing to 22 stock survived actual close/reopen. Reload returned to the initial Help/Deal me in screen, confirming there is no live-run autosave. Its fresh browser diagnostics had no warning/error entries. A rapid pointer sequence while reopening briefly opened the underlying Sweeper tile; it was closed and reopening verified with Enter after observing the folder state. This was an interaction during review, not a Solitaire state loss or a claimed broader OS fix.

## Remaining review limits

- Treasure is accepted; Double Points/Double Streak are technically verified **prototypes**. Andrew's human feel/balance approval remains open. Targets and the two-selection entitlement were not secretly adjusted. No new broad balance/win-rate study or claim of every seed being solvable was made.
- Browser actions were agent-directed and partly scripted, with viewport overrides rather than physical phones. No physical touch/swipe, native browser zoom, screen-reader session or human gameplay approval is claimed.
- Reduced motion used a clearly labelled development JS/CSS fixture with computed animation `none`, not an OS preference toggle. No new effects depend on animation for meaning.
- Search is intentionally conservative and incomplete. It can safely offer nothing on harder deals or slower devices; this does not prove those objectives impossible. Its guarantee concerns the stored legal route on the actual prepared deal, not every player choice.
- Phase 7 and Phase 9 remain untouched; the accepted Starweave concept and separately parked Hat to Hat remain separate.

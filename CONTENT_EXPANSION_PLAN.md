# Kasai OS: selected content expansion plan

Phased implementation plan, revised after Andrew's feedback on 27 October 2026.

**Status: Phase 0 complete; Starweave concept accepted; Phases 2 (art), 3 (writing) and 4 (variable-peak Solitaire foundation/previews) complete. Hat to Hat remains on its own branch and plan. This continuation stops after Phase 4; Phases 5–7 and 9 remain unimplemented.**

**Active implementation branch: `codex/content-expansion`.** Keep the remaining expansion phases on this branch. By Andrew’s later request, Hat to Hat is separately parked on `codex/hat-to-hat`; its complete brief and deferred tasks are in `HAT_TO_HAT_PLAN.md`. No push, merge or deployment is authorised.

### Confirmed decisions from the latest review

- Solitaire layouts may have **one to five peaks**. Their different opportunities for streaks and peak bonuses are an intended source of challenge.
- Treasure is accepted. Remove Lantern from the implementation; develop understandable card-point and streak multipliers instead.
- Improve curse indicators as part of the enchantment work, including their coexistence on one card.
- Contracts first apply to **deal four**, after completing deal three. Offer only objectives actually achievable for the specific planned deal and available resources. Light Touch and Keep a Spark require an owned usable spell.
- A clean sweep **and** reaching the target earns **two sequential reward selections**. Other continuing deals keep their current single selection.
- Art reverse sides, novel overview and the remaining uncommented details are accepted; Andrew still supplies authored content.
- Starweave’s working musical-spell concept is accepted. Hat to Hat is parked separately and is not a dependency of this plan.

## 1. Scope and recommended direction

| Original idea | Proposed addition | Main design decision |
| --- | --- | --- |
| 23 | More Spell Solitaire layouts | One to five peaks, explicit coverage/Seal metadata, distinct streak and peak-scoring opportunities. |
| 24 | Special Solitaire cards and clearer curses | Treasure plus prototypes of card-point/streak multipliers; replace Lantern; make all states readable together. |
| 25 | Optional Solitaire contracts and double rewards | From deal four; prove offered contracts doable; two choices for target plus sweep. |
| 33 | Art card reverse sides | A separate flip control reveals authored notes and process images; full-size artwork remains easy to open. |
| 35 | A current novel introduction | Build a reusable writing overview with optional premise, characters, setting and sample sections; Andrew supplies the actual material. |
| 41 | Musical spellcraft with the pet | Place symbols around a spell circle to compose music; the pet conducts and reacts. |

Keep the site's visual language, vanilla JavaScript architecture, lazy loading, keyboard controls, mobile layouts and existing sound preference. New visual effects must have reduced-motion alternatives. Content features must look complete when only some optional information exists.

This is a sizeable set of changes. Implement and review each feature in stages; do not merge all Solitaire mechanics into one untested change.

## 2. Relevant implementation at the Phase 0 baseline

Historical starting inventory; completed changes are recorded in each phase below. Phase 4's current layout model, measured comparisons and verification limits are in [PHASE4_SOLITAIRE_REVIEW.md](PHASE4_SOLITAIRE_REVIEW.md).

- `solitaire.js` contains the seeded rules, three layouts, rendering, scoring, nine spells, nine charms and five curses. A run has seven deals, then optional endless play. Deal one is plain TriPeaks with no starting spells.
- All layouts currently contain 28 table cards, four rows and three peak tips. A 52-card deck leaves one starting pile card and 23 stock cards before curses. Peak bonuses are currently 100, 100 and 250, multiplied by Twin Peaks when owned.
- Several rules assume particular positions: `TIPS = [0, 1, 2]`, `MIDDLE = 1`, the Seal curse, four-row coverage, and parts of sizing/navigation. A radically different silhouette is therefore more than a new coordinate list.
- Rewind restores a snapshot of the previous table removal. Undraw restores the previous draw and Toll/streak state, while putting that card at the bottom of the stock. New reversible state must participate in these existing paths.
- `content.js` is the main authoring location. Art metadata is keyed by the artwork's `img` path; the build discovers artwork automatically. Writing already supports `chapters`, each containing `title` and `paragraphs`.
- `apps.js` renders the art binder and writing windows. Art cards currently act as full-size viewer triggers; adding buttons inside the existing button-like figure would require restructuring the interaction.
- `sound.js` supplies named synthesised effects through `K.sound`. It does not currently expose an arbitrary-note sequencer API. The music feature needs a proper extension rather than scheduling existing sound effects repeatedly.
- `build/build.mjs` checks script syntax and asset references and prepares image variants. Its current content checking is not a full schema validator; add targeted validation for the proposed nested content.
- Existing Solitaire rule tests are in `tests/solitaire.test.mjs`; interaction tests and a Solitaire preview helper also exist.

## 3. Idea 23: layouts with one to five peaks

### Player experience and intended challenge

Keep Three Peaks as the opening teaching deal. Later layouts deliberately vary between one and five peak tips. Lower-peak layouts should explore broad fronts and routes that support long streaks; higher-peak layouts offer more frequent peak bonuses. Peak count alone does not guarantee longer streaks: coverage, exposed frontier and the actual deal determine that. Measure those properties and design for Andrew's intended tradeoff rather than simply renaming a shape.

Initial layout briefs:

| Peaks | Working layout | Intended decision |
| --- | --- | --- |
| 1 | Crown | Broad lower routes converge toward a single final crown. Players depend more on card chains before collecting their one peak award. |
| 2 | Crescent | Two wings offer a choice between extending the current chain and finishing one wing early. |
| 3 | Existing Three Peaks, Starlit Gate and Terraces | Preserve familiar reference layouts and their current coverage. |
| 4 | Forked Paths | Four smaller summits, shared junctions and more frequent opportunities to finish a peak. |
| 5 | Five Towers | Five individually identifiable tips, shorter local routes and more opportunities for peak scoring. |

These are briefs, not approved final geometries. Prototype a valid coverage graph and readable arrangement for each. Prefer shallower, broader arrangements for fewer-peak experiments where geometry permits. Do not force every layout into four rows. Phone readability takes priority over fitting an arbitrary silhouette.

### Scoring proposal

Retain **28 table cards**, the 52-card deck, starting pile and stock economy as the first balance baseline. Changing peak count is approved; changing table-card count is not necessary to deliver it.

Award **100 per non-final peak and 250 for the last remaining peak**, so the current three-peak scoring is preserved:

| Peaks | Awards in removal order | Total peak points |
| --- | --- | --- |
| 1 | 250 | 250 |
| 2 | 100, 250 | 350 |
| 3 | 100, 100, 250 | 450 |
| 4 | 100, 100, 100, 250 | 550 |
| 5 | 100, 100, 100, 100, 250 | 650 |

Twin Peaks doubles each award, regardless of layout peak count. Do not normalise all layouts to the same total: easier peak scoring on five peaks is part of the requested variation. Start with current deal targets, then tune using play evidence, accounting for multipliers and double reward selections. Avoid automatic per-layout handicaps that erase the distinction Andrew requested.

### Coverage, Seal and implementation

1. Describe each layout by a stable ID, coordinates, an explicit coverage graph, one to five named tips and optional Seal groups. Coordinates and actual overlap/connection indicators must explain the legal graph accurately.
2. Validate 28 unique slots, an acyclic graph, one to five distinct tips, and that every non-tip lies on a covering path to a tip. Removing the final tip must leave no orphaned cards. Validate explicit Seal dependencies cannot deadlock.
3. Replace TIPS, MIDDLE, fixed row assumptions, peak award indexing, keyboard-navigation assumptions and hardcoded sizing with metadata. Keep the existing three layouts compatible.
4. A clean sweep remains removal of all 28 table cards. It is not defined by an assumed number of peaks.
5. Seal is eligible only on layouts with an explicit safe lock group. On suitable three-to-five-peak layouts, mark a crown group protected until two named unsealed guard tips are removed. Keep an acyclic dependency and show those guards visually.
6. For initial one- and two-peak layouts, exclude Seal from curse generation; choose a compatible curse or Final Deal pair before dealing. Do not invent an impossible “clear both outer peaks” rule for a one-peak board. Other curses remain available.
7. First deal stays Three Peaks. Early later deals introduce variation; the pool includes all approved peak counts, avoids immediate layout repeats, and remains deterministic.
8. Show peak count and a small layout diagram in the next-deal preview. Give tips spatial names such as West Tower and East Tower, including a text alternative for contracts.
9. Adapt row depth and card overlap to small screens without hiding rank/suit, tips or state badges. Prototype every peak count on desktop and a small phone before accepting its geometry.

### Completion criteria

Compare fixed-seed move availability, longest chains, peak frequency, scores, clean sweeps and target success across all five families. Use bots plus human play; do not assume fewer tips automatically means easier streaks. Test all spells, Twin Peaks, eligible Seal groups, final/endless deals, undo and the two-reward qualification. Preserve the intended differences while avoiding one universally superior layout.

## 4. Idea 24: Treasure, multiplier enchantments and readable curses

### Direction after review

**Remove Lantern from the planned implementation.** Its reveal-without-unblocking rule was not clear to Andrew and overlaps the game's information spells. It is not needed as a dependency for the other features.

Keep enchantments attached to initial table-card occurrences. Each card retains its rank, suit and artwork; a badge adds a clearly described effect. No enchantments are inserted into stock, and Second Deck cannot recycle an enchantment reward. At most one enchantment per card initially. Treasure is accepted; the following multiplier semantics are proposed for prototype evaluation.

### Proposed enchantments and exact arithmetic

Let n be the streak the current play would normally produce after Hex. Ember changes its score offset as now; Kindred multiplies the normal card points as now. A normal card currently earns 10 × (n + Ember) × Kindred, plus any Clover bonus.

| Enchantment | Proposed rule | Example |
| --- | --- | --- |
| Treasure | If the resulting streak is at least five, add a flat 40 points for this play. Otherwise no extra points. | A qualifying ordinary 50-point play becomes 90 before other unrelated awards. |
| Double Points | Double this card's normal card points after Ember/Kindred. Do not double Clover, peaks, Treasure, contracts or stock bonuses. | At streak five with no charm bonus, this card earns 100 instead of 50; the next ordinary card is streak six. |
| Double Streak | After this card scores at normal streak n, change the carried scoring streak to 2n for the next play. | At n = 5, this card scores its normal 50; the HUD then says “Streak 5 → 10”; the next ordinary card starts at 11 and scores 110. |

The delayed Double Streak benefit is deliberate: Double Points rewards the current card, while Double Streak rewards keeping the chain alive. A normal draw immediately after Double Streak resets the streak as usual; Echo preserves it. Another Hex play still resets according to Hex, without bypassing its existing Kindred interaction. It never makes Hex ineffective.

**Milestones and related systems:** Double Streak can count toward Long Thread because that contract uses the game-scored streak, not physical cards played; explain this. The wizard's glow may advance to the highest crossed milestone once. Lucky Clover continues to award only for a scoring play whose pre-enchantment n is an exact multiple of five. The boost itself does not issue Clover rewards or retroactively pay for crossed multiples. Ember remains a score offset and is not multiplied into the streak value. A final-card boost can update the run's longest scoring streak but cannot invent further plays or extra peak awards.

Introduce no enchantments on deal one. Start with one Treasure on deal two, then introduce Double Points and later Double Streak separately. Proposed maximum: two enchanted cards per deal and at most one Double Streak initially. Space boosts in the coverage graph so repeated multiplicative chains are not handed out together. These are balance knobs; review double rewards alongside them.

### Interaction and settlement rules

| Existing action/state | Behaviour |
| --- | --- |
| Normal play / Wild | Normal legal play triggers the card's enchantment. Existing Wild and Hex rules remain in effect. |
| Fireball | Removes the card and may release coverage/award a peak, but destroys its enchantment without triggering it. Explain in the target preview. |
| Rewind | Restore score, pre-boost streak, removed card and consumed enchantment state together. Replaying cannot accumulate net rewards through undo. Keep the game's existing “seen cards stay face up” convention. |
| Undraw | Restore the streak that existed before the draw, including a carried boost if applicable. Restore draw-related contract state; never copy an enchantment into stock. |
| Moonlight | Reveal faces and badges; no effect triggers and no blocking/Seal restriction is removed. |
| Scry / Crystal Ball | Existing stock visibility only. |
| Nudge | Existing pile-rank adjustment only. |
| Dispel | Removes a selected curse, not a beneficial enchantment. |
| Seal | A sealed enchanted card remains blocked until the lock releases. |
| Second Deck | Returns ordinary cards to stock; no repeated table enchantment. |

Process an action as: validate, snapshot before mutation, remove/play, resolve ordinary streak/card score and Clover, resolve enchantment, uncover/peak/Seal effects, update contract, check target, then sweep/stuck settlement. Snapshot the new fields and ensure the scoring transition is presented in the same order. Spell spending follows existing resource rules.

### Improve cursed-card indicators in the same phase

Current curse chips and subtle Hex/Seal treatments need a clearer hierarchy:

- **Hex on a face-up card:** a persistent distinct hex symbol, patterned edge/corner ribbon and explicit inspect text naming the affected suit and streak reset. Rank/suit remain legible.
- **Seal:** a clear lock overlay and connected/numbered guard markers on the tips that release it. A card revealed by Moonlight can visibly show its enchantment while still being locked.
- **Global curses:** Broken Circle, Moths and Toll belong in the visible curse strip and their affected controls: disabled A/K connection explanation, reduced-stock indicator, and “Draw: -15 points”. Do not label every card as individually cursed when the effect is global.
- **Both enchantment and curse on one card:** reserve different badge positions and distinct shapes. A beneficial frame cannot erase a lock/Hex marker; show both in Inspect and accessible labels.
- Hover, keyboard focus and an explicit mobile Inspect affordance expose the same explanation. Inspect must never play the card.
- A compact legend differentiates Playable, Covered, Sealed, Hexed and Enchanted, including combinations. Selected spells get a separate targeting ring.
- Support dark mode, contrast, zoom and reduced motion; animations are optional emphasis, not the only state indicator.

### Review and completion criteria

Prototype a board with Treasure, Double Points, Double Streak, Hex and Seal, including combined states on the same card. Review understandable arithmetic and mobile legibility before expanding art/polish.

Test multiplier order with Kindred, Ember, Clover, Hex, Wild, draws/Echo, Rewind/Undraw, the final card, target boundaries and peaks. Test no automatic Clover payout from a boost and no reward duplication. Version score records for the combined rules update; retain old bests separately. Inspect actual persistence before designing save migration.

## 5. Idea 25: contracts from deal four and two reward selections

### Accepted contract concept and timing

A contract is one optional side objective for the upcoming deal. It awards the agreed flat run-score bonus and cannot rescue a missed deal target or cost extra hearts on failure. Keep one offer with Accept/Skip in the existing between-deal screen.

**No contracts on deals one, two or three.** The first offer is made after deal three, for deal four. This boundary applies in code and tests: nextDeal >= 4. Later endless deals remain eligible.

### Contract pool and resource requirements

| Contract | Exact condition | Run bonus | Required eligibility |
| --- | --- | --- | --- |
| Long Thread | Reach game-scored streak eight. A Double Streak boost can contribute. | 75 | Prove achievable on the specific deal/loadout. |
| Chosen Peak | Remove one named tip before any other tip; Fireball counts. | 75 | At least two tips; named tip has a legal first-clear path. Initially exclude Seal deals. |
| Five in Reserve | Clean sweep with at least five stock cards left. | 100 | Initially exclude Moths and Second Deck; prove the reserve condition achievable. |
| Light Touch | Clean sweep with at most one spell cast. Every charge spent, including information/undo spells, counts. | 100 | At least one owned usable spell charge for the upcoming deal, even though zero casts can satisfy the objective. Prove the whole deal can be swept within the cast limit. |
| Keep a Spark | Meet the main target and retain at least one charge of the named spell at final settlement. | 75 | A named owned spell has a usable charge on this deal and a proven solution can retain it. |

An owned spell with no legal use on that planned deal is insufficient for the two spell-related offers. A valid newly chosen reward may make a contract eligible, but only after the reward choices are locked and the actual upcoming resources are known. Temporary Spellbook charges count if they genuinely exist in the upcoming loadout.

Do not offer a single-peak Chosen Peak contract, a locked guard order that cannot be achieved, or an objective dependent on resources the player has not acquired.

### “Doable” means more than loadout filtering

Andrew requested achievable contracts. Resource/curse checks alone do not prove that a random Solitaire deal can satisfy an objective. Implement the stronger requirement:

1. Prepare the actual upcoming deal before offering its contract: immutable layout, deck order, curses, enchantments, opening pile, stock and the locked next-deal spell/charm resources.
2. Apply cheap structural/resource filters first.
3. Use a bounded deterministic search over the real rules on a cloned state to find a **legal witness action sequence** satisfying each candidate. Support applicable spells, stock reorder/refills, targets, Hex, coverage, enchantments, peak order and contract accounting. Do not mutate live state or consume its random stream.
4. Only offer a contract for which a witness has been found and replayed successfully through the same rule transition functions. A search timeout, unsupported mechanic or no witness means **do not offer that candidate**. A bounded search can miss valid contracts; it must never guess they are possible.
5. Run search incrementally or in a worker so the reward screen stays responsive. Use a fixed search-node budget for reproducibility and a wall-time cancellation limit for responsiveness. A slow device may safely receive no offer.
6. If no candidate is proven, show “No contract for this deal” and allow normal play immediately. Do not reroll an easier deck, weaken an objective silently, or block starting the deal.
7. Pin the deck/offer and any witness to their rules version. Starting the deal consumes that exact definition. Player actions can still make a once-achievable objective impossible; the guarantee is that a route existed at acceptance, not that every line of play wins.

Extract pure rule transitions as needed so search, witness replay and live play cannot drift. This is a substantive implementation task; keep the search conservative rather than claiming an unproved guarantee.

### Two rewards for target plus clean sweep

When a settled deal has both **all 28 table cards removed and its target reached**, award **two sequential selections** from the existing spell/charm system. This is independent of contracts.

- Every other continuing deal keeps its current one selection, including a target reached without sweeping and an under-target deal survived. No choices after a terminal loss.
- A sweep whose leftover-stock bonus reaches the target qualifies. Use the final target result after ordinary/enchantment/stock scoring, before contract run-score bonuses.
- First selection offers three eligible rewards as now. After it is chosen, update prospective ownership/charges/caps and generate a fresh second set. Show “Reward 1 of 2”, then “Reward 2 of 2”. Do not grant both from a stale pool.
- Do not offer the exact same reward ID twice in one break. For example, the same spell cannot gain two charges from these two selections. Choosing distinct spells or a spell and a charm is valid.
- Preserve charge/heart/charm caps. If the eligible reward pool is exhausted, show the reason and allow the remaining selection to be skipped; never hang the game or exceed caps.
- Do not start the next deal until both selections are resolved and any optional contract decision is complete. Use a visible Deal button rather than making the first click accidentally start play.
- On a successful final deal, record the entitlement once. A finished/banked run does not spend it; choosing Continue into endless presents its earned one or two selections before deal eight. Subsequent endless Final Deals follow the same rule.
- Spellbook's existing temporary sweep charge remains separate. It is included once in the next-deal resources and never counted as one of the two selection slots.
- Treat selection spending as an explicit break-state machine with a break ID and remaining count. Reopening a window, repeated callbacks, back navigation or selecting Continue cannot duplicate choices.

### Combined between-deal flow

1. Show settled deal results, contract outcome/run bonus and “One reward” or “Target + clean sweep: two rewards”.
2. Resolve the reward selections in order in that same screen.
3. Lock the prospective next-deal resources. Prepare its actual immutable deal and run contract eligibility/search for nextDeal >= 4.
4. Offer one proven contract, or no contract. Accept/Skip never rerolls the deal; no search is allowed to freeze the UI.
5. Press Deal to commit the previewed layout, resources, deck and contract atomically.
6. A contract remains visible in a slim status line. Conditions are provisional until settlement; award once and separately from the target.

Reward picks that are locked cannot be revisited to reroll cards or contracts. Store the in-memory state correctly through close/reopen; inspect actual reload persistence before proposing any new autosave behaviour.

### Progress, undo and balance

- Rewind restores board-derived contract progress and a boosted streak; Undraw restores draw-related state according to existing rules.
- Charge spending remains real: Fireball followed by Rewind counts as two casts for Light Touch. Do not restore spent-cast counters merely because a board snapshot is restored.
- A first-peak failure is undone only when the corresponding move is undone; reward is never issued immediately on an interim success notification.
- Abandoning or banking an unfinished deal does not pay its contract. A completed losing deal can still pay Long Thread/Chosen Peak if achieved, while suffering the ordinary main-target consequence.
- Contracts stay optional. More frequent upgrades can make later runs much stronger, so evaluate targets, curse combinations, enchantment frequency and pool exhaustion together. Do not remove Andrew's second selection as a hidden balance adjustment.
- Test deal-three/deal-four boundary, no-spell Light Touch/Keep a Spark exclusion, unusable resources, one-tip Chosen Peak exclusion, solver cancellation/timeout, witness/live equivalence, both reward choices, cap/exhaustion handling, target reached by stock bonus, final-to-endless transition and no duplicate settlement.

## 6. Idea 33: authored reverse sides for art cards

### Experience and controls

Artwork still opens full size through the image/front's explicit View artwork control. A separate **About this piece / Flip card** button appears only when authored reverse-side material exists. On the back, show a short note, optional medium/date, process thumbnails with captions, and **View artwork** / **Back to front** controls.

Restructure the card as a non-interactive figure/container with real sibling buttons. Do not nest a flip button inside the current figure acting as a button. Both actions must respect the site's single/double-click preference appropriately, while ordinary control buttons activate with one click/tap.

The flip can rotate gently on desktop; reduced motion swaps the face immediately. The hidden side must be removed from the accessibility/tab order. Keep focus on the equivalent flip control across the change. Reset to the front when a card is hidden by category filtering, and avoid clipping longer notes by allowing the back's content area to scroll or expand predictably.

### Proposed authoring format

Add an optional `details` object to the artwork's existing entry in **`content.js`, section 2, `art`**. The `img` value must exactly match the existing artwork path. This format is implemented in Phase 2; see the tracked root **`CONTENT_AUTHORING.md`** for the editing guide.

```js
{
  img: 'assets/art/Character Design/Pet Wizard 2.png',
  title: 'Pet Wizard',
  details: {
    year: '2026',
    medium: '',
    paragraphs: [
      'Replace this with your own description of the idea.',
      'Optional second paragraph about the design or process.',
    ],
    process: [
      {
        img: 'assets/art-process/pet-wizard/01-sketch.png',
        alt: 'Replace with a useful description of this process image.',
        caption: 'Replace with your caption.',
      },
    ],
  },
},
```

**Where images go:** final artwork stays in `assets/art/<Category>/`. Process images go in the new **`assets/art-process/<piece-name>/`** folder, deliberately outside `assets/art/`, so they do not become standalone gallery entries or Solitaire card art.

**What Andrew supplies:** any combination of year, medium, one or more paragraphs, and optional process images with alt text/captions. Two or three short paragraphs and one to four process images is a useful editorial target, not a hard limit. Omit unknown fields. An empty/missing `details` object produces no flip control and no placeholder prose.

Use normal JavaScript strings: double quotes are convenient for apostrophes, one string per paragraph, commas between array entries, and forward slashes in asset paths. Do not enter HTML. Render prose as escaped text. If renaming a final image, update its matching metadata path too.

### Deliverables when implemented

- Render optional reverse sides while preserving auto-discovery, category filters, Shuffle, palette colours, wide cards and full-size viewer navigation.
- Pass the new metadata through the generated-art/content merge without losing it.
- Add process-image optimisation to the build, with lazy thumbnails and larger viewer versions; do not add those images to the art catalogue.
- Add targeted shape/path validation with clear messages naming the piece and field.
- Deliver the tracked root **`CONTENT_AUTHORING.md`** with a copy-and-paste template and location/review instructions. Put a concise version in the `content.js` author comments and README too, since `docs/` is currently local-only.
- Make the feature fully functional with empty optional fields. Use clearly labelled temporary fixtures only during development; publish Andrew's real descriptions once supplied.

## 7. Idea 35: a current introduction to Dilettante's in the Interim

### Experience

The existing novel entry opens a proper overview rather than only the current short excerpt. Reuse the Writing window style, with section links for **Overview**, **Characters**, **Setting** and **Read a sample**, showing only sections containing material.

Recommended ordering: title, rewrite status and short hook; premise; cover if supplied; character introductions; setting note; current sample. On desktop, the cover and premise can share space; on phones they stack. Keep reading text at a comfortable width and avoid tall empty tabs.

The archived Prospector chapters remain a separately labelled archived work. Do not use them as the rewrite's sample or imply they are current. Do not invent plot, character biographies, genre claims or progress percentages.

### Proposed authoring format

Extend the existing **`content.js`, section 4, `writing`** entry for the novel with an optional `overview` object. Keep the existing `title`, `excerpt`, `status`, `stamp`, `accent`, optional `url`, and `chapters` conventions.

```js
{
  title: "Dilettante's in the Interim",
  excerpt: 'Replace with your short hook when ready.',
  status: 'Re-write in progress',
  stamp: 'Re-write',
  accent: 'lavender',
  url: '',
  overview: {
    cover: '',
    coverAlt: '',
    premise: [
      'Replace with a spoiler-light premise in your own words.',
    ],
    characters: [
      {
        name: 'Character name',
        role: '',
        paragraphs: ['Replace with a short introduction.'],
        img: '',
        imageAlt: '',
      },
    ],
    setting: ['Replace with an optional introduction to the setting.'],
    sampleLabel: 'Current rewrite sample',
  },
  chapters: [
    {
      title: 'Sample title',
      paragraphs: ['Replace with the first sample paragraph.'],
    },
  ],
},
```

This is an illustrative template, **not text to publish unchanged**. Empty arrays or omitted objects hide those sections. If no current sample is supplied, omit `chapters` and the sample link entirely. The existing novel description/status can remain until Andrew replaces them.

**Asset location:** propose **`assets/writing/dilettantes/`** for a cover and optional character images. Reusing an existing art image path is also valid and avoids duplicate files. Add new writing assets to image processing.

**What Andrew supplies, in priority order:**

1. A one- or two-sentence hook and one to three premise paragraphs.
2. Optional cover, with a brief visual description for its alt text.
3. Optional two to four character introductions: name, optional role, a short description, and optional image/alt text.
4. Optional setting paragraphs.
5. Optional current excerpt, with a title and one array string per paragraph. Existing chapter support remains useful for multiple samples/chapters.

No release date, fixed posting schedule, word count or percentage is required. Links appear only for real destinations. Reader-facing prose is escaped text, using the same apostrophe/comma/path conventions as the art template.

### Deliverables and checks

- Extend `openDoc` through reusable overview rendering rather than a title-specific one-off branch. Existing plain writing entries and archived chapters must continue working.
- Add section navigation, appropriate headings, optional image handling and schema validation.
- Document the exact editing location/template in the same authoring guide, `content.js` comments and README.
- Verify the entry with only the existing summary, with premise only, with images but no sample, and with a long sample. No empty headings, broken links or misleading sample labels.

## 8. Idea 41: Starweave, musical spellcraft

**Revised after Andrew tried the first preview.** The initial grid editor missed the intended whimsy. It is superseded by a musical spell circle, with the virtual pet participating in the interaction. This revision takes precedence over the original rectangular piano-roll specification.

Place Star, Ember and Moon symbols around sixteen clockwise moments. Angle means time; four concentric pitch rings mean C4, E4, G4 and C5 in the initial prototype. The symbols produce different synthesised chime, pluck and soft humming voices. Duration is an explicit one/two/four-moment choice. The star travels around the circle on the audio clock while the actual animated pet conducts and reacts to the ingredients. Lines between runes form the visible spell. Provide original recipes to remix rather than present an empty technical editor.

Place/replace/erase, Undo, deliberate sound, Play/Stop, loop and tempo remain useful. Provide large equivalent numbered moment controls and ingredient/pitch selection for phones and keyboard users. Musical mapping must remain predictable: no arbitrary symbol recognition or opaque generated music. Sound stops on editing, Stop, mute, hiding or loss of window focus. Reduced motion keeps state legible without requiring pet animation.

Retain the previously agreed later-phase local autosave/named patterns, validated editable JSON import/export, visual PNG export and Match the tune activity, adapted to the approved rune model. Preserve explicit pitch, start and duration data with stable IDs; do not silently retune a composition when changing its pitch palette. MIDI/audio export remains outside scope.

**Latest review:** Andrew is really happy with Starweave and says it strikes the perfect balance. Preserve this accepted concept during later technical completion. Remaining music work is technical completion/integration and device verification, not another conceptual redesign.

Phase 1 reviewed the circle, sound differences, pet involvement and whether combining ingredients feels playful. Named saves, richer scales, longer compositions, import/export, the final music activity and production sound/OS integration await Phase 7 and feedback. Do not merely reskin the old grid. The initial kernels may remain as historical experiments; they are not the current interaction.

## 9. Separately deferred idea

Hat to Hat is outside this active plan. Its design, remaining work and verification history have moved to **`HAT_TO_HAT_PLAN.md`**, with its implementation preserved on **`codex/hat-to-hat`**. It does not block any remaining phase.

## 10. Phased implementation plan

### Branch and delivery rules

- **Continue the active expansion on `codex/content-expansion`.** The explicit exception is the separately deferred game documented in section 9. Do not switch this checkout to that branch during active expansion work.
- Commit each completed phase, or a coherent substep within a large phase, on that branch. Suggested commit subjects below are descriptions, not instructions to push or merge.
- Keep previews, reusable rule code and final implementation together. Keep review-only preview pages out of the production build unless Andrew explicitly wants them published.
- Update this document's progress boxes as work actually completes. Acceptance of scope does not mean a phase is finished.
- Phase 0 remains complete and Starweave’s Phase 1 concept is accepted. Andrew authorised Phases 2 and 3, then a separate continuation through Phase 4 only. Stop after Phase 4; keep later numbered phases for their own continuations.
- Starweave’s later integration follows the accepted concept and Phase 7 requirements. The separately deferred game supplies no approval gate or dependency for this plan.
- Avoid new blanket approval stops for accepted art, writing and contract details. Ask for missing authored material when needed; render optional sections safely without inventing it.

### Phase 0: scope, branch and technical baseline

**Current status: complete.** Baseline evidence and technical assumptions are recorded in `CONTENT_EXPANSION_BASELINE.md`.

- [x] Create the single branch.
- [x] Incorporate Andrew's decisions and remove outdated three-peak-only/Lantern assumptions.
- [x] Save a canonical plan in the repository root so normal Git operations can include it.
- [x] At implementation start, run current tests/build and record any pre-existing failures. 23/23 tests pass; production build passes without warnings.
- [x] Locate all layout, peak, Seal, reward-choice, curse-visual and persistence assumptions before changing them. See the baseline inventory.

**Exit:** clean starting-state evidence and a known regression baseline. No production changes required.

Suggested commit: `docs: record phased content expansion plan`.

### Phase 1: accepted Starweave preview

**Complete for the active plan.** Andrew accepted the current musical-spell concept and its balance. Preserve its circle, rune families and pet participation.

- [x] Working circle with three audible rune families, predictable time/pitch/duration and original recipes.
- [x] Actual animated pet conducting and reacting to the composition.
- [x] Phone/keyboard moment controls, Undo, deliberate audio, clock-synchronised playback and cancellation.
- [x] Desktop and 390px browser review; no horizontal overflow, no warning/error console entries observed.
- [x] Production build and output/reference exclusion verified for the review-only preview.
- [x] Andrew’s concept approval recorded. No further concept approval gate blocks Phase 2.

Preview: http://localhost:4321/design-lab/content-expansion/starweave (also available via /music and the /index hub).

After separation, the active suite passes **33/33 tests** and the production build succeeds without warnings. Starweave was rechecked in the browser after shared-style cleanup, with no console warnings/errors. Production output still excludes the preview directory.

The pre-separation combined suite passed 61/61 tests. The active suite is reduced by moving game-only regressions with their preserved implementation; this does not mean those tests failed or that coverage was removed from the deferred branch. Retain the baseline interaction/Solitaire, musical model/audio and build-exclusion tests here. Device listening/touch and native interruption remain technical checks for Phase 7. Music currently has four pitches/sixteen moments/three voices and no saves/export/full activity.

The separately deferred game’s design and historical preview records live exclusively in its standalone plan. Phases 2–4 followed in separate continuations, recorded below. Phases 5–7 and 9 remain deferred.

### Phase 2: art reverse sides and content authoring

**Complete on 27 October 2026.** Implementation and verification stay on `codex/content-expansion`; no push, merge or deployment.

- [x] Implement the optional details schema, metadata passthrough and process-image build support from section 6.
- [x] Restructure interactive art cards into valid sibling controls, then add reversible front/back presentation.
- [x] Preserve viewer arrows/swipes, categories, Shuffle, colour selection and single/double-click preferences.
- [x] Provide keyboard/mobile Inspect/flip behaviour and reduced-motion treatment.
- [x] Add the exact editing path, safe example and asset-folder instructions to the tracked root `CONTENT_AUTHORING.md`, content comments and README.
- [x] Verify real existing art entries still work without any new fields.

**Actual outcomes:** optional medium/year, escaped paragraphs and lazy process thumbnails render independently. Empty fields create no About button or placeholder copy. Generated title/category defaults survive an `img` + `details` metadata entry. Final art and process images use separate viewer sets, so process pictures neither duplicate gallery navigation nor become Solitaire art. Process PNG/JPG/WebP files receive 400px thumbnails, 800px page copies and up-to-4000px viewer copies. Validation names the piece and field for invalid shapes, unsupported fields, missing paths, wrong filename case and missing process alt text.

The front View artwork button uses the shared single/double-click preference, with direct native keyboard/touch activation. Flip, back View and process buttons activate once. Hidden faces are `hidden` and `inert`, focus moves to the equivalent flip button, and category filtering resets hidden cards to the front. Notes scroll inside the card. Authored cards reserve at least 320px of height; phones at 380px and below use one column. Palette frames and wide-card treatment remain.

**Verification:** the starting 33/33 suite and production build passed. After Phase 2, **41/41 tests pass** and `npm run build` succeeds without content warnings. Eight art regressions exercise optional/partial fields and literal text, metadata merging, focus/hidden faces, reduced-motion tilt suppression, nested/filter/shuffled viewer sets, keyboard/touch-swipe event handling, schema/path errors and actual process-image generation in temporary directories. Packaging checks inspect the built files for QA fixture references as well as preview-directory exclusion.

Actual browser review used the portfolio app and temporary clearly labelled QA content at desktop 1280×720, phone 390×844 and narrow phone 320×740. It covered Enter/Space flips, equivalent focus, long-note scrolling, final/back/process viewers and focus return, process-only/date-only/medium-only fields, blank details, light/dark contrast, single/double-click mode, filters and Shuffle, filtered viewer counts, arrows/Left/Right/Home/End and palette metadata. No browser warning/error entries were observed. The temporary generator/pages were removed; the subsequent production build contains no `qa/`, design-lab directory or review fixture text. A separate server of the actual `dist/` output showed all **19 real artworks**, no flip buttons without authored material, and working final-art viewing.

**Limits and author input:** no artwork notes or process assets have been invented or added to live content. Andrew can now populate them using the guide. Phone review used browser viewport sizes, not a physical handset; touch taps/swipes have automated event-level coverage rather than physical-device confirmation. Reduced-motion JavaScript behaviour is tested and the CSS rotation is restricted to `no-preference`, with immediate face swapping under `reduce`; an actual OS preference toggle and screen-reader/device session were not exercised. These verification limits do not require another content/scope approval or begin Phase 3.

**Exit:** Andrew can populate a real artwork using only the documented content entry and optional image folder. No fabricated published art notes. Use development fixtures for visual checks, then remove them.

Suggested commit: `feat: add authored art card reverse sides`.

### Phase 3: novel overview and writing authoring

**Complete on 27 October 2026.** Its continuation ended after Phase 3; the separately authorised Phase 4 is recorded below. No push, merge or deployment.

- [x] Implement the optional overview schema and reusable section navigation from section 7.
- [x] Support premise, cover, characters, setting and an explicitly current sample, hiding absent sections.
- [x] Preserve existing writing entries, archived chapter reading and external links.
- [x] Add new image processing/validation and copy-and-paste authoring guidance.
- [x] Populate only Andrew's provided current material; until then the current summary/status remain.

**Actual outcomes:** `overview: {}` opts any writing entry into the reusable introduction. Dilettante's uses its unchanged real summary, rewrite status and date; it has no invented premise, cover, character, setting or sample. Optional sections appear independently. Blank paragraphs/character slots and title-only chapters produce no empty headings or navigation. Populated top-level `chapters` on an overview appear under a fixed **Current sample** heading, with optional `sampleLabel` as additional text. A label alone cannot produce a sample. The Prospector stopped-draft explanation and both chapters remain in their own Archived draft/Old writing document with chapter navigation. Plain documents and real external links retain their existing behavior.

Section buttons outside the reading scroll area jump immediately and move focus to the matching heading. Overview returns to the title. Long sample text wraps, including long unbroken strings; narrow window containers stack cover/premise and character image/text. Images reserve dimensions, load lazily and use responsive optimized sources. New writing assets receive 400px thumbnail, 800px page and up-to-2400px large copies without enlargement; existing art paths reuse their variants. Writing assets never enter gallery or Solitaire discovery. Targeted validation names the entry and nested field for shape/type errors, unsupported overview fields, missing/unsafe/wrong-case paths, missing alt text and unnamed populated character slots.

The tracked root **`CONTENT_AUTHORING.md`** now includes exact current/archived entry locations, safe empty templates retaining the real description/status, current-sample rules, image instructions and verification steps. README and `content.js` author comments match it. No sole instructions were added to locally ignored `docs/`.

**Verification:** the clean starting baseline passed **41/41 tests** and `npm run build` without content warnings. After Phase 3, **48/48 tests pass**, including seven writing regressions for summary-only/premise-only/partial fields, images without a sample, literal and already-escaped text, long current samples, section focus with reduced motion on/off, plain documents/external links, the real archive/rewrite distinction, nested schema/path errors and actual writing-image generation in temporary directories. Existing art, viewer, single/double-click, Solitaire and accepted Starweave regressions all remain passing. Production build succeeds without content warnings. Packaging checks exclude `qa/`, review previews and fixture references; temporary browser fixtures were removed before the final production build.

Actual browser review exercised the real portfolio and clearly labelled temporary synthetic fixtures at **1280×800**, **390×844** and **320×740**. It covered existing-summary-only, premise-only, partial blanks, cover/character images without sample, literal text, an 80-paragraph sample plus a long unbroken final string, Enter/Space opening and section activation, click navigation, heading focus, scrolling to the last sample paragraph, Overview return, close/focus return, both archived chapter buttons and the plain external link's destination/new-tab attributes. Images loaded and narrow layouts had no horizontal reading overflow. Light and dark themes were visually reviewed. A fixture forced the JavaScript reduced-motion preference; section jumps remained immediate with computed scroll behavior `auto`. No browser warning/error entries were observed. The final built-output browser check confirmed the real summary-only overview, separate archive and unchanged art viewer.

**Limits and author input:** no current authored novel material has been supplied beyond the existing summary/status; optional material remains hidden. Phone sizes were browser viewport overrides, not physical handsets, and clicks do not establish physical touch/swipe behavior. Reduced motion was exercised with a labelled development preference fixture and regression tests, not an OS preference toggle; the overview adds no motion effects. No screen-reader session was performed. These limits are recorded verification limits, not a new scope approval or the start of Phase 4.

**Exit:** a partial or complete novel overview renders cleanly on desktop/mobile, and the archive cannot be confused with the rewrite.

Suggested commit: `feat: add structured novel overviews`.

### Phase 4: variable-peak Solitaire foundation and layout previews

**Complete on 27 October 2026, with the technical verification limits below.** This continuation stops here on `codex/content-expansion`; no push, merge or deployment.

- [x] Extract/parameterise rule transitions enough to support layout validation, future search and rule tests. Play/Wild/Fireball share isolated `removeCard`; scoring, graph queries and keyboard navigation accept explicit deal data. Clone/live replay is tested. Full future solver orchestration is not claimed.
- [x] Generalise peak IDs/count, scoring, row depth, keyboard selection, dimensions and explicit coverage. Stable descriptors, spatial tip names and arbitrary slot IDs replace fixed tips/rows; a permuted-slot regression proves this.
- [x] Add compatible curse selection and safe Seal groups; exclude Seal where no valid group exists. Validate reachability, inverse edges, acyclicity, two named unsealed guard paths and complete structural clearance with locks active. Crown/Crescent cannot receive Seal; Final/endless rules remain compatible and deterministic.
- [x] Prototype at least one new layout for each of 1, 2, 4 and 5 peaks, preserving the existing three-peak options. Crown, Crescent, Forked Paths and Five Towers are implemented; the three reference graphs/coordinates and first teaching deal are preserved.
- [x] Apply 100-per-intermediate / 250-last scoring as the initial proposal, with Twin Peaks handled generically. All five totals and doubled awards are tested; a sweep still clears all 28 cards.
- [x] Preview real seeded deals at desktop and small-phone sizes. Real seed-415 browser play at 1280×800, 390×844 and 320×740, all nine spell interactions, keyboard scrolling, next-layout diagrams, light/dark, reduced-motion fixtures and zoom checks are recorded. Readable 36px-minimum cards, compact phone spell controls, expandable tip/guard text and scrollable short views replace illegible shrinking. Connector endpoint errors measured at most 0.03px desktop / 0.02px phone.
- [x] Compare scores and success across families before accepting the prototype geometries. Revise the initially narrow high-peak graphs; retain the measured broad-front/frequent-peak tradeoff, without changing targets or normalizing approved peak totals.

**Measured outcome:** 7,600 matched seeded deals across plain, equipped and eligible-Seal profiles, plus 5,000 selection deals. In plain play, Crown / Five Towers averaged frontiers **4.99 / 4.60**, best streaks **6.66 / 6.14**, **1.84 / 14.66** peaks per 100 plays, scores **843.73 / 1,090.05**, sweeps **49.5% / 41%**, and target success **25.25% / 49%**. Lower peaks do not automatically lengthen chains: Starlit Gate and Terraces averaged 6.82. Initial four/five-peak graphs swept only 22% / 15.25%; revised fronts improved them to 45% / 41%. The selection sample had zero immediate layout repeats and zero incompatible Seals. See [PHASE4_SOLITAIRE_REVIEW.md](PHASE4_SOLITAIRE_REVIEW.md) for every layout/profile, method, raw-results path and interpretation.

**Verification:** **59/59 tests pass** (48-test Phase 3 baseline plus 11 focused regressions), including validation failures, arbitrary tip IDs, legal Seal release, every spell across every family, scoring charms, Second Deck, Spellbook/Hearthstone/Potion, Rewind/Undraw conventions, diagram/navigation data, final/endless flow and unchanged single-pick/stock-bonus settlement. `npm run build` succeeds without content warnings: 37 images, 106 variants and 19 artworks. Final production packaging excludes `dist/qa/`, preview sources and fixture references. A fresh review page exercised corrected theme/zoom controls with no console warnings/errors and retained its score. The actual built site has no review toolbar, opens Three Peaks with 23 stock/no spells, accepts keyboard/draw input and retains the deal through close/reopen; production diagnostics were empty. Existing art/writing, viewer, desktop interaction and accepted Starweave regressions all remain passing.

**Limits:** play was agent-directed/partly scripted, not a separate human playtest or Andrew's subjective approval. Phones were browser viewports, not physical touch devices; no screen-reader session occurred. Reduced motion used a labelled JS/CSS fixture. All families were played at 200% CSS zoom and a 640×400 equivalent viewport; native browser access timed out before the separate native zoom action, so native browser/hardware zoom is unverified. Short/narrow views intentionally scroll to retain legibility; all cards, tips and controls need not fit simultaneously. The greedy simulations are reproducible comparisons, not optimal win-rate estimates or proof of every seed's solvability. These limits do not authorize Phase 5 or create another scope-approval stop.

**Exit:** all five peak counts play correctly; no orphan tips, impossible Seal, obscured ranks or off-screen critical controls. If a brief fails the intended streak/peak tradeoff, revise its graph.

Suggested commit: `feat: support Solitaire layouts with one to five peaks`.

### Phase 5: sequential double rewards and immutable next-deal planning

Build this before contracts so their resource checks see the final real loadout.

- [ ] Track whether final settled target plus sweep earns two selections.
- [ ] Implement the reward-break state machine, fresh eligible second offer, distinct reward IDs and cap/exhaustion handling.
- [ ] Preserve one reward for other continuing outcomes and no rewards for terminal losses.
- [ ] Carry the correct entitlement through the won-run Continue action into endless.
- [ ] Separate next-deal definition from starting it; lock layout/deck/curse data and reward-derived resources before any future contract offer.
- [ ] Make repeated callbacks, close/reopen and interrupted reward screens idempotent.

**Exit:** one selection cannot start a two-selection deal; earned choices cannot duplicate, disappear at a final deal or exceed caps. Stock-bonus target success qualifies.

Suggested commit: `feat: grant two rewards for a successful clean sweep`.

### Phase 6: enchantments, curse visuals and achievable contracts

Deliver in coherent substeps, with tests after each.

**6A: Treasure and multiplier prototype**

- [ ] Add occurrence-based enchantments with the trigger/undo rules in section 4.
- [ ] Implement accepted Treasure.
- [ ] Prototype Double Points and Double Streak with explicit arithmetic, milestone/Clover rules and capped frequency.
- [ ] Present a playable board/example and readable scoring breakdown; tune semantics and frequency from feedback before treating the multiplier balance as final.
- [ ] Preserve existing face-up knowledge through Rewind and restore all reward-related state correctly.

**6B: curse and combined-state presentation**

- [ ] Improve Hex, Seal, global curse/affected-control indicators and the shared Inspect affordance.
- [ ] Check combinations of enchantment + Hex, enchantment + Seal, spell targeting + curse, and multiple global curses.
- [ ] Confirm rank/suit legibility, accessible labels, touch behaviour, dark mode and reduced motion.

**6C: contracts with proof of achievability**

- [ ] Start offers only for deal four onward.
- [ ] Implement the approved contract pool, resource/curse/peak filters and real spell-usability checks.
- [ ] Implement bounded search, isolated deterministic state and replayable witness verification on the exact next-deal definition.
- [ ] Offer only verified candidates; graceful no-offer fallback on unsupported mechanics, timeout or cancellation.
- [ ] Add Accept/Skip and Deal within the reward screen, one-time settlement and separate run-score bonuses.
- [ ] Exercise solver/live-rule equivalence with all approved enchantments, variable peaks and double-reward loadouts.

**Exit:** multiplier effects and curse states are understandable, witnesses satisfy actual contracts, no impossible or no-spell-only offer slips through, and reward/undo loops cannot farm points. Save new-rule bests separately from prior bests.

Suggested commits: `feat: add Solitaire card enchantments`; `feat: clarify curse and card states`; `feat: offer achievable contracts from deal four`.

### Phase 7: complete musical spellcraft after revised preview feedback

- [x] Andrew accepted the current Starweave concept and balance; preserve its rune circle, sound families, durations and pet participation during later implementation.
- [ ] Promote the approved model/audio transport into a lazy-loaded production app.
- [ ] Complete agreed saves, longer compositions, scale/pitch choices and import/export around that model, with validated editable data.
- [ ] Develop the musical activity and authored recipes after the instrument's interaction is approved.
- [ ] Integrate global sound, OS lifecycle, phone/keyboard controls and storage documentation.
- [ ] Verify no voices survive Stop, mute, close, minimise, hiding or interruption.

**Exit:** visitors can create a deliberate musical spell with the pet, edit and retain it, and understand its sounds. A generic grid editor does not satisfy this revised direction.

### Phase 8: number reserved

The former game integration phase has moved entirely to `HAT_TO_HAT_PLAN.md` on its dedicated branch. There is no active Phase 8 work or dependency in this plan. Other phase numbers remain unchanged.

### Phase 9: content population, regression and handoff

- [ ] Populate any real art/novel content Andrew has supplied; keep other optional sections hidden.
- [ ] Run the repository's relevant tests and production build; resolve regressions caused by these phases.
- [ ] Review desktop/small phone, light/dark, reduced motion, keyboard, touch and zoom.
- [ ] Check every app still launches, resizes, closes and releases listeners/timers/audio correctly.
- [ ] Inspect final diff/build contents so review-only fixtures/debug controls are not accidentally published.
- [ ] Summarise completed phases, preview decisions, remaining author inputs and known limitations.
- [ ] Leave all work on the same branch, ready for the user's merge/deployment decision.

**Exit:** the agreed scope is implemented and verified, or any explicitly deferred preview decision is accurately recorded as unfinished. Do not mark a preview-gated feature complete merely because its prototype exists.

Suggested commit: `test: verify content expansion integration`.

### Files expected during implementation

Existing: `apps.js`, `content.js`, `style.css`, `solitaire.js`, `sound.js`, `kasai-core.js` where required, `build/build.mjs`, relevant OS launch registration, README and existing tests.

New proposed files: `musicbox.js`, shared pure rule helpers if required, focused tests, isolated preview pages, `assets/art-process/`, optional `assets/writing/`, and an authoring guide. Add the public authoring guide at a tracked path or keep its complete instructions in README/content comments; do not depend solely on ignored docs.

Relative effort: authoring features medium; variable layouts medium-to-large; double rewards medium; enchantments/curse presentation medium; **contract proof search large**; music large. These compare scope rather than promise delivery times.

## 11. Verification for implementation

Use meaningful rule/interaction tests and `npm run build` after the corresponding code changes. A Markdown-only planning update does not require rebuilding the website.

- **Layouts:** one-to-five-tip graphs, peak bonus totals, valid Seal dependency/curse selection, all-card reachability, seeded repeatability, phone navigation and target success.
- **Rewards:** correct final target/sweep qualification, sequential resource updates, exhausted pools/caps, final-to-endless entitlement, idempotent pick/commit, Spellbook independence.
- **Enchantments:** exact per-card versus carried-streak arithmetic, Hex/Kindred/Ember/Clover interaction, no hidden badge leak, Fireball tradeoff, Rewind/Undraw, last-card/target effects and no repeated reward.
- **Contracts:** strict deal-four boundary, owned/usable spell prerequisites, single-peak exclusions, witness replay through real rules, timeout/no-offer fallback, immutable deck/loadout, undo accounting and one-time payout.
- **Art/writing:** backward compatibility, partial fields, long text, escaped characters, process images excluded from art discovery, missing-path messages, focus and viewer/section navigation.
- **Music:** rune/time/pitch mapping, duration and recipe edits, distinct voices, pet conducting, save/import when implemented, scheduled stop/mute and phone audio timing.
- **Manual review:** actual audio listening and real gameplay are necessary for feel. Keyboard access alone is not proof a real-time game is usable by all assistive technology.

## 12. Review and author input still needed

### Settled scope: do not ask Andrew to approve these again

- [x] One-to-five peaks and different streak/peak-scoring opportunities.
- [x] Treasure; remove Lantern from implementation.
- [x] Improved cursed-card indicators in the enchantment phase.
- [x] Contracts beginning after deal three, with resource checks and achievable offers.
- [x] Two selections when target and clean sweep are both achieved.
- [x] Art reverse sides and the proposed authoring model.
- [x] Novel overview and the proposed authoring model.
- [x] One implementation branch and a phased delivery plan.
- [x] Previously uncommented details; Starweave’s revised concept is now accepted. The separately deferred game is outside this plan.

### Review through concrete previews

- [x] Revised music concept accepted by Andrew: rune-circle mapping, distinct voices, duration and pet conducting. Actual-phone listening/touch remains technical verification.
- [ ] Solitaire: multiplier arithmetic/feel and combined cursed/enchanted visuals as the design is refined. Treasure remains accepted; exact new multiplier values are proposed.
- [x] Layout prototypes: verify the intended broad-front versus peak-award tradeoff rather than assume peak count supplies it. Phase 4 graph revisions, comparisons, actual browser play and technical limits are recorded above; no separate human playtest approval is claimed.

### Authored material Andrew can provide later

- [ ] Art notes, optional medium/year and optional process images with captions/alt text.
- [ ] Novel hook/premise; optional cover, characters, setting and current sample.
- [ ] Preferred final names, illustrations or original example melodies, if wanted.

Functional art/writing features can be completed before this material arrives, using existing real content and hidden optional sections.

## 13. Canonical document and branch status

The canonical plan is **`CONTENT_EXPANSION_PLAN.md` in the repository root**, where Git can include it normally; it is tracked with the Phase 0 baseline commit. The original `docs/content-expansion-plan.md` is a local pointer to it, because docs is currently excluded by local Git rules. This avoids leaving the implementation instructions solely in an ignored folder.

The active branch is **`codex/content-expansion`**. Andrew subsequently requested the game be preserved separately on **`codex/hat-to-hat`**, with its own plan. **Phases 2, 3 and 4 are complete here**; stop this continuation after Phase 4. Phases 5–7 and 9 remain unimplemented. Preserve the branch separation; no push, merge or deployment is authorised.

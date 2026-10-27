# Kasai OS: selected content expansion plan

Phased implementation plan, revised after Andrew's feedback on 27 October 2026.

**Status: Phase 0 complete; Starweave’s current concept accepted by Andrew. Hat to Hat revised with travelling curved wards and drifting power runes, ready for another Phase 1 review.** Later phases and production integration remain unstarted.

**Single implementation branch: `codex/content-expansion`.** Keep every phase, preview, fix and final integration on this branch. Use phase-sized commits; no branch per feature. Push, merge and deploy are separate from this planning request.

### Confirmed decisions from the latest review

- Solitaire layouts may have **one to five peaks**. Their different opportunities for streaks and peak bonuses are an intended source of challenge.
- Treasure is accepted. Remove Lantern from the implementation; develop understandable card-point and streak multipliers instead.
- Improve curse indicators as part of the enchantment work, including their coexistence on one card.
- Contracts first apply to **deal four**, after completing deal three. Offer only objectives actually achievable for the specific planned deal and available resources. Light Touch and Keep a Spark require an owned usable spell.
- A clean sweep **and** reaching the target earns **two sequential reward selections**. Other continuing deals keep their current single selection.
- Art reverse sides, novel overview and the remaining uncommented details are accepted; Andrew still supplies authored content.
- Build working music and hockey previews before committing to their final interactions or effects.

## 1. Scope and recommended direction

| Original idea | Proposed addition | Main design decision |
| --- | --- | --- |
| 23 | More Spell Solitaire layouts | One to five peaks, explicit coverage/Seal metadata, distinct streak and peak-scoring opportunities. |
| 24 | Special Solitaire cards and clearer curses | Treasure plus prototypes of card-point/streak multipliers; replace Lantern; make all states readable together. |
| 25 | Optional Solitaire contracts and double rewards | From deal four; prove offered contracts doable; two choices for target plus sweep. |
| 33 | Art card reverse sides | A separate flip control reveals authored notes and process images; full-size artwork remains easy to open. |
| 35 | A current novel introduction | Build a reusable writing overview with optional premise, characters, setting and sample sections; Andrew supplies the actual material. |
| 41 | Musical spellcraft with the pet | Place symbols around a spell circle to compose music; the pet conducts and reacts. |
| 44 | A hat spell duel against the pet | Deliberate casts, timed shields, self and portal defence, and on-field spell runes. |

Keep the site's visual language, vanilla JavaScript architecture, lazy loading, keyboard controls, mobile layouts and existing sound preference. New visual effects must have reduced-motion alternatives. Content features must look complete when only some optional information exists.

This is a sizeable set of changes. Implement and review each feature in stages; do not merge all Solitaire mechanics into one untested change.

## 2. Relevant current implementation

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

Add an optional `details` object to the artwork's existing entry in **`content.js`, section 2, `art`**. The `img` value must exactly match the existing artwork path. This is a future format, not a feature that works today.

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
- Deliver **`docs/CONTENT_AUTHORING.md`** with a copy-and-paste template and screenshots/location instructions. Put a concise version in the `content.js` author comments and README too, since `docs/` is currently local-only.
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

**Latest review:** Andrew is really happy with Starweave and says it strikes the perfect balance. Preserve this accepted concept; this continuation changes only the duel. Remaining music work is technical completion/integration and device verification, not another conceptual redesign.

Phase 1 reviewed the circle, sound differences, pet involvement and whether combining ingredients feels playful. Named saves, richer scales, longer compositions, import/export, the final music activity and production sound/OS integration await Phase 7 and feedback. Do not merely reskin the old grid. The initial kernels may remain as historical experiments; they are not the current interaction.

## 9. Idea 44: Hat to Hat, a spell duel

**Revised after Andrew tried the air-hockey preview.** The continuous puck, passive strikers and first-to-five goal match are superseded. The player controls a coloured wizard hat against the pet wizard's hat. The player defends both their own hat and their portal, deliberately casts projectiles and uses a brief reaction shield to return incoming spells.

Initial Phase 1 tuning, explicitly provisional:

- Six hearts each. An unshielded hat hit costs one heart; a portal hit costs two. Fire adds one damage. Damage clears that projectile, with a short hit grace period.
- Cast at a chosen time and angle. One live cast originating from each side, at most two orbs total. Parrying changes the threatening owner while retaining the original caster slot, so returns cannot bypass the budget. A spell expires after eight active seconds or bounded wall contacts; there is no automatic persistent ball or serve loop.
- Andrew’s next review replaces the body-centred shield with a launched curved ward. It starts ahead of the hat, travels along the aim captured at launch, and moves independently of subsequent hat movement. Initial tuning: a 108-unit-wide curve, speed 280 units/s, 0.65s lifetime and 1.8s recharge. One enemy-orb contact returns the spell along that captured direction and spends the ward, with a brief visual fade. Expiry also fades it. It provides no invulnerability at the hat, cannot catch friendly spells and is not a closed circle.
- Fire/Electric power runes drift slowly around the field and rebound within a broad central region, including while recharging. Their motion freezes on pause/countdown. Use relative swept collisions for moving rune/orb collection. Shoot through them to empower a shot. Fire speeds travel and adds damage; Electric makes the next two side banks leave at 45 degrees toward the same end. Runes recharge, powers do not stack, and a parry retains an acquired power. Field geometry and exact effects remain review proposals.
- Pointer/touch move and aim modes, a relative phone movement pad, aim slider, separate Cast/Shield buttons, and keyboard movement/aim/cast/shield/pause. Aimed casting should not require covering an orb with a finger.
- Bounded movement/AI, a visible enemy cast wind-up, swept projectile collisions with moving hats, shields, walls, posts, portals and rune gates. Fixed-timestep simulation, bounded catch-up and projection-only resizing. No orb-to-orb collisions initially.
- The existing animated pet is the opponent and reacts to casting, parries and hits. Player hat colour is selectable. Keep the site's own art/visual language.
- Pause freezes every combat clock. Require a visible Resume countdown after interruptions. Keep a quiet-arena practice option and an explicit incoming-shot test for shield review. Real-time nonvisual equivalence is not claimed.

Phase 1 must test the two simultaneous defensive targets, timing, readable threats, deliberate orb release, spell gates and pet character. Final balance, sound, art polish, records, progression and production integration wait for Phase 8 and feedback.

## 10. Phased implementation plan

### Branch and delivery rules

- **Use one branch throughout: `codex/content-expansion`.** It has been created from the current main checkout. No feature branches or separate worktrees are needed.
- Commit each completed phase, or a coherent substep within a large phase, on that branch. Suggested commit subjects below are descriptions, not instructions to push or merge.
- Keep previews, reusable rule code and final implementation together. Keep review-only preview pages out of the production build unless Andrew explicitly wants them published.
- Update this document's progress boxes as work actually completes. Acceptance of scope does not mean a phase is finished.
- Phase 0 remains complete. Revised Phase 1 is ready for Andrew’s review; stop before later phases and production integration.
- Full music/hockey integration depends on Andrew trying their previews. Independent approved phases may continue while that feedback is pending.
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

### Phase 1: revised previews, pet-led musical spells and a hat duel

**Revision implemented (27 October 2026).** Andrew’s feedback replaced the initial grid editor and plain air hockey as the direction for these features. The first implementation and its 38-test result remain historical evidence, not approval of those concepts. Phase 0 is complete and is not being repeated.

Current review paths through npm run dev:

- [Starweave](http://localhost:4321/design-lab/content-expansion/starweave)
- [Hat to Hat](http://localhost:4321/design-lab/content-expansion/duel)
- [Workshop](http://localhost:4321/design-lab/content-expansion/index)

Revision checklist:

- [x] Record Andrew's feedback and replace sections 8/9 and the dependent Phase 7/8 briefs. Keep approved unrelated phases intact.
- [x] Build a working musical spell circle with three audible rune families, predictable timing/pitch/duration, remixable original recipes and the actual animated pet conducting/reacting.
- [x] Provide accessible moment buttons, phone controls, Undo, deliberate audio, clock-synchronised playback and cancellation.
- [x] Build the coloured-hat duel with self/portal damage, chosen casts, bounded simultaneous projectiles, short timed shields, field rune powerups and expressive pet opponent.
- [x] Provide pointer/touch/keyboard movement and aiming, phone pad/Cast/Shield, pause/countdown and explicit practice controls.
- [x] Exercise meaningful music/audio and combat-rule tests, desktop/phone browser behaviour, console errors, production build and review-page exclusion.
- [x] Update review notes with actual results, remaining limitations and direct preview links; commit on the same branch without pushing.
- [ ] Andrew tries the revised concepts and supplies further feedback. Do not infer final design approval.

Stop after this revised Phase 1. Phases 2 onward and production integration are outside this continuation.

Verification of the revised concepts:

- npm test: **53/53 pass**, comprising 23 original baseline tests, 15 retained initial-kernel regressions and 15 new musical-circle/audio/duel tests. New checks cover angle/pitch round-trips, actual waveform/harmonic differences and cancelled voices, chosen casts/two-orb budget, hat versus portal damage, shield timing/recharge/parry ownership, rune crossings, Fire/Electric rules, expiry, pause/countdown, moving-hat limits, swept posts and deterministic combat stress.
- npm run build: success without warnings. Revised source routes/dependencies return HTTP 200. The production-preview server returns 404 for Starweave, the duel and the companion module while the portfolio root returns 200. The physical output/reference scan confirms exclusion. That temporary production server is stopped; the source server is retained for Andrew’s review.
- Browser: audible-transport activation and cancellation, circle/numbered placement, actual ingredient drag, three-family pet response, Undo and mute preserving the composition. Duel: empty quiet arena, chosen cast causing a hat hit, a shot collecting Fire and later dealing three portal damage, shield activation without accidental pause, explicit pause/resume, aim slider and relative-pad movement. Desktop and 390px layouts have no horizontal page overflow. Console checks found no warnings/errors.
- A UI focus bug discovered in playtesting was fixed: disabling Cast/Shield after use no longer automatically pauses combat. Keyboard and the focused arena remain usable after button activation.
- Prototype limits are displayed on both pages: music has four pitches/sixteen moments/three voices, no saves/export/full activity; duel has initial balance/AI, circular hit areas, eight-second life and no orb-to-orb collisions, records, sound or OS integration. Actual phone listening/touch, live parry comfort, native OS/tab interruption and subjective game/music feel remain user/device checks. Do not count desktop automation as those checks.
- The old /music and /hockey links lead to the revised pages. Original unused editor/hockey UI modules and kernels remain tracked as historical experiments; the shared circle sweep is reused by the duel. They are not the approved current concepts.

### Phase 1 follow-up: travelling wards and drifting runes

Andrew accepted Starweave’s balance but requested a stronger duel: send a curved shield out into the arena instead of surrounding the hat, and let powerups move slowly. Starweave sources are unchanged.

- [x] Replace hat shield/invulnerability geometry with an independent launched curve; capture direction at launch, expire/fade after 0.65s or spend/fade on one contact.
- [x] Share the visible curve’s geometry with continuous segment/capsule collision tests. Preserve powered returns, original caster slots and speed caps. AI uses the same launched-ward rules.
- [x] Drift both rune powerups slowly inside the field, including during recharge, using relative moving-rune collision sweeps.
- [x] Freeze wards, rune positions and their timers during pause/resume countdown; update controls, pet text and help.
- [x] Automated verification: **61/61 tests pass**, including eight additional geometry, remote interception, independent movement, no body immunity, friendly-shot exclusion, one-contact spending, deadline/fade, pause/countdown and moving-rune boundary/collection regressions.
- [x] Browser verification: actual incoming practice spell returned by the launched ward (one parry recorded), visible separated crescent, pause state and console check. 390px browser controls and layout also pass with no horizontal page overflow. The production build passes without warnings and a physical output/reference scan confirms preview exclusion.
- [ ] Andrew tries the revised duel. Range, width, lifetime, movement pace and game feel remain provisional.

### Phase 2: art reverse sides and content authoring

- [ ] Implement the optional details schema, metadata passthrough and process-image build support from section 6.
- [ ] Restructure interactive art cards into valid sibling controls, then add reversible front/back presentation.
- [ ] Preserve viewer arrows/swipes, categories, Shuffle, colour selection and single/double-click preferences.
- [ ] Provide keyboard/mobile Inspect/flip behaviour and reduced-motion treatment.
- [ ] Add the exact editing path, safe example and asset-folder instructions to the authoring guide, content comments and README.
- [ ] Verify real existing art entries still work without any new fields.

**Exit:** Andrew can populate a real artwork using only the documented content entry and optional image folder. No fabricated published art notes. Use development fixtures for visual checks, then remove them.

Suggested commit: `feat: add authored art card reverse sides`.

### Phase 3: novel overview and writing authoring

- [ ] Implement the optional overview schema and reusable section navigation from section 7.
- [ ] Support premise, cover, characters, setting and an explicitly current sample, hiding absent sections.
- [ ] Preserve existing writing entries, archived chapter reading and external links.
- [ ] Add new image processing/validation and copy-and-paste authoring guidance.
- [ ] Populate only Andrew's provided current material; until then the current summary/status remain.

**Exit:** a partial or complete novel overview renders cleanly on desktop/mobile, and the archive cannot be confused with the rewrite.

Suggested commit: `feat: add structured novel overviews`.

### Phase 4: variable-peak Solitaire foundation and layout previews

- [ ] Extract/parameterise rule transitions enough to support layout validation, future search and rule tests.
- [ ] Generalise peak IDs/count, scoring, row depth, keyboard selection, dimensions and explicit coverage.
- [ ] Add compatible curse selection and safe Seal groups; exclude Seal where no valid group exists.
- [ ] Prototype at least one new layout for each of 1, 2, 4 and 5 peaks, preserving the existing three-peak options.
- [ ] Apply 100-per-intermediate / 250-last scoring as the initial proposal, with Twin Peaks handled generically.
- [ ] Preview real seeded deals at desktop and small-phone sizes. Measure frontiers/chains rather than claiming width follows automatically from peak count.
- [ ] Compare scores and success across families before accepting the geometries.

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

### Phase 8: complete the hat spell duel after revised preview feedback

- [ ] Settle the self/portal defence, casting budget, aiming, shield timing and rune effects from the new preview.
- [ ] Harden swept combat collisions, moving targets, simultaneous threats and idempotent damage.
- [ ] Complete fair AI, pet reactions, sound, match/records and deliberate interruption/resume.
- [ ] Verify actual phone movement/aim/Cast/Shield comfort and readable powered threats.
- [ ] Integrate the lazy-loaded duel and content-driven help; remove review controls from production.

**Exit:** the player can deliberately cast, defend their hat and portal, time a return and use field spells. No assumption of an always-live hockey puck remains.

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

New proposed files: `musicbox.js`, `hockey.js`, shared pure rule helpers if required, focused tests, isolated preview pages, `assets/art-process/`, optional `assets/writing/`, and an authoring guide. Add the public authoring guide at a tracked path or keep its complete instructions in README/content comments; do not depend solely on ignored docs.

Relative effort: authoring features medium; variable layouts medium-to-large; double rewards medium; enchantments/curse presentation medium; **contract proof search large**; music large; hockey large. These compare scope rather than promise delivery times.

## 11. Verification for implementation

Use meaningful rule/interaction tests and `npm run build` after the corresponding code changes. A Markdown-only planning update does not require rebuilding the website.

- **Layouts:** one-to-five-tip graphs, peak bonus totals, valid Seal dependency/curse selection, all-card reachability, seeded repeatability, phone navigation and target success.
- **Rewards:** correct final target/sweep qualification, sequential resource updates, exhausted pools/caps, final-to-endless entitlement, idempotent pick/commit, Spellbook independence.
- **Enchantments:** exact per-card versus carried-streak arithmetic, Hex/Kindred/Ember/Clover interaction, no hidden badge leak, Fireball tradeoff, Rewind/Undraw, last-card/target effects and no repeated reward.
- **Contracts:** strict deal-four boundary, owned/usable spell prerequisites, single-peak exclusions, witness replay through real rules, timeout/no-offer fallback, immutable deck/loadout, undo accounting and one-time payout.
- **Art/writing:** backward compatibility, partial fields, long text, escaped characters, process images excluded from art discovery, missing-path messages, focus and viewer/section navigation.
- **Music:** rune/time/pitch mapping, duration and recipe edits, distinct voices, pet conducting, save/import when implemented, scheduled stop/mute and phone audio timing.
- **Duel:** chosen cast limits, self/portal damage, shield timing and ownership, swept moving-hat/post/rune collisions, power rules, AI wind-up, expiry, resizing and interruption.
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
- [x] Previously uncommented details, except music/hockey interactions which explicitly await previews.

### Review through concrete previews

- [x] Revised music concept accepted by Andrew: rune-circle mapping, distinct voices, duration and pet conducting. Actual-phone listening/touch remains technical verification.
- [ ] Revised duel: deliberate casting, self/portal defence, reaction shield, field rune powers, pet opponent and phone controls.
- [ ] Solitaire: multiplier arithmetic/feel and combined cursed/enchanted visuals as the design is refined. Treasure remains accepted; exact new multiplier values are proposed.
- [ ] Layout prototypes: verify the intended broad-front versus peak-award tradeoff rather than assume peak count supplies it.

### Authored material Andrew can provide later

- [ ] Art notes, optional medium/year and optional process images with captions/alt text.
- [ ] Novel hook/premise; optional cover, characters, setting and current sample.
- [ ] Preferred final names, illustrations or original example melodies, if wanted.

Functional art/writing features can be completed before this material arrives, using existing real content and hidden optional sections.

## 13. Canonical document and branch status

The canonical plan is **`CONTENT_EXPANSION_PLAN.md` in the repository root**, where Git can include it normally; it is tracked with the Phase 0 baseline commit. The original `docs/content-expansion-plan.md` is a local pointer to it, because docs is currently excluded by local Git rules. This avoids leaving the implementation instructions solely in an ignored folder.

The shared branch **`codex/content-expansion`** has been created. Phase commits remain on this branch. No push, merge or deployment is authorised by the Phase 0/1 implementation request.

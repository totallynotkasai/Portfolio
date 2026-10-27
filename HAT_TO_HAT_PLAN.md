# Hat to Hat: deferred design and implementation

**Status: parked at Andrew’s request on 27 October 2026.** The concept may work, but Andrew needs time to think it through. Do not continue its design, implementation or production integration without a later request. It does not gate any work in CONTENT_EXPANSION_PLAN.md.

**Dedicated branch: codex/hat-to-hat.** This branch preserves the complete working prototype, tests, predecessor experiments and shared assets at the separation point. The current content-expansion branch will remove duel-only code, tests and links without rewriting history. Starweave remains accepted and stays in the main expansion scope.

## Resume context

- Latest implemented revision: travelling crescent wards and slowly drifting Fire/Electric runes, committed in 57c25c7.
- Earlier concepts: a84b303 initial grid/hockey previews; b3e7c40 rune-circle music and hat-duel redesign.
- Preserve chosen casts, self/portal defence, limited simultaneous orbs and the pet opponent as current proposals. Neither the duel’s concept nor tuning has final approval.
- Outstanding human decisions include the overall duel feel, aiming/movement, ward range/width/lifetime/recharge, rune motion, orb budget, damage and whether the two defensive targets create enjoyable decisions.
- Remaining technical checks include real-phone play, live ward comfort, native interruption/resume and stronger maximum-speed/simultaneous-contact testing.
- No duel work is required for Phase 2 or any other active expansion phase.

## Running the preserved prototype

Use a checkout of codex/hat-to-hat, run npm run dev, then open http://localhost:4321/design-lab/content-expansion/duel. The source server follows its checkout. The continuing content-expansion checkout intentionally does not serve this prototype. Run npm test and npm run build on the dedicated branch; the preserved state passed 61/61 tests and its production output excluded review pages. These are historical separation results, not a guarantee after future edits. No push, merge or deployment has been performed.

## Preserved sources

- design-lab/content-expansion/duel.html, duel.mjs, duel-rules.mjs.
- design-lab/content-expansion/hockey.html, hockey.mjs, hockey-physics.mjs: initial experiments, with circle sweep reused by the duel.
- tests/travelling-ward.test.mjs; duel cases in tests/spell-concepts.test.mjs; initial hockey cases in tests/content-expansion.test.mjs.
- Shared companion.mjs, preview.css, spell.css and the unchanged production wizard rig/assets. Keep only shared material that a future implementation needs.

## Current detailed concept

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


## Preserved controls, limits and verification

## Hat to Hat

Begin duel, move your coloured hat and choose when to Cast. Each side has one live originating cast, so at most two orbs exist. Plain hat hits cost one heart; portal hits cost two. Fire adds one damage and speed. Electric changes two side banks to a predictable 45 degrees. Power runes drift slowly and rebound within the central field, even while recharging. Powers are collected by shooting through the moving runes; their recharge prevents stacking/replacement. Symbols, remaining orb life and bank charges are shown.

Spell Shield launches a 108-unit-wide crescent at 280 units/s along the aim captured at launch. It travels independently of the hat for at most 0.65s, fading at expiry. Its first enemy spell contact returns that spell along the captured direction, spends the ward and leaves a brief fading arc. Recharge is 1.8s. It is not a hat bubble: flanks and the space behind it remain exposed. Friendly spells pass through. Holding the key cannot sustain protection. The threatening owner changes but the original caster slot remains occupied. Unshielded hats take damage, rather than passively bouncing a puck. Projectiles expire after eight active seconds or bounded banks.

Pointer/touch uses explicit Move/Aim modes; the separate relative pad always moves the hat. Aim with the slider or Q/E, cast with J, shield with Space/K, move with WASD/arrows and pause with P. Large phone Cast/Shield/Pause controls remain near the arena. Enemy casts have a visible wind-up; the animated pet is the opponent and reacts to combat. Choose a hat colour. Practice controls can disable AI and send an incoming shot. Pause freezes all combat clocks, ward travel and rune drift; Resume has a countdown.

Initial AI, balance and art tuning; circular hat hit areas; no orb-to-orb collisions, production sound, records, progression or OS integration. There is no equivalent nonvisual real-time mode. Real phone controls and live shield comfort remain for review.

## Verification · 27 October 2026

- npm test: 61/61 pass (23 baseline, 15 retained initial kernels, 23 revised-concept/ward tests).
- npm run build: success without warnings. All revised source pages/dependencies return 200; production output excludes this entire directory and its references. Temporary production HTTP checks: root 200, revised pages/companion module 404.
- Browser checks: audio activation/playhead/Stop/Mute; actual ingredient drag, numbered/phone placement, Undo, pet response; chosen duel cast/hat damage, Fire collection and three-damage portal hit, shield activation, pause/resume, aim and relative-pad drag. Desktop/390px layouts show no horizontal page overflow. No console warnings/errors observed.
- A disabled-button focus bug found in browser playtesting was fixed so casting/shielding do not pause the duel.
- Actual listening/voice balance, real-phone touch, native OS/tab interruption and subjective feel are not established by browser automation and await review. Pure tests establish parry mechanics; they do not approve human reaction timing.

### Latest ward review checks

Eight additional tests verify the shared visible/collision curve, independent movement, remote powered returns, one-contact spending/fade, no body immunity, friendly shots, exact expiry, pause/countdown, bounded rune drift and relative swept collection. Browser play returned a real practice shot with the travelling ward and recorded a parry; the visible curve remained separate from the hat. Rune drift was exercised through active play and pause. Updated 390px controls/layout show no page overflow; console checks are clear. The production build passes without warnings and output/reference scans confirm exclusion. Motion/timing values remain review knobs. Starweave sources were left unchanged after Andrew accepted that concept.


## Historical Phase 1 record

The following record includes the contemporaneous Starweave comparison for context. It is historical; it is not a request to redo or change the accepted music concept.

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


## Deferred future implementation

### Phase 8: complete the hat spell duel after revised preview feedback

- [ ] Settle the self/portal defence, casting budget, aiming, shield timing and rune effects from the new preview.
- [ ] Harden swept combat collisions, moving targets, simultaneous threats and idempotent damage.
- [ ] Complete fair AI, pet reactions, sound, match/records and deliberate interruption/resume.
- [ ] Verify actual phone movement/aim/Cast/Shield comfort and readable powered threats.
- [ ] Integrate the lazy-loaded duel and content-driven help; remove review controls from production.

**Exit:** the player can deliberately cast, defend their hat and portal, time a return and use field spells. No assumption of an always-live hockey puck remains.


## Eventual completion criteria

Resolve Andrew’s design feedback before integration. Harden chosen-cast limits, self/portal damage, shield ownership, moving-hat/post/rune collision sweeps, AI telegraphing, lifetime/charges, simultaneous contacts and interruption. Integrate a lazy-loaded app, content-driven help and sound only when requested. Remove review-only controls from production. Preserve earned unrelated Portfolio progress when bringing this work back later.

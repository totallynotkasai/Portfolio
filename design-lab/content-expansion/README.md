# Starweave preview · active content-expansion branch

Andrew accepted the current Starweave concept and balance. Preserve its circle, rune families, pet participation and interactions during future technical completion.

Run npm run dev from the repository root:

- http://localhost:4321/design-lab/content-expansion/starweave
- http://localhost:4321/design-lab/content-expansion/index
- The old /music route redirects to Starweave.

## What to try

Enable sound and Cast the song. Place Star chimes, Ember plucks and Moon hums by tapping the circle or dragging an ingredient onto it. Clockwise position is time; outer rings are higher pitches. Numbered moment buttons and phone ingredient/pitch controls provide equivalent edits. Keyboard arrows choose time/pitch, Enter places and Delete erases. Undo restores an edit.

The actual animated pet conducts the audio-clock star and reacts to rune families. Three original recipes can be remixed. Voices differ in waveform, harmonics and envelope. A rune rings for one, two or four moments; duration stops at the loop boundary and may overlap later notes. The current palette has C4/E4/G4/C5 and sixteen moments, one rune start per moment. Stop, mute, edits and interruption cancel owned voices. Muting preserves the composition.

No named saves, reload persistence, export, larger compositions or full musical activity yet. These are later Phase 7 requirements. Real-phone listening/touch and native OS/tab interruption remain technical verification; the concept itself has been accepted.

## Separation of the deferred game

Hat to Hat has been removed from this branch’s preview routes, sources, styles and tests, and is preserved on codex/hat-to-hat. All game scope, review history and future tasks are in the root HAT_TO_HAT_PLAN.md. It does not block Phase 2 or any remaining active expansion work. The source server follows this checkout, so the old game URLs are intentionally unavailable here.

## Sources and checks

spell-music-model.mjs, spell-audio.mjs and companion.mjs support the current preview; starweave.mjs provides its review UI. The original unused music-model.mjs, music-audio.mjs and music.mjs remain historical music experiments. Production wizard rig/assets and runtime are unchanged. Shared styles retain only music/general preview rules.

The active tests cover original interaction/Solitaire rules, music model/audio behaviour and production exclusion. Game-specific regressions remain with their preserved code on the dedicated branch; the pre-separation combined suite passed 61/61. After cleanup, npm test passes 33/33 and npm run build succeeds without warnings; the preview directory remains excluded from dist. Browser recheck confirms Starweave renders correctly with no console warnings/errors. Run those checks again after relevant phase changes. Production packaging copies only root web files plus assets/ and fonts/, excluding this review directory.

Next authorised task: complete Phase 2 (art reverse sides and content authoring) from CONTENT_EXPANSION_PLAN.md in a new chat, on codex/content-expansion. Do not implement later phases or resume the deferred game in that task.

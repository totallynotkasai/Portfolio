# Phase 1 interaction previews

Run `npm run dev` from the repository root and open:

- http://localhost:4321/design-lab/content-expansion/index
- http://localhost:4321/design-lab/content-expansion/music
- http://localhost:4321/design-lab/content-expansion/hockey

The source server uses clean URLs, without `.html`. It does not resolve directory indexes, so include `/index` for the review hub. These sources are explicitly tracked despite local `design-lab/` ignore rules. Production copies only root web files plus `assets/` and `fonts/`, so none of this folder is deployed. No production launcher or sound preference was changed.

## What to try

Music: draw C4 across four columns and listen to one held note. Clear and tap C4 in separate steps; listen to separate attacks. Load the original sample, toggle its reference overlay, edit a pitch, split a hold and Undo. Use the labelled time-page buttons on a narrow screen. Enable sound deliberately, then Play. Stop, Mute, edit, tempo change, window blur and tab hiding cancel queued voices. Muting preserves the pattern. Keyboard arrows move the cursor; Enter creates a fresh note and Delete erases.

Hockey: Serve, then use pointer/drag, arrows/WASD or the relative pad. The lower Pause/Resume button stays next to phone controls. First to five wins; New match alternates the opening receiver. The conceding side receives after a goal. Pause, select Fire or Electric, then Resume to compare effects without a random wait. Enable Spawn pickups for ordinary rally spawns. The puck collects pickups; powers cannot stack. The sidebar explains the current starting rules. Power timers freeze on pause/countdown.

## Reusable implementation

- `music-model.mjs`: one pitch per step, stroke-based holds, interpolation in both drawing directions, event extraction, Split/Join.
- `music-audio.mjs`: audio-clock note scheduling, loop transport, owned/cancellable voices; no dependence on named production sound effects.
- `hockey-physics.mjs`: fixed-step logical table, swept circular/moving-striker/post/pickup contacts, scoring/serve, bounded movement/impulses, active-time power/spawn rules. Strikers keep a puck-width wall clearance to prevent impossible pinches. UI and debug controls are separate.
- `music.mjs` / `hockey.mjs`: review-only DOM, controls and rendering. Hockey uses 120 Hz fixed simulation with bounded catch-up; resizing changes only the canvas projection.

## Verification and limits

Automated checks are in `tests/content-expansion.test.mjs`: drawing in both directions, latest-column edits, hold/repeat/erase/Split/Join semantics, audio scheduling/cancellation, movement caps, moving-striker sweeps, rounded posts, radius-aware goals, one-time scoring, Fire limits/recoil, Electric direction/charges/return, pickup warmup/expiry, pause/countdown timers and five deterministic stress matches that finish at five without escaping the table or exceeding speed limits. The complete repository test suite and production build are run for handoff. Physical build contents and source HTTP paths are checked separately.

On 27 October 2026, `npm test` passed **38/38** and `npm run build` completed without warnings. All source preview paths/dependencies returned HTTP 200 with correct MIME types. A temporary `--dist` server returned 404 for the hub, music, hockey and music module, with `/` returning 200. The physical production output/reference scan also passed; that temporary server was stopped.

Browser checks cover actual pointer drawing, separate taps, Undo, sample/overlay, sound activation, Play/playhead/Stop/Mute, keyboard edits, desktop and 390px layout/paging; hockey Serve/countdown, keyboard pause, relative-pad drag, real rallies, power controls and pause when focus leaves the game controls. Browser console checks found no errors or warnings. Tab-hidden/window-blur handlers are implemented; background automation did not reproduce native visibility changes, so an actual OS/tab interruption test remains pending. Narrow-browser testing is not a real phone test, and successful Web Audio scheduling is not a listening assessment. Andrew's listening, touch-device test and judgement of rally/AI/recoil/bank feel remain pending.

Music currently has one C-major bar, a sine voice and one original sample. Named saves, reload persistence, other scales/lengths, import/export and Match the tune belong to Phase 7. Hockey has no saved statistics, production sound or OS integration. Collision handling is a tested prototype, with more maximum-speed/contact and actual-device testing required before Phase 8 integration. Rendering uses fixed-step positions rather than interpolation; that presentation refinement remains for Phase 8.

There is no real-time nonvisual equivalent for hockey. Reduced motion avoids trails/shake/flashing while preserving physics. All of the powers, control feel and music gestures remain proposals for review, not final design approval. Phase 2 onward has not started.

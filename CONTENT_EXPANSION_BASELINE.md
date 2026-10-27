# Content expansion baseline — 27 October 2026

Phase 0 on the existing `codex/content-expansion` checkout. Starting status: only the untracked canonical plan; no production edits. No branch/worktree recreation.

## Verification before implementation

- `npm test`: 23/23 pass (interaction and Solitaire rules).
- `npm run build`: success, no warnings; 37 source images, 19 artworks, 106 generated variants.
- Production packaging in `build/build.mjs`: root `.html/.css/.js/.txt/.xml` files and only `assets/` and `fonts/` directories. Nested `design-lab/` is excluded. Its new files require explicit Git inclusion because local exclude rules ignore that folder.
- Local source server: `npm run dev`, default port 4321; clean URLs resolve `music.html` as `/design-lab/content-expansion/music` (directory indexes are not resolved).

## Assumptions to change in later phases

| Area | Current implementation / consequence |
| --- | --- |
| Layout graph | `solitaire.js:66–88`: `makeLayout` derives overlap from adjacent rows; 28 slots, four rows, three layouts, `TIPS=[0,1,2]`, `MIDDLE=1`. Metadata must replace these assumptions before variable peaks. |
| Peaks | `PEAK=[100,100,250]`; `uncover` indexes by `d.peaks`. Sweep settlement independently checks every slot removed. Twin Peaks doubles the award. |
| Seal | `makeLayout` seals middle tip plus its two covering cards; `sealed` requires slots 0 and 2 gone. `uncover`, help, announcements and deny text assume both outer peaks. `planOf` chooses curses before layout without compatibility filtering. |
| Sizing/navigation | `measure` divides peak width by 10.585; CSS assumes four rows; `buildTable` sets layout width, and arrow navigation uses the reference `SLOTS` coordinates rather than `slotsOf(d)`. Needs per-layout dimensions/navigation. |
| Scoring/undo | `play` handles Hex, Kindred, Ember and Clover; `remember` stores slots/pile/nudge/burnt/score/streak/peaks/reached. `rewind` restores these but retains seen faces. Draw's snapshot and `undraw` restore streak/Toll/nudge and send the drawn card under stock. Enchantment/contract fields do not exist. |
| Settlement/rewards | `endDeal` adds stock bonus before final target result and healing, tracks Spellbook separately, ends on terminal failure/final win, otherwise creates one offer. `choose` grants one pick and immediately calls `startDeal`. `keepDealing` constructs a fresh single offer after a won run. No two-choice entitlement or explicit Deal commit exists. |
| Offers/resources | `offer` draws two spells and one charm, fills shortages, respects spell/heart/charm caps. Next-deal metadata has target/curses/hex/layout but deck shuffling occurs in `startDeal`; future contract proof must pin the actual deck and resources first. |
| Curse visuals | `renderCards` uses `is-sealed`, Hex treatment and accessible labels on face-up cards. `curseChip` supplies global tooltip chips; draw/help text handles global effects. No independent enchantment badge/Inspect model exists. |
| Persistence | Module-level `run` survives window close/reopen; `unmount` removes view/listeners/timers, not the run. Reload does not restore a live run. Only finished/banked records are written under `kasai:solitaire` (`best`, `endless`, `longest`, trophy `won`). `K.store` wraps JSON localStorage with fallbacks. Do not invent a live-save migration. New scoring rules will need separate bests while preserving old records/trophies. |
| Audio | `sound.js` stores `{on}` under `kasai:sound`, creates audio through deliberate activation, supplies named effects and mute/interruption handling. Arbitrary scheduled-note transport is absent. Phase 1 uses an isolated transport without changing the production preference. |

Phase 1 introduces only isolated preview sources, focused preview-kernel tests and documentation. Production rules, launchers, audio service and content remain unchanged.

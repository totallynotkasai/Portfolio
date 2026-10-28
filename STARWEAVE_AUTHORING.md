# Starweave patterns and recipes

Open **Games → Starweave**. Choose an ingredient and pitch, then use the circle or the equivalent numbered controls. Clockwise means later; outer rings sound higher. Each circle has sixteen moments (four beats, with four moments per beat). Play follows the audio clock. Stop leaves the composition intact. Editing music stops playback; returning from a hidden/minimised/unfocused window never resumes a song automatically.

Star chimes, Ember plucks and Moon hums share the portfolio's global Sound switch, compressor and master volume. Enable sound deliberately, then Cast the song. Nothing starts just because a saved pattern was opened. The conductor uses the actual production pet rig, with private SVG definitions; it does not change petting counts, desktop position or personality. Reduced motion uses still expressions, numbered moment highlighting and a written playback position.

## Editing and longer pieces

- One attack per moment. Placing another rune at that moment replaces it while keeping the occurrence's ID. Erase removes that occurrence; Undo restores it.
- Durations are explicitly **1, 2 or 4 moments**. Sustained voices may overlap later attacks and cross into another circle. They must end within the whole piece; nothing wraps, clips or creates a three-moment duration silently.
- Add up to **eight circles / 128 moments**. Playback follows successive circles automatically. The Circle selector and Left/Right at a boundary reach the same absolute moments. Remove last empty circle refuses to discard notes or a continuing hold.
- Six presets offer major, minor and pentatonic selections. Edit the four pitch rings for custom ascending MIDI pitches from 48 (C3) to 84 (C6). Changing rings affects future placements only. Earlier notes retain their exact MIDI pitches and IDs. Notes outside the palette appear on dashed edge sockets, with pitch names and full numbered-control labels.
- Undo retains sixty composition snapshots in the current open window. Reload/close restores the autosaved composition, not its Undo history. Clear, New, recipe selection and valid imports can all be undone before closing.

## Local saves and recovery

Storage key: **`kasai:starweave:v1`**, independent of sound, Solitaire scores/trophies and the pet. Values are plain JSON, not the `K.store` envelope: direct storage access lets the app report quota/blocked-storage failures rather than claim a successful save.

```json
{
  "version": 1,
  "autosave": "a pattern object, or null",
  "saves": [{ "id": "stable-save-id", "name": "My pattern", "pattern": "a pattern object" }],
  "deleted": null
}
```

The quoted pattern placeholders above describe structure; they are not importable values. Named patterns hold full independent pattern snapshots, with up to 24 entries and names of 1–80 characters. New names are distinct without regard to case. **Replace selected** explicitly overwrites the selected snapshot and retains its save ID. **Load selected** is an undoable composition edit. **Delete selected** retains the removed entry in `deleted`; **Undo last deletion** restores it, including after reload. A later deletion replaces that single recovery slot. The app refuses recovery when the name is already used or the library is full.

Every committed music edit autosaves locally. Set title explicitly commits a title edit (leaving the field also commits it). Tune practice is temporary and never writes over the visitor's composition or named library. Return to my spell restores the original composition, circle, cursor and Undo history. Closing/reloading during practice also retains the original autosave; it does not save an unfinished exercise answer.

Malformed/unsupported library versions stay untouched. Valid named entries can still be read from a partially damaged library, but automatic writes are blocked to avoid destroying invalid entries. **Local save recovery → Download stored library** preserves the exact stored string. Starting a fresh local library requires its explicit confirmation and retains the open composition. Export the current spell as well before recovery. Blocked/quota failures leave the app usable in memory and tell the visitor to export JSON. Another tab changing the library blocks writes in this view; export the open spell, then close/reopen to read the other tab's library. No silent cross-tab overwrite or speculative migration.

## Editable pattern JSON

Download JSON is a portable, editable snapshot. Put current spell in editor copies it into the textarea. Files/pasted JSON are validated before application. A selected file is staged in the editor; **Apply JSON** is the separate, undoable load action. A stale asynchronous file read cannot overwrite newer edits or a later file selection. Maximum file size: 80 KB; maximum editor text: 80,000 characters.

This complete small example is an agent-created phrase, not Andrew-authored music:

```json
{
  "format": "starweave",
  "version": 1,
  "title": "A little answering spell",
  "tempo": 90,
  "loop": true,
  "bars": 1,
  "palette": [60, 64, 67, 72],
  "notes": [
    { "id": "opening-bell", "rune": "star", "pitch": 60, "start": 0, "duration": 2 },
    { "id": "answering-moon", "rune": "moon", "pitch": 67, "start": 8, "duration": 4 }
  ]
}
```

The model in `starweave-model.js` is the canonical validator:

- Exact `format: "starweave"`, `version: 1`; unknown fields and old rectangular-grid exports are rejected with feedback. No music is inferred from arbitrary marks.
- Nonblank title, at most 80 characters; integer tempo 50–160 BPM; boolean loop; integer `bars` 1–8. `bars` counts sixteen-moment circles.
- Exactly four ascending distinct integer MIDI pitches from 48 to 84 in `palette`. `notes[].pitch` independently uses that same MIDI range and may lie outside the current palette.
- Each note has a unique ID of 1–80 letters/digits/underscores/hyphens; a `star`, `ember` or `moon` rune; an integer zero-based absolute start from 0 through `bars * 16 - 1`; and duration 1, 2 or 4, ending inside the piece. Starts are unique. UI moment 17 is JSON `start: 16`.
- Validation clones and sorts notes by start. It never retunes, quantises, drops data or mutates the source. Invalid imports leave the current spell unchanged.

PNG exports draw every circle from that same model, with moment numbers, rune voices, exact pitches/durations, connections and continuing-hold notes. A text key under each circle keeps dense/outside-palette music readable. The export is a snapshot at the button press. PNG is visual; JSON retains editable music. MIDI/audio export is outside Phase 7.

## Built-in authoring and the activity

`starweave-model.js` contains `RECIPE_NAMES` and `recipe()` for **Starlight greeting**, **Wizard’s lullaby** and **Mischievous embers**. Their exact pitch/start/voice/duration arrangements preserve the accepted preview. They are original agent-created, remixable examples, not compositions attributed to Andrew. Selecting a recipe creates fresh note IDs for that copy; ordinary replacement/palette editing preserves them.

`TUNES` and `tune()` contain three additional original four-note exercises: **Four little bells**, **Spark and answer**, **Moon steps home**. Each names a voice, four pitches, starts and durations. They use the initial C4/E4/G4/C5 palette and the same validator and synthesis as the instrument. Keep exercise names and the explicit four-note instructions consistent if extending this pool.

Match the tune compares exact rune/pitch/start/duration plus composition length, ignoring generated IDs, title, tempo and loop preference. Every target attack must match and there must be no extra attack. Feedback reports exact matches and unmatched notes; a written hint gives the full target without requiring hearing or a timed response. Listening is deliberate, non-looping and cancellable through the same transport. Check and Return stop playback. There are no score records or pet rewards to duplicate.

Run `npm test` and `npm run build` after changing the model, recipes or audio. Technical checks and the remaining physical/listening limits are in [PHASE7_STARWEAVE_REVIEW.md](PHASE7_STARWEAVE_REVIEW.md).

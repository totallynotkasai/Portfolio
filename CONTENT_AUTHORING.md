# Content authoring: art and writing

The art and writing instructions below are canonical and tracked in Git. Edit text in root `content.js`; no renderer changes are needed.

## Art editing location

Edit **`content.js` → `2. ART` → `art: [`** in the repository root. This is the only content entry to change for an existing piece. Find its exact `img` path and extend that entry; do not add a second entry for the same file. An automatically discovered piece can be given a new metadata entry with just its matching `img` and `details`; its generated title and category remain available.

Final artworks stay in **`assets/art/<Category>/`**. PNG, JPG/JPEG and WebP files there automatically become gallery and Solitaire art. Folder names become category buttons. Keep existing `title`, `tag`, `pin`, `frame`, `chip` and `full` values when extending an entry. Rename a file only if you also update its metadata path.

## Safe starting entry

For the existing Pet Wizard entry, this is safe to paste as a replacement: it adds no claims or placeholder prose and shows no flip button until you supply material.

```js
{
  img: 'assets/art/Character Design/Pet Wizard 2.png',
  title: 'Pet Wizard',
  details: {
    year: '',
    medium: '',
    paragraphs: [],
    process: [],
  },
},
```

Fill any combination of fields with your own material. `year` is a string, so a year, date or range is fine. `medium` is a string. `paragraphs` is an array of strings, one per paragraph. Unknown fields can be omitted. Missing details, `{}`, blank strings, empty arrays and blank paragraph entries do not create a reverse side. Medium or year alone is enough to show About this piece. There is no required paragraph count.

For syntax only, this illustrates how to add prose. Replace the instruction with your words before saving it into a real entry:

```js
paragraphs: [
  "Replace this instruction with your description of the idea or process.",
],
```

Use double quotes around a string containing apostrophes, or escape apostrophes inside single quotes (`'Andrew\'s'`). Put commas between entries. Do not enter HTML: text such as `<em>` is displayed literally. Long notes scroll inside the back of the card; View artwork and Back to front stay reachable below the notes. Two or three short paragraphs and one to four process images are a useful starting size, with no hard limit.

## Optional process images

Create **`assets/art-process/<piece-name>/`**, outside `assets/art/`. For example, `assets/art-process/pet-wizard/01-sketch.png`. Supply your actual image before adding its path. Do not copy process images into the final-art folder: that would publish them as separate gallery and Solitaire artwork.

Then add an object to this piece's `details.process` array. This is an illustrative shape, not material to publish unchanged:

```js
process: [
  {
    img: 'assets/art-process/pet-wizard/01-sketch.png',
    alt: 'Replace with a useful visual description of your actual sketch.',
    caption: '',
  },
],
```

Each actual image requires `img` and useful `alt` text. `caption` is optional; blank captions produce no empty caption. Empty drafting objects are ignored; an object with a caption or alt but no image fails validation. Use forward slashes, exact filename case and a PNG, JPG/JPEG or WebP extension. No leading slash, URL, `..`, query string or URL encoding. The build reports the piece and field for unsupported fields, wrong types, missing files and case mismatches. Originals can be full resolution: the build generates 400px thumbnails, 800px page copies and viewer copies up to a 4000px longest edge, without enlarging small originals. Images load lazily and process thumbnails open their own viewer set.

## Find and check it

1. Run `npm run dev` and open [Art locally](http://localhost:4321/illustrations_and_graphics). Locate the piece by its title or category. The front contains **View artwork**; a populated details object adds **About this piece** below it.
2. Click/tap About this piece once. On the back, the title stays at the top, your note and optional process images occupy the scroll area, and **View artwork / Back to front** remain below. Tab to the note area and use arrow keys/Page Down to read a long note. Enter/Space activates buttons; focus moves to the equivalent flip button after each flip. The hidden face is removed from keyboard and accessibility navigation.
3. Open the final image from either side. Front View artwork uses the Wallpaper single/double-click setting on a mouse; keyboard and touch open immediately. Back controls and process thumbnails always activate once. Viewer arrows/Left/Right/Home/End and horizontal touch swipes still work. Final-art navigation follows the category and Shuffle order; process images navigate only that piece's process set. Closing the viewer returns focus to the visible opener.
4. Filter the piece away, then show it again: it returns to the front. Check a narrow phone layout, dark theme and reduced motion. Reduced motion swaps the faces immediately.
5. Run `npm test` and `npm run build`. Fix any reported piece/field/path errors before publishing through your normal workflow. Check `dist/generated/manifest.js`: process images should appear under `images`, never under `art`. The root guide is tracked; `docs/` is locally ignored and is not the canonical authoring location.

No Andrew-authored reverse-side notes or process images have been supplied as part of Phase 2. Existing art remains unchanged until you add them. Development fixtures are never authored content.

## Writing editing location

Edit **`content.js` → `4. WRITING` → `writing: [` → the existing `title: "Dilettante's in the Interim"` entry**. Its `overview: {}` already enables the structured introduction. Keep the existing summary/status until you have current material. The separate **Prospector's Attempt at Sourdough Spellcasting** entry holds the two archived chapters of the stopped draft. Leave those there; they are not a sample of the current rewrite.

This is safe to paste as a replacement for the current Dilettante entry. It preserves the existing real description and status, adds no claims, and publishes no empty headings, image boxes or sample link:

```js
{
  date: '2026',
  title: "Dilettante's in the Interim",
  excerpt: 'My web novel, currently being re-written. A character-driven story I keep coming back to.',
  url: '',
  status: 'Re-write in progress',
  stamp: 'Re-write',
  accent: 'lavender',
  overview: {
    premise: [],
    cover: '',
    coverAlt: '',
    characters: [],
    setting: [],
    sampleLabel: '',
  },
},
```

Fill only what you know. `premise` and `setting` are arrays of strings, one per paragraph. `excerpt` is the short hook; `status` states the current rewrite status. Keep optional fields blank or omit them. Neither a schedule nor a progress percentage is required. Text is displayed literally: `<em>`, `&lt;` and quotes are not interpreted as HTML. Use double quotes for apostrophes or escape them in single-quoted strings, and separate entries with commas. Long paragraphs and samples stay in the window's scrollable reading area.

Each character is an object inside `overview.characters`. This empty slot is safe to paste there and remains hidden until populated:

```js
characters: [
  { name: '', role: '', paragraphs: [], img: '', imageAlt: '' },
],
```

For an actual introduction, supply the character's `name`, optional `role`, and your own `paragraphs`. An image is optional. A name alone is valid; a role/description/image without a name produces a field error. Empty character slots and blank paragraph strings are ignored. Any populated characters create the Characters section; populated setting paragraphs create Setting. Overview navigation appears when there is another populated section to jump to.

### Covers and character images

Put actual PNG, JPG/JPEG or WebP files in **`assets/writing/dilettantes/`**, for example `assets/writing/dilettantes/cover.png`. New files here get generated 400px thumbnail, 800px page and up-to-2400px viewer-size copies, without enlargement. Writing images load lazily with reserved dimensions and responsive sources. They do not become gallery or Solitaire art. Reuse an existing exact `assets/art/<Category>/<file>` path if appropriate; its existing variants are reused without copying the original.

After the file exists, put its path in `overview.cover` with a useful visual description in `overview.coverAlt`. For a character, use that character's `img` and `imageAlt`. Keep both fields blank if no image is supplied. Alt text without an image produces an error. Use forward slashes, exact filename case and the supported extensions. No URLs, leading slash, `..`, backslashes, query strings or URL-encoded filenames. Validation reports the document title and field, such as `writing[1] (Dilettante's in the Interim).overview.characters[0].imageAlt`.

### Current sample and archived chapters

For an entry with `overview`, **top-level `chapters` means current sample material**. It sits beside `overview`, not inside it. Never copy the archived Prospector chapters into this entry. Until you supply current text, omit `chapters` or leave it empty. `sampleLabel` alone cannot create a sample link or heading.

This optional empty slot is safe to paste beside `overview` and does not publish any sample:

```js
chapters: [
  { title: '', paragraphs: [] },
],
```

Add your current sample title and one string per paragraph when ready. Blank/title-only chapter slots stay hidden. Nonempty samples receive a fixed **Current sample** heading and a **Read a sample** navigation button. `overview.sampleLabel` is an optional additional label, for example `Current rewrite sample`; it never replaces the explicit Current sample heading. Multiple populated chapters appear in their authored order. There is no length limit imposed by the renderer.

Other writing can keep its existing plain entry format. Without `overview`, `chapters` retains the chapter reader and chapter buttons used by the archive. A real `url` produces Read it in the footer; use an `https://` or `http://` destination or a site-relative path. Blank and `#` create no link. External links open in a new tab.

### Verify writing changes

1. Run `npm run dev` and open [Writing locally](http://localhost:4321/writing). Open the current novel with the saved single/double-click preference, Enter/Space or a phone tap. Confirm title, rewrite status and summary, then only the sections you populated. With just the existing summary there should be no section toolbar, sample link or empty heading.
2. Check premise-only, cover/characters without a sample, and partially filled content before adding more. Click/tap a section button or activate it with Enter/Space: the reading area jumps immediately and keyboard focus moves to that section's heading. Overview returns to the title; Tab returns to ordinary window navigation. These are real buttons, not tabs that hide text, and do not change the OS URL. Long samples scroll normally; the section toolbar stays outside the scroll area.
3. Check a narrow phone viewport, a resized desktop window, light/dark theme and reduced motion. Cover/premise and character images/text stack in narrow reading windows. Section jumps never animate. Check long words, quotes, apostrophes, literal `< > &` and the end of a long sample; no text should be clipped horizontally.
4. Open the Prospector archive independently, confirm its stopped-project explanation and Archived draft/Old writing labels, and use both chapter buttons. Confirm no archive text or chapter labels appear as a sample of the rewrite. Check existing plain documents and any real external link you add.
5. Run `npm test` and `npm run build`; resolve named entry/field/path errors. New writing images belong under `images` in `dist/generated/manifest.js`, never `art`. Test-only fixtures belong outside the production assets and content and must be removed before the final build. Do not publish template instructions or invented material.

Phase 3 ships the existing real summary/status and an empty overview. Andrew has not yet supplied current premise, character introductions, setting, cover or sample text. Browser viewport review does not establish physical touch-device or screen-reader compatibility; use those devices separately when available.

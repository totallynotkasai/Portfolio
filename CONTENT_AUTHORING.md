# Art content authoring

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

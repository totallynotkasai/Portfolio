/* ════════════════════════════════════════════════════════════════════════
   ✏️  YOUR PORTFOLIO CONTENT  —  THIS IS THE ONLY FILE YOU NEED TO EDIT
   ════════════════════════════════════════════════════════════════════════

   HOW IT WORKS
   ------------
   Every image, certificate, project and bit of text on the site lives in
   this one file. The pages build themselves from what you put here, so you
   never have to touch the HTML or CSS.

   TO ADD AN IMAGE / CERTIFICATE / PROJECT:
     1. Drop the image file into the matching assets folder:
          artwork → assets/art/     certificates → assets/certs/
          photos  → assets/photos/  icons & logos → assets/ui/
     2. Add ONE line to the matching list below (copy the line above it),
        using the folder in the path, e.g.  img: 'assets/art/My Piece.png'
     3. Save & refresh the page. Done. ✅

   TIP — keep the site fast: resize images to ~1200px before adding them
   (squoosh.app does this in the browser). For artwork you can also keep a
   full-resolution file and add it as  full: 'assets/art/original.png'  —
   the small one shows in the grid, the big one opens in the lightbox.

   A FEW RULES (so nothing breaks):
     • Keep each entry between { curly braces } and end the line with a comma.
     • Wrap text in 'single quotes'. If your text contains an apostrophe,
       use "double quotes" around it instead, e.g.  "Dilettante's".
     • The "img" path must match the file EXACTLY, capitals and spaces
       included, e.g.  img: 'assets/art/Pet Wizard 2.png'
     • Leave  img: ''  empty to get a coloured placeholder instead.
     • "accent" can be:  'lavender'  'blue'  'yellow'  'teal'  'pink'

   ════════════════════════════════════════════════════════════════════════ */

window.CONTENT = {

  /* ──────────────────────────────────────────────────────────────────────
     1. ABOUT PAGE  (index.html)
     ──────────────────────────────────────────────────────────────────────
     • Put *asterisks* around words you want highlighted in yellow.
     • Each string in "paragraphs" becomes one paragraph. Add/remove freely.
     • Set  photo: ''  to show a placeholder instead of a photo. */
  about: {
    eyebrow: 'About me',

    // Big one-line greeting at the top. Wrap any part in *asterisks* to highlight.
    heading: "Hi I'm *Andrew Worgan*",

    // Shown as a subheading just under the greeting.
    subheading: "IT professional and hobbyist artist living around Bristol, UK",

    photo: 'assets/photos/About Me Photo.png',
    photoAlt: 'Photo of Andrew',

    paragraphs: [
      "I currently work in the IT sector, doing a bit of everything from user support to QA testing.",
      "I'm a massive creative at heart, I spend most of my time writing, creating character designs or building small tools and web apps to help me with my creative work. My main creative project at the moment is re-writing my web novel \"Dilettantes in the Interim\".",
      "My current goals are to finish my main side project, my PKM \"Filo\", and to keep progressing my career in IT.",
    ],

    email: 'andrew.worgan.enquiry@gmail.com',

    // "Currently" card — a little life-status block under the bio.
    // Keep it fresh: update me monthly, or delete every line to hide the card.
    // icon can be: 'pencil' 'quill' 'hammer' 'book' 'sprout' 'controller'
    currentlyHeading: 'Current Goals:',
    currently: [
      { icon: 'hammer', label: 'Building', value: 'Filo, my personal knowledge manager.' },
      { icon: 'pencil', label: 'Drawing', value: 'Getting better everyday :)' },
      { icon: 'quill', label: 'Writing', value: '"Dilettantes in the Interim" An Isekai Web-Novel.' },
      { icon: 'sprout', label: 'Growing', value: 'My career in IT, one cert at a time.' },
    ],

    // The "Other Pages" chips on the About page link to the rest of the site.
    // Each chip lights up in its own page's colour on hover (set by "accent").
    //   accent can be:  'blue'  'lavender'  'teal'  'yellow'  'pink'
    pagesHeading: 'Other Pages',
    pages: [
      { label: 'Coding', url: 'coding_projects.html', accent: 'blue' },
      { label: 'Art', url: 'illustrations_and_graphics.html', accent: 'lavender' },
      { label: 'Writing', url: 'writing.html', accent: 'teal' },
      { label: 'Certificates', url: 'certificates.html', accent: 'pink' },
    ],

    // Casual Niv-style sign-off shown at the bottom of the About page.
    signoff: 'Thanks for stopping by :)',
  },

  /* ──────────────────────────────────────────────────────────────────────
     2. ILLUSTRATIONS & GRAPHICS  (illustrations_and_graphics.html)
     ──────────────────────────────────────────────────────────────────────
     One line per artwork. Click an image on the site to view it full-size.
        { img: 'file.png', title: 'Name',  tag: 'Category' },
     • "tag" powers the filter chips above the gallery — stick to a few
       categories so the chip row stays tidy:
         'Character Design'  'Poster'  'Fanart'  'Digital Art'
     • "img" should be a web-sized file (~1200px); "full" is the optional
       full-resolution original that opens in the lightbox.                 */
  art: [
    {
      img: 'assets/art/assisted-existence-web.jpg', full: 'assets/art/assisted existence.png',
      title: 'Assisted Existence', tag: 'Digital Art'
    },
    { img: 'assets/art/Pet Wizard 2.png', title: 'Pet Wizard', tag: 'Character Design' },
    {
      img: 'assets/art/growth-is-good-web.jpg', full: 'assets/art/GROWTH is GOOD.png',
      title: 'GROWTH is GOOD', tag: 'Poster'
    },
    { img: 'assets/art/Ellie fr fr fr.png', title: 'Ellie', tag: 'Character Design' },
    {
      img: 'assets/art/owl-house-poster-web.jpg', full: 'assets/art/House movie poster OWL HOUSE LONG.png',
      title: 'Owl House — Movie Poster', tag: 'Poster'
    },
    { img: 'assets/art/Frieren Fr this time ACTUALLY THO FIXED EYES.png', title: 'Frieren', tag: 'Fanart' },
    { img: 'assets/art/Mountain.png', title: 'Mountain', tag: 'Digital Art' },
    {
      img: 'assets/art/kurugaya-vaporwave-web.jpg', full: 'assets/art/Kurugaya vaporwave.png',
      title: 'Kurugaya, Vaporwave', tag: 'Fanart'
    },
    {
      img: 'assets/art/summoning-god-web.jpg', full: 'assets/art/Summoning God.png',
      title: 'Summoning God', tag: 'Digital Art'
    },
    { img: 'assets/art/Horn guy.png', title: 'Horn Guy', tag: 'Character Design' },
    { img: 'assets/art/Decay.png', title: 'Decay', tag: 'Digital Art' },
    { img: 'assets/art/Dinosaur.png', title: 'Dinosaur', tag: 'Character Design' },
    { img: 'assets/art/Outgoing personality.png', title: 'Outgoing Personality', tag: 'Poster' },
    { img: 'assets/art/Filthy Habit.png', title: 'Filthy Habit', tag: 'Poster' },
    { img: 'assets/art/Party bottle.png', title: 'Party Bottle', tag: 'Poster' },
    { img: 'assets/art/Rakka.png', title: 'Rakka', tag: 'Fanart' },
    { img: 'assets/art/My Pet Wizard.png', title: 'My Pet Wizard', tag: 'Character Design' },
    // ↑ copy a line, change the filename/title/tag to add another piece.
    //   "full" is optional — a high-res original that opens in the lightbox.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     3. CODING PROJECTS  (coding_projects.html)
     ──────────────────────────────────────────────────────────────────────
     • "img" is an optional screenshot ('' shows a coloured block).
     • "tags" is a list of technologies.
     • "links" is a list of buttons — give each a label and url.            */
  coding: [
    {
      img: '',
      title: 'Filo — Personal Knowledge Manager',
      desc: 'My main side project: a personal knowledge-management app for organising notes, ideas and worldbuilding.',
      tags: ['JavaScript', 'In Progress'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai' },
      ],
    },
    {
      img: '',
      title: 'This Portfolio',
      desc: 'The site you are looking at — a hand-built static portfolio with a one-file content system.',
      tags: ['HTML', 'CSS', 'JavaScript'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai' },
      ],
    },
    // ↑ copy a whole { ... }, block to add another project.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     4. WRITING  (writing.html)
     ──────────────────────────────────────────────────────────────────────
        { date: 'Month Year', title: 'Title', excerpt: 'Teaser…',
          url: 'https://…', accent: 'blue' },                              */
  writing: [
    {
      date: '2026',
      title: 'Dilettantes in the Interim',
      excerpt: 'My web novel, currently being re-written. A character-driven story I keep coming back to.',
      url: '',                              // no url = no dead link; shows the status text instead
      status: 'Re-write in progress ✍️',    // shown in place of "Read more →"
      accent: 'lavender',
    },
    // ↑ copy a whole { ... }, block to add another piece of writing.
    //   Give it a real  url: 'https://…'  and it becomes a clickable card again.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     5. CERTIFICATES  (certificates.html)
     ──────────────────────────────────────────────────────────────────────
     EASIEST WAY: drop a photo/scan of the certificate into assets/certs/
     and put its path in "img" — it shows as a thumbnail you can click to
     enlarge. No image? Leave img:'' and it shows a coloured badge + emoji.

        { img: 'assets/certs/my-cert.png', title: 'Certificate Name',
          issuer: 'Who issued it', date: 'Month Year',
          link: 'https://credential-url',     // optional 'View credential'
          accent: 'yellow', emoji: '🎓' },                                 */
  certificates: [
    // Empty on purpose — the page shows a tidy "nothing here yet" state,
    // which looks better to a recruiter than placeholder data ever would.
    // Add your first real one by copying the template from the comment above.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     6. SITE PERSONALITY  (every page)
     ──────────────────────────────────────────────────────────────────────
     Small bits of voice that live around the edges of the site.           */
  site: {
    // Shown under the copyright line in the footer. '' hides it.
    footerTagline: 'Hand-coded, hand-drawn — no frameworks were harmed.',

    // Per-page "nothing here yet" jokes. Keys match each page's section.
    // The coding one stays straight on purpose — recruiters read that page.
    emptyStates: {
      art: 'The easel is warming up — art arriving soon.',
      coding: 'Projects are being tidied up — check back soon.',
      writing: 'The ink is still drying on this page.',
      certificates: "The certificate goblin hasn't delivered yet. Soon.",
    },

    // Printed in the browser dev console for nosy developers (hi!).
    consoleMsg: 'Oh hi — you opened the console. The wizard sees you. 🧙\n' +
      'Yes, this site is hand-built vanilla HTML/CSS/JS. View source away —\n' +
      'all the content lives in one friendly file: content.js',

    // Tab title when you wander off to another tab. '' disables it.
    awayTitle: 'hey, come back :(',
  },

  /* ──────────────────────────────────────────────────────────────────────
     7. THE PET WIZARD  (your interactive mascot, bottom-right of every page)
     ──────────────────────────────────────────────────────────────────────
     • Click him (or Tab to him + Enter) to pet him. Pet him a LOT and
       something nice happens.
     • "lines" = speech-bubble greetings per page; one is picked at random
       a moment after the page loads. Pages listed in "quietPages" never
       speak first — the wizard only talks there if clicked.
     • FRAMES: he now blinks on his own, beams when petted, and dozes off —
       driven by five hand-drawn 960×960 PNGs below. Blank out any one of
       them (or remove `frames`) and he falls back to the single `image`.   */
  wizard: {
    enabled: true,                // set false to retire him (he'll understand)
    image: 'assets/ui/Pet Wizard Cursor default Not rotated.png', // fallback frame
    frames: {                     // 5 expressions — see assets/Wizard Sprite/
      idle: 'assets/Wizard Sprite/Idle Wizard.png',            // eyes open, resting
      half: 'assets/Wizard Sprite/Inbetween Frame Wizard.png', // mid-blink (eyes half)
      blink: 'assets/Wizard Sprite/Blink Wizard.png',           // eyes shut
      happy: 'assets/Wizard Sprite/Happy Wizard.png',           // when you pet him
      asleep: 'assets/Wizard Sprite/Sleepy Wizard.png',          // napping (zzz drawn in)
    },
    sleepAfter: 60,               // seconds of being ignored before he naps
    quietPages: ['coding'],       // pages where he won't speak unprompted

    lines: {
      index: [
        'hello! i live here now.',
        "that's my human up there ↑",
        'psst… try petting me.',
      ],
      coding: [
        'All hand-built. I QA’d it myself.',
      ],
      art: [
        'my human drew all of these.',
        "i'm in some of them. look closely.",
        'click a piece — the lightbox is cosy.',
      ],
      writing: [
        'quiet please, novel in progress.',
        'plot holes are just secret tunnels.',
      ],
      certificates: [
        'paper achievements! shiny.',
        'more coming, allegedly.',
      ],
      notfound: [
        'i ate this page. sorry.',
        'it tasted like 404.',
      ],
    },

    // What he says when you pet him (cycles in order, then repeats).
    petLines: ['!', '♥', 'Momentai', 'Good vibes only, gang.', 'again.', 'this is acceptable', 'magic +1', 'okay one more'],
    sleepLine: 'zzz…',
  },

};

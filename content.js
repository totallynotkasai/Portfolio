/* ════════════════════════════════════════════════════════════════════════
   YOUR PORTFOLIO CONTENT  —  THIS IS THE ONLY FILE YOU NEED TO EDIT
   ════════════════════════════════════════════════════════════════════════

   HOW IT WORKS
   ------------
   Every image, certificate, project and bit of text on the site lives in
   this one file. The pages build themselves from what you put here, so you
   never have to touch the HTML or CSS.

   TO ADD ARTWORK: just drop the file into a category folder and push —
     assets/art/Poster/My Piece.png   →  appears on the Art page, tagged
     "Poster", titled "My Piece". No need to touch this file. A new folder
     makes a new category (and a new filter chip). Files loose in
     assets/art/ appear with no category.

   TO ADD A CERTIFICATE / PROJECT:
     1. Drop the image file into the matching assets folder:
          certificates → assets/certs/   photos → assets/photos/
     2. Add ONE line to the matching list below (copy the line above it),
        using the folder in the path, e.g.  img: 'assets/certs/My Cert.png'
     3. Save & push. Done.

   IMAGE SIZE: don't worry about it. Use your full-resolution files — every
   deploy makes small, fast copies for the page automatically (the
   original's detail is kept for the full-size lightbox view).

   IF YOU MAKE A TYPO in this file, the deploy stops and the live site stays
   as it was. Vercel's build log says which line to fix.

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
     1. ABOUT PAGE  (about.html)
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
      "I'm a massive creative at heart and spend most of my time writing, creating character designs or building small tools and web apps to help me with my creative work. My main creative project at the moment is re-writing my web novel \"Dilettantes in the Interim\".",
      "My current goals are to finish my main side project, my PKM \"Filo\", and to keep progressing my career in IT.",
    ],

    email: 'andrew.worgan.enquiry@gmail.com',

    // "Currently" card — a little life-status block under the bio.
    // Keep it fresh: update me monthly, or delete every line to hide the card.
    // icon can be: 'pencil' 'quill' 'hammer' 'book' 'sprout' 'controller'
    currentlyHeading: 'Current Goals:',
    currently: [
      { icon: 'hammer', label: 'Building', value: 'Filo, my personal knowledge manager.' },
      { icon: 'pencil', label: 'Drawing', value: 'Getting better every day :)' },
      { icon: 'quill', label: 'Writing', value: '"Dilettantes in the Interim" An Isekai Web-Novel.' },
      { icon: 'sprout', label: 'Growing', value: 'My career in IT, one cert at a time.' },
    ],

    // The "Other Pages" chips on the About page link to the rest of the site.
    // Each chip lights up in its own page's colour on hover (set by "accent").
    //   accent can be:  'blue'  'lavender'  'teal'  'yellow'  'pink'
    pagesHeading: 'Other Pages',
    pages: [
      { label: 'Coding', url: '/coding_projects', accent: 'blue' },
      { label: 'Art', url: '/illustrations_and_graphics', accent: 'lavender' },
      { label: 'Writing', url: '/writing', accent: 'teal' },
      { label: 'Certificates', url: '/certificates', accent: 'pink' },
    ],

    // Casual Niv-style sign-off shown at the bottom of the About page.
    signoff: 'Thanks for stopping by :)',
  },

  /* ──────────────────────────────────────────────────────────────────────
     2. ILLUSTRATIONS & GRAPHICS  (illustrations_and_graphics.html)
     ──────────────────────────────────────────────────────────────────────
     Every image in assets/art/ shows up automatically (see the top of this
     file); its subfolder is its category. This list is OPTIONAL — only add a
     line to change how a piece appears:
        { img: 'assets/art/Poster/My Piece.png', title: 'A Nicer Title' },
     ORDER on the page:
       1. lines below marked  pin: true   (stay above everything)
       2. new files with no line here     (newest first)
       3. the other lines below, in this order
     • "title" replaces the name taken from the filename.
     • "tag" replaces the category taken from the subfolder (rarely needed).
     • Deleting a line never removes the piece — delete the file for that. */
  art: [
    { img: 'assets/art/Digital Art/assisted existence.png', title: 'Assisted Existence' },
    { img: 'assets/art/Character Design/Pet Wizard 2.png', title: 'Pet Wizard' },
    { img: 'assets/art/Poster/GROWTH is GOOD.png', title: 'GROWTH is GOOD' },
    { img: 'assets/art/Character Design/Ellie fr fr fr.png', title: 'Ellie' },
    { img: 'assets/art/Poster/House movie poster OWL HOUSE LONG.png', title: 'Owl House — Movie Poster' },
    { img: 'assets/art/Fanart/Frieren Fr this time ACTUALLY THO FIXED EYES.png', title: 'Frieren' },
    { img: 'assets/art/Digital Art/Mountain.png', title: 'Mountain' },
    { img: 'assets/art/Fanart/Kurugaya vaporwave.png', title: 'Kurugaya, Vaporwave' },
    { img: 'assets/art/Digital Art/Summoning God.png', title: 'Summoning God' },
    { img: 'assets/art/Character Design/Horn guy.png', title: 'Horn Guy' },
    { img: 'assets/art/Digital Art/Decay.png', title: 'Decay' },
    { img: 'assets/art/Character Design/Dinosaur.png', title: 'Dinosaur' },
    { img: 'assets/art/Poster/Outgoing personality.png', title: 'Outgoing Personality' },
    { img: 'assets/art/Poster/Filthy Habit.png', title: 'Filthy Habit' },
    { img: 'assets/art/Poster/Party bottle.png', title: 'Party Bottle' },
    { img: 'assets/art/Fanart/Rakka.png', title: 'Rakka' },
    { img: 'assets/art/Character Design/My Pet Wizard.png', title: 'My Pet Wizard' },
  ],

  /* ──────────────────────────────────────────────────────────────────────
     3. CODING PROJECTS  (coding_projects.html)
     ──────────────────────────────────────────────────────────────────────
     • "img" is an optional screenshot ('' shows a coloured block).
     • "tags" is a list of technologies.
     • "links" is a list of buttons — give each a label and url.
     • Each project shows as a file folder. The tab reads the title up to any
       " — " (e.g. "filo/"); set  tab: "my-name"  to choose it yourself.
     • "accent" colours the folder (default blue).                         */
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
      tab: 'portfolio',                     // folder tab label (optional)
      accent: 'teal',
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
          url: 'https://…', accent: 'blue', stamp: 'Short' },
     • Each piece shows as a library index card. "accent" colours the
       margin line; "stamp" (optional) is the little rubber stamp.        */
  writing: [
    {
      date: '2026',
      title: 'Dilettantes in the Interim',
      excerpt: 'My web novel, currently being re-written. A character-driven story I keep coming back to.',
      url: '',                              // no url = no dead link; shows the status text instead
      status: 'Re-write in progress',    // shown in place of "Read more →"
      stamp: 'Re-write',                  // rubber stamp in the top corner (optional)
      accent: 'lavender',
    },
    // ↑ copy a whole { ... }, block to add another piece of writing.
    //   Give it a real  url: 'https://…'  and it becomes a clickable card again.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     5. CERTIFICATES  (certificates.html)
     ──────────────────────────────────────────────────────────────────────
     EASIEST WAY: drop a photo/scan of the certificate into assets/certs/
     and put its path in "img" — it fills the stub of the ticket and opens
     full size when clicked. No image? Leave img:'' and the stub shows
     an icon on its accent colour (default pink).

        { img: 'assets/certs/my-cert.png', title: 'Certificate Name',
          issuer: 'Who issued it', date: 'Month Year',
          link: 'https://credential-url',     // optional 'View credential'
          accent: 'yellow', icon: 'cap' },
     • "icon" (badge only) can be:  'cap'  'ribbon'  'book'  'laptop'      */
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
    consoleMsg: 'Oh hi — you opened the console. The wizard sees you.\n' +
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
      about: [
        'hello!',
        "Give me a click ;~;",
        'psst…',
      ],
      coding: [
        'Computer magic.',
      ],
      art: [
        'Hey nice Cursor :3',
        "Is that me or my twin?",
        'click a piece, the lightbox is cosy.',
      ],
      writing: [
        'shhhhhhh... novel in progress.',
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
    petLines: ['!', '<3', 'Momentai', 'Good vibes only, gang.', 'again.', 'this is acceptable', 'magic +1', 'okay one more'],
  },

};

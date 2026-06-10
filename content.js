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
    heading: "Hi I'm *Andrew Worgan*.",

    // Shown as a subheading just under the greeting.
    subheading: "I'm an IT professional and hobbyist artist living around Bristol, UK.",

    photo: 'assets/photos/about-photo.jpg',
    photoAlt: 'Photo of Andrew',

    paragraphs: [
      "I currently work in the IT sector, doing a bit of everything from user support to QA testing.",
      "I'm a massive creative at heart, and I spend most of my time writing and creating characters. I'm mostly a hobbyist, but I've done a fair amount of commission work over the years for a number of clients — you can check that out in the illustrations section. I'm currently re-writing my web novel \"Dilettantes in the Interim\".",
      "My current goals are to finish my main side project, my PKM \"Filo\", and to keep progressing my career in IT.",
    ],

    email: 'andrew.worgan@yahoo.co.uk',

    // The "Other Pages" chips on the About page link to the rest of the site.
    // Each chip lights up in its own page's colour on hover (set by "accent").
    //   accent can be:  'blue'  'lavender'  'teal'  'yellow'  'pink'
    pagesHeading: 'Other Pages',
    pages: [
      { label: 'Coding',       url: 'coding_projects.html',            accent: 'blue' },
      { label: 'Art',          url: 'illustrations_and_graphics.html', accent: 'lavender' },
      { label: 'Writing',      url: 'writing.html',                    accent: 'teal' },
      { label: 'Certificates', url: 'certificates.html',               accent: 'pink' },
    ],

    // Casual Niv-style sign-off shown at the bottom of the About page.
    signoff: 'Thanks for stopping by :)',
  },

  /* ──────────────────────────────────────────────────────────────────────
     2. ILLUSTRATIONS & GRAPHICS  (illustrations_and_graphics.html)
     ──────────────────────────────────────────────────────────────────────
     One line per artwork. Click an image on the site to view it full-size.
        { img: 'file.png', title: 'Name',  tag: 'Category' },             */
  art: [
    { img: 'assets/art/assisted-existence-web.jpg', full: 'assets/art/assisted existence.png',
      title: 'Assisted Existence', tag: 'Digital Art' },
    { img: 'assets/art/Pet Wizard 2.png', title: 'Pet Wizard', tag: 'Character Design' },
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
    /* ⚠️ FIX ME: github.com/LittleKasai currently returns 404 — the links
       below (and the GitHub icon in the footer of every page) are dead.
       Replace with your real GitHub username, and point each project at
       its own repo (github.com/<you>/<repo>), not just your profile.
       Also: add a real screenshot to each project — img: 'assets/...'    */
    {
      img: '',
      title: 'Filo — Personal Knowledge Manager',
      desc: 'My main side project: a personal knowledge-management app for organising notes, ideas and worldbuilding.',
      tags: ['JavaScript', 'In Progress'],
      links: [
        { label: 'GitHub', url: 'https://github.com/LittleKasai' },
      ],
    },
    {
      img: '',
      title: 'This Portfolio',
      desc: 'The site you are looking at — a hand-built static portfolio with a one-file content system.',
      tags: ['HTML', 'CSS', 'JavaScript'],
      links: [
        { label: 'GitHub', url: 'https://github.com/LittleKasai' },
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
      date: '2025',
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

};

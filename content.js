/* ════════════════════════════════════════════════════════════════════════
   YOUR PORTFOLIO CONTENT  -  THIS IS THE ONLY FILE YOU NEED TO EDIT
   ════════════════════════════════════════════════════════════════════════

   HOW IT WORKS
   ------------
   The site is Kasai OS: one page that's a little desktop. Every image,
   certificate, project and bit of text in its windows lives in this one
   file, so you never have to touch the HTML, CSS or JS.

   TO ADD ARTWORK: just drop the file into a category folder and push:
     assets/art/Poster/My Piece.png   →  appears in the Art window as a
     card, tagged "Poster", titled "My Piece". No need to touch this file.
     A new folder makes a new category (and a new menu item). Files loose
     in assets/art/ appear with no category.

   TO ADD A CERTIFICATE / PROJECT:
     1. Drop the image file into the matching assets folder:
          certificates → assets/certs/   photos → assets/photos/
     2. Add ONE line to the matching list below (copy the line above it),
        using the folder in the path, e.g.  img: 'assets/certs/My Cert.png'
     3. Save & push. Done.

   TO PUT AN OLD DESIGN IN THE TRASH: drop a screenshot into assets/recycle/
     and it appears in the Recycle Bin, named after the file. A date in
     brackets, like "My Old Look (May 2027).png", puts them in order.

   IMAGE SIZE: don't worry about it. Use your full-resolution files. Every
   deploy makes small, fast copies for the page automatically (the
   original's detail is kept for the full-size image viewer).

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
     1. ABOUT  (the about_me.txt window, open when someone first arrives)
     ──────────────────────────────────────────────────────────────────────
     • In the heading and subheading, put *asterisks* around words you
       want highlighted in yellow (it only works in those two).
     • Each string in "paragraphs" becomes one paragraph. Add/remove freely.
     • Set  photo: ''  to show a placeholder instead of a photo. */
  about: {
    // The big greeting at the top of the window. Wrap any part in *asterisks* to highlight.
    heading: "Hi I'm *Andrew Worgan*",

    // Shown just under the greeting (and in the Start menu, under your name).
    subheading: "IT professional and hobbyist artist living around Bristol, UK",

    // The rolling strip across the top of the About window. One phrase per line.
    ticker: ['Digital illustration', 'Graphic design', 'Web design', 'Creative writing', 'IT', 'QA', 'Automation'],

    photo: 'assets/photos/About Me Photo.png',
    photoAlt: 'Photo of Andrew',

    paragraphs: [
      "I currently work in the IT sector, doing a bit of everything from user support to QA testing.",
      "I'm a massive creative at heart and spend most of my time writing, creating character designs or building small tools and web apps to help me with my creative work. My main creative project at the moment is re-writing my web novel \"Dilettantes in the Interim\".",
      "My current goals are to finish my main side project, my PKM \"Filo\", and to keep progressing my career in IT.",
    ],

    email: 'andrew.worgan.enquiry@gmail.com',

    // Casual sign-off, shown in the About window's status bar.
    signoff: 'Thanks for stopping by :)',
  },

  /* ──────────────────────────────────────────────────────────────────────
     2. ART  (the binder.exe window: every piece is a collectible card)
     ──────────────────────────────────────────────────────────────────────
     Every image in assets/art/ shows up automatically (see the top of this
     file); its subfolder is its category. This list is OPTIONAL. Only add a
     line to change how a piece appears:
        { img: 'assets/art/Poster/My Piece.png', title: 'A Nicer Title' },
     ORDER in the binder:
       1. lines below marked  pin: true   (stay above everything)
       2. new files with no line here     (newest first)
       3. the other lines below, in this order
     • "title" replaces the name taken from the filename.
     • "tag" replaces the category taken from the subfolder (rarely needed).
     • Each piece is a collectible card. Its frame is painted with the
       piece's most visible colour and its category strip with the second,
       picked automatically. Don't like a pick? Set your own with
       frame: '#F7216B', chip: '#17C38C'  (either one on its own works too).
       Wide pieces get a sideways card automatically.
     • Deleting a line never removes the piece; delete the file for that. */
  art: [
    { img: 'assets/art/Digital Art/assisted existence.png', title: 'Assisted Existence' },
    { img: 'assets/art/Character Design/Pet Wizard 2.png', title: 'Pet Wizard' },
    { img: 'assets/art/Poster/GROWTH is GOOD.png', title: 'GROWTH is GOOD' },
    { img: 'assets/art/Character Design/Ellie fr fr fr.png', title: 'Ellie' },
    { img: 'assets/art/Poster/House movie poster OWL HOUSE LONG.png', title: 'Owl House - Movie Poster' },
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
     3. CODING  (the projects folder; each project opens as its own window)
     ──────────────────────────────────────────────────────────────────────
     • "img" is an optional screenshot in assets/projects/ ('' shows an
       icon). It's cropped to 16:10, so landscape shots work best.
     • "tags" is a list of technologies (they become the window's menu bar).
       A tag of 'In Progress' shows in the status bar instead.
     • "links" is a list of buttons. Give each a label and url.
     • Each project is a file in the folder and opens as an app window. Its
       name reads the title up to any " - ", with an extension that fits its
       tags (e.g. "filo.exe", "toolbox.apk"); set  window: 'name.ext'  to
       choose it yourself.
     • "accent" colours the project's window (default blue).
     • Built on someone else's project? Add
         forkOf: { label: 'owner/repo', url: 'https://github.com/owner/repo' }
       and a "Forked from owner/repo" line appears under the title.       */
  coding: [
    {
      img: 'assets/projects/Filo.png',
      title: 'Filo - Personal Knowledge Manager',
      desc: 'My main side project: a local-first desktop app for notes, ideas and worldbuilding. Mind maps, kanban boards, task lists and documents, all saved as plain Markdown files on your own disk.',
      tags: ['TypeScript', 'Svelte', 'Electron', 'In Progress'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/filo' },
        { label: 'Download for Windows', url: 'https://github.com/totallynotkasai/filo/releases/latest' },
      ],
    },
    {
      img: 'assets/projects/Mi Back Screen.png',
      title: 'Mi Back Screen - Rear Display App',
      accent: 'lavender',
      desc: 'An Android app for the Xiaomi 17 Pro Max that puts your own images, GIFs, a clock, notifications and a charging animation on the phone\'s rear display, and can move any app or the camera there with a tap.',
      tags: ['Kotlin', 'Android', 'Shizuku'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/mi-back-screen' },
        { label: 'Website', url: 'https://totallynotkasai.github.io/mi-back-screen/' },
        { label: 'Download APK', url: 'https://github.com/totallynotkasai/mi-back-screen/releases/latest/download/MiBackScreen.apk' },
      ],
    },
    {
      img: 'assets/projects/Toolbox.png',
      title: 'Toolbox - Tools & Mini-Games',
      accent: 'yellow',
      desc: 'An Android app of 40-odd everyday tools, fidget toys and mini-games, from a tuner and compass to Connect Four against the computer. The physics, audio and game AIs are all built in, with no third-party libraries.',
      tags: ['Kotlin', 'Jetpack Compose', 'Material 3'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/Toolbox' },
        { label: 'Website', url: 'https://totallynotkasai.github.io/Toolbox/' },
        { label: 'Download APK', url: 'https://github.com/totallynotkasai/Toolbox/releases/latest/download/Toolbox.apk' },
      ],
    },
    {
      img: 'assets/projects/Paperized.png',
      title: 'Paperized - Paperize Fork',
      accent: 'pink',
      forkOf: { label: 'Anthonyy232/Paperize', url: 'https://github.com/Anthonyy232/Paperize' },
      desc: 'My own build of Anthony La\'s open-source Android wallpaper changer. I fixed bugs in scheduling, live wallpapers and settings, and added set times of day, night albums, favourites, home-screen widgets and live auto-pan.',
      tags: ['Kotlin', 'Jetpack Compose', 'Room'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/Paperize' },
        { label: 'What I changed', url: 'https://github.com/totallynotkasai/Paperize/blob/master/CHANGELOG.md' },
      ],
    },
    {
      img: 'assets/projects/Portfolio.png',
      title: 'This Portfolio',
      window: 'portfolio.html',             // title bar name (optional)
      accent: 'teal',
      desc: 'The site you are looking at: a hand-built static portfolio with a one-file content system.',
      tags: ['HTML', 'CSS', 'JavaScript'],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/Portfolio' },
      ],
    },
    // ↑ copy a whole { ... }, block to add another project.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     4. WRITING  (the documents window; each piece opens on an index card)
     ──────────────────────────────────────────────────────────────────────
        { date: 'Month Year', title: 'Title', excerpt: 'Teaser…',
          url: 'https://…', status: 'Finished', accent: 'blue', stamp: 'Short' },
     • Each piece is a document in the list (title, status, date). Opening
       it shows the excerpt on a ruled index card. "accent" colours the
       card's margin line; "stamp" (optional) is the little rubber stamp.
     • Give it a real url and a "Read it" button appears.                 */
  writing: [
    {
      date: '2026',
      title: 'Dilettantes in the Interim',
      excerpt: 'My web novel, currently being re-written. A character-driven story I keep coming back to.',
      url: '',                              // no url = no dead link; shows the status text instead
      status: 'Re-write in progress',    // shown in the list and on the card
      stamp: 'Re-write',                  // rubber stamp in the top corner (optional)
      accent: 'lavender',
    },
    // ↑ copy a whole { ... }, block to add another piece of writing.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     5. CERTIFICATES  (a folder of certificate files)
     ──────────────────────────────────────────────────────────────────────
     EASIEST WAY: drop a photo/scan of the certificate into assets/certs/
     and put its path in "img". It becomes the file's thumbnail and opens
     full size in the image viewer. No image? Leave img:'' and the file
     shows an icon instead.

        { img: 'assets/certs/my-cert.png', title: 'Certificate Name',
          issuer: 'Who issued it', date: 'Month Year',
          link: 'https://credential-url',     // optional 'View credential'
          accent: 'yellow', icon: 'cap' },
     • "icon" (no image only): any doodle name, e.g. 'cap' 'ribbon' 'book' 'laptop' */
  certificates: [
    // Empty on purpose: the folder shows a tidy "This folder is empty",
    // which looks better to a recruiter than placeholder data ever would.
    // Add your first real one by copying the template from the comment above.
  ],

  /* ──────────────────────────────────────────────────────────────────────
     6. SITE PERSONALITY  (all around Kasai OS)
     ──────────────────────────────────────────────────────────────────────
     Small bits of voice that live around the edges of the site.           */
  site: {
    // The last line of the Start menu.
    copyright: '© 2026 Andrew Worgan (Kasai). All rights reserved.',

    // What an empty folder says under "This folder is empty". Keys match
    // each window. The coding one stays straight because recruiters read it.
    emptyStates: {
      art: 'The easel is warming up. Art arriving soon.',
      coding: 'Projects are being tidied up. Check back soon.',
      writing: 'The ink is still drying on this page.',
      certificates: "The certificate goblin hasn't delivered yet. Soon.",
    },

    // Printed in the browser dev console for nosy developers (hi!).
    consoleMsg: 'Oh hi, you opened the console. The wizard sees you.\n' +
      'Yes, this site is hand-built vanilla HTML/CSS/JS. View source away:\n' +
      'all the content lives in one friendly file: content.js',

    // Tab title when you wander off to another tab. '' disables it.
    awayTitle: 'hey, come back :(',
  },

  /* ──────────────────────────────────────────────────────────────────────
     7. KASAI OS  (window headings; all optional)
     ──────────────────────────────────────────────────────────────────────
     Each window's big heading, the line under it and its folder path.
     Delete a line to go back to the built-in wording.                    */
  os: {
    windows: {
      coding: { heading: 'Projects', sub: "Apps, experiments & tools I've built." },
      art: { heading: 'Illustration & Design', sub: 'Drawings, characters & design work. Pick a card to see it full size.' },
      writing: { heading: 'Drafts & Complete Works', sub: 'Web novels, stories & creative writing.' },
      certificates: { heading: 'Certificates', sub: 'Courses, certifications & professional development.' },
      games: { heading: 'Games', sub: 'Things to play when you should be working.' },
      trash: { heading: 'Recycle Bin', sub: "Old designs I couldn't bring myself to delete." },
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
     8. THE PET WIZARD  (your virtual pet, living on the desktop)
     ──────────────────────────────────────────────────────────────────────
     • He lives on the desktop, always behind the windows, and wanders the
       free bits with a little hop. If a window lands on him he pops out
       from behind it. Ignore him and he naps.
     • Click him (or Tab to him + Enter) to pet him. Pet him a LOT and
       something nice happens.
     • Drag him with the mouse to carry him somewhere (on a phone, press and
       hold him first). He dangles, then grumbles or dozes off where you put
       him down. Try dropping him on the Trash.
     • He remembers where you left him, and remembers people who petted
       him: they get a "welcomeBack" line when they come back.
     • pet.exe in the Start menu shows him, his mood and how many pets he's had.
     • "lines" = what he says when a window opens (one at random). Windows
       listed in "quietPages" never get a line unprompted; pet him while one
       is in front and he says it then.
     • Any list of lines can be emptied, e.g.  dropLines: [],  to keep him quiet.
     • FRAMES: his drawings, 960×960 transparent PNGs in assets/Wizard
       Sprite/. The first five are drawn. The rest are optional: until one
       exists he borrows another drawing (noted beside each), so nothing
       ever looks broken. With no frames at all he uses the single `image`. */
  wizard: {
    enabled: true,                // set false to retire him (he'll understand)
    image: 'assets/ui/Pet Wizard Cursor default Not rotated.png', // fallback frame
    frames: {                     // his expressions, see assets/Wizard Sprite/
      idle: 'assets/Wizard Sprite/Idle Wizard.png',            // eyes open, resting
      half: 'assets/Wizard Sprite/Inbetween Frame Wizard.png', // mid-blink (eyes half)
      blink: 'assets/Wizard Sprite/Blink Wizard.png',           // eyes shut
      happy: 'assets/Wizard Sprite/Happy Wizard.png',           // when you pet him
      asleep: 'assets/Wizard Sprite/Sleepy Wizard.png',          // napping (zzz drawn in)

      // Optional extras: draw one, drop it in the folder, put its path between
      // the quotes. Walking frames face RIGHT (he's flipped to walk left).
      walk1: '',     // walking, step one                 (until drawn: idle)
      walk2: '',     // walking, step two                 (until drawn: walk1)
      held: '',      // dangling when picked up           (until drawn: startled)
      dizzy: '',     // just been put down                (until drawn: half)
      startled: '',  // surprised (dropped in the Trash)  (until drawn: idle)
      wave: '',      // waving hello to old friends       (until drawn: happy)
      party: '',     // in a party hat, for a secret      (until drawn: happy)
    },
    sleepAfter: 60,               // seconds of being ignored before he naps (half that at night)
    quietPages: ['coding'],       // windows where he won't speak unprompted

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
        'click a card, the viewer is cosy.',
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

    // Carrying him about (one at random each time).
    heldLines: ['wheee!', 'put me down!!', 'i can see my house from here', 'careful, the hat.'],   // when picked up
    dropLines: ['oof.', 'rude.', 'the room is spinning', 'i meant to land like that.'],          // when put down
    trashLines: ["i'm NOT rubbish!", 'hey! not recyclable.', 'it smells like old designs in here.'], // dropped on the Trash

    // Said to someone who petted him before, when they come back later
    // (after half an hour or more away).
    welcomeBack: ['welcome back!', 'oh hi, you again :)', 'i kept your spot warm.'],
  },

};

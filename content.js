/* ════════════════════════════════════════════════════════════════════════
   YOUR PORTFOLIO CONTENT  -  THIS IS THE ONLY FILE YOU NEED TO EDIT
   ════════════════════════════════════════════════════════════════════════

   HOW IT WORKS
   ------------
   The site is Kasai OS: one page that's a little desktop. Every word,
   picture and project in its windows lives in this one file, so you never
   have to touch the HTML, CSS or JS. Save, push, and the site rebuilds.

   WHAT'S IN HERE
     1. ABOUT          the About window
     2. ART            the Art window: a binder of spell cards
     3. CODING         the projects folder (each project is its own window)
     4. WRITING        the documents folder (each piece opens on an index card)
     5. CERTIFICATES   the certificates folder
     6. SITE           little bits of voice around the edges
     7. KASAI OS       window headings, the boot screen, About Kasai OS
     8. PET WIZARD     his drawings and everything he says
     9. WIZARD SWEEPER a game in the Games window
    10. NOT RUBBISH    a game in the Games window
    11. STAR DROP      a game in the Games window

   TO ADD ARTWORK: just drop the file into a category folder and push:
     assets/art/Poster/My Piece.png   →  a new spell card in the Art
     window, in the "Poster" category, titled "My Piece". No need to touch
     this file. A new folder makes a new category (and a new button in the
     binder's menu bar). Files loose in assets/art/ get no category.

   TO ADD A PROJECT OR A CERTIFICATE:
     1. Drop its picture into the matching folder:
          project screenshots → assets/projects/
          certificates        → assets/certs/
     2. Copy an entry in its section below and fill it in, with the folder
        in the path, e.g.  img: 'assets/certs/My Cert.png'
     3. Save & push. Done.

   TO PUT AN OLD DESIGN IN THE TRASH: drop a screenshot into assets/recycle/
     and it appears in the Recycle Bin, named after the file. A month and
     year in brackets, like "My Old Look (May 2027).png", puts them in date
     order, oldest first.

   NEW DRAWINGS OF THE PET WIZARD go in assets/Wizard Sprite/ (section 8
     says which ones he can use).

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
       included, e.g.  img: 'assets/art/Pet Wizard 2.png'. If it doesn't,
       the build log warns you and the site shows a small picture icon.
     • Leave  img: ''  empty and an icon stands in for the picture.
     • "accent" (the colour of a window or a file) can be:
         'lavender'  'blue'  'yellow'  'teal'  'pink'
     • Write " - " rather than a long dash. The build warns about long dashes.

   ════════════════════════════════════════════════════════════════════════ */

window.CONTENT = {

  /* ──────────────────────────────────────────────────────────────────────
     1. ABOUT  (the About window)
     ──────────────────────────────────────────────────────────────────────
     It's open when someone arrives on a computer (phones start on the
     home screen, with About one tap away).
     • In the heading and subheading, put *asterisks* around words you
       want highlighted in yellow. It only works in those two.
     • Each string in "paragraphs" becomes one paragraph. Add/remove freely.
     • Set  photo: ''  to show a placeholder instead of a photo.
     • Set  email: ''  to hide both Email me buttons. */
  about: {
    // The big greeting at the top of the window. Wrap any part in *asterisks* to highlight.
    heading: "Hi I'm *Andrew Worgan*",

    // Just under the greeting. It's also under your name at the top of the
    // Start menu (without the highlight there).
    subheading: "IT professional and hobbyist artist living around Bristol, UK",

    // The rolling strip across the top of the window, one phrase per item.
    // Empty the list,  ticker: [],  to hide the strip.
    ticker: ['Digital illustration', 'Graphic design', 'Web design', 'Creative writing', 'IT', 'QA', 'Automation'],

    // Your photo: in a little me.png window beside the text, and in the
    // circle at the top of the Start menu. "photoAlt" describes it for
    // people using screen readers.
    photo: 'assets/photos/About Me Photo.png',
    photoAlt: 'Photo of Andrew',

    paragraphs: [
      "I currently work in the IT sector, doing a bit of everything from user support to QA testing.",
      "I'm a massive creative at heart and spend most of my time writing, creating character designs or building small tools and web apps to help me with my creative work. My main creative project at the moment is re-writing my web novel \"Dilettantes in the Interim\".",
      "My current goals are to finish my main side project, my PKM \"Filo\", and to keep progressing my career in IT.",
    ],

    // The Email me button under your text and the one in the Start menu.
    email: 'andrew.worgan.enquiry@gmail.com',

    // A casual sign-off in the window's status bar (the strip along its foot).
    signoff: 'Thanks for stopping by :)',
  },

  /* ──────────────────────────────────────────────────────────────────────
     2. ART  (the Art window: every piece is a spell card)
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
     • Each card's frame is painted with the piece's most visible colour
       and its category strip with the second, picked automatically. Don't
       like a pick? Set your own with  frame: '#F7216B', chip: '#17C38C'
       (either one on its own works too).
     • Wide pieces get a sideways card, two cards wide, automatically.
     • With two or more categories, the binder's menu bar gets a button
       for each one (plus Shuffle) to filter the cards.
     • A click on a card opens the piece full size in the image viewer.
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
     Projects show in the folder in this order.
     • "title" is the project's name, then (optionally) " - " and a short
       subtitle, e.g. 'Filo - Personal Knowledge Manager'.
     • "img" is an optional screenshot in assets/projects/ ('' shows an
       icon). It's cropped to 16:10, so landscape shots work best.
     • "desc" is the paragraph in the project's window.
     • "tags" is a list of technologies (they become the window's menu bar).
       A tag of 'In Progress' becomes a blinking "In progress" light in the
       folder and the status bar instead; without one it says "Ready".
     • "links" are the buttons in the window's status bar. Give each a
       label and a url.
     • Each project is named like a file: the title up to any " - ", plus
       an ending that fits its tags (.apk for Android or Kotlin, .exe for
       desktop apps, .html for the web), e.g. "filo.exe", "toolbox.apk".
       Set  window: 'name.ext'  to choose it yourself.
     • "accent" colours the project's window (default blue).
     • Built on someone else's project? Add
         forkOf: { label: 'owner/repo', url: 'https://github.com/owner/repo' }
       and a "Forked from owner/repo" line appears under the title.       */
  coding: [
    {
      img: 'assets/projects/Filo Updated.png',
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
     4. WRITING  (the documents folder; each piece opens on an index card)
     ──────────────────────────────────────────────────────────────────────
        { date: 'Month Year', title: 'Title', excerpt: 'Teaser…',
          url: 'https://…', status: 'Finished', accent: 'blue', stamp: 'Short' },
     • Each piece is a document in the list (its title, status and date).
       Opening it shows the date, title and excerpt on a ruled index card
       in a window of its own.
     • Give it a real url and a "Read it" button appears in the card's
       status bar; with no url the status sits there instead.
     • "stamp" (optional) is the little rubber stamp in the card's corner.
     • "accent" colours the card's window and its margin line (default teal). */
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
     • "issuer" and "date" show under the name, and in the image viewer.
     • "link" adds a "View credential" link under the file.
     • "accent" colours the file (default pink).
     • "icon" (only used with no image) picks the icon by name: 'cap'
       (the default), 'ribbon', 'book', 'laptop', 'star', 'heart', 'globe',
       'sprout', 'pencil', 'quill', 'palette' or 'hammer'. Any doodle name
       in kasai-core.js works; one it doesn't know shows the pencil.     */
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
    // At the foot of the Start menu, and in the About Kasai OS box.
    copyright: '© 2026 Andrew Worgan (Kasai). All rights reserved.',

    // What an empty folder says under "This folder is empty", one line per
    // window (a  trash: '...'  line works too, should the bin ever be
    // empty). The coding one stays straight because recruiters read it.
    emptyStates: {
      art: 'The easel is warming up. Art arriving soon.',
      coding: 'Projects are being tidied up. Check back soon.',
      writing: 'The ink is still drying on this page.',
      certificates: "The certificate goblin hasn't delivered yet. Soon.",
    },

    // Printed in the browser dev console for nosy developers (hi!).
    // \n starts a new line.
    consoleMsg: 'Oh hi, you opened the console. The wizard sees you.\n' +
      'Yes, this site is hand-built vanilla HTML/CSS/JS. View source away:\n' +
      'all the content lives in one friendly file: content.js',

    // The tab's title while someone is looking at another tab. '' turns it off.
    awayTitle: 'hey, come back :(',
  },

  /* ──────────────────────────────────────────────────────────────────────
     7. KASAI OS  (the OS itself; every line here is optional)
     ──────────────────────────────────────────────────────────────────────
     Delete a line to go back to the built-in wording.
     • "windows": each folder window's big heading ("heading"), the line
       under it ("sub") and the folder path above it ("address"; Coding,
       Writing and Certificates have one built in). In an address, type
       two backslashes for each one you want to see, e.g.
       address: 'C:\\Kasai\\Games'. (The About window's heading is the
       greeting in section 1.)
     • "bootLines": the boot screen, shown once per visit (but not for
       people whose device asks for less motion), on Start > Restart and
       after Shut down. It's over in under a second, so keep them short;
       five fit. Empty the list,  bootLines: [],  and only the bar shows.
     • "version" and "credits": the About Kasai OS box (right-click the
       desktop, or the button at the bottom of the Start menu).
     • "newFolder": the joke when someone picks New folder on the desktop menu.
     • Secret codes (just so you know them): typing "wizard" throws the
       wizard a party, "kasai" makes it rain doodles, and "sweep",
       "rubbish" and "stardrop" open the games; the Konami code (up up
       down down left right left right B A) gets the party and the rain
       together. On a phone, swipe the arrows part of the Konami code on
       the home screen. */
  os: {
    windows: {
      coding: { heading: 'Projects', sub: "Apps, experiments & tools I've built." },
      art: { heading: 'Illustration & Design', sub: 'Drawings, characters & design work. Pick a card to see it full size.' },
      writing: { heading: 'Drafts & Complete Works', sub: 'Web novels, stories & creative writing.' },
      certificates: { heading: 'Certificates', sub: 'Courses, certifications & professional development.' },
      games: { heading: 'Games', sub: 'Things to play when you should be working.' },
      trash: { heading: 'Recycle Bin', sub: "Old designs I couldn't bring myself to delete." },
    },

    // The boot screen's lines, in order (each gets a little "[ OK ]").
    // Past five, the oldest ones roll away.
    bootLines: [
      'Loading doodles...',
      'Waking the wizard...',
      'Shuffling the spell cards...',
      'Tucking wizards into the minefield...',
      'Kasai OS is ready.',
    ],

    // About Kasai OS. Each credit is one line.
    version: '1.0',
    credits: [
      'Made by Andrew Worgan (Kasai).',
      'Pet wizard drawn by Andrew, petted by you.',
      'Hand-built in vanilla HTML, CSS and JavaScript.',
      'Fonts: Arial Rounded MT Bold and Inter.',
    ],

    // Right-click the desktop > New folder.
    newFolder: 'New folder (2) already exists. So does New folder (3). Kasai OS is staging an intervention.',
  },

  /* ──────────────────────────────────────────────────────────────────────
     8. THE PET WIZARD  (your virtual pet, living on the desktop)
     ──────────────────────────────────────────────────────────────────────
     • He lives on the desktop, always behind the windows, and teleports
       about the free bits: his hat's star glows, there's a flash, and he
       pops up somewhere else. If a window lands on him he pops out from
       behind it. Ignore him and he naps.
     • Click him (or Tab to him + Enter) to pet him. Every tenth pet it
       rains doodles, and the mouse leaves a trail of them for the rest of
       the visit.
     • Drag him with the mouse to carry him somewhere (on a phone, press and
       hold him first). He dangles from his hat, then grumbles or dozes off
       where you put him down. Try dropping him on the Trash.
     • He remembers where you left him, and remembers people who petted
       him: they get a "welcomeBack" line when they come back. He waves
       when you come back to his tab too (see waveAway below).
     • pet.exe in the Start menu shows him, his mood and how many pets he's had.
     • What he says, and when, is noted above each list of lines below.
     • Any list of lines can be emptied, e.g.  dropLines: [],  to keep him quiet.
     • FRAMES: his drawings. The ones in assets/Wizard Sprite/svg/ come
       from the Wizard Virtual Pet project, along with wizard-rig.js (the
       animated him on the desktop): change them there, not here. A slot
       left empty borrows another drawing (noted beside it), so nothing
       ever looks broken. pet.exe, the games (sections 9 to 11), the Shut
       down screen and the page-not-found box wear these drawings, even if
       he's retired.                                                       */
  wizard: {
    enabled: true,                // set false to retire him from the desktop (he'll understand)
    image: 'assets/ui/Pet Wizard Cursor default Not rotated.png', // stands in for "idle" if that drawing is ever missing
    frames: {                     // his expressions (see FRAMES above)
      idle: 'assets/Wizard Sprite/svg/idle.svg',          // eyes open, resting
      half: 'assets/Wizard Sprite/svg/half.svg',          // mid-blink, eyes half shut
      blink: 'assets/Wizard Sprite/svg/blink.svg',        // eyes shut
      happy: 'assets/Wizard Sprite/svg/happy.svg',        // when you pet him
      asleep: 'assets/Wizard Sprite/svg/asleep.svg',      // napping (zzz drawn in)
      held: 'assets/Wizard Sprite/svg/held.svg',          // dangling from his hat when picked up
      dizzy: 'assets/Wizard Sprite/svg/dizzy.svg',        // just been put down
      startled: 'assets/Wizard Sprite/svg/startled.svg',  // surprised: poked awake, dropped in the Trash, or woken in Wizard Sweeper
      wave: 'assets/Wizard Sprite/svg/wave.svg',          // waving hello (with a magic hand)
      party: 'assets/Wizard Sprite/svg/party.svg',        // in a party hat, for the secret codes
      walk1: 'assets/Wizard Sprite/svg/walk1.svg',        // a step, left foot up (Not Rubbish)
      walk2: 'assets/Wizard Sprite/svg/walk2.svg',        // a step, right foot up (Not Rubbish)

      // Only the games use these (he never wears them on the desktop).
      // A tiny sleeping wizard for Wizard Sweeper's board: just his hat and
      // head, bold and simple, as it shows at about 32px.  (if emptied: asleep)
      sweeperTile: 'assets/Wizard Sprite/svg/sweeperTile.svg',
      // The same, woken: the wizard you woke, or one a Shield caught waking.  (if emptied: startled)
      sweeperAwake: 'assets/Wizard Sprite/svg/sweeperAwake.svg',
      hop: 'assets/Wizard Sprite/svg/hop.svg',          // mid-hop, in the air (Not Rubbish)  (if emptied: walk2)
      bonk: 'assets/Wizard Sprite/svg/bonk.svg',        // bonking a gremlin with his hat (Not Rubbish)  (if emptied: idle)
      hurt: 'assets/Wizard Sprite/svg/hurt.svg',        // "ouch!" when a gremlin hits him (Not Rubbish)  (if emptied: startled)
      aim: 'assets/Wizard Sprite/svg/aim.svg',          // his star glowing, ready to flick it off his hat (Star Drop)  (if emptied: idle)
      hatless: 'assets/Wizard Sprite/svg/hatless.svg',  // his hat without its star, watching it fall (Star Drop)  (if emptied: idle)
    },
    sleepAfter: 60,               // seconds of being ignored before he naps (half that from 10pm to 6am)
    waveAway: 10,                 // seconds on another tab before he waves when you come back (at most every 30 seconds)
    quietPages: ['coding'],       // windows where he won't speak unprompted (see "lines" below)

    // What he says when a window opens: one line at random from its list,
    // at most one every 8 seconds and never in his sleep. Its project or
    // document windows count as the folder's. "games" and "trash" lists
    // work too, if you'd like him to talk there.
    // Windows in "quietPages" never get a line unprompted: pet him while
    // one is in front and he says it then (once per visit).
    // "notfound" is his line in the page-not-found (404) box.
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

    // What he says when you pet him (cycles in order, then repeats; every
    // tenth pet is the doodle rain instead).
    petLines: ['!', '<3', 'Momentai', 'Good vibes only, gang.', 'again.', 'this is acceptable', 'magic +1', 'okay one more'],

    // Carrying him about (one at random each time).
    heldLines: ['wheee!', 'put me down!!', 'i can see my house from here', 'careful, the hat.'],   // when picked up
    dropLines: ['oof.', 'rude.', 'the room is spinning', 'i meant to land like that.'],          // when put down
    trashLines: ["i'm NOT rubbish!", 'hey! not recyclable.', 'it smells like old designs in here.'], // dropped on the Trash

    // Said to someone who petted him before, when they come back later
    // (after half an hour or more away), and with a wave to anyone coming
    // back to his tab (see waveAway).
    welcomeBack: ['welcome back!', 'oh hi, you again :)', 'i kept your spot warm.'],

    // Right-click the desktop > Refresh: he does a flip, then says one of these.
    trickLines: ['ta-da!', 'did you see that?!', 'fresh as a daisy.'],

    // A secret code (section 7) throws him a party, party hat and all.
    partyLines: ["it's a party!", 'nobody said there was a dress code', 'secret code accepted. party mode: on.'],
  },

  /* ──────────────────────────────────────────────────────────────────────
     9. WIZARD SWEEPER  (the game in the Games window)
     ──────────────────────────────────────────────────────────────────────
     Minesweeper with sleeping wizards: clear the field without waking
     any. Each level is a little bigger, and after every one you pick an
     upgrade. A visitor's best run is remembered on their computer.
     • The wizards on the board wear the pet wizard's drawings from
       section 8: "sweeperTile" (asleep), "startled" (the one you woke),
       and "happy" cheers on the level-cleared card.
     • Each list of lines is said one at random. Empty a list, e.g.
       loseLines: [],  to keep the wizards quiet.
     • "upgrades" are the names and blurbs on the upgrade cards. Reword
       them freely, but keep them true: the numbers are how the game
       works, so changing them here doesn't change the game.            */
  sweeper: {
    // Said by the wizard you woke, when the run ends.
    loseLines: ['WHO DARES WAKE ME?', 'five more minutes. FIVE.', "it's not even morning!", 'i was dreaming about cake...'],

    // After each level you clear.
    clearLines: ['shhh... not one of them stirred.', 'they slept right through it.', 'tiptoe champion.'],

    // When a run beats your best.
    bestLines: ['a new best! the wizards will hear about it tomorrow.', 'record broken. quietly.'],

    // When a Shield saves you.
    shieldLines: ['your shield hummed him back to sleep.', 'phew. shield to the rescue.'],

    upgrades: {
      lantern:   { name: 'Lantern',     blurb: 'Every level starts with a safe 3x3 patch already lit.' },
      shield:    { name: 'Shield',      blurb: 'Wake a wizard and your shield sends him back to sleep. Used up when it saves you.' },
      scry:      { name: 'Scry',        blurb: 'Your crystal ball spots one sleeping wizard at the start of every level.' },
      chord:     { name: 'Chord charm', blurb: 'Tap or click a number once all its wizards are starred to clear the rest of the tiles around it.' },
      hourglass: { name: 'Hourglass',   blurb: "20 more seconds on every level's speed bonus clock." },
      lucky:     { name: 'Lucky star',  blurb: "Once a level, a star that can't be wrong: it lands on a wizard or safely clears the tile." },
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
     10. NOT RUBBISH  (a game in the Games window)
     ──────────────────────────────────────────────────────────────────────
     Someone dropped the pet wizard in the Trash, so he climbs out: ten
     floors dressed as the retired designs in the Trash, oldest at the
     bottom, then the Empty Recycle Bin dialog on the lid. It's turn by
     turn: gremlins mark the tiles they'll strike after his move. After
     every floor he installs a program. A visitor's best run is
     remembered on their computer.
     • He wears his own drawings from section 8: "walk1"/"walk2" (steps),
       "hop", "bonk", "hurt", "asleep" (a nap), "party" (the Party popper
       and climbing out), "happy" (a floor cleared) and "startled"
       (knocked out).
     • "gremlins": a drawing for each gremlin, an SVG or a 960×960 transparent PNG
       in assets/Games/, e.g.  bug: 'assets/Games/Bug.png',  Until one is
       drawn, a stand-in shows (a coloured blob with eyes and a doodle).
       A slot ending in "Angry" (e.g. bugAngry) is a second drawing, shown
       while he stands on a tile that gremlin will strike next.
     • Each list of lines is said one at random. Empty a list, e.g.
       loseLines: [],  to keep him quiet.
     • "programs" are the names and blurbs on the program cards. Reword
       them freely, but keep them true: changing them here doesn't change
       the game.                                                         */
  rubbish: {
    gremlins: {
      bug: 'assets/Games/Ladybug.svg', // a ladybug: bites the four tiles beside it
      bugAngry: 'assets/Games/LadybugGreen.svg', // the ladybug while he stands on a tile it will bite
      webcam: 'assets/Games/Webcam.svg', // a webcam that shoots a beam along its row or column
      bunny: 'assets/Games/Bunny.svg', // a dust bunny: naps, then sneezes on all eight tiles round it
      spinner: 'assets/Games/Spinner.svg', // an evil dreidel that rolls at him
      printer: 'assets/Games/Printer.svg', // bites like a bug and prints copies of itself
    },

    // After each floor he climbs.
    floorLines: ['up we go.', 'one floor closer to the desktop.', 'that floor smelled like June.'],

    // When he's knocked out (the run ends).
    loseLines: ['back to the bottom of the bin...', 'i was nearly out!', 'someone empty this thing already.'],

    // When he climbs out at the top.
    winLines: ['told you. NOT rubbish.', 'fresh air! and wallpaper!'],

    // When a run beats your best.
    bestLines: ['a new best! the gremlins are fuming.'],

    // The Empty Recycle Bin dialog, in order, each time he bonks it (it
    // takes eight). The last line waits until it gives up.
    lidLines: ['Are you sure?', 'Are you really sure?', 'Are you totally sure?', 'This cannot be undone!', 'Seriously, this is permanent.', 'Last chance!', 'Final answer?', 'Fine. Keep him.'],

    // What he tells the desktop after a run. {floor} becomes the floor he
    // reached.
    deskLines: {
      lose: ['i made it to floor {floor} of the Trash!', 'floor {floor}. the gremlins got me.'],
      win: ['i climbed out of the Trash! not rubbish.'],
    },

    programs: {
      undo:        { name: 'Ctrl+Z',        blurb: 'Once a floor, take back a turn. If a hit would knock you out, it steps in by itself.' },
      firewall:    { name: 'Firewall',      blurb: 'Blocks the first hit on every floor.' },
      screensaver: { name: 'Screensaver',   blurb: 'Once a floor, every gremlin forgets its attack and sits out a turn. Using it costs no turn.' },
      ram:         { name: 'Extra RAM',     blurb: 'One more heart, and all your hearts back.' },
      overclock:   { name: 'Overclock',     blurb: 'Your hop recharges a turn sooner.' },
      antivirus:   { name: 'Antivirus',     blurb: 'Bonks do double damage.' },
      snooze:      { name: 'Snooze button', blurb: 'One more nap on every floor.' },
      popper:      { name: 'Party popper',  blurb: 'Once a floor, every gremlin round you gets dizzy. Using it costs no turn.' },
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
     11. STAR DROP  (a game in the Games window)
     ──────────────────────────────────────────────────────────────────────
     The pet wizard is asleep, and his nightmares creep along a lane
     towards his bed. In his dream he flicks the star off his hat down
     through a sky of pegs: every peg it pops is damage for the nightmare
     in the ring (pink, coral and white pegs count as 2, 3 and 5, and once
     in a blue moon a moon rises that makes the shot count ten times
     over), then they all step closer. A run is a week of nights, Monday
     to Sunday (the Bogeyman's), with a new star or a charm to pick each
     morning; endless runs carry on into harder and harder weeks. A
     visitor's best week and best endless run are remembered on their
     computer.
     • He wears his own drawings from section 8: "aim" (aiming the star),
       "hatless" (his hat without its star, while it flies), "asleep" (in
       bed), "startled" (a nightmare reaching the bed, and the run
       ending), "happy" (a night survived) and "party" (the whole week).
     • "nightmares": a drawing for each one, an SVG or a 960×960 transparent PNG in
       assets/Games/, e.g.  shadow: 'assets/Games/Shadow.png',  Until one
       is drawn, a stand-in shows (a coloured blob with eyes and a doodle).
       The bat and the jack-in-the-box only come in endless runs, from the
       second week.
     • Each list of lines is said one at random. Empty a list, e.g.
       loseLines: [],  to keep him quiet.
     • "stars" and "charms" are the names and blurbs on the cards he picks
       from each morning. Reword them freely, but keep them true: changing
       them here doesn't change the game.                                */
  stardrop: {
    nightmares: {
      shadow: 'assets/Games/Shadow.svg', // creeps one square closer every turn
      spider: 'assets/Games/Spider.svg', // scuttles two squares every turn
      raggedy: 'assets/Games/Raggedy.svg', // a raggedy teddy: big and slow, it rests every other turn
      cloud: 'assets/Games/Cloud.svg', // a storm cloud that strikes the bed with lightning
      bogeyman: 'assets/Games/Bogeyman.svg', // Sunday night's boss, who calls up shadows
      bat: 'assets/Games/Bat.svg', // endless only: flutters one square a turn, over anything in its way
      jack: 'assets/Games/Jack.svg', // endless only: a jack-in-the-box that winds up, then springs three squares
    },

    // Each morning, after a night he gets through.
    nightLines: ['phew. what a night.', 'five more minutes...', 'one night down.'],

    // When the nightmares wake him (the run ends).
    loseLines: ['AAAH! ...oh. it was only a dream.', 'i am sleeping with the light on.'],

    // When he gets through Sunday night.
    winLines: ['a whole week of sweet dreams!', 'the Bogeyman? never heard of him.'],

    // Endless runs: each Monday morning after he gets through another week.
    weekLines: ['another whole week!', 'Monday again already?'],

    // In a speech bubble, when a shot pops the blue moon.
    moonLines: ['once in a blue moon!', 'a blue moon! make a wish!'],

    // When a run beats your best (of its kind: week or endless).
    bestLines: ['a new best! sweet dreams indeed.'],

    // What he tells the desktop after a run. {night} becomes the night he
    // reached: like "Thursday" in a week, or a number in an endless run.
    deskLines: {
      lose: ['i made it to {night} night in Star Drop!', '{night} night was too scary.'],
      win: ['i slept through a whole week of nightmares!'],
      endless: ['i made it to night {night} of endless Star Drop!'],
    },

    stars: {
      plain:    { name: 'Plain star',    blurb: 'One damage for every peg it pops.' },
      split:    { name: 'Split star',    blurb: 'Splits in two on the first peg it touches.' },
      heavy:    { name: 'Heavy star',    blurb: 'Crashes straight through pegs for 2 damage each, so its whole path shows as you aim.' },
      bouncy:   { name: 'Bouncy star',   blurb: 'Extra bouncy, and it bounces back up off the bottom once.' },
      lullaby:  { name: 'Lullaby star',  blurb: 'Every nightmare it hits nods off and loses its next turn.' },
      starfall: { name: 'Starfall',      blurb: 'Every nightmare takes the hit, at half damage.' },
      big:      { name: 'Big star',      blurb: 'Half as big again, so it pops more pegs.' },
      north:    { name: 'North star',    blurb: 'Flies dead straight until it touches a peg, then falls like the rest.' },
      firework: { name: 'Firework',      blurb: 'Bursts on the first peg it touches and pops every peg round it. The aiming line shows which.' },
      snowball: { name: 'Snowball star', blurb: 'Starts small and grows with every peg it pops.' },
      pillow:   { name: 'Pillow star',   blurb: 'Knocks every nightmare it hits back 2 squares, if there\'s room. The Bogeyman is too heavy to budge.' },
    },

    charms: {
      nightlight:   { name: 'Night light',     blurb: 'Your aiming line shows the second bounce too.' },
      teddy:        { name: 'Teddy bear',      blurb: 'Guards the bed: the first nightmare or lightning to reach it each night does no harm.' },
      cocoa:        { name: 'Hot cocoa',       blurb: 'One more heart, and all your hearts back.' },
      socks:        { name: 'Lucky socks',     blurb: 'One more yellow peg in the sky.' },
      dreamcatcher: { name: 'Dreamcatcher',    blurb: 'The green peg also hits every nightmare for 5.' },
      stardust:     { name: 'Stardust',        blurb: 'Every star does one more damage for each peg it pops.' },
      story:        { name: 'Bedtime story',   blurb: 'A yellow peg triples the shot instead of doubling it.' },
      alarm:        { name: 'Alarm clock',     blurb: 'Once a night, ring it to push every nightmare back two squares. It costs no shot.' },
      jar:          { name: 'Star jar',        blurb: 'Pink, coral and white pegs each count as one more peg.' },
      telescope:    { name: 'Telescope',       blurb: 'Spots the blue moon 3 times as often.' },
      slippers:     { name: 'Fluffy slippers', blurb: 'One more star swap each night.' },
      sheep:        { name: 'Counting sheep',  blurb: 'Every fourth turn, the nightmare nearest the bed nods off and misses it.' },
    },
  },

};

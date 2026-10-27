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
    12. CV             your CV (the My CV button in the About window)
    13. PAINT          paint.exe, hidden in the Trash
    14. SPELL SOLITAIRE a game in the Games window, with your art on the cards

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
     • Set  email: ''  to hide both Email me buttons.
     • The My CV button beside Email me opens your CV (section 12). */
  about: {
    // The big greeting at the top of the window. Wrap any part in *asterisks* to highlight.
    heading: "Hi I'm *Andrew Worgan*",

    // Just under the greeting. It's also under your name at the top of the
    // Start menu (without the highlight there).
    subheading: "IT professional and hobbyist artist living around Bristol, UK",

    // The rolling strip across the top of the window, one phrase per item.
    // Empty the list,  ticker: [],  to hide the strip.
    ticker: ['Digital illustration', 'Graphic design', 'Web design', 'Creative writing', 'IT', 'QA', 'Automation'],

    // Your photo: beside the text, and in the circle at the top of the
    // Start menu. "photoAlt" describes it for people using screen readers.
    photo: 'assets/photos/About Me Photo.png',
    photoAlt: 'Photo of Andrew',

    paragraphs: [
      "I currently work in the IT sector, doing a bit of everything from user support to QA testing.",
      "I'm a massive creative at heart and spend most of my time writing, creating character designs or building small tools and web apps to help me with my creative work. My main creative project at the moment is re-writing my web novel \"Dilettante's in the Interim\".",
      "I've now completed and released my PKM \"Filo\", and I'm continuing to progress my career in IT.",
    ],
    workLinks: [
      { text: 'Filo', app: 'coding', href: '/coding_projects' },
      { text: "Dilettante's in the Interim", app: 'writing', href: '/writing' },
    ],
    contactLine: 'Happy to chat about IT opportunities, creative projects and collaboration.',

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
     • View artwork follows the single/double-click preference; touch and
       keyboard open straight away. About this piece always flips in one tap.
     • Optional reverse side: edit this same entry (match img exactly), e.g.
         details: { year: '', medium: '', paragraphs: [], process: [] }
       Put your own text in paragraphs, one string per paragraph. Omit
       unknown fields; empty details show no About button. Text is not HTML.
       Process images belong OUTSIDE the gallery in assets/art-process/<piece>/:
         process: [{ img: 'assets/art-process/pet-wizard/01-sketch.png',
                     alt: 'Your description of the sketch', caption: '' }]
       Use PNG/JPG/WebP, forward slashes and exact filename case. An image
       needs useful alt text; caption is optional. The build checks this.
       See the tracked root CONTENT_AUTHORING.md for the full template,
       asset instructions and preview checks. No author notes are supplied here.
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
       folder and the status bar instead. "status" sets a release label.
     • "benefit" is a short plain-English reason to use the project.
       "aiAssisted: true" adds an AI-assistance credit. "caseStudy" is an
       optional list of { heading, text } sections in the project window.
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
      benefit: 'Keep your notes, ideas and worldbuilding together on a flexible canvas.',
      desc: 'A completed and publicly released local-first desktop app for notes, ideas and worldbuilding. Mind maps, kanban boards, task lists and documents, all saved as plain Markdown files on your own disk.',
      tags: ['TypeScript', 'Svelte', 'Electron'],
      status: 'Released for Windows',
      aiAssisted: true,
      caseStudy: [
        { heading: 'Why I built Filo', text: 'I could not find a personal knowledge manager that met all my needs. I wanted something open source, with Markdown support and a canvas flexible enough for the way I work. Obsidian came close, but its controls did not suit what I wanted to do.' },
        { heading: 'Why Markdown', text: 'I already had an established collection of Obsidian files, so choosing Markdown meant I could bring my existing notes into Filo rather than start again.' },
        { heading: 'A technical challenge', text: 'Filo and Obsidian handle frontmatter differently. Working through those differences was one of the technical challenges involved in making the move between them seamless.' },
      ],
      links: [
        { label: 'GitHub', url: 'https://github.com/totallynotkasai/filo' },
        { label: 'Download for Windows', url: 'https://github.com/totallynotkasai/filo/releases/latest' },
      ],
    },
    {
      img: 'assets/projects/Mi Back Screen.png',
      title: 'Mi Back Screen - Rear Display App',
      benefit: 'Make the rear screen your own with useful shortcuts and personal touches.',
      status: 'Released for Android',
      aiAssisted: true,
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
      benefit: 'Find everyday tools, fidget toys and quick games in one Android app.',
      status: 'Released for Android',
      aiAssisted: true,
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
      benefit: 'Give your wallpaper routine more control with schedules and favourite images.',
      status: 'Publicly released',
      aiAssisted: true,
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
      benefit: 'Explore my projects, artwork, writing and games in a playful desktop.',
      status: 'Live website',
      aiAssisted: true,
      window: 'portfolio.html',             // title bar name (optional)
      accent: 'teal',
      desc: 'The site you\'re looking at: a little operating system I built by hand in plain HTML, CSS and JavaScript. Windows drag, snap and tidy themselves, a pet wizard roams the desktop, there are four games, every sound is made in the browser, and paint.exe hides in the Trash. Everything on it comes from one content file.',
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
     • "accent" colours the card's window and its margin line (default teal).
     • Optional overview: {} opens a structured introduction using the existing
       excerpt/status. Fill any of premise: [], cover: '', coverAlt: '',
       characters: [{ name: '', role: '', paragraphs: [], img: '', imageAlt: '' }],
       setting: [], sampleLabel: ''. Blank sections stay hidden.
       With overview, chapters: [{ title: '', paragraphs: [] }] is CURRENT sample
       material only; never copy the archived Prospector draft into the rewrite.
       No chapters means no sample heading/link, even with a sampleLabel.
       Use your own text, one string per paragraph, no HTML. Images need useful
       alt text and exact forward-slash PNG/JPG/WebP paths under assets/writing/
       (suggested: assets/writing/dilettantes/) or reuse assets/art/ images.
       See tracked CONTENT_AUTHORING.md for safe templates and checks. */
  writing: [
    {
      "title": "Prospector's Attempt at Sourdough Spellcasting",
      "excerpt": "The first two chapters of an old writing project. This project has been stopped and is being reworked into Dilettante's in the Interim. These chapters are preserved as an archived draft, rather than a sample of the current rewrite.",
      "status": "Archived draft",
      "date": "",
      "stamp": "Old writing",
      "accent": "teal",
      "chapters": [
        {
          "title": "Chapter 1 - Close",
          "paragraphs": [
            "The lights outside the store are humming again, a maddening, incessant buzz that has recently become the soundtrack to my evenings.",
            "They're a sensory nightmare on my closing shifts, the low-frequency tone vibrates straight through my skull to settle behind my eyes.",
            "The shelves gleam with new worlds, new stories, new possibilities; each back cover promising a grander purpose.",
            "\"Chronicles of Kona: Destiny's Blade\" the hero on the cover posturing with a certainty of will. Their role is clear, their destiny definite; my certainty lies solely in the need to restock them.",
            "On the slow walk back to the other side of the store, I catch a reflection drifting across the glass countertops; a tired ghost stares blankly back at me. There are dark circles under her eyes, knots in her hair and creases in her blue polo shirt.",
            "The cheap polyester blend chafes at the memory of bespoke costumes.",
            "The thread tries to strip bare the shroud burying my former self. I wipe the glass, exorcising my dishevelled image from existence. The motion is mechanical, a practiced ritual to avoid meeting my own gaze for too long.",
            "Most of my closing shift is spent monotonously tidying, cleaning and waiting. Becoming another part of the store’s fixtures. Habitually dulled by repetitive tasks or dust motes in the air.",
            "The occasional old person is the exception to the monotony as they stumble their way through the aisles searching for DVDs.",
            "My co-workers have always treated them poorly. Snickering every time one of them accidentally knocks something over, or intentionally interrupting them when they begin to ask a question.",
            "Personally, I find a brief solace in their tangential style of conversation.",
            "\"Oh thank you so much for helping me. I’ll tell you who else has been getting some help lately, my friend Hinako. Though her husband probably wouldn’t see it that way.\"",
            "It’s a special kind of craving, feeding off the emotional whiplash of their lives. Where each memory of colour and lustre they share only further illuminates how bare my own existence has become.",
            "The daze in my limbs is shaken away by tinny fanfare from a nearby demo cabinet. I press and hold the power button in retaliation, the screen’s vibrant world collapsing into a single point of light before vanishing.",
            "Count the tills, sweep the floors, check for any stowaways.",
            "My boss always reiterates the closing rituals to me every shift, even though I have been here for 3 years now.",
            "I put the alarm on and pull the metal shutter at the front of the store down, a grating screech reverberates through the arcade. With a weary lament, the lights extinguish, plunging my small corner into darkness, finally easing the burden on my ears.",
            "The store keys rattle in my hand, a small weight of responsibility I despise. There is a small pleasure in relinquishing them to the void of the drop box.",
            "The pavement is dull with recent rain. Neon \"We’re Closed\" signs shimmer on distorted puddles, bleeding reds and greens into the asphalt. The city’s scent is aerated with damp concrete, fried food, and the faint sweetness of refuse.",
            "A low rumble vibrates through the soles of my shoes. My feet begin to carry me as the city dissolves around me into a blur of headlights and muted laughter of strangers; a world that feels a universe away.",
            "The frigid night air caressing my skin fails to pierce the fog that has settled in my mind.",
            "Each movement forward feels heavier and more disconnected. That feeling doesn’t bring alarm, only a dry sense of inevitability.",
            "A long stretch of pale concrete gawks at me, stained with the grime of a thousand hurried journeys. The platform is deserted; a disembodied voice announces the next express service, its cheerful tone a stark contrast to the hollow ache in my chest.",
            "I find myself standing close to the edge of the platform, the textured yellow line pressing against the worn-down tread of my shoes.",
            "It goes against my nature, as the stage direction",
            "\"Find your mark. Don’t stand too close to the edge.\"",
            "has been etched into my soul.",
            "Down the tracks, a trio of brilliant lights cut through the inky darkness, growing larger, brighter, more insistent with every passing second.",
            "The air begins to tremble, a powerful wind pulling at my clothes.",
            "It feels almost like an embrace, a promise of an end to the quiet desperation that has become my constant companion.",
            "A symphony of squealing metal and blinding light consumes everything. I close my eyes, not in fear, but in resignation."
          ]
        },
        {
          "title": "Chapter 2 - Pusillanimity",
          "paragraphs": [
            "My hair blusters wildly in my face, strands whipping against my cheeks in retaliation for my cowardice.",
            "Tears, hot and unexpected, begin to swirl around on my cheeks in a celebration of despair.",
            "With a shuddering gasp torn from the depths of my lungs, I take control of my body for a brief moment and step back.",
            "A thundering silence befalls the station.",
            "My heart hammers against my ribs, a frantic, wretched rhythm that cruelly reminds me, I am alive.",
            "The despair doesn't recede. It crashes over me, now mingling with the bitter taste of failure.",
            "I sink to my knees on the cold concrete, the rough texture digging into my skin. The sharp, sudden pain is a distant sensation, barely registering. The compulsion that carried me here, departed on the express service.",
            "A different set of lights appear in the distance, softer, slower. It’s my train.",
            "There is no grand decision, no moment of clarity. My limbs feel weighted with lead, but the thought of remaining here, a pathetic heap on the platform, is somehow worse.",
            "The judgement of late evening commuters on their way home is too much for my brittle ego to bear.",
            "As the train doors hiss open with a sigh of pneumatics, I force myself to stand and step inside, the sudden warmth and artificial light, alien to my chilled skin.",
            "I slump into the nearest empty seat. The carriage is mostly empty, populated by the dregs of the city’s late-night workforce.",
            "No one looks at me, no one notices the parade of tears drying on my face or the jittering nature of my hands in my lap. I am just another tired face on the last train home.",
            "The rhythmic clatter of the wheels on the track becomes a metronome for the single word ricocheting around my brain.",
            "\"Stupid. Stupid. Stupid.\"",
            "My station approaches and I find myself propelled by a desperate, ugly urgency.",
            "The wind feels thin as it journeys past my hair, drying out my lungs. The stairwell reeks of stale dust and grease.",
            "Every quick step I take echoes into the oppressive abyss as an intense ache slumbers behind my temples.",
            "My key scrapes in the lock, and my door swings open. The silence that greets me isn't peaceful. It's a vacuum, sucking in the vicious chorus in my head.",
            "My work bag loosens its clutch on my shoulder before falling to the ground with a dull thud. In one motion my jacket and shoes tumble to the wayside.",
            "A grim conviction throws my legs to the bathroom.",
            "Still trembling, my fingers go to a small unassuming tin box tucked behind the spare toilet rolls. It’s a hidden sanctuary nestled in cotton wool, a secret I guard with a ferocity born of shame and desperation.",
            "Inside, a single razor blade, its size so pitiful, so unassuming, belies the immense power it holds over me, the elusive promise it whispers.",
            "\"Stupid. Stupid. Stupid.\"",
            "I press the cold edge against the soft skin of my wrist. The sharp, clean line of pain is a relief, a focal point for the swirling chaos in my head. It’s a language I can understand, a punishment I can control.",
            "The overwhelming cacophony of my meltdown is gagged, replaced by the terrible clarity of a thin crimson line that wells on my skin.",
            "It appears slowly at first, a delicate thread that blossoms into a tapestry on my arm. The grip of the scarlet tide is so alluring and alleviating.",
            "Except, it doesn’t appear to be swimming amongst the scars of previous repose; it’s pulsating, releasing pheromones of my failure into the air. The strands no longer neatly aligned, weave their way across my bathroom and body.",
            "My razor feels heavy as a sudden gush of warmth paints my skin in a grotesque swirl. Already accustomed to the gloom my vision narrows, the edges of the bathroom smearing into shades of ruby and sapphire.",
            "A deep chill starting from my toes crawls upwards; an assault has been launched against the warmth blooming from my wrist. My knees buckle, and I slump against the cold tile, the porcelain clasps to my face.",
            "A metallic tang fills my nostrils, thick and cloying. Each beat of my heart feels weaker, a slowing drum marking a steady retreat.",
            "The cold is consuming me, seeping into my bones, suckling on the last vestiges of my body's will to live. My spine is pounded by a tremor, forcing my eyelids to twitch and dance across my eye line.",
            "Soft twilight nuzzles against my vision, however its embrace is impeded by the appearance of a velvet curtain.",
            "I exhale hoping my breath would push past the increasing weight I feel on top of my body, but it does little to shift the curtain. Distant applause rains upon me as I feel compelled to bow one last time."
          ]
        }
      ]
    },
    {
      date: '2026',
      title: "Dilettante's in the Interim",
      excerpt: 'My web novel, currently being re-written. A character-driven story I keep coming back to.',
      url: '',                              // no url = no dead link; shows the status text instead
      status: 'Re-write in progress',    // shown in the list and on the card
      stamp: 'Re-write',                  // rubber stamp in the top corner (optional)
      accent: 'lavender',
      overview: {},                       // optional sections await current authored material
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
    {
      img: 'assets/certs/emergency-first-aid-at-work.png',
      title: 'Emergency First Aid at Work',
      issuer: 'British Red Cross',
      date: '20 April 2026 (valid until 19 April 2029)',
      link: '/assets/certs/emergency-first-aid-at-work.pdf',
      linkLabel: 'Open certificate PDF',
      accent: 'pink',
    },
    {
      img: 'assets/certs/microsoft-365-fundamentals.png',
      title: 'Microsoft 365 Certified: Fundamentals',
      issuer: 'Microsoft',
      date: '20 February 2025',
      link: '/assets/certs/microsoft-365-fundamentals.pdf',
      linkLabel: 'Open certificate PDF',
      accent: 'blue',
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
     6. SITE PERSONALITY  (all around Kasai OS)
     ──────────────────────────────────────────────────────────────────────
     Small bits of voice that live around the edges of the site.           */
  site: {
    // At the foot of the Start menu, and in the About Kasai OS box.
    copyright: '© 2026 Andrew Worgan (Kasai). All rights reserved.',

    // What an empty folder says under "This folder is empty", one line per
    // window. The coding one stays straight because recruiters read it.
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
     • Games can also have a "trophy": a drawing (an SVG or a square
       transparent PNG in assets/Games/) for the trophy a game's file gets
       once someone wins a run of it. Until there is one, a yellow doodle
       cup on a white sticker stands in.
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
      games: { heading: 'Games', sub: 'Things to play when you should be working.', trophy: '' },
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
     • Double-click an empty bit of the desktop (double-tap a phone's home
       screen) and he teleports over to see what you want, waking up
       first if he was napping. He stays there until he next wanders off.
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
      cards: '',                                        // fanning out a hand of cards (Spell Solitaire's file and title card)  (until drawn: wave)
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
    // "cv" is for your CV's window (section 12), the first time it opens.
    // "notfound" is his line in the page-not-found (404) box.
    // "summon" is what he says when he's called over: a double-click on an
    // empty bit of the desktop (a double-tap on a phone).
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
      cv: [
        'hire him! he feeds me.',
      ],
      notfound: [
        'i ate this page. sorry.',
        'it tasted like 404.',
      ],
      summon: [
        'you rang?',
        'poof!',
        'at your service.',
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

    // The sound switch (the speaker by the clock, or Sound in the Start
    // menu): what he says when it's turned on, and off (not while
    // he's asleep). Empty a list, e.g.  soundOff: [],  to keep him quiet.
    soundOn: ['ooh, i can hear again!', 'la la laaa!', 'is that my theme tune?'],
    soundOff: ['shhh...', 'quiet time.', 'library rules, got it.'],
  },

  /* ──────────────────────────────────────────────────────────────────────
     9. WIZARD SWEEPER  (the game in the Games window)
     ──────────────────────────────────────────────────────────────────────
     Minesweeper with sleeping wizards: clear the field without waking
     any. Each level is a little bigger, and after every one you pick an
     upgrade. Clearing level 12 wins the run, and then you can keep
     sweeping into endless levels. A visitor's best run is remembered on
     their computer, and a won run puts a trophy on the game's file.
     • The wizards on the board wear the pet wizard's drawings from
       section 8: "sweeperTile" (asleep), "startled" (the one you woke),
       "happy" cheers on the level-cleared card and "party" on the win.
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

    // When you clear level 12 and win the run.
    winLines: ['twelve levels, and they all slept through it.', 'sweet dreams, every one of them.'],

    // When a run beats your best.
    bestLines: ['a new best! the wizards will hear about it tomorrow.', 'record broken. quietly.'],

    // When a Shield saves you.
    shieldLines: ['your shield hummed him back to sleep.', 'phew. shield to the rescue.'],

    // What the pet wizard tells the desktop after a run. {level} becomes
    // the level it ended on. "endless" is for a run lost after the win.
    deskLines: {
      lose: ['i got to level {level} of Wizard Sweeper!', 'level {level}. a wizard woke up.'],
      win: ['i cleared all twelve levels of Wizard Sweeper!'],
      endless: ['i swept all the way to level {level}!'],
    },

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
     remembered on their computer, and climbing out puts a trophy on the
     game's file.
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
    // reached; "lid" is for a run that ends on the lid itself.
    deskLines: {
      lose: ['i made it to floor {floor} of the Trash!', 'floor {floor}. the gremlins got me.'],
      lid: ['i made it all the way to the lid!', 'so close. the lid got me.'],
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
     computer, and a won week puts a trophy on the game's file.
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
      dreamcatcher: { name: 'Dreamcatcher',    blurb: 'The green peg also hits every nightmare, harder as the nights get tougher.' },
      stardust:     { name: 'Stardust',        blurb: 'Every star does one more damage for each peg it pops.' },
      story:        { name: 'Bedtime story',   blurb: 'A yellow peg triples the shot instead of doubling it.' },
      alarm:        { name: 'Alarm clock',     blurb: 'Once a night, ring it to push every nightmare but the Bogeyman back two squares. It costs no shot.' },
      jar:          { name: 'Star jar',        blurb: 'Pink, coral and white pegs each count as one more peg.' },
      telescope:    { name: 'Telescope',       blurb: 'Spots the blue moon 3 times as often.' },
      slippers:     { name: 'Fluffy slippers', blurb: 'One more star swap each night.' },
      sheep:        { name: 'Counting sheep',  blurb: 'Every fourth turn, the nightmare nearest the bed nods off and misses it.' },
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
     12. CV  (the My CV button in the About window)
     ──────────────────────────────────────────────────────────────────────
     Your CV on a sheet of paper, in a window of its own. The My CV button
     under your About text opens it, and so does the address
     www.andrewworgan.co.uk/cv (handy for job applications and LinkedIn).
     Its menu bar prints it, or saves it as a PDF: only the page prints.
     • Contact details: the email is the one in section 1, so your own
       email address and phone number never go online. "linkedin" and
       "website" show as links, "place" is where you're based.
     • "jobs", newest first: "dates" sits on the right, with "where"
       (Remote, On-site...) under it. Each of "points" is one bullet.
     • "education": "what" is the qualification, "points" the bullets.
     • "certificates": "from" sits on the right; "note" (optional) is a
       small line under the name.
     • "skills": each is a "name", its "chips" (one little label per
       skill) and an optional "note" under them.
     • "headings" are the section titles, top to bottom.
     • Delete the whole  cv: { ... },  block to take the My CV button away. */
  cv: {
    name: 'Andrew Worgan',
    place: 'Gloucester/Bristol',
    linkedin: 'https://www.linkedin.com/in/andrew-worgan/',
    website: 'https://www.andrewworgan.co.uk/',

    headings: {
      profile: 'Personal Profile',
      jobs: 'Employment History',
      education: 'Education',
      skills: 'Technical Skills and Certification',
      interests: 'Hobbies & Interests',
    },

    profile: 'I am a proactive and inquisitive person with a strong foundation in IT and administrative roles relating to system administration, data management, and automation.',

    jobs: [
      {
        place: 'Intertek Check Safety First Ltd',
        role: 'IT System Administrator and Graphic Design',
        dates: 'July 2023 to present',
        where: 'Remote',
        points: [
          'Managed primary helpdesk responsibilities, resulting in the highest ticket closure rate on the support team: over 2,400 tickets in one year, a third of all tickets for the year in a six-person team.',
          'Addressed a diverse range of IT issues, from system outages to bugs in our bespoke systems, utilising Azure DevOps to identify, open and test work items.',
          'Led a cross-departmental initiative to update and maintain our asset tracking, successfully reducing lost assets from 5% to 0%.',
          'Gained proficiency in Microsoft Azure, enabling effective monitoring and maintenance of core user functions, including distribution lists and group memberships critical for data access control.',
          'Employed graphic design skills to assist with the roll-out of over 30 training modules for our bespoke hotel training platform, as well as assisting in brainstorming for a potential company rebrand.',
          'Took on the responsibility of training colleagues in key system processes such as device setups.',
          'Contributed to the maintenance and updating of internal SQL databases.',
        ],
      },
      {
        place: 'Yorkley Health Centre',
        role: 'NHS Administrator and IT Support',
        dates: 'March 2021 to June 2023',
        where: 'On-site',
        points: [
          'Delivered prompt and efficient patient services, significantly honing interpersonal and telephone communication skills in a sensitive environment, reducing patient wait time on the phone to under 2 minutes on average when I was on shift.',
          'Demonstrated strong problem-solving abilities by helping my colleagues with a variety of first-line hardware issues such as printers and servers, minimising practice downtime.',
          'Improved the general efficiency of the practice by utilising new solutions within SystmOne to improve how doctors and other administrative staff handled paperwork and coded patient records.',
          'Preserved and updated patient records while adhering to confidentiality requirements - alongside assisting with the effort to digitise patient paper records.',
          'Developed an internal sheet for managing practice room allocation, which lessened the burden on our practice manager when it came to working on the practice rota.',
          'Volunteered for administrating COVID-19 vaccinations during the pandemic.',
        ],
      },
    ],

    education: [
      {
        place: 'UWE Bristol',
        what: 'BSc (Hons) Computer Science (Distinction/1st)',
        points: [
          'Modules included Computer and Network Systems, Intro to OOD, Intro to AI and Principles of Computing.',
          "Dean's List member for 2020.",
          'Team Captain for UWE "Sea Stags" Esports Team.',
        ],
      },
      {
        place: 'Wyedean Sixth Form',
        what: 'A-Level and 2 BTECs',
        points: [
          'A-Level: Computer Science (A)',
          'BTECs: ICT (Distinction) and Business Studies (Distinction)',
          'Hold a mentoring certificate and provided guidance to struggling students in secondary school and sixth form.',
        ],
      },
      {
        place: 'The Dean Academy',
        what: '10 GCSEs at grade B and above',
        points: [
          'Subjects including English (B), Maths (A) and Computer Science (A).',
          'Served on the student leadership team and as head of the student council in secondary school.',
        ],
      },
    ],

    certificates: [
      { name: 'MS-900 Microsoft 365 Fundamentals', from: 'Microsoft', note: 'Certificate available upon request' },
      { name: 'Intermediate and Advanced Excel Techniques', from: 'QA' },
      { name: 'Querying SQL Databases using T-SQL', from: 'QA' },
    ],

    skills: [
      { name: 'Operating systems', chips: ['Windows 10 and 11', 'iOS', 'Android', 'VMware', 'VirtualBox'], note: 'Proficient in all of them.' },
      { name: 'Office 365', chips: ['Word', 'Excel', 'SharePoint', 'Teams', 'Outlook'], note: 'Qualified to use and support all areas of 365, especially these.' },
      { name: 'Adobe Creative Suite', chips: ['Photoshop', 'Illustrator', 'Audition', 'XD'], note: 'Experienced with all four. Portfolio available upon request.' },
      { name: 'Coding', chips: ['HTML', 'CSS', 'JavaScript', 'PowerShell', 'cmd'], note: 'Proficient in HTML, with a basic understanding of CSS, JavaScript, cmd and PowerShell, and experience with web development tools.' },
      { name: 'AI', chips: ['Gemini', 'Claude', 'Copilot Studio', 'Gemini CLI', 'Claude Code'], note: 'Extremely competent with LLMs, and very familiar with Copilot Studio and its integrations with the 365 suite. Was a private beta tester for the original GPT-3 and DALL-E.' },
      { name: 'Driving licence', note: 'Clean record and access to a vehicle.' },
    ],

    interests: "A primary passion of mine is graphic design and illustration, which provides an outlet for my creativity and the opportunity to set measurable objectives for self-improvement. I've recently taken up some vibe coding so I can build a tailor-made organisation tool for my own personal use, to support me with the rewrite of my web novel. I also enjoy playing games and watching shows with my friends online.",

    // The last line of the page.
    references: 'References available on request',
  },

  /* ──────────────────────────────────────────────────────────────────────
     13. PAINT  (paint.exe, hidden in the Trash)
     ──────────────────────────────────────────────────────────────────────
     The Trash has one file that isn't an old design: paint.exe, an old
     paint program that still works. Pencil, brush, line, curve,
     rectangle, fill bucket, eyedropper and eraser in the brand colours,
     on a 640x480 picture that zooms. Save downloads the
     picture as a PNG to the visitor's own computer (nothing is ever sent
     anywhere), and the pet wizard rates it.
     • "drawing": a drawing for paint.exe's file in the Trash (an SVG or
       a transparent PNG in assets/ui/). Until there is one, a tiny paint
       window stands in. "note" is the line under its name.
     • "rateLines": what the wizard on the desktop says when a picture is
       saved, one at random. {score} becomes his score out of 10, and
       "blank" is for saving an empty picture. Empty a list to keep him quiet. */
  paint: {
    drawing: '',
    note: 'Old paint program. Still works.',
    rateLines: {
      blank: ['a blank canvas. very brave.', 'i love it. what is it?'],
      low: ['{score}/10. i can tell you tried.', '{score}/10. is it upside down?'],
      mid: ['{score}/10. that is going on my fridge.', '{score}/10. the wizard council approves.'],
      high: ['{score}/10! a masterpiece!', '{score}/10. somebody frame this.'],
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
     14. SPELL SOLITAIRE  (a game in the Games window)
     ──────────────────────────────────────────────────────────────────────
     TriPeaks with spells, and your art on the cards. Three peaks of
     cards: play any uncovered card one higher or lower than the pile
     (Kings and Aces go round), and chain them into streaks, each card
     worth more than the last. A run is seven deals, each with a target;
     between deals you pick a spell or a charm, and from deal 4 curses
     join in. A visitor's best run is remembered on their computer, and
     beating the Final Deal puts a trophy on the game's file.
     • Every rank wears one of your artworks for the whole run (all four
       suits share it), captioned like "7 of Flames: Mountain". Each run
       picks a fresh 13 from assets/art. To fix some, list them in
       "faces", Ace first:  faces: ['assets/art/Digital Art/Mountain.png'],
       Leave a rank '' (or the list empty) and it's picked at random.
     • "drawings": your drawings for the card back, the four suits and
       the spell and curse icons, an SVG or a transparent PNG each (e.g.
       in assets/Games/). Until one is drawn, a stand-in shows: the back
       is periwinkle with the flame logo, the rest are doodles.
     • He wears his own drawings from section 8: "idle" beside the pile,
       "happy" on a streak of 5 or more, "party" for a clean sweep and a
       won run, "startled" when a heart is lost, and "cards" (until it's
       drawn, "wave") on the title card and the game's file.
     • Each list of lines is said one at random. Empty a list, e.g.
       loseLines: [],  to keep him quiet.
     • "spells", "charms" and "curses" are the names and blurbs on their
       cards. Reword them freely, but keep them true: changing them here
       doesn't change the game.                                          */
  solitaire: {
    faces: [],

    drawings: {
      back: '',      // the back of every card
      backFinal: '', // ...and on a Final Deal (until drawn: the back above, or the ink stand-in)
      flames: '',    // the four suits, in the cards' corners
      stars: '',
      moons: '',
      leaves: '',
      wild: '',      // the seven spells, in the dock and on their cards
      fireball: '',
      echo: '',
      rewind: '',
      moonlight: '',
      scry: '',
      undraw: '',
      nudge: '',
      dispel: '',
      circle: '',    // the five curses, on the bar along the top (Broken Circle, Seal, Moths, Hex, Toll)
      seal: '',
      moth: '',
      hex: '',
      coin: '',
      ember: '',     // the charms too, if you like (Ember, Twin Peaks, Kindred, Crystal Ball, Second Deck, Healing Potion, Spellbook)
      peaks: '',
      kindred: '',
      crystal: '',
      deck: '',
      potion: '',
      book: '',
      clover: '',
      hearth: '',
    },

    // At the start of each deal, and of the Final Deal.
    dealLines: ['shuffle up and deal!', 'i can feel a long streak coming.', 'cards on the table.'],
    finalLines: ['the Final Deal. no pressure.', 'this is it. the Final Deal!'],

    // In a speech bubble during a deal: a streak of 10 or more, the
    // target reached, a clean sweep.
    streakLines: ['on a roll!', 'keep it going!', 'look at that streak!'],
    targetLines: ['target reached! keep going.', "that's the target. now show off."],
    sweepLines: ['clean sweep!', 'not a card left!', 'peaks? what peaks?'],

    // On the card between deals: a deal made, or under its target.
    madeLines: ['deal done!', 'another one for the pile.'],
    hurtLines: ['ouch. under target.', 'that one got away.'],

    // When the run ends: lost, won, or a new best.
    loseLines: ["that's the deck done.", 'the cards were against us.'],
    winLines: ['every deal beaten!', 'we did it! all seven!'],
    bestLines: ['a new best! frame those cards.'],

    // What he tells the desktop after a run. {deal} becomes the deal it
    // ended on; "endless" is for a run lost after beating the Final Deal.
    deskLines: {
      lose: ['i made it to deal {deal} in Spell Solitaire!', 'deal {deal}. the cards were against me.'],
      win: ['i beat all seven deals of Spell Solitaire!'],
      endless: ['i dealt my way to deal {deal} of Spell Solitaire!'],
    },

    spells: {
      wild:      { name: 'Wild',      blurb: 'Play any uncovered card, whatever its rank. The streak carries on.' },
      fireball:  { name: 'Fireball',  blurb: 'Burn an uncovered card away. The streak carries on, and a peak still pays.' },
      echo:      { name: 'Echo',      blurb: 'Draw a card without breaking your streak.' },
      rewind:    { name: 'Rewind',    blurb: 'Take back your last play.' },
      moonlight: { name: 'Moonlight', blurb: 'Every face-down card turns face up for this deal.' },
      scry:      { name: 'Scry',      blurb: 'See the next three cards of the stock, and put them back in any order.' },
      undraw:    { name: 'Undraw',    blurb: 'Take back your last draw: the streak comes back, and the card goes under the stock.' },
      nudge:     { name: 'Nudge',     blurb: 'Shift the pile’s top rank up or down by one. Its suit and your streak stay the same.' },
      dispel:    { name: 'Dispel',    blurb: 'Remove one chosen curse for this deal.' },
    },

    charms: {
      ember:     { name: 'Ember',          blurb: 'Streaks start a step higher: 20, 30, 40...' },
      twin:      { name: 'Twin Peaks',     blurb: 'Peak bonuses are doubled.' },
      kindred:   { name: 'Kindred',        blurb: 'A card played on its own suit scores double. Changing suit keeps your streak; the Hex curse still applies.' },
      crystal:   { name: 'Crystal Ball',   blurb: 'See the top card of the stock (two with a second ball).' },
      deck:      { name: 'Second Deck',    blurb: 'Once a deal, an empty stock gets 12 cards back from the pile.' },
      potion:    { name: 'Healing Potion', blurb: 'One more heart, and all your hearts back.' },
      spellbook: { name: 'Spellbook',      blurb: 'Each clean sweep gives a free spell charge for the next deal.' },
      clover:    { name: 'Lucky Clover',   blurb: 'Every fifth consecutive play scores 50 extra points.' },
      hearth:    { name: 'Hearthstone',    blurb: 'A clean sweep that reaches its target restores an extra half-heart.' },
    },

    curses: {
      circle: { name: 'Broken Circle', blurb: "Kings and Aces don't connect." },
      seal:   { name: 'Seal',          blurb: "The middle peak's top three cards are sealed until both outer peaks are clear." },
      moths:  { name: 'Moths',         blurb: '11 fewer cards in the stock.' },
      hex:    { name: 'Hex',           blurb: 'One suit still scores, but starts the streak again.' },
      toll:   { name: 'Toll',          blurb: 'Every draw costs 15 points.' },
    },
  },

};

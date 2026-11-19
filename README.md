# KidZ Zone

One app for children aged 4 to 12, with eight worlds and one profile, one set of stars and one grown-ups area.

Live: https://kidz-zone-mu.vercel.app

| Group | World | From | What the child does |
|---|---|---|---|
| Learn | Words | Word Wonders | 314 words in 25 categories that move and speak; Find the Object lessons with spaced revision |
| Learn | Word Garden | Word Garden | 40 levels of cards: match the picture, find the missing letter, spell with tiles, then sentences, opposites and rhymes |
| Learn | Money | Money Master | Real RBI specimen notes and coins at true relative size; make amounts, endless challenges |
| Play | Puzzles | Puzzle Quest | Eight adaptive puzzle types (jigsaw, shapes, numbers, stories, memory, logic, patterns, mazes) |
| Play | Brain Gym | Brain Gym | 37 mini-games in eight zones, ten levels each, daily challenges |
| Play | Pets | Virtual Pet Universe | Adopt a pet and raise it from Baby to Legendary: feed, play, train, dress up, decorate |
| Explore | Maps | Map Explorer | India's 28 states, 8 Union Territories and every district on official boundaries, plus a 3D globe; EN/Tamil read-aloud |
| Explore | Shop | My Supermarket | A 3D supermarket with seven aisles, prices in rupees, a trolley, a till and change to count; AR/VR modes |

Shared across every world:

- **One profile:** name, age band (4–6, 7–9, 10–12) and an initials badge, mirrored into each world.
- **One progress summary:** stars, XP, plays and each world's level; player level and day streak on Home.
- **Today's mix:** four short activities from four worlds that suit the age band, the same all day.
- **One Settings screen:** sound, reading voice speed, text size and reduced motion.
- **Grown-ups area** (behind a multiplication question): a 14-day chart across worlds, a per-world table, each
  world's own dashboard (Word Wonders, Puzzle Quest, Brain Gym, Map Explorer, My Supermarket) and reset.
- **A play-money jar:** money challenges and shopping trips add rupees; the Shop swaps them for shop coins.

Look: Kolam (Lato, ink on white, hairline borders); each world keeps one accent colour. Inside the Android app the
Kolam M3 kit gives Material 3 bars, inside the iPhone app the Kolam iOS kit gives Apple HIG bars. Preview in a
browser with `?app=android`, `?app=ios`, and `?app=web` to go back.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # shared layer + the source apps' engine tests
npm run build    # type-check + production build into dist/
node tools/check.mjs http://localhost:5173   # every world in web, Android and iPhone modes, fails on console errors
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the eight apps were brought together.

## Sources and licences

- Word Garden pictures: Microsoft Fluent Emoji 3D (MIT), in `public/garden/img`.
- Money: Reserve Bank of India specimen notes and coins from Wikimedia Commons (GODL-India, CC0); see
  `public/money/currency/CREDITS.md`.
- Maps: India boundaries from the Government of India Local Government Directory (December 2023) via datameet and
  ramSeraph/indian_admin_boundaries (CC0); world map from Natural Earth, India point-of-view edition (public domain);
  country data from mledoze/countries (ODbL); photos from Wikimedia Commons, credited under each photo.
- Speech uses the device's own voices (Web Speech API; native text-to-speech inside the phone apps).

Progress stays on the device (localStorage and IndexedDB). No account, no tracking. The Pets world's optional cloud
save only switches on when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set at build time; they are not.

Designed and built by Gopinath Thandapani with AI-assisted coding.

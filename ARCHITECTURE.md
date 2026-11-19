# KidZ Zone architecture

KidZ Zone brings eight children's apps into one Vite + React 19 + TypeScript app: Word Wonders, Word Garden,
Money Master, Puzzle Quest, Brain Gym, Virtual Pet Universe, Map Explorer and My Supermarket. Each became a
**world**: its code was copied in (the source folders were not changed), mounted under one router, and given
the same type, palette, frame and settings. A thin shared layer owns the child profile, settings, progress
summary, Today's mix and the grown-ups area.

## System

```mermaid
flowchart LR
  subgraph Phone apps
    A[Android shell<br/>Capacitor, com.gopinath.kidzzone<br/>native text-to-speech] --> L
    I[iPhone shell<br/>SwiftUI WKWebView, KidzZone-iOS] --> L
  end
  B[Browser] --> L[kidz-zone.vercel.app<br/>static Vite build]
  L --> K[Kolam kits from GitHub Pages<br/>kolam-m3.js / kolam-ios.js]
  L --> S[(localStorage + IndexedDB<br/>on the device only)]
  L -. optional, env-gated .-> SB[(Supabase cloud save<br/>Pets world, off by default)]
```

- No server, no account. Everything is saved on the device. The Pets world keeps its optional Supabase cloud
  save behind `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (not set, so it is off).
- In the Android app the Kolam M3 kit draws a Material 3 top app bar and navigation bar; in the iPhone app the
  Kolam iOS kit draws an Apple HIG navigation bar and tab bar. In a browser neither switches on
  (`?app=android`, `?app=ios`, `?app=web` preview them). See `src/shared/native.ts`.

## Worlds and routing

```mermaid
flowchart TD
  R[HashRouter in src/App.tsx] --> H[/ Home: Today's mix + all worlds/]
  R --> LRN[/learn/] & PLY[/play/] & EXP[/explore/] & PRG[/progress/]
  R --> SET[/settings/] & PAR[/parent/* grown-ups, behind a sum/]
  LRN --> W1[/words/* Word Wonders<br/>nested Routes/]
  LRN --> W2[/garden Word Garden<br/>vanilla JS mounted in a route/]
  LRN --> W3[/money Money Master/]
  PLY --> W4[/puzzles/* Puzzle Quest<br/>state routes moved to the URL/]
  PLY --> W5[/brain/* Brain Gym<br/>its own hash router, prefixed/]
  PLY --> W6[/pets Virtual Pet Universe<br/>zustand store, full-screen box/]
  EXP --> W7[/maps/* Map Explorer<br/>Next.js pages on next/link + next/navigation shims/]
  EXP --> W8[/shop My Supermarket<br/>React Three Fiber, WebXR/]
```

| World | Source | How it was brought in |
|---|---|---|
| Words | `vocab-builder` (Word Wonders) | Routes nested under `/words`; absolute links prefixed; NavBar replaced by the world bar; its Parent screen is reused in the grown-ups area. |
| Word Garden | `word-garden` | The original `app.js` wrapped in `mountGarden(root, liveRegion, opts)`; its CSS scoped under `.w-garden` by `tools/scope-css.mjs`. Name, sound and voice come from the shared layer. |
| Money | `money-master` | Header replaced by the world bar; challenges report stars and add ₹20 to the shared play-money jar. |
| Puzzles | `puzzle-quest` | Screen state (home / play / parent) moved into the URL; its global CSS scoped under `.w-puzzles`; its PIN gate replaced by the shared grown-up check. |
| Brain Gym | `brain-gym` | Its tiny hash router now parses `#/brain/…`; its utilities renamed (`bcard`, `bbtn`…) so they never clash with Puzzle Quest's `.card` / `.btn`. |
| Pets | `virtual-pet-universe` | Fixed full-screen root became a box under the world bar; game, trick and care actions report to the shared progress. |
| Maps | `india-map-explorer` | Next.js app-router pages mounted as routes; `@/…`, `next/link` and `next/navigation` resolve to small shims (`src/worlds/maps/next-shim`) that add the `/maps` prefix. Boundary data in `public/maps/data`. |
| Shop | `virtual-supermarket` | Session screens unchanged; the 3D store fills the world's box; quizzes and shopping trips report to the shared progress; the jar can be swapped for shop coins. |

Every world is lazy-loaded (`React.lazy`), so Home ships about 100 kB of JavaScript and the 3D supermarket's
three.js code loads only in the Shop.

## Shared profile and progress

```mermaid
flowchart LR
  subgraph World saves, original keys
    a[wordwonders:v1] --- b[word-garden-v2] --- c[money-master:*] --- d[puzzle-quest/v1]
    e[braingym:v1] --- f[vpu-save-v1] --- g[imx-progress-v1] --- h[(IndexedDB virtual-supermarket-progress)]
  end
  W[World code] -- record(world, id, stars, xp, level) --> S[(kidzzone:v1<br/>src/shared/store.ts)]
  W -- reads name, age, sound, voice --> S
  S --> HM[Home: totals, streak, level]
  S --> MX[Today's mix<br/>src/shared/dailyMix.ts]
  S --> PA[Grown-ups: 14-day chart, per-world table, reset]
  PA --> WD[Each world's own dashboard<br/>Word Wonders, Puzzle Quest, Brain Gym, Map Explorer, My Supermarket]
```

- **Profile:** name, age band (4–6, 7–9, 10–12) and an initials badge colour. Each world's own profile is
  mirrored from it (Brain Gym and Puzzle Quest age groups, Word Wonders difficulty, the shop's age band).
- **Progress:** `record()` adds an activity to a capped log and to the world's summary (stars 0–3, XP, plays,
  the world's own level label). Totals, the player level, the streak and the parent chart are pure functions of it.
- **Today's mix:** four activities from four different worlds that suit the age band, seeded by the date and the
  child's name and stored once per day. An item is done when the world records a matching activity today.
- **Settings:** sound, reading voice speed, text size and reduced motion, read by every world.
- **First run:** `src/shared/legacy.ts` summarises any saves the original apps left on the same origin (they
  lived on their own domains, so on kidz-zone's domain this normally finds nothing). It runs once per device.

## Build and deploy

```mermaid
flowchart LR
  G[git push main<br/>tgopinath/kidz-zone] --> V[Vercel project kidz-zone<br/>npm run build -> dist]
  V --> LIVE[kidz-zone.vercel.app]
  LIVE --> APK[Android shell<br/>android-wrappers/build-remote.sh<br/>kidz-zone.apk on release v1.0.0]
  LIVE --> IOS[iPhone shell<br/>KidzZone-iOS, Simulator screenshots]
  LIVE --> P[Portfolio card<br/>gopinath-portfolio + PetProjects]
```

- `npm test` runs the shared-layer tests (profile, progress, Today's mix, first-run import) and the source apps'
  own engine tests (Puzzle Quest adaptive engine and store, Money Master currency and challenges, My Supermarket
  engine).
- `npm run build` type-checks and builds. `node tools/check.mjs` opens every world headless in web, Android and
  iPhone modes and fails on console errors. `node tools/shots.mjs` captures the portfolio screenshots.

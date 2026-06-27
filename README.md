# Micron — Hash Rosin Tracker

A mobile-first PWA for tracking ice‑water hash rosin production end to end:
**Setup → Wash → Freeze Dry → Press → Cure → Summary**. Dark "gunmetal" and
industrial "Hash Lab" themes, per‑stage cold→warm palettes, editable textures,
a 10‑swatch color scale, melt ratings, micron‑band grade merging, and a press
run builder.

This repository is the **Phase 0 scaffold**: the original Babel‑in‑browser React
prototype has been migrated to a **Vite + React** build with ES modules. The app
boots the prototype **1:1** (`npm run dev`) and is structured for the Supabase /
PWA work described in [docs/DEV_TASK_LIST.md](docs/DEV_TASK_LIST.md).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Script             | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start the Vite dev server (opens browser)               |
| `npm run build`    | Production build to `dist/`                              |
| `npm run preview`  | Serve the production build locally                      |
| `npm run lint`     | ESLint (React + hooks rules)                            |
| `npm run format`   | Prettier write over `src/`                              |
| `npm run test`     | Vitest run (jsdom render smoke tests)                   |
| `npm run typecheck`| `tsc --noEmit` (JS is allowed; strict types come later) |

## Project structure

```
hash_rosin_tracker/
├── index.html                 # Vite entry — fonts + #stage/#root + module script
├── public/                    # static assets served at site root
│   ├── metal.jpg              # brushed-steel texture (Hash Lab light)
│   ├── metal-dark.jpg         # brushed-olive texture (Hash Lab dark)
│   └── metal-industrial.png
├── src/
│   ├── main.jsx               # Shell: wraps app in IOS device frame, theme polling
│   ├── App.jsx                # MicronApp — routing, state, Tweaks panel
│   ├── lib/
│   │   ├── tokens.js          # design tokens, theme palettes, stage palettes, bands
│   │   ├── data.js            # seed data (replaced by Supabase in Phase 1)
│   │   └── grade-units.js     # band → merged-grade abstraction + saved combos
│   ├── components/
│   │   ├── primitives.jsx     # Icon, Btn, Stepper, ScaleFace, NumberPad, Sheet,
│   │   │                      #   ColorSwatches, MeltRating, Input, BandChip,
│   │   │                      #   UnitChip, Segmented, useTheme, formatG, CSS
│   │   ├── IOSFrame.jsx       # iOS 26 device bezel + status bar / keyboard
│   │   ├── PhotoNotes.jsx     # PhotoNotes, ComboField, DateField
│   │   └── Chrome.jsx         # shared TopBar / BottomBar
│   ├── screens/
│   │   ├── HomeScreen.jsx
│   │   ├── SetupWashScreens.jsx   # SetupScreen + WashScreen
│   │   ├── FreezeDryScreen.jsx    # also exports SectionLabel, CombineSheet
│   │   ├── PressScreen.jsx        # also exports PressCard, YieldByMicronSummary
│   │   ├── CureScreen.jsx
│   │   └── SummaryScreen.jsx      # also exports FlowBar
│   ├── styles/stage.css
│   └── test/setup.js
├── docs/
│   ├── DEV_TASK_LIST.md       # full product roadmap (Phases 0–10)
│   └── supabase-schema.sql    # reference DB schema for Phase 1
└── _unzipped/                 # original prototype + design explorations (git-ignored)
```

## How the prototype was ported

The original prototype loaded each `micron/*.jsx` file as a separate
`<script type="text/babel">` and shared everything through `window.*` globals.
The port converts those to real ES modules:

- **Global data/tokens → named imports.** `window.MicronTokens`,
  `MicronStages`, `MicronBands`, `withStage`, `MicronSeed`, and `GradeUnits` are
  now exported from `src/lib/*` and imported where used.
- **Bare component globals → imports.** Primitives, the iOS frame, photo/notes
  fields, and the shared `TopBar`/`BottomBar` chrome are imported explicitly.
- **Behavior unchanged.** Screens were converted mechanically — same JSX,
  styles, and logic. State still persists to `localStorage`
  (`micron-theme`, `micron-unit`, `micron-tempUnit`, `micron-route`,
  `micron-batches`, `micron-combos`).

### Intentional remaining globals

Four genuinely app‑runtime singletons are still read from `window` to preserve
1:1 behavior. They are written in `App.jsx` during render and read by primitives:

- `window.__theme` — active theme id
- `window.__stage` — active workflow stage (drives the per‑stage palette)
- `window.__onTweak` — opens the Tweaks panel from the Home settings button
- `window.__resources` — optional asset‑URL override map (standalone exports)

Converting these to a React context is tracked below.

## Remaining Phase 0 work

The scaffold satisfies most of Phase 0 in [docs/DEV_TASK_LIST.md](docs/DEV_TASK_LIST.md).
Still open:

- [ ] **Strict TypeScript migration.** The build is TS‑ready (`allowJs` on,
      `checkJs` off). Migrate `.jsx` → `.tsx` file by file, typing props, until
      `npm run typecheck` is strict‑clean.
- [ ] **Replace the 4 `window.__*` runtime globals** with a `Theme/StageContext`
      provider so primitives read theme/stage via `useContext`.
- [ ] **CI** — wire `lint` + `typecheck` + `build` + `test` on PRs.
- [ ] **Deploy pipeline** — Vercel or Netlify.

After that: Phase 1 (Supabase data layer + offline) and Phase 2 (PWA shell).
See the roadmap for the full plan.

## Tech

- React 18 · Vite 5 · Vitest + Testing Library · ESLint + Prettier
- No CSS framework — styling is inline + a small injected stylesheet
  (`injectGlobalCSS` in `primitives.jsx`) and `src/styles/stage.css`.

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

## Analytics + cloud database (the heart of the app)

Every action in the app is **automatically saved** to a shared Supabase
database and analyzed. There is no sign-up: each install silently provisions a
per-device account (`device-auth` edge function → password sign-in), and every
batch mutation is debounced and pushed through one transactional
`sync_batch(jsonb)` RPC (farm, batch, bags, wash passes, presses, merged
grades, cure log). Demo/seed batches are flagged `demo: true` and are **never**
uploaded, so shared stats only contain real production data.

### Insights, AI analyst, and the record keeper

The dashboard opens with **"What your results are saying"** — a pattern
recognizer ([insights.js](src/lib/insights.js)) that watches the data as it
comes in and turns it into plain-language findings: press-temp sweet spots,
less-vs-more pressure verdicts, strain champions and laggards, grower quality
drift, cost-per-gram winners, quality signals, trends, milestones, and soft
data-hygiene guidance ("2 batches are missing dry weights"). Every finding is
upserted into the `insights` table with the date it was first recognized — a
permanent journal per user.

The **AI Analyst** panel sends a summary of the user's own data to Claude via
the `ai-analyst` edge function and returns a narrative read plus a "next
experiment" recommendation; its findings are journaled too. It activates when
the backend has an Anthropic key (`supabase secrets set ANTHROPIC_API_KEY=…`)
and degrades gracefully to a how-to-enable note otherwise.

Every metric and section carries an ⓘ tooltip ([InfoTip.jsx](src/components/InfoTip.jsx))
explaining in plain language what the number means and what's a healthy range.

### Exports and Ask-the-Analyst (members)

The **Export Records** panel ([export.js](src/lib/export.js),
[ExportPanel.jsx](src/components/ExportPanel.jsx)) downloads data scoped to
everything, one strain, or one batch, as: **.csv** (BOM'd, opens clean in
Excel/Sheets; Batches + Bags + Press Runs sections), **.md** (readable report
with summary table and per-batch narrative), or **Excel** (real .xlsx workbook
with Batches / Bags / Press Runs sheets; SheetJS is dynamically imported so
it never weighs down the main bundle).

**Ask the Analyst** is a members-only Q&A: type any question ("How do I lift
my wash yield on outdoor material?") and the `ai-analyst` edge function
answers it against the user's own numbers plus solventless best practice,
with follow-up question chips. Membership lives in `profiles.is_member` and
is enforced **server-side**; column-level grants stop users from flipping
their own flag (only the service role can). Grant a member with:
`update profiles set is_member = true, member_since = now() where id = '<user-uuid>';`

The **Analytics** dashboard (chart button on Home) answers the questions the
operation actually cares about, in two lenses — **MY DATA** (computed locally,
works offline) and **NETWORK** (anonymized aggregates across every
contributor via `SECURITY DEFINER` RPCs):

- **KPIs** — batches, kg washed, hash pulled, rosin pressed, wash-yield %,
  press-return %
- **Economics / ROI** — biomass spend, cost per gram of rosin, market-price
  slider → margin % and profit per kg washed
- **Press Lab** — press-temp buckets vs return % with a "sweet spot" callout,
  pressure buckets vs return %, and a temp × pressure recipe heatmap
- **Wash Lab** — water-temperature buckets vs hash yield %
- **Strain leaderboard** — dominance + avg return, melt, rosin totals
- **Growers** — per-farm quality (wash yield) and cost per gram of rosin
- **Micron bands** — where the hash lives, per-band melt averages
- **Monthly trend** — rosin output over time

Key modules: [supabase.js](src/lib/supabase.js) (client + device auth),
[sync.js](src/lib/sync.js) (auto-save engine),
[analytics.js](src/lib/analytics.js) (local compute + network fetch),
[AnalyticsScreen.jsx](src/screens/AnalyticsScreen.jsx),
[charts.jsx](src/components/charts.jsx). The deployed schema lives in the
Supabase project's migrations (`core_schema`, `rls_policies`,
`sync_rpc_and_views`, `security_hardening`);
[docs/supabase-schema.sql](docs/supabase-schema.sql) is the original design
reference. Row-level security scopes every table to its owner; the network
analytics functions expose only anonymized aggregates to signed-in devices.

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

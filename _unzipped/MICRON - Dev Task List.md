# Micron — Hash Rosin Tracker
## Development Task List for Antigravity

**Prototype status:** Mobile PWA prototype built in React. Dark "gunmetal" theme with cold (Wash / Freeze Dry) → warm (Press / Summary) per-stage palettes. Covers Home, Setup, Wash, Freeze Dry, Press, Summary screens with editable textures, 10-swatch color scale, melt rating, and press run builder.

**Mission:** Ship Micron as a production-ready PWA backed by Supabase, with photo capture, timers, historical analytics, QR labels, and a community data layer.

---

## Phase 0 — Project scaffolding (prerequisite)

- [ ] Migrate prototype from Babel-in-browser to a Vite + React + TypeScript build
- [ ] Port all `.jsx` files from `/micron/*` into `/src/components/*`, convert `window.*` globals to module imports
- [ ] Set up ESLint + Prettier + Vitest
- [ ] Set up GitHub repo + CI (lint, typecheck, build on PR)
- [ ] Set up deployment pipeline (Vercel or Netlify recommended)
- [ ] Carry over all design tokens, stage palettes, iOS frame preview

**Definition of done:** `npm run dev` boots the current prototype 1:1. All screens work. Types are strict.

---

## Phase 1 — Data layer & persistence (Supabase)

### 1.1 Schema
- [ ] Design Supabase schema:
  - `profiles` (id, display_name, email, created_at)
  - `farms` (id, owner_id, name, location, grow_type, notes)
  - `batches` (id, owner_id, farm_id, strain, cultivar, material_type, input_g, cost, started_at, wash_date, press_date, cure_started_at, stage, room_temp_lo_f, room_temp_hi_f, water_temp_lo_f, water_temp_hi_f, freeze_dry_start, freeze_dry_end, impression, biomass_notes, freeze_dry_notes)
  - `wash_passes` (id, batch_id, pass_number, minutes, rpm)
  - `bags` (id, batch_id, band_id, wet_g, dry_g, color_index, melt_rating, texture, notes, photo_url)
  - `presses` (id, batch_id, press_number, grade_ids[], charge_g, yield_g, temp_f, pressure_psi, minutes, notes, pressed_at, photo_url)
  - `cure_logs` (id, batch_id, press_id, method, container, vacuum_sealed, light_exposure, temp_f, target_days, started_at, ended_at, notes)
  - `cure_observations` (id, cure_log_id, observed_at, color_index, melt_rating, terps_score, taste_score, texture, notes, photo_url) — day-7 / day-14 / day-21 check-ins
  - `press_presets` (id, owner_id, name, temp_f, pressure_psi, minutes, notes)
  - `texture_options` (id, owner_id, label, sort_order)
- [ ] Write migrations (Supabase CLI)
- [ ] Write Row Level Security policies — user sees only their own rows (except opt-in community shares)

### 1.2 Auth
- [ ] Implement Supabase auth: email magic link + Google OAuth
- [ ] Auth-gated routes, "Sign in to continue" wall
- [ ] Post-signup onboarding: create a default farm, prompt for display name

### 1.3 Data fetching + offline-first
- [ ] Set up TanStack Query for all Supabase reads/writes
- [ ] Implement optimistic updates on batch create, bag weight entry, press run save
- [ ] Local cache layer (IndexedDB via Dexie) for offline mode
- [ ] Outbox queue: writes performed offline are stored locally, replayed when connection returns
- [ ] Conflict-resolution strategy: last-write-wins on scalar fields, merge for arrays (wash passes, presses)
- [ ] Sync status indicator in top bar (synced / pending / offline)

### 1.4 Wire existing screens to Supabase
- [ ] Replace all `window.MicronSeed` data with live queries
- [ ] Home screen fetches user's batches
- [ ] Setup screen creates draft batch in DB
- [ ] Wash / Freeze Dry / Press screens patch the active batch record
- [ ] Summary screen reads hydrated batch + bags + presses

**Definition of done:** User can sign up, create a batch on phone A, open phone B, see it. Can turn off wifi, enter dry weights, turn wifi back on, see it sync.

---

## Phase 2 — PWA shell

- [ ] Create `manifest.webmanifest` with full icon set (192, 256, 384, 512 + maskable variants)
- [ ] Generate icons from source logo (use `pwa-asset-generator` or similar)
- [ ] Add iOS-specific meta tags (`apple-touch-icon`, status bar style, splash screens for each device)
- [ ] Implement service worker via Workbox / `vite-plugin-pwa`:
  - Cache app shell (HTML, JS, CSS, fonts)
  - Cache Supabase query responses with `StaleWhileRevalidate`
  - Precache icons + manifest
- [ ] Handle install prompt (custom "Install Micron" button on home screen)
- [ ] Handle app update prompt ("New version available — reload")
- [ ] Test install on iOS Safari + Android Chrome
- [ ] Test offline cold-start (airplane mode → launch from home screen)

**Definition of done:** App installs to home screen on both platforms, cold-starts offline, shows cached batches.

---

## Phase 3 — Photo capture

- [ ] Build `<PhotoCapture>` component using `input[type=file][capture=environment]`
- [ ] Client-side image compression before upload (target <500KB, 1600px long edge) via `browser-image-compression`
- [ ] Upload to Supabase Storage bucket `batch-photos`, signed URLs
- [ ] Wire photo capture into:
  - Wash screen — optional "photo of biomass" before wash starts
  - Freeze Dry screen — per-bag photo alongside weight entry
  - Press screen — per-press-run photo of finished rosin
- [ ] Multi-photo support per entity (array of photo URLs)
- [ ] Photo gallery viewer in Summary screen with pinch-to-zoom
- [ ] Delete / re-take flow
- [ ] Offline photo capture: store blob in IndexedDB, upload on reconnect

**Definition of done:** Can take a photo at any stage, appears in Summary gallery, survives offline → online sync.

---

## Phase 4 — Timers

- [ ] Build reusable `<Timer>` primitive: start/pause/reset, audible alert at target time, haptic pulse (Vibration API)
- [ ] **Wash pass timer:** on Wash screen, each pass row has a "Start" button; timer counts down from the configured minutes; beeps + vibrates at zero; auto-marks pass complete
- [ ] **Freeze dryer elapsed timer:** on Freeze Dry screen, shows running elapsed since `freeze_dry_start`; can manually end cycle
- [ ] **Press timer:** on Press builder, starts when user taps "Press active", ends at `minutes` with alert
- [ ] Timers persist across navigation (use a TimerContext + requestAnimationFrame or setInterval in a provider)
- [ ] Timers survive app kill: store `startedAt` timestamp, compute elapsed on mount
- [ ] Wake-lock API to prevent screen sleep during active timer
- [ ] Optional push notification when timer expires if app backgrounded (web push via Supabase edge function)

**Definition of done:** Start a 3-minute press timer, lock phone, return 3 min later — alert fired.

---

## Phase 5 — Temp / pressure presets

- [ ] CRUD UI for press presets: name, temp, pressure, minutes, notes
- [ ] Preset picker on Press builder: "Apply preset" dropdown + "Save current as preset"
- [ ] Default seed presets on new account: "Cold cure 180/800", "Warm cure 195/900", "Hot press 210/1000"
- [ ] Preset usage analytics (Phase 7): which preset yielded best returns
- [ ] Mirror the same pattern for wash cycle presets (6-pass templates) — save / load / edit
- [ ] Mirror for freeze-dry cycle recipes (target chamber temp, vacuum)

**Definition of done:** User creates "My go-to rosin recipe", applies it on a new press run with one tap.

---

## Phase 6 — QR labels

- [ ] Generate unique QR per batch AND per press run (URL: `micron.app/b/{batch_id}` or `/p/{press_id}`)
- [ ] QR renders in Summary screen and Press detail
- [ ] **Single-label print view:** full-screen QR + batch ID + strain + date, formatted for 2x2" thermal label printers (Brother / DYMO)
- [ ] **Sheet-label print view:** Avery 5160 (30-up) layout with QR + strain + date per cell
- [ ] Label designer: user can choose what data to include (strain, date, operator, yield, micron grade, custom field)
- [ ] Scan a QR → deep link into the PWA, opens that batch / press detail
- [ ] Public QR landing page (web companion) shows sanitized batch info for end customers
- [ ] Optional "strain info card" QR with chain-of-custody style metadata

**Definition of done:** Print a sheet of 30 QR labels at home, scan one → deep links to batch in the PWA.

---

## Phase 6.5 — Cure stage tracking

The Cure stage is the 5th and final phase of the workflow (Setup → Wash → Freeze Dry → Press → **Cure**). Storage method dramatically affects terpene retention, color stability, and final product quality. This phase makes the data layer first-class.

### 6.5.1 Cure session model
- [ ] Persist `cure_logs` row when user enters Cure screen (one log per batch, optionally per press_id for multi-method comparisons)
- [ ] Fields: method (cold-cure / room-cure / warm-cure / flash / no-cure / custom), container (glass / parchment / silicone / mylar / other + free text), vacuum_sealed (bool), light_exposure (opaque / uv-blocking / clear), storage temp (°F), target days, started_at, ended_at, notes
- [ ] User-defined custom methods + custom containers (mirrors texture pattern — saved per-account in `cure_method_options` and `container_options`)

### 6.5.2 Live cure clock
- [ ] Timer counts elapsed days since `started_at` (already in prototype)
- [ ] Progress bar against target_days
- [ ] Optional push notification on day milestones (day 3, 7, 14, 21, target)
- [ ] "Cure complete" badge once elapsed >= target_days

### 6.5.3 Cure observations / check-ins
- [ ] In-app prompt at day 3/7/14/21 (or user-configured cadence): "Log a cure check-in"
- [ ] Each check-in captures: color shift, melt rating delta, terpene strength (1–10), taste score (1–10), texture change, photo, notes
- [ ] Visualize check-ins as a timeline on the batch detail page — see how the rosin evolves
- [ ] Compare day-0 vs day-N photos side-by-side

### 6.5.4 Storage analytics
- [ ] Per-method analytics: which cure method retains best color / highest taste scores at day 21
- [ ] Vacuum vs non-vacuum comparison across the user's history
- [ ] Container performance: which containers correlate with best terpene retention
- [ ] Surface insights ("Your cold-cured runs score 1.4 higher on terps at day 14 vs room-cure")

### 6.5.5 UI / palette
- [ ] Cure screen has its own warm crimson-purple palette (already in prototype `MicronStages.cure`)
- [ ] Stepper extends to 5 nodes — Setup → Wash → Freeze Dry → Press → Cure (already wired)
- [ ] Cure clock surfaces on Home screen for in-progress cures

**Definition of done:** User logs storage spec at press time, gets a day-N progress widget on Home, prompted for check-ins, and can answer "Which storage method works best for my Papaya Zkittlez?"

---

## Phase 7 — Historical view & analytics

### 7.1 Batch archive
- [ ] Dedicated "Archive" tab in the home nav
- [ ] Searchable / filterable list: by strain, farm, operator, material type, date range, yield %, melt rating
- [ ] Sort by: date, yield %, rosin return, strain A→Z
- [ ] Saved filter views ("My top-yielding batches", "Leafy Jungle only", "Last 30 days")

### 7.2 Per-strain analytics
- [ ] Strain detail page: aggregate stats across all batches of that strain
  - Avg hash yield % (dry g / input g)
  - Avg rosin return %
  - Best micron bag (highest avg yield)
  - Color distribution histogram
  - Melt rating trend over time
  - Best press recipe (highest-yielding temp/pressure/minutes combo)
- [ ] Strain comparison view: side-by-side charts for 2–4 strains

### 7.3 Farm analytics
- [ ] Farm detail page: material quality trends, which cultivars perform best, cost-per-gram-of-rosin analysis
- [ ] Flagging poor-performing farms ("Last 3 batches from X averaged 30% below your norm")

### 7.4 Press recipe analytics
- [ ] Heatmap: temp × pressure → avg yield %
- [ ] Recipe leaderboard: your top 10 presses of all time

### 7.5 Export
- [ ] Export batch to CSV (single batch → spreadsheet matching the user's existing template)
- [ ] Export archive to CSV (date range)
- [ ] Export batch to PDF (print-ready one-pager: header, photos, bag breakdown, press runs, notes)

**Definition of done:** User can answer "What's my best-yielding strain and what press recipe works for it?" in 3 taps.

---

## Phase 8 — Web companion + community repository

### 8.1 Web companion app (same Supabase backend)
- [ ] Responsive dashboard at `micron.app` — desktop-first analytics for power users
- [ ] All Phase 7 analytics with more screen real estate (bigger charts, multi-dimensional filtering)
- [ ] Bulk edit tools (re-tag old batches, merge duplicate farms)
- [ ] Import from CSV (onboard users with existing spreadsheet data — maps to the schema)

### 8.2 Public batch pages
- [ ] `micron.app/b/{id}` public page (opt-in per batch) — shareable QR destination
- [ ] Shows sanitized batch info: strain, micron breakdown, melt rating, photos, aroma/impression, date pressed
- [ ] Hides: cost, farm internal notes, operator name (unless explicitly shared)
- [ ] "Customer view" mode for sharing with buyers

### 8.3 Community repository (opt-in)
- [ ] Per-batch toggle: "Share this batch to the community"
- [ ] Shared batches aggregate into anonymized strain-level community data
- [ ] Strain community page shows: community avg yield, color distribution, melt rating, top recipes
- [ ] Your strain detail page overlays "vs community" benchmarks ("Your Papaya Zkittlez yields 0.8% higher than community avg")
- [ ] Leaderboards (optional, pseudonymous): top yielders per strain
- [ ] Flagging / moderation for bad data
- [ ] Privacy controls: user can withdraw from community at any time, past contributions anonymized

**Definition of done:** User opts in, sees "Community Avg" alongside their stats on every strain detail page.

---

## Phase 9 — Polish, reliability, launch prep

- [ ] Full dark/light theme audit across every screen — no hardcoded colors
- [ ] Accessibility pass: contrast ratios, focus rings, screen reader labels, keyboard nav
- [ ] iOS haptics (`navigator.vibrate` + iOS-specific Taptic via `hapticfeedback` polyfill where possible)
- [ ] Error boundaries on every route with "Report this error" → Sentry
- [ ] Sentry error tracking + PostHog for product analytics
- [ ] Legal: privacy policy, ToS, age gate (21+), regional compliance disclaimers
- [ ] Onboarding tutorial / empty states (first-batch walkthrough)
- [ ] Settings screen: account, subscription, export all data, delete account
- [ ] Data export (GDPR right-to-download): full user data as JSON + photos as zip
- [ ] In-app feedback form
- [ ] Landing page at `micron.app` for unauthenticated users
- [ ] App Store / Play Store alternatives: TWA wrapper for Google Play (Android PWA-in-Store)

---

## Phase 10 — Business model hooks (optional, for commercial launch)

- [ ] Free tier: 10 active batches, core features
- [ ] Pro tier: unlimited batches, full analytics, QR labels, community access — Stripe subscription
- [ ] Team tier: multi-operator workspaces, shared farms, role-based permissions
- [ ] Referral program

---

## Reference: files in the current prototype

```
micron/
  tokens.jsx            — design tokens + stage palettes
  data.jsx              — seed data (replace in Phase 1)
  primitives.jsx        — Btn, Stepper, ScaleFace, NumberPad, Sheet, ColorSwatches, MeltRating, Input, BandChip, Segmented
  ios-frame.jsx         — iOS preview bezel
  screen-home.jsx       — batch list + active hero
  screen-setup-wash.jsx — Setup + Wash screens
  screen-freezedry.jsx  — Freeze Dry per-bag weight + color + melt + texture + notes
  screen-press.jsx      — multi-run press builder
  screen-cure.jsx       — storage method, container, vacuum, light, temp, target days, live cure clock
  screen-summary.jsx    — yield breakdown + press runs + FlowBar
  app.jsx               — main app shell, routing, Tweaks panel
index.html              — entry
```

---

## Suggested build order

1. **Phase 0** (scaffolding) — 2–3 days
2. **Phase 1** (Supabase + offline) — 1.5 weeks
3. **Phase 2** (PWA shell) — 2–3 days
4. **Phase 3** (photos) — 3–4 days
5. **Phase 4** (timers) — 3 days
6. **Phase 5** (presets) — 2 days
7. **Phase 6** (QR labels) — 3–4 days
8. **Phase 7** (analytics) — 1 week
9. **Phase 8** (web + community) — 2 weeks
10. **Phase 9** (polish + launch) — 1 week
11. **Phase 10** (monetization) — ongoing

**Total est:** ~7–8 weeks for a single full-time dev to reach launch-ready.

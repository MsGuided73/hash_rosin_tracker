// Design tokens for Micron — hash rosin tracker
// Dark mode first; light mode is a variant.

// Resolve an asset URL: use the bundled blob URL (standalone export) when present,
// otherwise fall back to the relative path (live dev).
function MICRON_ASSET(id, fallback) {
  return (window.__resources && window.__resources[id]) || fallback;
}

window.MicronTokens = {
  // spacing (4px grid)
  sp: { '0': 0, '1': 4, '2': 8, '3': 12, '4': 16, '5': 20, '6': 24, '7': 32, '8': 40, '9': 56, '10': 72 },
  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },

  // typography
  fontSans: '"Inter Tight", -apple-system, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, Menlo, monospace',

  // dark theme (default) — gun metal: cool, structured, depth via gradients
  dark: {
    name: 'dark',
    // Base canvas — deep blue-graphite, not pure black. A subtle vignette lives on top.
    bg:           '#0E1116',
    bgGradient:   'radial-gradient(ellipse 120% 80% at 50% 0%, #1A2028 0%, #0E1116 45%, #06080B 100%)',
    // Cards — brushed gunmetal: top edge lit, bottom falls off to near-black.
    bgElevated:   '#191D24',
    bgElevatedGrad: 'linear-gradient(180deg, #242932 0%, #1A1E25 48%, #13161C 100%)',
    bgElevated2:  '#232832',
    bgElevated2Grad: 'linear-gradient(180deg, #2B313B 0%, #1E232B 100%)',
    bgOverlay:    'rgba(8,10,14,0.82)',
    // Hairline borders with a spec-highlight recipe (top:bright / bottom:black)
    line:         'rgba(255,255,255,0.06)',
    lineStrong:   'rgba(255,255,255,0.12)',
    lineTop:      'rgba(255,255,255,0.10)',  // top bevel
    lineBottom:   'rgba(0,0,0,0.55)',        // bottom shadow
    innerHi:      'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.45)',
    text:         '#E8ECF2',            // cool bone
    textMuted:    'rgba(232,236,242,0.60)',
    textDim:      'rgba(232,236,242,0.34)',
    accent:       'oklch(0.82 0.12 80)',    // trichome amber (kept — warm pop on cool steel)
    accentInk:    '#18130A',
    accentSoft:   'oklch(0.82 0.12 80 / 0.14)',
    accentGrad:   'linear-gradient(180deg, oklch(0.88 0.12 85) 0%, oklch(0.76 0.13 72) 100%)',
    success:      'oklch(0.78 0.14 155)',
    danger:       'oklch(0.68 0.19 25)',
    // micron band hues (cool→warm as micron decreases)
    bands: {
      '160-219': 'oklch(0.70 0.10 235)',  // steel blue
      '120-159': 'oklch(0.74 0.11 190)',  // teal
      '90-119':  'oklch(0.80 0.13 120)',  // green-gold
      '45-89':   'oklch(0.82 0.14 75)',   // amber
    },
    // color/appearance scale — Blonde spectrum + green/amber/dark tones
    colorScale: [
      { name: 'Ivory',     hex: '#F4E4BC' },
      { name: 'Blonde',    hex: '#EBCB89' },
      { name: 'Gold',      hex: '#D9A94B' },
      { name: 'Sage',      hex: '#C8C68B' },
      { name: 'Green-Gold',hex: '#A8B060' },
      { name: 'Olive',     hex: '#6E7A3A' },
      { name: 'Amber',     hex: '#B8802B' },
      { name: 'Dark Gold', hex: '#8B5A1E' },
      { name: 'Brown',     hex: '#5E3A12' },
      { name: 'Dark',      hex: '#2E1C08' },
    ],
  },

  light: {
    name: 'light',
    bg:           '#F6F3EC',
    bgElevated:   '#FFFFFF',
    bgElevated2:  '#EFEADF',
    bgOverlay:    'rgba(246,243,236,0.85)',
    line:         'rgba(20,16,8,0.08)',
    lineStrong:   'rgba(20,16,8,0.18)',
    text:         '#141008',
    textMuted:    'rgba(20,16,8,0.64)',
    textDim:      'rgba(20,16,8,0.40)',
    accent:       'oklch(0.68 0.14 65)',
    accentInk:    '#FFFFFF',
    accentSoft:   'oklch(0.68 0.14 65 / 0.14)',
    success:      'oklch(0.58 0.14 155)',
    danger:       'oklch(0.56 0.19 25)',
    bands: {
      '160-219': 'oklch(0.55 0.12 235)',
      '120-159': 'oklch(0.58 0.12 190)',
      '90-119':  'oklch(0.60 0.13 120)',
      '45-89':   'oklch(0.62 0.14 75)',
    },
    colorScale: [
      { name: 'Ivory',     hex: '#F4E4BC' },
      { name: 'Blonde',    hex: '#EBCB89' },
      { name: 'Gold',      hex: '#D9A94B' },
      { name: 'Sage',      hex: '#C8C68B' },
      { name: 'Green-Gold',hex: '#A8B060' },
      { name: 'Olive',     hex: '#6E7A3A' },
      { name: 'Amber',     hex: '#B8802B' },
      { name: 'Dark Gold', hex: '#8B5A1E' },
      { name: 'Brown',     hex: '#5E3A12' },
      { name: 'Dark',      hex: '#2E1C08' },
    ],
  },

  // Hash Lab — gritty industrial terminal. Share Tech Mono, terracotta on brushed
  // olive metal, recessed LCD readouts. A self-contained look (own fonts).
  hashlab: {
    name: 'hashlab',
    hl: true,
    fontSans: '"Spline Sans Mono", ui-monospace, monospace',
    fontMono: '"Spline Sans Mono", ui-monospace, monospace',
    fontLcd:  '"Share Tech Mono", ui-monospace, monospace',
    // Page = near-black with a faint cool-green cast (matches the Hash Lab ref).
    bg:           '#0C0E0C',
    bgGradient:   'radial-gradient(ellipse 130% 90% at 50% 0%, #15191500 0%, #0C0E0C 55%, #070806 100%), linear-gradient(180deg, #101310 0%, #0A0B09 100%)',
    // Cards = brushed olive metal: the texture lives HERE, not on the page.
    bgElevated:   '#3A423D',
    bgElevatedGrad:  "linear-gradient(160deg, rgba(58,66,60,0.62) 0%, rgba(46,53,48,0.70) 55%, rgba(36,42,37,0.78) 100%), url('" + MICRON_ASSET('metalDark', 'metal-dark.jpg') + "') center/cover",
    bgElevated2:  '#2B312D',
    bgElevated2Grad: "linear-gradient(160deg, rgba(46,53,48,0.66) 0%, rgba(35,41,37,0.76) 100%), url('" + MICRON_ASSET('metalDark', 'metal-dark.jpg') + "') center/cover",
    bgOverlay:    'rgba(10,12,10,0.88)',
    line:         'rgba(96,106,97,0.55)',
    lineStrong:   'rgba(112,122,112,0.9)',
    lineTop:      'rgba(235,230,217,0.08)',
    lineBottom:   'rgba(0,0,0,0.5)',
    innerHi:      'inset 0 0 22px 5px rgba(0,0,0,0.55), inset 0 0 50px 12px rgba(0,0,0,0.30), inset 0 1px 0 rgba(235,230,217,0.06), inset 0 -2px 8px rgba(0,0,0,0.5)',
    text:         '#F2EFE6',
    textMuted:    'rgba(240,236,226,0.82)',
    textDim:      'rgba(240,236,226,0.62)',
    accent:       '#C85A3A',
    accentInk:    '#1A1208',
    accentSoft:   'rgba(200,90,58,0.16)',
    accentGrad:   'linear-gradient(180deg, #CD6044 0%, #BD4F30 100%)',
    readout:      '#D9663F',
    btnRadius:    3,
    cardRadius:   4,
    success:      '#7FA35A',
    danger:       '#D2654A',
    // Steel-blue forward band palette to match the ref's micron heading.
    bands: {
      '160-219': '#8FAFC2',  // light steel
      '120-159': '#83B2AC',  // steel teal
      '90-119':  '#7D9DB3',  // steel blue (ref heading)
      '45-89':   '#D08A4E',  // terracotta-amber
    },
    colorScale: [
      { name: 'Ivory',     hex: '#F4E4BC' },
      { name: 'Blonde',    hex: '#EBCB89' },
      { name: 'Gold',      hex: '#D9A94B' },
      { name: 'Sage',      hex: '#C8C68B' },
      { name: 'Green-Gold',hex: '#A8B060' },
      { name: 'Olive',     hex: '#6E7A3A' },
      { name: 'Amber',     hex: '#B8802B' },
      { name: 'Dark Gold', hex: '#8B5A1E' },
      { name: 'Brown',     hex: '#5E3A12' },
      { name: 'Dark',      hex: '#2E1C08' },
    ],
  },

  // Hash Lab (light) — same industrial terminal, brushed PALE steel + paper.
  'hashlab-light': {
    name: 'hashlab-light',
    hl: true,
    fontSans: '"Spline Sans Mono", ui-monospace, monospace',
    fontMono: '"Spline Sans Mono", ui-monospace, monospace',
    fontLcd:  '"Share Tech Mono", ui-monospace, monospace',
    bg:           '#E7E5DC',
    bgGradient:   'radial-gradient(ellipse 130% 90% at 50% 0%, #F2F0E8 0%, #E7E5DC 55%, #DAD7CC 100%)',
    // Cards = pale brushed steel: lighten the metal texture with a near-white wash.
    bgElevated:   '#D9D7CC',
    bgElevatedGrad:  "linear-gradient(160deg, rgba(216,214,203,0.965) 0%, rgba(205,203,191,0.975) 55%, rgba(196,194,182,0.982) 100%), url('" + MICRON_ASSET('metal', 'metal.jpg') + "') center/cover",
    bgElevated2:  '#DEDCD1',
    bgElevated2Grad: "linear-gradient(160deg, rgba(214,212,201,0.965) 0%, rgba(202,200,188,0.978) 100%), url('" + MICRON_ASSET('metal', 'metal.jpg') + "') center/cover",
    bgOverlay:    'rgba(231,229,220,0.86)',
    line:         'rgba(70,72,64,0.20)',
    lineStrong:   'rgba(70,72,64,0.38)',
    lineTop:      'rgba(255,255,255,0.6)',
    lineBottom:   'rgba(90,90,80,0.25)',
    // worn edges as a light grime vignette + top highlight
    innerHi:      'inset 0 0 22px 5px rgba(120,118,104,0.20), inset 0 0 46px 12px rgba(120,118,104,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
    text:         '#1B1D17',
    textMuted:    'rgba(27,29,23,0.80)',
    textDim:      'rgba(27,29,23,0.58)',
    accent:       '#B84A2E',
    accentInk:    '#FFF6F1',
    accentSoft:   'rgba(184,74,46,0.14)',
    accentGrad:   'linear-gradient(180deg, #C85A3A 0%, #AC4127 100%)',
    // LCD stays a dark recessed panel even on light chrome (like a real scale).
    readout:      '#D9663F',
    lcdDark:      true,
    btnRadius:    2,
    cardRadius:   2,
    success:      '#4F7A33',
    danger:       '#B23A22',
    bands: {
      '160-219': '#3F6E89',
      '120-159': '#3C817A',
      '90-119':  '#3E6F87',
      '45-89':   '#A9622B',
    },
    colorScale: [
      { name: 'Ivory',     hex: '#F4E4BC' },
      { name: 'Blonde',    hex: '#EBCB89' },
      { name: 'Gold',      hex: '#D9A94B' },
      { name: 'Sage',      hex: '#C8C68B' },
      { name: 'Green-Gold',hex: '#A8B060' },
      { name: 'Olive',     hex: '#6E7A3A' },
      { name: 'Amber',     hex: '#B8802B' },
      { name: 'Dark Gold', hex: '#8B5A1E' },
      { name: 'Brown',     hex: '#5E3A12' },
      { name: 'Dark',      hex: '#2E1C08' },
    ],
  },
};

// ─────────── Stage palettes ───────────
// Each stage has a COLD or WARM personality overlaid on the base theme.
// Cold = Wash / Freeze Dry (ice, stainless). Warm = Press / Summary (copper, gold).
window.MicronStages = {
  setup: { kind: 'neutral', label: 'Cultivar', glyph: '◎' },
  wash: {
    kind: 'cold', label: 'Ice Water Wash', glyph: '❄',
    dark: {
      bgGradient:      'radial-gradient(ellipse 120% 80% at 50% 0%, #1F2C38 0%, #111820 45%, #070B10 100%)',
      bgElevatedGrad:  'linear-gradient(180deg, #2B3947 0%, #1B2631 48%, #131B24 100%)',
      bgElevated2Grad: 'linear-gradient(180deg, #324150 0%, #202B37 100%)',
      bgElevated2:     '#263340',
      accent:          'oklch(0.82 0.10 220)',
      accentInk:       '#0A1620',
      accentSoft:      'oklch(0.82 0.10 220 / 0.16)',
      accentGrad:      'linear-gradient(180deg, oklch(0.90 0.08 220) 0%, oklch(0.74 0.11 225) 100%)',
    },
    light: {
      bg: '#EEF3F6', bgElevated: '#FFFFFF', bgElevated2: '#E2EAF0',
      accent: 'oklch(0.58 0.12 225)', accentInk: '#FFFFFF',
      accentSoft: 'oklch(0.58 0.12 225 / 0.14)',
    },
  },
  freezedry: {
    kind: 'cold', label: 'Freeze Dry', glyph: '❆',
    dark: {
      bgGradient:      'radial-gradient(ellipse 120% 80% at 50% 0%, #223140 0%, #121A22 45%, #070B10 100%)',
      bgElevatedGrad:  'linear-gradient(180deg, #2E3F4F 0%, #1D2832 48%, #131B24 100%)',
      bgElevated2Grad: 'linear-gradient(180deg, #35475A 0%, #212D39 100%)',
      bgElevated2:     '#2A384A',
      accent:          'oklch(0.86 0.08 210)',
      accentInk:       '#081218',
      accentSoft:      'oklch(0.86 0.08 210 / 0.18)',
      accentGrad:      'linear-gradient(180deg, oklch(0.92 0.06 210) 0%, oklch(0.78 0.10 215) 100%)',
    },
    light: {
      bg: '#EDF2F5', bgElevated: '#FFFFFF', bgElevated2: '#DFE8ED',
      accent: 'oklch(0.60 0.10 215)', accentInk: '#FFFFFF',
      accentSoft: 'oklch(0.60 0.10 215 / 0.14)',
    },
  },
  press: {
    kind: 'warm', label: 'Press', glyph: '◉',
    dark: {
      bgGradient:      'radial-gradient(ellipse 120% 80% at 50% 0%, #3A2518 0%, #1A1108 45%, #0A0703 100%)',
      bgElevatedGrad:  'linear-gradient(180deg, #3E2A1C 0%, #251810 48%, #18100A 100%)',
      bgElevated2Grad: 'linear-gradient(180deg, #4A3422 0%, #2B1D12 100%)',
      bgElevated2:     '#33220E',
      accent:          'oklch(0.78 0.15 55)',
      accentInk:       '#1A0E02',
      accentSoft:      'oklch(0.78 0.15 55 / 0.18)',
      accentGrad:      'linear-gradient(180deg, oklch(0.84 0.15 60) 0%, oklch(0.68 0.16 45) 100%)',
    },
    light: {
      bg: '#F7EFE4', bgElevated: '#FFFFFF', bgElevated2: '#EFE1CB',
      accent: 'oklch(0.62 0.16 50)', accentInk: '#FFFFFF',
      accentSoft: 'oklch(0.62 0.16 50 / 0.14)',
    },
  },
  summary: {
    kind: 'warm', label: 'Summary', glyph: '✦',
    dark: {
      bgGradient:      'radial-gradient(ellipse 120% 80% at 50% 0%, #2E2114 0%, #16100A 45%, #080604 100%)',
      bgElevatedGrad:  'linear-gradient(180deg, #362618 0%, #211610 48%, #150E08 100%)',
      bgElevated2Grad: 'linear-gradient(180deg, #43301E 0%, #261A11 100%)',
      bgElevated2:     '#2E1F10',
      accent:          'oklch(0.82 0.12 75)',
      accentInk:       '#1A1206',
      accentSoft:      'oklch(0.82 0.12 75 / 0.16)',
      accentGrad:      'linear-gradient(180deg, oklch(0.88 0.12 80) 0%, oklch(0.72 0.14 65) 100%)',
    },
    light: {
      bg: '#F7F1E4', bgElevated: '#FFFFFF', bgElevated2: '#EEE4CD',
      accent: 'oklch(0.64 0.14 65)', accentInk: '#FFFFFF',
      accentSoft: 'oklch(0.64 0.14 65 / 0.14)',
    },
  },
  cure: {
    kind: 'warm', label: 'Cure', glyph: '⏳',
    dark: {
      bgGradient:      'radial-gradient(ellipse 120% 80% at 50% 0%, #2A1F2E 0%, #15101A 45%, #080510 100%)',
      bgElevatedGrad:  'linear-gradient(180deg, #322438 0%, #1F1828 48%, #15101A 100%)',
      bgElevated2Grad: 'linear-gradient(180deg, #3D2C45 0%, #241A30 100%)',
      bgElevated2:     '#2A2030',
      accent:          'oklch(0.74 0.14 35)',
      accentInk:       '#1A0A05',
      accentSoft:      'oklch(0.74 0.14 35 / 0.18)',
      accentGrad:      'linear-gradient(180deg, oklch(0.80 0.14 40) 0%, oklch(0.62 0.15 25) 100%)',
    },
    light: {
      bg: '#F4ECEF', bgElevated: '#FFFFFF', bgElevated2: '#E8DEE5',
      accent: 'oklch(0.58 0.15 30)', accentInk: '#FFFFFF',
      accentSoft: 'oklch(0.58 0.15 30 / 0.14)',
    },
  },
};

// Merge a stage palette into the base theme.
window.withStage = function(theme, stageId) {
  const base = window.MicronTokens[theme];
  const stage = window.MicronStages[stageId];
  if (!stage || !stage[theme]) return base;
  return { ...base, ...stage[theme], stage: stageId, stageKind: stage.kind };
};

// Standard micron bands (in workflow order: largest first = most "headstash")
window.MicronBands = [
  { id: '160-219', label: '160–219µ', short: '160µ' },
  { id: '120-159', label: '120–159µ', short: '120µ' },
  { id: '90-119',  label: '90–119µ',  short: '90µ'  },
  { id: '45-89',   label: '45–89µ',   short: '45µ'  },
];

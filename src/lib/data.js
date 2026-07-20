// Seed data for the prototype — expanded schema.
// In Phase 1 this is replaced by live Supabase queries (see MICRON - Dev Task List.md).
import { MicronBands } from './tokens.js';

const defaultWashCycle = [
  { pass: 1, minutes: 2,  rpm: 130 },
  { pass: 2, minutes: 4,  rpm: 160 },
  { pass: 3, minutes: 6,  rpm: 190 },
  { pass: 4, minutes: 8,  rpm: 220 },
  { pass: 5, minutes: 10, rpm: 250 },
  { pass: 6, minutes: 15, rpm: 280 },
];

export const MicronSeed = {
  strains: ['Papaya Zkittlez','Lemon Cherry Gelato','Apples & Bananas','Tropicana Cookies','Gary Payton','Runtz','Zoap','Modified Grapes','Gascotti','Black Maple 22'],
  operators: ['J. Reyes', 'M. Kato', 'A. Hoffman', 'You'],
  farms: [
    { name: 'Leafy Jungle',     location: 'Humboldt, CA', type: 'Indoor · Living Soil' },
    { name: 'Emerald Cove',     location: 'Mendocino, CA', type: 'Greenhouse · Organic' },
    { name: 'Black Maple Co.',  location: 'Southern OR', type: 'Indoor · Hydroponic' },
  ],
  materialTypes: ['WPFF', 'FF (Fresh Frozen)', 'Dry Flower', 'Dry Trim', 'Fresh Frozen Trim'],
  growTypes: ['Indoor · Living Soil', 'Indoor · Hydroponic', 'Greenhouse · Organic', 'Outdoor · Sun-grown'],
  textures: ['Sandy','Creamy','Sticky','Crumbly','Chunky','Greasy'],

  // Default wash cycle template (6 passes)
  defaultWashCycle,

  // NOTE: seed batches are flagged `demo: true` — the sync engine never
  // uploads them, so shared analytics only contain real user data.
  batches: () => {
    const daysAgo = (n) => { const d = new Date(2026, 3, 18); d.setDate(d.getDate() - n); return d.toISOString(); };
    const mkBag = (wet, dry, color, melt, tex, notes) =>
      ({ wet, dry, color, melt, texture: tex, notes });
    const mkWash = (roomLo=42, roomHi=48, waterLo=32, waterHi=35) => ({
      roomTempLoF: roomLo, roomTempHiF: roomHi,
      waterTempLoF: waterLo, waterTempHiF: waterHi,
      passes: defaultWashCycle.map(p => ({ ...p })),
      freezeDryStart: null, freezeDryEnd: null,
    });

    const seeds = [
      // in progress — currently on Freeze Dry
      {
        id: 'B-046', strain: 'Papaya Zkittlez', operator: 'You',
        startedAt: daysAgo(1), stage: 'freezedry',
        farm: 'Leafy Jungle', location: 'Humboldt, CA', growType: 'Indoor · Living Soil',
        materialType: 'WPFF', costPerLb: 850, inputG: 2268,
        washDate: daysAgo(1), pressDate: null,
        wash: { ...mkWash(), freezeDryStart: daysAgo(1), freezeDryEnd: null },
        bags: {
          '160-219': mkBag(52,  null, null, 0, '', ''),
          '120-159': mkBag(88,  null, null, 0, '', ''),
          '90-119':  mkBag(124, null, null, 0, '', ''),
          '45-89':   mkBag(41,  null, null, 0, '', ''),
        },
        presses: [],
        impression: '', biomassNotes: '',
      },
      {
        id: 'B-045', strain: 'Gascotti', operator: 'You',
        startedAt: daysAgo(4), stage: 'done',
        farm: 'Leafy Jungle', location: 'Humboldt, CA', growType: 'Indoor · Living Soil',
        materialType: 'WPFF', costPerLb: 800, inputG: 2966, // 6537 g in sample — use realistic
        washDate: daysAgo(4), pressDate: daysAgo(2),
        wash: { ...mkWash(42,48,32,35), freezeDryStart: daysAgo(4), freezeDryEnd: daysAgo(3) },
        bags: {
          '160-219': mkBag(null, null, null, 0, '', ''),
          '120-159': mkBag(null, 12.7, 2, 5, 'Sandy', ''),
          '90-119':  mkBag(null, 19.8, 1, 6, 'Sandy', 'Full melt.'),
          '45-89':   mkBag(null, 41.6, 3, 4, 'Creamy',''),
        },
        presses: [
          { id: 'P-1', grades: ['120-159','90-119','45-89'], chargeG: 74.1, yieldG: 38.3, tempF: 182, pressurePsi: 850, minutes: 3, notes: 'Combined press. Clean melt.' },
        ],
        impression: 'Gassy & sweet. Full-spectrum profile. Retained terp clarity through dry.',
        biomassNotes: 'Biomass material contained high amounts of leaves & petioles. Low trichome quantity. Inquire about harvest timing and post-harvest process — what happens to the biomass before it gets into the freezers?',
      },
      {
        id: 'B-044', strain: 'Apples & Bananas', operator: 'M. Kato',
        startedAt: daysAgo(7), stage: 'done',
        farm: 'Emerald Cove', location: 'Mendocino, CA', growType: 'Greenhouse · Organic',
        materialType: 'FF (Fresh Frozen)', costPerLb: 650, inputG: 1814,
        washDate: daysAgo(7), pressDate: daysAgo(5),
        wash: { ...mkWash(44,49,33,36), freezeDryStart: daysAgo(7), freezeDryEnd: daysAgo(6) },
        bags: {
          '160-219': mkBag(38,  8.4,  4, 3, 'Sticky', ''),
          '120-159': mkBag(75,  19.9, 2, 5, 'Sandy',  ''),
          '90-119':  mkBag(102, 28.3, 2, 6, 'Sandy',  ''),
          '45-89':   mkBag(35,  7.1,  3, 4, 'Creamy', ''),
        },
        presses: [
          { id: 'P-1', grades: ['90-119'], chargeG: 28.3, yieldG: 22.6, tempF: 178, pressurePsi: 750, minutes: 3, notes: '' },
          { id: 'P-2', grades: ['120-159','160-219','45-89'], chargeG: 35.4, yieldG: 24.1, tempF: 190, pressurePsi: 900, minutes: 4, notes: '' },
        ],
        impression: 'Tropical fruit forward, solid return.',
        biomassNotes: 'Clean material, decent trichome coverage.',
      },
      {
        id: 'B-043', strain: 'Gary Payton', operator: 'J. Reyes',
        startedAt: daysAgo(11), stage: 'done',
        farm: 'Black Maple Co.', location: 'Southern OR', growType: 'Indoor · Hydroponic',
        materialType: 'WPFF', costPerLb: 900, inputG: 2722,
        washDate: daysAgo(11), pressDate: daysAgo(9),
        wash: { ...mkWash(42,46,32,34), freezeDryStart: daysAgo(11), freezeDryEnd: daysAgo(10) },
        bags: {
          '160-219': mkBag(61,  14.9, 5, 2, 'Chunky', 'Contam — separated to secondary.'),
          '120-159': mkBag(108, 31.2, 3, 4, 'Sandy',  ''),
          '90-119':  mkBag(154, 46.4, 2, 5, 'Sandy',  'Heavy yield.'),
          '45-89':   mkBag(52,  11.9, 4, 3, 'Creamy', ''),
        },
        presses: [
          { id: 'P-1', grades: ['90-119','120-159'], chargeG: 77.6, yieldG: 58.1, tempF: 182, pressurePsi: 850, minutes: 3, notes: 'Classic combo press.' },
        ],
        impression: 'Exceptional 90µ, top shelf.',
        biomassNotes: '',
      },
      {
        id: 'B-042', strain: 'Zoap', operator: 'You',
        startedAt: daysAgo(16), stage: 'done',
        farm: 'Leafy Jungle', location: 'Humboldt, CA', growType: 'Indoor · Living Soil',
        materialType: 'WPFF', costPerLb: 800, inputG: 1361,
        washDate: daysAgo(16), pressDate: daysAgo(14),
        wash: { ...mkWash(), freezeDryStart: daysAgo(16), freezeDryEnd: daysAgo(15) },
        bags: {
          '160-219': mkBag(32, 7.2,  3, 3, 'Sticky', ''),
          '120-159': mkBag(68, 18.6, 2, 5, 'Sandy',  ''),
          '90-119':  mkBag(91, 25.9, 1, 6, 'Sandy',  'Incredible terps. Gassy & sweet.'),
          '45-89':   mkBag(28, 6.1,  3, 4, 'Creamy', ''),
        },
        presses: [
          { id: 'P-1', grades: ['90-119'], chargeG: 25.9, yieldG: 21.3, tempF: 175, pressurePsi: 700, minutes: 3, notes: 'Solo press — preserved for dab jars.' },
          { id: 'P-2', grades: ['120-159','45-89','160-219'], chargeG: 31.9, yieldG: 21.8, tempF: 188, pressurePsi: 900, minutes: 4, notes: '' },
        ],
        impression: 'Dab-jar worthy. Gassy.',
        biomassNotes: '',
      },
      {
        id: 'B-041', strain: 'Runtz', operator: 'A. Hoffman',
        startedAt: daysAgo(21), stage: 'done',
        farm: 'Emerald Cove', location: 'Mendocino, CA', growType: 'Greenhouse · Organic',
        materialType: 'FF (Fresh Frozen)', costPerLb: 650, inputG: 2268,
        washDate: daysAgo(21), pressDate: daysAgo(19),
        wash: { ...mkWash(), freezeDryStart: daysAgo(21), freezeDryEnd: daysAgo(20) },
        bags: {
          '160-219': mkBag(44,  10.1, 4, 3, 'Sticky', ''),
          '120-159': mkBag(82,  22.4, 3, 4, 'Sandy',  ''),
          '90-119':  mkBag(119, 33.0, 2, 5, 'Sandy',  ''),
          '45-89':   mkBag(39,  8.5,  4, 3, 'Creamy', ''),
        },
        presses: [
          { id: 'P-1', grades: ['120-159','90-119','45-89','160-219'], chargeG: 74.0, yieldG: 52.6, tempF: 185, pressurePsi: 850, minutes: 4, notes: 'Full-spectrum press.' },
        ],
        impression: 'Solid all-around.',
        biomassNotes: '',
      },
    ];
    return seeds.map((b) => ({ ...b, demo: true }));
  },
};

// `MicronBands` is re-exported for convenience so data consumers can pull bands
// and seed from one module if desired.
export { MicronBands };

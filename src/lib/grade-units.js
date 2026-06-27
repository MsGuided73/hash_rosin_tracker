// Grade units — the abstraction that lets micron bands be combined into
// merged grades that flow through Press + Summary + analytics as ONE unit.
//
// A batch may carry `mergedGrades`: [{ id, label, bandIds:[...], color, melt,
// texture, notes, photos }]. A merged grade's dry weight is DERIVED as the sum
// of its constituent bags' dry weights. Constituent bands are then hidden from
// the press/summary unit list so nothing double-counts.

import { MicronBands } from './tokens.js';

// Suggest a label like "90–159µ Blend" from the selected band ids.
function makeMergeLabel(bandIds) {
  const bands = MicronBands.filter(b => bandIds.includes(b.id));
  if (!bands.length) return 'Blend';
  // micron numbers across all selected bands → overall low–high
  const nums = bands.flatMap(b => b.id.split('-').map(Number));
  const lo = Math.min(...nums), hi = Math.max(...nums);
  return `${lo}–${hi}µ Blend`;
}

// Derived dry weight of a merged grade = sum of constituent bags' dry.
function mergeDry(batch, m) {
  return m.bandIds.reduce((s, id) => s + (batch.bags[id]?.dry || 0), 0);
}
function mergeWet(batch, m) {
  return m.bandIds.reduce((s, id) => s + (batch.bags[id]?.wet || 0), 0);
}

// The canonical list of pressable/analyzable UNITS for a batch:
// unmerged bands first (workflow order), then merged grades.
function units(batch) {
  const merged = batch.mergedGrades || [];
  const inMerge = new Set(merged.flatMap(m => m.bandIds));
  const bandUnits = MicronBands
    .filter(b => !inMerge.has(b.id))
    .map(b => ({
      kind: 'band', id: b.id, label: b.label, short: b.short,
      bandIds: [b.id], bagRef: batch.bags[b.id],
      dry: batch.bags[b.id]?.dry ?? null,
    }));
  const mergeUnits = merged.map(m => ({
    kind: 'merge', id: m.id, label: m.label, short: 'BLEND',
    bandIds: m.bandIds, mergeRef: m,
    dry: mergeDry(batch, m),
  }));
  return [...bandUnits, ...mergeUnits];
}

// Look up a unit (band or merge) by its id.
function unitById(batch, id) {
  return units(batch).find(u => u.id === id);
}

// Resolve a display color for a unit, given a resolved theme `t`.
function unitColor(t, unit) {
  if (unit.kind === 'merge') return t.accent;
  return t.bands[unit.id];
}

// ---- Merge CRUD on a batch (returns a new batch) ----
function createMerge(batch, bandIds, label) {
  const id = 'merge-' + (Date.now().toString(36)) + Math.floor(Math.random()*99);
  const m = {
    id, label: label || makeMergeLabel(bandIds), bandIds: [...bandIds],
    color: null, melt: 0, texture: '', notes: '', photos: [],
  };
  return { ...batch, mergedGrades: [...(batch.mergedGrades || []), m], __newMergeId: id };
}
function updateMerge(batch, id, patch) {
  return { ...batch, mergedGrades: (batch.mergedGrades || []).map(m => m.id === id ? { ...m, ...patch } : m) };
}
function removeMerge(batch, id) {
  return {
    ...batch,
    mergedGrades: (batch.mergedGrades || []).filter(m => m.id !== id),
    // also drop any press runs that referenced the merge as a grade
    presses: (batch.presses || []).filter(p => !(p.grades || []).includes(id)),
  };
}

// ---- Saved combinations (reusable across batches; localStorage in prototype) ----
const COMBO_KEY = 'micron-combos';
function getCombos() {
  try { return JSON.parse(localStorage.getItem(COMBO_KEY)) || []; }
  catch { return []; }
}
function saveCombo(label, bandIds) {
  const combos = getCombos();
  const id = 'combo-' + Date.now().toString(36);
  const next = [...combos, { id, label: label || makeMergeLabel(bandIds), bandIds: [...bandIds] }];
  localStorage.setItem(COMBO_KEY, JSON.stringify(next));
  return next;
}
function deleteCombo(id) {
  const next = getCombos().filter(c => c.id !== id);
  localStorage.setItem(COMBO_KEY, JSON.stringify(next));
  return next;
}

// Resolve any grade id (band OR merge) to a renderable descriptor.
function resolveUnit(batch, id) {
  const band = MicronBands.find(b => b.id === id);
  if (band) return { kind: 'band', id, label: band.label, short: band.short, bandIds: [id] };
  const m = (batch.mergedGrades || []).find(x => x.id === id);
  if (m) return { kind: 'merge', id, label: m.label, short: 'BLEND', bandIds: m.bandIds };
  return { kind: 'band', id, label: id + 'µ', short: id + 'µ', bandIds: [id] };
}

export const GradeUnits = {
  makeMergeLabel, mergeDry, mergeWet, units, unitById, unitColor, resolveUnit,
  createMerge, updateMerge, removeMerge,
  getCombos, saveCombo, deleteCombo,
};

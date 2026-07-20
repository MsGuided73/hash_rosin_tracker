// Export engine — turn batches into CSV, Markdown, or Excel files,
// scoped to everything, one strain, or one batch.
//
// CSV ships with a UTF-8 BOM so Excel opens it correctly. Excel export uses
// SheetJS loaded on demand (dynamic import) so it never weighs down the main
// bundle. Note: SheetJS is used for WRITING only — its known CVEs concern
// parsing untrusted workbooks, which we never do.
import { deriveBatch } from './analytics.js';

const fmt = (v, d = 1) => (v == null ? '' : Number(v).toFixed(d));

export function filterScope(batches, scope) {
  const derived = batches.map(deriveBatch);
  if (!scope || scope.kind === 'all') return derived;
  if (scope.kind === 'strain') return derived.filter((b) => b.strain === scope.value);
  if (scope.kind === 'batch') return derived.filter((b) => b.id === scope.value);
  return derived;
}

export function scopeLabel(scope) {
  if (!scope || scope.kind === 'all') return 'all-batches';
  return `${scope.kind}-${String(scope.value).replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

// ─────────── row builders (shared by every format) ───────────
export function batchRows(list) {
  return list.map((b) => ({
    Batch: b.id,
    Strain: b.strain || '',
    Farm: b.farm || '',
    Location: b.location || '',
    'Grow Type': b.growType || '',
    Material: b.materialType || '',
    Operator: b.operator || '',
    Stage: b.stage,
    Started: dateStr(b.startedAt),
    'Wash Date': dateStr(b.washDate),
    'Press Date': dateStr(b.pressDate),
    'Input g': fmt(b.inputG, 1),
    'Cost $/lb': b.costPerLb != null ? fmt(b.costPerLb, 2) : '',
    'Hash Dry g': fmt(b.totalDryG, 1),
    'Hash Yield %': fmt(b.hashYieldPct, 2),
    'Rosin g': fmt(b.totalRosinG, 1),
    'Press Return %': fmt(b.rosinReturnPct, 2),
    'Cost per Rosin g $': b.costCents && b.totalRosinG ? fmt(b.costCents / 100 / b.totalRosinG, 2) : '',
    Presses: (b.presses || []).length,
    'Room Temp °F': rangeStr(b.wash?.roomTempLoF, b.wash?.roomTempHiF),
    'Water Temp °F': rangeStr(b.wash?.waterTempLoF, b.wash?.waterTempHiF),
    'Cure Method': b.cure?.method || '',
    Impression: b.impression || '',
    Demo: b.demo ? 'yes' : '',
  }));
}

export function bagRows(list) {
  const rows = [];
  for (const b of list) {
    for (const [band, bag] of Object.entries(b.bags || {})) {
      if (bag.wet == null && bag.dry == null && !bag.texture && !bag.notes) continue;
      rows.push({
        Batch: b.id,
        Strain: b.strain || '',
        'Micron Band': band,
        'Wet g': fmt(bag.wet, 1),
        'Dry g': fmt(bag.dry, 1),
        'Melt (0-6)': bag.melt || '',
        Texture: bag.texture || '',
        Notes: bag.notes || '',
      });
    }
  }
  return rows;
}

export function pressRows(list) {
  const rows = [];
  for (const b of list) {
    for (const p of b.presses || []) {
      rows.push({
        Batch: b.id,
        Strain: b.strain || '',
        Press: p.id,
        Grades: (p.grades || []).join(' + '),
        'Charge g': fmt(p.chargeG, 1),
        'Yield g': fmt(p.yieldG, 1),
        'Return %': p.chargeG && p.yieldG ? fmt((p.yieldG / p.chargeG) * 100, 2) : '',
        'Temp °F': p.tempF ?? '',
        PSI: p.pressurePsi ?? '',
        Minutes: p.minutes ?? '',
        Notes: p.notes || '',
      });
    }
  }
  return rows;
}

// ─────────── CSV ───────────
export function toCSV(list) {
  const sections = [
    ['BATCHES', batchRows(list)],
    ['BAGS', bagRows(list)],
    ['PRESS RUNS', pressRows(list)],
  ].filter(([, rows]) => rows.length);

  const parts = sections.map(([title, rows]) => {
    const cols = Object.keys(rows[0]);
    const lines = [
      title,
      cols.map(csvCell).join(','),
      ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')),
    ];
    return lines.join('\r\n');
  });
  // BOM so Excel detects UTF-8 (strain names, ° symbols)
  return '﻿' + parts.join('\r\n\r\n');
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ─────────── Markdown ───────────
export function toMarkdown(list, scope) {
  const title =
    !scope || scope.kind === 'all'
      ? 'All batches'
      : scope.kind === 'strain'
        ? `Strain report — ${scope.value}`
        : `Batch report — ${scope.value}`;

  const done = list.filter((b) => b.stage === 'done');
  const totalRosin = done.reduce((s, b) => s + (b.totalRosinG || 0), 0);
  const totalInput = done.reduce((s, b) => s + (b.inputG || 0), 0);
  const avgReturn = avgOf(done.map((b) => b.rosinReturnPct));
  const avgYield = avgOf(done.map((b) => b.hashYieldPct));

  const out = [
    `# Hashashin — ${title}`,
    '',
    `Exported ${new Date().toISOString().slice(0, 10)} · ${list.length} batch${list.length === 1 ? '' : 'es'} (${done.length} finished)`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Material washed | ${fmt(totalInput / 1000, 2)} kg |`,
    `| Rosin pressed | ${fmt(totalRosin, 1)} g |`,
    `| Avg wash yield | ${avgYield != null ? fmt(avgYield, 2) + '%' : '—'} |`,
    `| Avg press return | ${avgReturn != null ? fmt(avgReturn, 2) + '%' : '—'} |`,
    '',
    '## Batches',
    '',
    mdTable(batchRows(list), [
      'Batch', 'Strain', 'Farm', 'Stage', 'Press Date', 'Input g',
      'Hash Dry g', 'Hash Yield %', 'Rosin g', 'Press Return %', 'Cost per Rosin g $',
    ]),
  ];

  const bags = bagRows(list);
  if (bags.length) {
    out.push('', '## Micron bags', '', mdTable(bags, Object.keys(bags[0])));
  }
  const presses = pressRows(list);
  if (presses.length) {
    out.push('', '## Press runs', '', mdTable(presses, Object.keys(presses[0])));
  }

  // Narrative fields only make sense batch-scoped
  if (scope?.kind === 'batch' && list[0]) {
    const b = list[0];
    if (b.impression) out.push('', '## Impression', '', b.impression);
    if (b.biomassNotes) out.push('', '## Biomass notes', '', b.biomassNotes);
  }
  return out.join('\n') + '\n';
}

function mdTable(rows, cols) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  return [
    `| ${cols.join(' | ')} |`,
    `| ${cols.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${cols.map((c) => esc(r[c])).join(' | ')} |`),
  ].join('\n');
}

// ─────────── Excel (SheetJS, loaded on demand) ───────────
export async function toXLSXBlob(list) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (rows, name) => {
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  };
  add(batchRows(list), 'Batches');
  add(bagRows(list), 'Bags');
  add(pressRows(list), 'Press Runs');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ─────────── download ───────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportBatches(batches, scope, format) {
  const list = filterScope(batches, scope);
  if (!list.length) throw new Error('Nothing to export for that selection.');
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `hashashin-${scopeLabel(scope)}-${stamp}`;

  if (format === 'csv') {
    downloadBlob(new Blob([toCSV(list)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
  } else if (format === 'md') {
    downloadBlob(new Blob([toMarkdown(list, scope)], { type: 'text/markdown;charset=utf-8' }), `${base}.md`);
  } else if (format === 'xlsx') {
    downloadBlob(await toXLSXBlob(list), `${base}.xlsx`);
  } else {
    throw new Error(`Unknown export format: ${format}`);
  }
}

// ─────────── helpers ───────────
const dateStr = (v) => (v ? String(v).slice(0, 10) : '');
const rangeStr = (lo, hi) => (lo != null && hi != null ? `${lo}–${hi}` : '');
function avgOf(arr) {
  const vals = arr.filter((v) => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

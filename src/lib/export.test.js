import { describe, expect, test } from 'vitest';
import { filterScope, batchRows, pressRows, toCSV, toMarkdown, scopeLabel } from './export.js';
import { MicronSeed } from './data.js';

const seeds = () => MicronSeed.batches();

describe('export', () => {
  test('filterScope narrows by strain and batch', () => {
    expect(filterScope(seeds(), { kind: 'all' }).length).toBe(6);
    expect(filterScope(seeds(), { kind: 'strain', value: 'Zoap' }).map((b) => b.id)).toEqual(['B-042']);
    expect(filterScope(seeds(), { kind: 'batch', value: 'B-045' }).map((b) => b.id)).toEqual(['B-045']);
  });

  test('batch rows carry the key production metrics', () => {
    const [row] = batchRows(filterScope(seeds(), { kind: 'batch', value: 'B-045' }));
    expect(row.Batch).toBe('B-045');
    expect(row.Strain).toBe('Gascotti');
    expect(row['Hash Dry g']).toBe('74.1');
    expect(row['Rosin g']).toBe('38.3');
    expect(Number(row['Press Return %'])).toBeCloseTo(51.68, 1);
    expect(row.Demo).toBe('yes');
  });

  test('press rows compute per-run return', () => {
    const rows = pressRows(filterScope(seeds(), { kind: 'batch', value: 'B-044' }));
    expect(rows).toHaveLength(2);
    expect(Number(rows[0]['Return %'])).toBeCloseTo(79.86, 1);
  });

  test('CSV escapes commas and quotes and includes all sections', () => {
    const csv = toCSV(filterScope(seeds(), { kind: 'batch', value: 'B-045' }));
    expect(csv.startsWith('﻿')).toBe(true); // Excel BOM
    expect(csv).toContain('BATCHES');
    expect(csv).toContain('BAGS');
    expect(csv).toContain('PRESS RUNS');
    expect(csv).toContain('"Humboldt, CA"'); // comma-containing value quoted
    expect(csv).toContain('Combined press. Clean melt.'); // plain text unquoted
  });

  test('markdown report has summary and tables', () => {
    const list = filterScope(seeds(), { kind: 'strain', value: 'Gascotti' });
    const md = toMarkdown(list, { kind: 'strain', value: 'Gascotti' });
    expect(md).toContain('# Hashashin — Strain report — Gascotti');
    expect(md).toContain('| Avg press return |');
    expect(md).toContain('## Press runs');
  });

  test('scopeLabel produces safe filenames', () => {
    expect(scopeLabel({ kind: 'strain', value: 'Lemon Cherry Gelato' })).toBe('strain-Lemon_Cherry_Gelato');
    expect(scopeLabel({ kind: 'all' })).toBe('all-batches');
  });
});

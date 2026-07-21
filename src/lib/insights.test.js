import { describe, expect, test } from 'vitest';
import { computeInsights } from './insights.js';
import { MicronSeed } from './data.js';

// Use the seed batches as realistic fixtures, but strip the demo flag AND
// re-id them (the engine also excludes known seed batch ids).
const realBatches = () =>
  MicronSeed.batches().map(({ demo: _demo, ...b }) => ({ ...b, id: b.id.replace('B-', 'R-') }));

describe('computeInsights', () => {
  test('returns onboarding guidance when there is no real data', () => {
    const insights = computeInsights(MicronSeed.batches()); // all demo
    expect(insights).toHaveLength(1);
    expect(insights[0].key).toBe('onboard-first-batch');
  });

  test('recognizes patterns from finished batches', () => {
    const insights = computeInsights(realBatches());
    const keys = insights.map((i) => i.key);

    expect(keys).toContain('milestone-rosin-100'); // 238.8g total pressed
    expect(keys).toContain('press-temp-sweet-spot'); // 175-190°F spread in seeds
    expect(insights.length).toBeGreaterThanOrEqual(4);
  });

  test('every insight has the required shape', () => {
    for (const i of computeInsights(realBatches())) {
      expect(i.key).toBeTruthy();
      expect(['win', 'watch', 'tip', 'milestone']).toContain(i.severity);
      expect(i.title).toBeTruthy();
      expect(typeof i.body).toBe('string');
    }
  });

  test('detects press temperature spread when meaningful', () => {
    // Build a dataset with a clear temp split: 2 cool presses at high return,
    // 2 hot presses at low return.
    const mk = (id, tempF, yieldG) => ({
      id,
      strain: 'Test',
      stage: 'done',
      startedAt: '2026-06-01T00:00:00Z',
      pressDate: '2026-06-03T00:00:00Z',
      inputG: 1000,
      bags: { '90-119': { wet: 100, dry: 30, color: 1, melt: 5, texture: '', notes: '' } },
      presses: [
        { id: 'P-1', grades: ['90-119'], chargeG: 30, yieldG, tempF, pressurePsi: 800, minutes: 3 },
      ],
    });
    const data = [
      mk('B-1', 175, 25),
      mk('B-2', 175, 24),
      mk('B-3', 205, 15),
      mk('B-4', 205, 16),
    ];
    const insights = computeInsights(data);
    const temp = insights.find((i) => i.key === 'press-temp-sweet-spot');
    expect(temp).toBeTruthy();
    expect(temp.severity).toBe('win');
    expect(temp.title).toContain('175');
  });
});

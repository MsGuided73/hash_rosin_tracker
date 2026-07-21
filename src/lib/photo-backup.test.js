import { describe, expect, test } from 'vitest';
import { collectPhotos } from './photo-backup.js';

const px = 'data:image/png;base64,iVBORw0KGgo='; // tiny stub data URL

describe('collectPhotos', () => {
  test('gathers photos from every attachment spot with context', () => {
    const batches = [
      {
        id: 'B-100',
        intakePhotos: [{ id: 'p1', url: px, ts: '2026-07-01T00:00:00Z' }],
        freezeDryPhotos: [{ id: 'p2', url: px }],
        bags: { '90-119': { photos: [{ id: 'p3', url: px }] } },
        mergedGrades: [{ id: 'm1', label: '90–159µ Blend', photos: [{ id: 'p4', url: px }] }],
        presses: [{ id: 'P-1', photos: [{ id: 'p5', url: px }] }],
      },
    ];
    const found = collectPhotos(batches);
    expect(found.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(found.find((p) => p.id === 'p3').spot).toBe('bag 90-119');
    expect(found.find((p) => p.id === 'p5').spot).toBe('press P-1');
    expect(found.every((p) => p.batchCode === 'B-100')).toBe(true);
  });

  test('skips demo batches and non-data-URL entries', () => {
    const batches = [
      { id: 'B-041', intakePhotos: [{ id: 'x', url: px }] }, // seed id → demo
      { id: 'B-200', demo: true, intakePhotos: [{ id: 'y', url: px }] },
      { id: 'B-201', intakePhotos: [{ id: 'z', url: 'https://example.com/a.jpg' }] },
    ];
    expect(collectPhotos(batches)).toHaveLength(0);
  });
});

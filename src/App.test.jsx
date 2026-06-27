import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MicronApp } from './App.jsx';

describe('MicronApp smoke test', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('boots and renders the home screen with seeded batches', () => {
    render(<MicronApp />);
    // Seed data includes a Papaya Zkittlez batch (active hero + list row).
    expect(screen.getAllByText(/Papaya Zkittlez/i).length).toBeGreaterThan(0);
  });

  it('renders the summary screen for a completed batch (exercises cross-screen imports)', () => {
    // Route directly into a finished batch so SummaryScreen -> PressCard /
    // SectionLabel cross-module imports are exercised at runtime.
    localStorage.setItem('micron-route', JSON.stringify({ name: 'summary', batchId: 'B-045' }));
    render(<MicronApp />);
    expect(screen.getByText(/Gascotti/i)).toBeInTheDocument();
  });
});

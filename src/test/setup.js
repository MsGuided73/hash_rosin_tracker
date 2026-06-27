// Vitest setup — extends expect with jest-dom matchers and provides a
// minimal browser-runtime shim for the prototype's window.* globals.
import '@testing-library/jest-dom/vitest';

// The prototype reads window.__theme / window.__stage during render (set by the
// app shell). Default them so primitives can resolve a theme in isolation tests.
if (typeof window !== 'undefined') {
  window.__theme = window.__theme || 'dark';
  window.__stage = window.__stage ?? null;
}

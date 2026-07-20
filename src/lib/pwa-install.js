// PWA install prompt plumbing. Chrome/Android fire `beforeinstallprompt`
// early, so this module is imported for its side effects from main.jsx —
// it stashes the event and lets UI subscribe to availability.
let deferred = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((fn) => fn(true));
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((fn) => fn(false));
});

export function subscribeInstall(fn) {
  listeners.add(fn);
  fn(!!deferred);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  listeners.forEach((fn) => fn(false));
  return choice.outcome === 'accepted';
}

// iOS Safari has no install prompt — used to show "Add to Home Screen" hint.
export function isIOSSafari() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !window.matchMedia('(display-mode: standalone)').matches;
}

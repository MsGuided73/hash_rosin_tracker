// Supabase client + zero-friction device auth.
//
// Every install generates a device UUID + random secret, exchanges them for a
// pre-confirmed account via the `device-auth` edge function, then signs in with
// password. No sign-up wall — data starts saving automatically on first use.
//
// The URL and anon key are PUBLISHABLE values (they ship in every client
// bundle by design; row-level security protects the data). They can be
// overridden with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qpoqxagsvvdpyqvmfxkv.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3F4YWdzdnZkcHlxdm1meGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjQzNDUsImV4cCI6MjEwMDEwMDM0NX0.ifM52ZT2h1PTvC-0XvInixgKwYSAMDvBM-ji7vK2xDw';

let client = null;

export function getSupabase() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

const DEVICE_ID_KEY = 'micron-device-id';
const DEVICE_SECRET_KEY = 'micron-device-secret';

function getDeviceCreds() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!id || !secret) {
    id = crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ID_KEY, id);
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return { id, secret };
}

let sessionPromise = null;

// Resolve to an authenticated session, creating the device account on first
// run. Concurrent callers share one in-flight promise; failures reset it so
// the next call retries.
export function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = bootstrapSession().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

async function bootstrapSession() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;

  const { id, secret } = getDeviceCreds();
  const email = `device-${id}@devices.hashashin.app`;

  // Account may already exist (e.g. localStorage kept creds, session expired)
  let res = await sb.auth.signInWithPassword({ email, password: secret });
  if (!res.error) return res.data.session;

  const { error: fnError } = await sb.functions.invoke('device-auth', {
    body: { device_id: id, password: secret },
  });
  if (fnError) throw new Error(`device-auth failed: ${fnError.message}`);

  res = await sb.auth.signInWithPassword({ email, password: secret });
  if (res.error) throw new Error(`device sign-in failed: ${res.error.message}`);
  return res.data.session;
}

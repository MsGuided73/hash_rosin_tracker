// Photo backup engine.
//
// Every photo attached anywhere in the app (intake, freeze-dry bags/merges,
// freeze-dry cycle, press runs) lives as a data URL in the local batch state.
// This module watches that state, and for each new photo: compresses it
// (JPEG, max 1600px edge), uploads it to the private `batch-photos` bucket at
// <uid>/<batchCode>/<photoId>.jpg, and records it in the `photos` table.
// Photos deleted in the app are pruned from storage on the next pass.
// Demo/seed batches are never uploaded. Failures retry on the next change.
import { getSupabase, ensureSession } from './supabase.js';
import { isDemoBatch } from './sync.js';

const BUCKET = 'batch-photos';
const LEDGER_KEY = 'micron-photo-backup'; // { photoId: { path, rowId } }
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const DEBOUNCE_MS = 3000;

// ─────────── collect every photo in the local model ───────────
// Returns [{ id, url, ts, name, batchCode, spot }]
export function collectPhotos(batches) {
  const out = [];
  const push = (batch, spot, list) => {
    for (const p of list || []) {
      if (p && p.id && typeof p.url === 'string' && p.url.startsWith('data:image')) {
        out.push({ ...p, batchCode: batch.id, spot });
      }
    }
  };
  for (const b of batches) {
    if (isDemoBatch(b)) continue;
    push(b, 'intake', b.intakePhotos);
    push(b, 'freeze-dry', b.freezeDryPhotos);
    for (const [band, bag] of Object.entries(b.bags || {})) push(b, `bag ${band}`, bag?.photos);
    for (const m of b.mergedGrades || []) push(b, `merge ${m.label || m.id}`, m.photos);
    for (const p of b.presses || []) push(b, `press ${p.id}`, p.photos);
  }
  return out;
}

// ─────────── ledger (what's already uploaded) ───────────
function readLedger() {
  try {
    return JSON.parse(localStorage.getItem(LEDGER_KEY)) || {};
  } catch {
    return {};
  }
}
function writeLedger(ledger) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

// ─────────── compression (canvas, no deps) ───────────
async function compressDataUrl(dataUrl) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('compression failed');
  return blob;
}

// ─────────── backup pass ───────────
let timer = null;
let running = false;
let queued = null;

export function schedulePhotoBackup(batches) {
  queued = batches;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runBackup, DEBOUNCE_MS);
}

async function runBackup() {
  timer = null;
  if (running) {
    timer = setTimeout(runBackup, DEBOUNCE_MS);
    return;
  }
  const batches = queued;
  if (!batches) return;

  const photos = collectPhotos(batches);
  const ledger = readLedger();
  const currentIds = new Set(photos.map((p) => p.id));
  const newPhotos = photos.filter((p) => !ledger[p.id]);
  const removed = Object.keys(ledger).filter((id) => !currentIds.has(id));
  if (!newPhotos.length && !removed.length) return;

  running = true;
  try {
    const session = await ensureSession();
    const sb = getSupabase();
    const uid = session.user.id;

    // Upload new photos
    for (const p of newPhotos) {
      const { data: batchRow } = await sb
        .from('batches')
        .select('id')
        .eq('batch_code', p.batchCode)
        .maybeSingle();
      if (!batchRow) continue; // batch not synced yet — retry on next pass

      const blob = await compressDataUrl(p.url);
      const path = `${uid}/${p.batchCode}/${p.id}.jpg`;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const { data: row, error: rowErr } = await sb
        .from('photos')
        .insert({
          owner_id: uid,
          batch_id: batchRow.id,
          storage_path: `${BUCKET}/${path}`,
          caption: p.spot,
          taken_at: p.ts || new Date().toISOString(),
        })
        .select('id')
        .single();
      if (rowErr) throw rowErr;

      ledger[p.id] = { path, rowId: row.id };
      writeLedger(ledger);
    }

    // Prune photos deleted in the app
    for (const id of removed) {
      const entry = ledger[id];
      if (entry?.path) await sb.storage.from(BUCKET).remove([entry.path]);
      if (entry?.rowId) await sb.from('photos').delete().eq('id', entry.rowId);
      delete ledger[id];
      writeLedger(ledger);
    }
  } catch {
    // Offline or mid-sync — photos stay local; next change retries.
  } finally {
    running = false;
  }
}

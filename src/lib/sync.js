// Auto-save sync engine.
//
// Every change to the local batch list is debounced and pushed to Supabase via
// the `sync_batch` RPC (one transactional upsert per batch: farm, batch, bags,
// wash passes, presses, merged grades, cure log). Only batches whose payload
// actually changed since the last successful push are sent. Demo/seed batches
// are never synced so the shared analytics stay clean.
import { getSupabase, ensureSession } from './supabase.js';

const DEBOUNCE_MS = 1500;
const SEED_IDS = new Set(['B-041', 'B-042', 'B-043', 'B-044', 'B-045', 'B-046']);

// ─────────── subscribable sync status ───────────
const state = { status: 'idle', lastSyncAt: null, error: null };
const listeners = new Set();

function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn({ ...state }));
}

export function subscribeSync(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

// ─────────── payload mapping (local model → sync_batch jsonb) ───────────
const MATERIAL_MAP = {
  WPFF: 'WPFF',
  'FF (Fresh Frozen)': 'FF',
  'Dry Flower': 'Dry Flower',
  'Dry Trim': 'Dry Trim',
  Kief: 'Kief',
};

export function isDemoBatch(b) {
  return b.demo === true || SEED_IDS.has(b.id);
}

export function toPayload(b) {
  return {
    id: b.id,
    strain: b.strain || '',
    operator: b.operator || null,
    stage: b.stage || 'setup',
    farm: b.farm || null,
    location: b.location || null,
    growType: b.growType || null,
    materialType: b.materialType ? MATERIAL_MAP[b.materialType] || 'Other' : null,
    inputG: b.inputG ?? null,
    costPerLbCents: b.costPerLb != null ? Math.round(Number(b.costPerLb) * 100) : null,
    startedAt: b.startedAt || null,
    washDate: b.washDate || null,
    pressDate: b.pressDate || null,
    impression: b.impression || null,
    biomassNotes: b.biomassNotes || null,
    wash: b.wash
      ? {
          roomTempLoF: b.wash.roomTempLoF ?? null,
          roomTempHiF: b.wash.roomTempHiF ?? null,
          waterTempLoF: b.wash.waterTempLoF ?? null,
          waterTempHiF: b.wash.waterTempHiF ?? null,
          freezeDryStart: b.wash.freezeDryStart || null,
          freezeDryEnd: b.wash.freezeDryEnd || null,
          passes: (b.wash.passes || []).map((p, i) => ({
            pass: p.pass ?? i + 1,
            minutes: p.minutes ?? null,
            rpm: p.rpm ?? null,
          })),
        }
      : null,
    bags: Object.fromEntries(
      Object.entries(b.bags || {}).map(([band, bag]) => [
        band,
        {
          wet: bag.wet ?? null,
          dry: bag.dry ?? null,
          color: bag.color ?? null,
          melt: bag.melt ?? 0,
          texture: bag.texture || null,
          notes: bag.notes || null,
        },
      ]),
    ),
    presses: (b.presses || []).map((p) => ({
      id: p.id,
      grades: p.grades || [],
      chargeG: p.chargeG ?? null,
      yieldG: p.yieldG ?? null,
      tempF: p.tempF ?? null,
      pressurePsi: p.pressurePsi ?? null,
      minutes: p.minutes ?? null,
      yieldByGrade: p.yieldByGrade || {},
      notes: p.notes || null,
    })),
    mergedGrades: (b.mergedGrades || []).map((m) => ({
      id: m.id,
      label: m.label || null,
      bandIds: m.bandIds || [],
      color: m.color ?? null,
      melt: m.melt ?? 0,
      texture: m.texture || null,
      notes: m.notes || null,
    })),
    cure: b.cure
      ? {
          method: b.cure.method || null,
          container: b.cure.container || null,
          vacuumSealed: !!b.cure.vacuumSealed,
          lightExposure: b.cure.lightExposure || null,
          tempF: b.cure.tempF ?? null,
          targetDays: b.cure.targetDays ?? null,
          startedAt: b.cure.startedAt || null,
          notes: b.cure.notes || null,
        }
      : null,
  };
}

// ─────────── debounced push ───────────
const lastSynced = new Map(); // batch id → serialized payload of last success
let timer = null;
let inFlight = false;
let queued = null;

export function scheduleSync(batches) {
  queued = batches;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runSync, DEBOUNCE_MS);
}

async function runSync() {
  timer = null;
  if (inFlight) {
    // a push is running; re-schedule to pick up the latest state after it ends
    timer = setTimeout(runSync, DEBOUNCE_MS);
    return;
  }
  const batches = queued;
  if (!batches) return;

  const dirty = batches
    .filter((b) => !isDemoBatch(b))
    .map((b) => ({ batch: b, payload: toPayload(b) }))
    .map((x) => ({ ...x, key: JSON.stringify(x.payload) }))
    .filter((x) => lastSynced.get(x.batch.id) !== x.key);

  if (dirty.length === 0) return;

  inFlight = true;
  setState({ status: 'syncing', error: null });
  try {
    await ensureSession();
    const sb = getSupabase();
    for (const { batch, payload, key } of dirty) {
      const { error } = await sb.rpc('sync_batch', { p: payload });
      if (error) throw new Error(`${batch.id}: ${error.message}`);
      lastSynced.set(batch.id, key);
    }
    setState({ status: 'synced', lastSyncAt: new Date().toISOString() });
  } catch (err) {
    // Offline or auth failure — data stays local; next change retries.
    setState({ status: 'offline', error: err instanceof Error ? err.message : String(err) });
  } finally {
    inFlight = false;
  }
}

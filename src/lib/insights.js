// Insight engine — the pattern recognizer.
//
// Pure rules over the user's real batches → plain-language findings. Runs
// locally every time data changes; findings are also recorded to the
// `insights` table (upsert on dedupe_key) so the database keeps a permanent
// log of when each pattern was first recognized.
//
// Severity vocabulary:
//   win       — something working; keep doing it
//   watch     — something drifting; look at it
//   tip       — soft guidance / data hygiene
//   milestone — progress marker
import { deriveBatch } from './analytics.js';
import { getSupabase, ensureSession } from './supabase.js';
import { isDemoBatch } from './sync.js';

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const fmtPct = (v) => `${v.toFixed(1)}%`;

export function computeInsights(batches) {
  // isDemoBatch also catches seed batches from pre-flag localStorage
  const real = batches.filter((b) => !isDemoBatch(b)).map(deriveBatch);
  const done = real
    .filter((b) => b.stage === 'done')
    .sort((a, b) => new Date(a.pressDate || a.startedAt) - new Date(b.pressDate || b.startedAt));
  const out = [];
  const add = (i) => out.push(i);

  // ── Getting started guidance (before there's enough data) ──
  if (done.length === 0) {
    add({
      key: 'onboard-first-batch',
      category: 'progress',
      severity: 'tip',
      title: real.length ? 'Finish your first batch' : 'Run your first batch',
      body: real.length
        ? 'You have a batch in progress. Once it reaches Done, your dashboard starts building real numbers — yield, return, and cost per gram.'
        : 'Tap New Batch and log a wash. Every weight and temperature you enter is saved automatically and turns into insights here.',
    });
    return out;
  }

  const presses = done.flatMap((b) => (b.presses || []).filter((p) => num(p.chargeG) > 0 && num(p.yieldG) != null));
  const overallReturn = avg(done.map((b) => b.rosinReturnPct).filter((v) => v != null));

  // ── Press temperature pattern ──
  const tempGroups = groupBuckets(presses, (p) => num(p.tempF), 5);
  const tempRanked = rankBuckets(tempGroups);
  if (tempRanked.length >= 2) {
    const [best] = tempRanked;
    const worst = tempRanked[tempRanked.length - 1];
    if (best.avg - worst.avg >= 3) {
      add({
        key: 'press-temp-sweet-spot',
        category: 'press',
        severity: 'win',
        title: `${best.x}–${best.x + 5}°F is your press sweet spot`,
        body: `Presses at ${best.x}–${best.x + 5}°F average ${fmtPct(best.avg)} return across ${best.n} runs — ${fmtPct(best.avg - worst.avg)} better than ${worst.x}–${worst.x + 5}°F. Favor the lower-variance range and log a few more runs to confirm.`,
        data: { best, worst },
      });
    }
  }

  // ── Pressure pattern (less vs more pressure) ──
  const psiGroups = groupBuckets(presses, (p) => num(p.pressurePsi), 100);
  const psiRanked = rankBuckets(psiGroups);
  if (psiRanked.length >= 2) {
    const [best] = psiRanked;
    const worst = psiRanked[psiRanked.length - 1];
    if (best.avg - worst.avg >= 3) {
      const direction = best.x < worst.x ? 'Less pressure is winning' : 'More pressure is winning';
      add({
        key: 'pressure-pattern',
        category: 'press',
        severity: 'win',
        title: direction,
        body: `${best.x}–${best.x + 100} PSI averages ${fmtPct(best.avg)} return (${best.n} runs) vs ${fmtPct(worst.avg)} at ${worst.x}–${worst.x + 100} PSI. Temperature and micron mix matter too, so change one variable at a time.`,
        data: { best, worst },
      });
    }
  }

  // ── Wash water temperature ──
  const washGroups = new Map();
  for (const b of done) {
    const lo = num(b.wash?.waterTempLoF);
    const hi = num(b.wash?.waterTempHiF);
    if (lo == null || hi == null || b.hashYieldPct == null) continue;
    const bucket = Math.floor((lo + hi) / 2 / 2) * 2;
    if (!washGroups.has(bucket)) washGroups.set(bucket, []);
    washGroups.get(bucket).push(b.hashYieldPct);
  }
  const washRanked = [...washGroups.entries()]
    .map(([x, vals]) => ({ x, n: vals.length, avg: avg(vals) }))
    .filter((g) => g.n >= 2)
    .sort((a, b) => b.avg - a.avg);
  if (washRanked.length >= 2 && washRanked[0].avg - washRanked[washRanked.length - 1].avg >= 0.5) {
    const best = washRanked[0];
    add({
      key: 'wash-water-temp',
      category: 'wash',
      severity: 'win',
      title: `Best wash yields come at ~${best.x}°F water`,
      body: `Batches washed around ${best.x}°F pull ${fmtPct(best.avg)} hash from biomass — your strongest water temperature so far (${best.n} batches).`,
      data: { ranked: washRanked },
    });
  }

  // ── Strain champion / laggard ──
  const strainGroups = Object.entries(groupBy(done.filter((b) => b.strain), (b) => b.strain))
    .map(([strain, list]) => ({
      strain,
      n: list.length,
      ret: avg(list.map((b) => b.rosinReturnPct).filter((v) => v != null)),
      hash: avg(list.map((b) => b.hashYieldPct).filter((v) => v != null)),
    }))
    .filter((s) => s.n >= 2 && s.ret != null)
    .sort((a, b) => b.ret - a.ret);
  if (strainGroups.length >= 1) {
    const champ = strainGroups[0];
    add({
      key: 'strain-champion',
      category: 'strain',
      severity: 'win',
      title: `${champ.strain} is your top performer`,
      body: `Across ${champ.n} batches, ${champ.strain} returns ${fmtPct(champ.ret)} on the press${champ.hash != null ? ` and washes at ${fmtPct(champ.hash)}` : ''}. When sourcing decisions come up, this strain has earned the freezer space.`,
      data: champ,
    });
    if (strainGroups.length >= 2 && overallReturn != null) {
      const laggard = strainGroups[strainGroups.length - 1];
      if (overallReturn - laggard.ret >= 5) {
        add({
          key: 'strain-laggard',
          category: 'strain',
          severity: 'watch',
          title: `${laggard.strain} runs below your average`,
          body: `${laggard.strain} returns ${fmtPct(laggard.ret)} vs your ${fmtPct(overallReturn)} overall. Before dropping it, check whether the material source or press recipe differed on those runs.`,
          data: laggard,
        });
      }
    }
  }

  // ── Grower quality drift ──
  const farmGroups = groupBy(done.filter((b) => b.farm), (b) => b.farm);
  for (const [farm, list] of Object.entries(farmGroups)) {
    if (list.length < 3) continue;
    const yields = list.map((b) => b.hashYieldPct).filter((v) => v != null);
    if (yields.length < 3) continue;
    const last = yields[yields.length - 1];
    const prior = avg(yields.slice(0, -1));
    if (prior > 0 && last < prior * 0.7) {
      add({
        key: `farm-drift-${slug(farm)}`,
        category: 'grower',
        severity: 'watch',
        title: `${farm}'s latest material came in light`,
        body: `The most recent ${farm} batch washed at ${fmtPct(last)} vs their ${fmtPct(prior)} norm — a ${Math.round((1 - last / prior) * 100)}% drop. Worth a conversation about harvest timing and how the biomass is handled before freezing.`,
        data: { farm, last, prior },
      });
    }
  }

  // ── Best-value grower (cost per rosin gram) ──
  const farmValue = Object.entries(farmGroups)
    .map(([farm, list]) => {
      const rosin = list.reduce((s, b) => s + (b.totalRosinG || 0), 0);
      const cost = list.reduce((s, b) => s + (b.costCents || 0), 0);
      return { farm, n: list.length, costPerG: rosin > 0 && cost > 0 ? cost / rosin / 100 : null };
    })
    .filter((f) => f.costPerG != null && f.n >= 2)
    .sort((a, b) => a.costPerG - b.costPerG);
  if (farmValue.length >= 2 && farmValue[farmValue.length - 1].costPerG > farmValue[0].costPerG * 1.25) {
    const best = farmValue[0];
    const worst = farmValue[farmValue.length - 1];
    add({
      key: 'farm-best-value',
      category: 'economics',
      severity: 'win',
      title: `${best.farm} delivers your cheapest rosin`,
      body: `Material from ${best.farm} works out to $${best.costPerG.toFixed(2)} per finished gram vs $${worst.costPerG.toFixed(2)} from ${worst.farm}. Same dollars, ${Math.round((worst.costPerG / best.costPerG - 1) * 100)}% more rosin.`,
      data: { best, worst },
    });
  }

  // ── Trend: recent vs prior return ──
  if (done.length >= 4) {
    const rets = done.map((b) => b.rosinReturnPct).filter((v) => v != null);
    if (rets.length >= 4) {
      const half = Math.floor(rets.length / 2);
      const early = avg(rets.slice(0, half));
      const late = avg(rets.slice(half));
      if (late - early >= 3) {
        add({
          key: 'trend-improving',
          category: 'progress',
          severity: 'win',
          title: 'Your press returns are trending up',
          body: `Recent batches average ${fmtPct(late)} vs ${fmtPct(early)} earlier — process dialing-in is paying off.`,
        });
      } else if (early - late >= 3) {
        add({
          key: 'trend-declining',
          category: 'progress',
          severity: 'watch',
          title: 'Press returns have slipped',
          body: `Recent batches average ${fmtPct(late)} vs ${fmtPct(early)} before. Compare what changed: material source, micron mix on the plates, or press temp.`,
        });
      }
    }
  }

  // ── Micron quality note ──
  const bandMelts = new Map();
  for (const b of done) {
    for (const [band, bag] of Object.entries(b.bags || {})) {
      const m = num(bag.melt);
      if (m > 0) {
        if (!bandMelts.has(band)) bandMelts.set(band, []);
        bandMelts.get(band).push(m);
      }
    }
  }
  const meltRanked = [...bandMelts.entries()]
    .map(([band, vals]) => ({ band, n: vals.length, avg: avg(vals) }))
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.avg - a.avg);
  if (meltRanked.length && meltRanked[0].avg >= 5) {
    const b0 = meltRanked[0];
    add({
      key: 'micron-headstash',
      category: 'quality',
      severity: 'win',
      title: `Your ${b0.band}µ bags are headstash grade`,
      body: `${b0.band}µ averages ${b0.avg.toFixed(1)}/6 melt across ${b0.n} bags. Consider pressing it solo and jarring it separately — it's your premium tier.`,
      data: b0,
    });
  }

  // ── Data hygiene (soft guidance) ──
  const missingDry = done.filter((b) => !b.totalDryG);
  if (missingDry.length) {
    add({
      key: 'hygiene-missing-dry',
      category: 'progress',
      severity: 'tip',
      title: `${missingDry.length} finished batch${missingDry.length === 1 ? ' is' : 'es are'} missing dry weights`,
      body: `Without dry weights the wash-yield stats can't count ${missingDry.length === 1 ? 'that batch' : 'those batches'} (${missingDry.map((b) => b.id).join(', ')}). Open each batch → Freeze Dry and log the bag weights.`,
    });
  }
  const missingCost = done.filter((b) => b.costPerLb == null);
  if (missingCost.length && missingCost.length < done.length) {
    add({
      key: 'hygiene-missing-cost',
      category: 'economics',
      severity: 'tip',
      title: 'Add biomass cost to sharpen ROI',
      body: `${missingCost.length} of ${done.length} finished batches have no cost per pound, so your cost-per-gram numbers are incomplete. It's one field on the Setup screen.`,
    });
  }

  // ── Milestones ──
  const totalRosin = done.reduce((s, b) => s + (b.totalRosinG || 0), 0);
  for (const mark of [100, 500, 1000, 5000]) {
    if (totalRosin >= mark) {
      add({
        key: `milestone-rosin-${mark}`,
        category: 'progress',
        severity: 'milestone',
        title: `${mark >= 1000 ? mark / 1000 + ' kg' : mark + ' g'} of rosin pressed`,
        body: `Lifetime output crossed ${mark >= 1000 ? mark / 1000 + ' kilograms' : mark + ' grams'} across ${done.length} finished batches. Keep the data coming.`,
      });
    }
  }

  // press-count guidance when temp analysis is starved
  if (presses.length > 0 && presses.length < 4) {
    add({
      key: 'onboard-more-presses',
      category: 'press',
      severity: 'tip',
      title: 'A few more presses unlock temperature insights',
      body: `You've logged ${presses.length} press run${presses.length === 1 ? '' : 's'}. At 4+ runs across different temps, the dashboard starts comparing temperature and pressure recipes for you.`,
    });
  }

  return out;
}

// ─────────── record keeper: persist findings to the database ───────────
let lastRecorded = '';

export async function recordInsights(insights) {
  if (!insights.length) return;
  const fingerprint = JSON.stringify(insights.map((i) => [i.key, i.title, i.body]));
  if (fingerprint === lastRecorded) return;
  try {
    const session = await ensureSession();
    const sb = getSupabase();
    const rows = insights.map((i) => ({
      owner_id: session.user.id,
      dedupe_key: i.key,
      kind: i.kind || 'rule',
      category: i.category,
      severity: i.severity,
      title: i.title,
      body: i.body,
      data: i.data || {},
    }));
    const { error } = await sb
      .from('insights')
      .upsert(rows, { onConflict: 'owner_id,dedupe_key' });
    if (error) throw error;
    lastRecorded = fingerprint;
  } catch {
    // Offline — findings still render locally; recording retries next change.
  }
}

// ─────────── helpers ───────────
function groupBy(arr, keyFn) {
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] = out[k] || []).push(item);
  }
  return out;
}

function groupBuckets(presses, valFn, size) {
  const map = new Map();
  for (const p of presses) {
    const v = valFn(p);
    if (v == null) continue;
    const bucket = Math.floor(v / size) * size;
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket).push((num(p.yieldG) / num(p.chargeG)) * 100);
  }
  return map;
}

function rankBuckets(map) {
  return [...map.entries()]
    .map(([x, vals]) => ({ x, n: vals.length, avg: avg(vals) }))
    .filter((g) => g.n >= 2)
    .sort((a, b) => b.avg - a.avg);
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

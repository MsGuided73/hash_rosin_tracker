// Analytics engine.
//
// Two data sources, one shape:
//  - computeLocalAnalytics(batches): derives every stat from the local batch
//    list (works offline, powers the "MY DATA" view)
//  - fetchNetworkAnalytics(): calls the cross-user aggregate RPCs in Supabase
//    (anonymized aggregates across every contributor — the "NETWORK" view)
import { getSupabase, ensureSession } from './supabase.js';

const G_PER_LB = 453.592;

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const round = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
const sum = (arr) => arr.reduce((s, v) => s + (v || 0), 0);

// ─────────── batch derivations (shared by several sections) ───────────
export function deriveBatch(b) {
  const bags = Object.values(b.bags || {});
  const totalDryG = sum(bags.map((x) => num(x.dry)));
  const totalWetG = sum(bags.map((x) => num(x.wet)));
  const totalRosinG = sum((b.presses || []).map((p) => num(p.yieldG)));
  const inputG = num(b.inputG);
  const costCents =
    b.costPerLb != null && inputG ? Math.round((Number(b.costPerLb) * 100 * inputG) / G_PER_LB) : null;
  return {
    ...b,
    totalDryG,
    totalWetG,
    totalRosinG,
    costCents,
    hashYieldPct: inputG > 0 && totalDryG > 0 ? (totalDryG / inputG) * 100 : null,
    rosinReturnPct: totalDryG > 0 && totalRosinG > 0 ? (totalRosinG / totalDryG) * 100 : null,
  };
}

// ─────────── local compute ───────────
export function computeLocalAnalytics(batches) {
  const all = batches.map(deriveBatch);
  const done = all.filter((b) => b.stage === 'done');
  const presses = all.flatMap((b) =>
    (b.presses || [])
      .map((p) => ({ ...p, strain: b.strain }))
      .filter((p) => num(p.chargeG) > 0 && num(p.yieldG) != null),
  );

  const overview = {
    batchCount: done.length,
    activeCount: all.filter((b) => b.stage !== 'done' && b.stage !== 'archived').length,
    contributorCount: null, // n/a for local data
    farmCount: new Set(done.map((b) => b.farm).filter(Boolean)).size,
    strainCount: new Set(done.map((b) => b.strain).filter(Boolean)).size,
    totalInputG: sum(done.map((b) => num(b.inputG))),
    totalHashG: sum(done.map((b) => b.totalDryG)),
    totalRosinG: sum(done.map((b) => b.totalRosinG)),
    avgHashYieldPct: round(avg(done.map((b) => b.hashYieldPct).filter((v) => v != null))),
    avgRosinReturnPct: round(avg(done.map((b) => b.rosinReturnPct).filter((v) => v != null))),
    totalCostCents: sum(done.map((b) => b.costCents)),
  };

  // strain leaderboard
  const byStrain = groupBy(done.filter((b) => b.strain), (b) => b.strain);
  const strains = Object.entries(byStrain)
    .map(([strain, list]) => {
      const rosin = sum(list.map((b) => b.totalRosinG));
      const cost = sum(list.map((b) => b.costCents));
      const melts = list.flatMap((b) =>
        Object.values(b.bags || {}).map((x) => num(x.melt)).filter((m) => m > 0),
      );
      return {
        strain,
        batchCount: list.length,
        totalInputG: sum(list.map((b) => num(b.inputG))),
        totalHashG: sum(list.map((b) => b.totalDryG)),
        totalRosinG: rosin,
        avgHashYieldPct: round(avg(list.map((b) => b.hashYieldPct).filter((v) => v != null))),
        avgRosinReturnPct: round(avg(list.map((b) => b.rosinReturnPct).filter((v) => v != null))),
        avgMelt: round(avg(melts)),
        avgCostPerRosinGCents: rosin > 0 && cost > 0 ? Math.round(cost / rosin) : null,
      };
    })
    .sort((a, b) => (b.avgRosinReturnPct ?? -1) - (a.avgRosinReturnPct ?? -1));

  // press temp / pressure buckets
  const tempBuckets = bucketPresses(presses, (p) => num(p.tempF), 5).map(mapBucket('tempBucket'));
  const pressureBuckets = bucketPresses(presses, (p) => num(p.pressurePsi), 100).map(
    mapBucket('psiBucket'),
  );

  // temp × pressure grid
  const gridMap = new Map();
  for (const p of presses) {
    const t = num(p.tempF);
    const psi = num(p.pressurePsi);
    if (t == null || psi == null) continue;
    const key = `${Math.floor(t / 10) * 10}|${Math.floor(psi / 200) * 200}`;
    if (!gridMap.has(key)) gridMap.set(key, []);
    gridMap.get(key).push((num(p.yieldG) / num(p.chargeG)) * 100);
  }
  const grid = [...gridMap.entries()].map(([key, vals]) => {
    const [t, psi] = key.split('|').map(Number);
    return { tempBucket: t, psiBucket: psi, pressCount: vals.length, avgReturnPct: round(avg(vals)) };
  });

  // farms
  const byFarm = groupBy(done.filter((b) => b.farm), (b) => b.farm);
  const farms = Object.entries(byFarm)
    .map(([farm, list]) => {
      const rosin = sum(list.map((b) => b.totalRosinG));
      const cost = sum(list.map((b) => b.costCents));
      return {
        farm,
        location: list.find((b) => b.location)?.location || null,
        growType: list.find((b) => b.growType)?.growType || null,
        batchCount: list.length,
        strainCount: new Set(list.map((b) => b.strain).filter(Boolean)).size,
        totalInputG: sum(list.map((b) => num(b.inputG))),
        totalRosinG: rosin,
        avgHashYieldPct: round(avg(list.map((b) => b.hashYieldPct).filter((v) => v != null))),
        avgRosinReturnPct: round(avg(list.map((b) => b.rosinReturnPct).filter((v) => v != null))),
        avgCostPerLbCents: round(avg(list.map((b) => num(b.costPerLb)).filter((v) => v != null)) * 100, 0),
        avgCostPerRosinGCents: rosin > 0 && cost > 0 ? Math.round(cost / rosin) : null,
      };
    })
    .sort((a, b) => (b.avgRosinReturnPct ?? -1) - (a.avgRosinReturnPct ?? -1));

  // micron bands
  const bandMap = new Map();
  for (const b of all) {
    for (const [band, bag] of Object.entries(b.bags || {})) {
      if (!bandMap.has(band)) bandMap.set(band, { dry: [], melt: [], color: [] });
      const e = bandMap.get(band);
      if (num(bag.dry) != null) e.dry.push(num(bag.dry));
      if (num(bag.melt) > 0) e.melt.push(num(bag.melt));
      if (num(bag.color) != null) e.color.push(num(bag.color));
    }
  }
  const micronBands = [...bandMap.entries()].map(([bandId, e]) => ({
    bandId,
    bagCount: e.dry.length,
    totalDryG: round(sum(e.dry), 1),
    avgMelt: round(avg(e.melt)),
    avgColor: round(avg(e.color)),
  }));

  // monthly trend
  const byMonth = groupBy(done, (b) => {
    const d = new Date(b.pressDate || b.startedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthly = Object.entries(byMonth)
    .map(([month, list]) => ({
      month,
      batchCount: list.length,
      totalInputG: sum(list.map((b) => num(b.inputG))),
      totalRosinG: round(sum(list.map((b) => b.totalRosinG)), 1),
      avgReturnPct: round(avg(list.map((b) => b.rosinReturnPct).filter((v) => v != null))),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // wash water temp → hash yield
  const waterMap = new Map();
  for (const b of done) {
    const lo = num(b.wash?.waterTempLoF);
    const hi = num(b.wash?.waterTempHiF);
    if (lo == null || hi == null || b.hashYieldPct == null) continue;
    const bucket = Math.floor((lo + hi) / 2 / 2) * 2;
    if (!waterMap.has(bucket)) waterMap.set(bucket, []);
    waterMap.get(bucket).push(b.hashYieldPct);
  }
  const waterTempBuckets = [...waterMap.entries()]
    .map(([bucket, vals]) => ({
      waterTempBucket: bucket,
      batchCount: vals.length,
      avgHashYieldPct: round(avg(vals)),
    }))
    .sort((a, b) => a.waterTempBucket - b.waterTempBucket);

  return { overview, strains, tempBuckets, pressureBuckets, grid, farms, micronBands, monthly, waterTempBuckets };
}

function groupBy(arr, keyFn) {
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] = out[k] || []).push(item);
  }
  return out;
}

function bucketPresses(presses, valFn, size) {
  const map = new Map();
  for (const p of presses) {
    const v = valFn(p);
    if (v == null) continue;
    const bucket = Math.floor(v / size) * size;
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket).push({ ret: (num(p.yieldG) / num(p.chargeG)) * 100, yield: num(p.yieldG) });
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

const mapBucket = (name) => ([bucket, vals]) => ({
  [name]: bucket,
  pressCount: vals.length,
  avgReturnPct: round(avg(vals.map((v) => v.ret))),
  totalYieldG: round(sum(vals.map((v) => v.yield)), 1),
});

// ─────────── network fetch (cross-user aggregates) ───────────
export async function fetchNetworkAnalytics() {
  await ensureSession();
  const sb = getSupabase();

  const call = async (fn) => {
    const { data, error } = await sb.rpc(fn);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data;
  };

  const [overviewRaw, strains, temp, pressure, grid, farms, bands, monthly, water] =
    await Promise.all([
      call('analytics_overview'),
      call('analytics_strains'),
      call('analytics_temp_buckets'),
      call('analytics_pressure_buckets'),
      call('analytics_temp_pressure_grid'),
      call('analytics_farms'),
      call('analytics_micron_bands'),
      call('analytics_monthly'),
      call('analytics_water_temp_buckets'),
    ]);

  return {
    overview: {
      batchCount: overviewRaw.batch_count,
      activeCount: overviewRaw.active_count,
      contributorCount: overviewRaw.contributor_count,
      farmCount: overviewRaw.farm_count,
      strainCount: overviewRaw.strain_count,
      totalInputG: num(overviewRaw.total_input_g),
      totalHashG: num(overviewRaw.total_hash_g),
      totalRosinG: num(overviewRaw.total_rosin_g),
      avgHashYieldPct: num(overviewRaw.avg_hash_yield_pct),
      avgRosinReturnPct: num(overviewRaw.avg_rosin_return_pct),
      totalCostCents: num(overviewRaw.total_cost_cents),
    },
    strains: strains.map((s) => ({
      strain: s.strain,
      batchCount: Number(s.batch_count),
      contributorCount: Number(s.contributor_count),
      totalInputG: num(s.total_input_g),
      totalHashG: num(s.total_hash_g),
      totalRosinG: num(s.total_rosin_g),
      avgHashYieldPct: num(s.avg_hash_yield_pct),
      avgRosinReturnPct: num(s.avg_rosin_return_pct),
      avgMelt: num(s.avg_melt),
      avgCostPerRosinGCents: num(s.avg_cost_per_rosin_g_cents),
    })),
    tempBuckets: temp.map((r) => ({
      tempBucket: r.temp_bucket,
      pressCount: Number(r.press_count),
      avgReturnPct: num(r.avg_return_pct),
      totalYieldG: num(r.total_yield_g),
    })),
    pressureBuckets: pressure.map((r) => ({
      psiBucket: r.psi_bucket,
      pressCount: Number(r.press_count),
      avgReturnPct: num(r.avg_return_pct),
      totalYieldG: num(r.total_yield_g),
    })),
    grid: grid.map((r) => ({
      tempBucket: r.temp_bucket,
      psiBucket: r.psi_bucket,
      pressCount: Number(r.press_count),
      avgReturnPct: num(r.avg_return_pct),
    })),
    farms: farms.map((f) => ({
      farm: f.farm,
      location: f.location,
      growType: f.grow_type,
      batchCount: Number(f.batch_count),
      strainCount: Number(f.strain_count),
      totalInputG: num(f.total_input_g),
      totalRosinG: num(f.total_rosin_g),
      avgHashYieldPct: num(f.avg_hash_yield_pct),
      avgRosinReturnPct: num(f.avg_rosin_return_pct),
      avgCostPerLbCents: num(f.avg_cost_per_lb_cents),
      avgCostPerRosinGCents: num(f.avg_cost_per_rosin_g_cents),
    })),
    micronBands: bands.map((r) => ({
      bandId: r.band_id,
      bagCount: Number(r.bag_count),
      totalDryG: num(r.total_dry_g),
      avgMelt: num(r.avg_melt),
      avgColor: num(r.avg_color),
    })),
    monthly: monthly.map((r) => ({
      month: String(r.month).slice(0, 7),
      batchCount: Number(r.batch_count),
      totalInputG: num(r.total_input_g),
      totalRosinG: num(r.total_rosin_g),
      avgReturnPct: num(r.avg_return_pct),
    })),
    waterTempBuckets: water.map((r) => ({
      waterTempBucket: r.water_temp_bucket,
      batchCount: Number(r.batch_count),
      avgHashYieldPct: num(r.avg_hash_yield_pct),
    })),
  };
}

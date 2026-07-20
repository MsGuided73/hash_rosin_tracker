// Analytics — the heart of the app.
//
// Two lenses on the same dashboard:
//   MY DATA  — computed locally from this device's batches (works offline)
//   NETWORK  — anonymized aggregates across every contributor, pulled from
//              the Supabase analytics RPCs (all growers, all devices)
//
// Sections: KPIs · Economics/ROI · Press Lab (temp, pressure, temp×pressure)
// · Wash Lab · Strain leaderboard · Growers · Micron bands · Monthly trend.
import React from 'react';
import { MicronTokens, MicronBands } from '../lib/tokens.js';
import { Icon, Segmented } from '../components/primitives.jsx';
import { computeLocalAnalytics, fetchNetworkAnalytics } from '../lib/analytics.js';
import { subscribeSync } from '../lib/sync.js';
import { KpiTile, BucketBars, HeatGrid, LeaderBar, EmptyNote } from '../components/charts.jsx';

const { useState, useEffect, useMemo } = React;

const PRICE_KEY = 'micron-market-price-g';

export function AnalyticsScreen({ batches, theme, onBack }) {
  const t = MicronTokens[theme];
  const [source, setSource] = useState('mine');
  const [network, setNetwork] = useState({ status: 'idle', data: null, error: null });
  const [priceG, setPriceG] = useState(() => Number(localStorage.getItem(PRICE_KEY)) || 25);
  const [sync, setSync] = useState({ status: 'idle' });

  useEffect(() => subscribeSync(setSync), []);
  useEffect(() => { localStorage.setItem(PRICE_KEY, String(priceG)); }, [priceG]);

  const local = useMemo(() => computeLocalAnalytics(batches), [batches]);

  useEffect(() => {
    if (source !== 'network' || network.status === 'loading' || network.data) return;
    let cancelled = false;
    setNetwork({ status: 'loading', data: null, error: null });
    fetchNetworkAnalytics()
      .then((data) => !cancelled && setNetwork({ status: 'ready', data, error: null }))
      .catch((err) =>
        !cancelled && setNetwork({ status: 'error', data: null, error: err.message || String(err) }),
      );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const a = source === 'network' ? network.data : local;
  const hasDemo = source === 'mine' && batches.some((b) => b.demo);

  const sectionCard = {
    padding: 18,
    borderRadius: t.cardRadius ?? 16,
    background: t.bgElevatedGrad || t.bgElevated,
    border: `1px solid ${t.line}`,
    boxShadow: t.innerHi || 'none',
    minWidth: 0,
  };
  const sectionLabel = {
    fontFamily: t.fontMono,
    fontSize: 10,
    color: t.textDim,
    letterSpacing: 2,
    marginBottom: 12,
  };

  return (
    <div
      style={{
        background: t.bgGradient || t.bg,
        height: '100%',
        color: t.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* header */}
      <div
        style={{
          padding: '54px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: 999, border: `1px solid ${t.line}`,
            background: t.bgElevated, color: t.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Icon.chevL width={16} height={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.accent, letterSpacing: 2 }}>
            PRODUCTION INTELLIGENCE
          </div>
          <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            Analytics
          </div>
        </div>
        <Segmented
          options={[
            { value: 'mine', label: 'MY DATA' },
            { value: 'network', label: 'NETWORK' },
          ]}
          value={source}
          onChange={setSource}
        />
      </div>

      {/* scroll body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '18px 16px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* status strip */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusChip t={t} sync={sync} />
            {hasDemo && (
              <Chip t={t}>
                INCLUDES DEMO BATCHES — DEMO DATA IS NEVER UPLOADED
              </Chip>
            )}
            {source === 'network' && a?.overview?.contributorCount != null && (
              <Chip t={t} accent>
                {a.overview.contributorCount} CONTRIBUTOR{a.overview.contributorCount === 1 ? '' : 'S'} · ANONYMIZED
              </Chip>
            )}
          </div>

          {source === 'network' && network.status === 'loading' && (
            <div style={sectionCard}><EmptyNote t={t}>FETCHING NETWORK AGGREGATES…</EmptyNote></div>
          )}
          {source === 'network' && network.status === 'error' && (
            <div style={sectionCard}>
              <EmptyNote t={t}>OFFLINE — COULD NOT REACH THE NETWORK DATABASE</EmptyNote>
              <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, textAlign: 'center' }}>
                {network.error}
              </div>
            </div>
          )}

          {a && (
            <>
              {/* KPI grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 10,
                }}
              >
                <KpiTile t={t} label="FINISHED BATCHES" value={a.overview.batchCount} sub={`${a.overview.activeCount} in progress`} />
                <KpiTile t={t} label="MATERIAL WASHED" value={(a.overview.totalInputG / 1000).toFixed(1)} unit="kg" />
                <KpiTile t={t} label="HASH PULLED" value={fmtG(a.overview.totalHashG)} unit="g" sub={pctLabel(a.overview.avgHashYieldPct, 'avg wash yield')} />
                <KpiTile t={t} label="ROSIN PRESSED" value={fmtG(a.overview.totalRosinG)} unit="g" accent sub={pctLabel(a.overview.avgRosinReturnPct, 'avg press return')} />
                <KpiTile t={t} label="STRAINS" value={a.overview.strainCount} sub={`${a.overview.farmCount} farms`} />
                {a.overview.contributorCount != null && (
                  <KpiTile t={t} label="CONTRIBUTORS" value={a.overview.contributorCount} sub="devices reporting" />
                )}
              </div>

              {/* Economics / ROI */}
              <Economics t={t} a={a} priceG={priceG} setPriceG={setPriceG} card={sectionCard} label={sectionLabel} />

              {/* Press lab */}
              <div style={sectionCard}>
                <div style={sectionLabel}>PRESS LAB · TEMPERATURE VS RETURN</div>
                <IdealCallout t={t} buckets={a.tempBuckets} unitLabel="°F" xKey="tempBucket" span={5} />
                <BucketBars
                  t={t}
                  data={a.tempBuckets.map((b) => ({ x: b.tempBucket, value: b.avgReturnPct, count: b.pressCount }))}
                  xUnit="°"
                  bestX={bestBucket(a.tempBuckets, 'tempBucket')}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 14,
                }}
              >
                <div style={sectionCard}>
                  <div style={sectionLabel}>PRESSURE VS RETURN</div>
                  <IdealCallout t={t} buckets={a.pressureBuckets} unitLabel="PSI" xKey="psiBucket" span={100} />
                  <BucketBars
                    t={t}
                    data={a.pressureBuckets.map((b) => ({ x: b.psiBucket, value: b.avgReturnPct, count: b.pressCount }))}
                    bestX={bestBucket(a.pressureBuckets, 'psiBucket')}
                  />
                </div>
                <div style={sectionCard}>
                  <div style={sectionLabel}>WASH LAB · WATER TEMP VS HASH YIELD</div>
                  <BucketBars
                    t={t}
                    data={a.waterTempBuckets.map((b) => ({ x: b.waterTempBucket, value: b.avgHashYieldPct, count: b.batchCount }))}
                    xUnit="°"
                    bestX={bestBucket(a.waterTempBuckets, 'waterTempBucket', 'avgHashYieldPct', 'batchCount')}
                  />
                </div>
              </div>

              <div style={sectionCard}>
                <div style={sectionLabel}>RECIPE MAP · TEMP × PRESSURE → AVG RETURN</div>
                <HeatGrid t={t} grid={a.grid} />
              </div>

              {/* Strain leaderboard */}
              <div style={sectionCard}>
                <div style={sectionLabel}>STRAIN LEADERBOARD · BY PRESS RETURN</div>
                {a.strains.length === 0 && <EmptyNote t={t} />}
                {a.strains.slice(0, 12).map((s) => (
                  <LeaderBar
                    key={s.strain}
                    t={t}
                    label={s.strain}
                    sub={`${s.batchCount} batch${s.batchCount === 1 ? '' : 'es'} · ${fmtG(s.totalRosinG)}g rosin${s.avgMelt ? ` · melt ${s.avgMelt}` : ''}`}
                    value={s.avgRosinReturnPct}
                    max={Math.max(...a.strains.map((x) => x.avgRosinReturnPct ?? 0))}
                    display={s.avgRosinReturnPct != null ? `${s.avgRosinReturnPct.toFixed(1)}%` : '—'}
                  />
                ))}
              </div>

              {/* Growers */}
              <div style={sectionCard}>
                <div style={sectionLabel}>GROWERS · QUALITY & COST</div>
                {a.farms.length === 0 && <EmptyNote t={t}>NO FARMS TAGGED YET</EmptyNote>}
                {a.farms.map((f) => (
                  <LeaderBar
                    key={f.farm}
                    t={t}
                    label={f.farm}
                    sub={[f.location, f.growType, `${f.batchCount} batches`].filter(Boolean).join(' · ')}
                    value={f.avgHashYieldPct}
                    max={Math.max(...a.farms.map((x) => x.avgHashYieldPct ?? 0))}
                    display={`${f.avgHashYieldPct != null ? f.avgHashYieldPct.toFixed(1) + '% wash' : '—'}${
                      f.avgCostPerRosinGCents != null ? ` · $${(f.avgCostPerRosinGCents / 100).toFixed(2)}/g` : ''
                    }`}
                    color={t.bands['120-159']}
                  />
                ))}
              </div>

              {/* Micron bands + trend */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 14,
                }}
              >
                <div style={sectionCard}>
                  <div style={sectionLabel}>MICRON BANDS · WHERE THE HASH LIVES</div>
                  <MicronSplit t={t} bands={a.micronBands} />
                </div>
                <div style={sectionCard}>
                  <div style={sectionLabel}>MONTHLY ROSIN OUTPUT</div>
                  <BucketBars
                    t={t}
                    data={a.monthly.map((m) => ({ x: m.month.slice(2), value: m.totalRosinG, count: m.batchCount }))}
                    unit="g"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── economics / ROI ───────────
function Economics({ t, a, priceG, setPriceG, card, label }) {
  const o = a.overview;
  const costUsd = (o.totalCostCents || 0) / 100;
  const revenue = (o.totalRosinG || 0) * priceG;
  const profit = revenue - costUsd;
  const roiPct = costUsd > 0 ? (profit / costUsd) * 100 : null;
  const costPerG = o.totalRosinG > 0 && costUsd > 0 ? costUsd / o.totalRosinG : null;
  const profitPerKg = o.totalInputG > 0 ? profit / (o.totalInputG / 1000) : null;

  return (
    <div style={card}>
      <div style={label}>ECONOMICS · BIOMASS COST → ROSIN VALUE</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <KpiTile t={t} label="BIOMASS SPEND" value={fmtMoney(costUsd)} />
        <KpiTile t={t} label="COST PER G ROSIN" value={costPerG != null ? fmtMoney(costPerG) : '—'} />
        <KpiTile t={t} label={`VALUE @ $${priceG}/G`} value={fmtMoney(revenue)} />
        <KpiTile t={t} label="MARGIN" value={roiPct != null ? `${roiPct.toFixed(0)}%` : '—'} accent sub={profitPerKg != null ? `${fmtMoney(profitPerKg)} profit / kg washed` : undefined} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          MARKET PRICE
        </span>
        <input
          type="range"
          min="5"
          max="80"
          step="1"
          value={priceG}
          onChange={(e) => setPriceG(Number(e.target.value))}
          style={{ flex: 1, accentColor: t.accent }}
        />
        <span style={{ fontFamily: t.fontLcd || t.fontMono, fontSize: 15, fontWeight: 700, color: t.accent, whiteSpace: 'nowrap' }}>
          ${priceG}/g
        </span>
      </div>
    </div>
  );
}

// ─────────── helpers ───────────
function bestBucket(buckets, xKey, valKey = 'avgReturnPct', countKey = 'pressCount') {
  if (!buckets?.length) return null;
  const qualified = buckets.filter((b) => (b[countKey] ?? 0) >= 2 && b[valKey] != null);
  const pool = qualified.length ? qualified : buckets.filter((b) => b[valKey] != null);
  if (!pool.length) return null;
  return pool.reduce((a, b) => (b[valKey] > a[valKey] ? b : a))[xKey];
}

function IdealCallout({ t, buckets, unitLabel, xKey, span }) {
  const best = bestBucket(buckets, xKey);
  if (best == null) return null;
  const row = buckets.find((b) => b[xKey] === best);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: t.accentSoft,
        border: `1px solid ${t.accent}44`,
        marginBottom: 4,
      }}
    >
      <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textMuted, letterSpacing: 1 }}>
        SWEET SPOT
      </span>
      <span style={{ fontFamily: t.fontLcd || t.fontMono, fontSize: 13, fontWeight: 700, color: t.accent }}>
        {best}–{best + span} {unitLabel}
      </span>
      <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMuted }}>
        {row.avgReturnPct?.toFixed(1)}% avg · {row.pressCount ?? row.batchCount} runs
      </span>
    </div>
  );
}

function MicronSplit({ t, bands }) {
  const ordered = MicronBands.map((b) => bands.find((x) => x.bandId === b.id)).filter(Boolean);
  const total = ordered.reduce((s, b) => s + (b.totalDryG || 0), 0);
  if (!total) return <EmptyNote t={t} />;
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        {ordered.map((b) => (
          <div
            key={b.bandId}
            style={{ width: `${((b.totalDryG || 0) / total) * 100}%`, background: t.bands[b.bandId], minWidth: 3 }}
            title={`${b.bandId}µ — ${b.totalDryG}g`}
          />
        ))}
      </div>
      {ordered.map((b) => (
        <div
          key={b.bandId}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 0', borderBottom: `1px solid ${t.line}`,
            fontFamily: t.fontMono, fontSize: 11,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: t.bands[b.bandId], flexShrink: 0 }} />
          <span style={{ color: t.text, width: 68 }}>{b.bandId}µ</span>
          <span style={{ color: t.textMuted, flex: 1 }}>{(((b.totalDryG || 0) / total) * 100).toFixed(1)}%</span>
          <span style={{ color: t.textDim }}>{fmtG(b.totalDryG)}g</span>
          <span style={{ color: b.avgMelt >= 5 ? t.accent : t.textDim, width: 70, textAlign: 'right' }}>
            {b.avgMelt != null ? `melt ${b.avgMelt}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusChip({ t, sync }) {
  const map = {
    idle: { label: 'AUTO-SAVE READY', color: t.textDim },
    syncing: { label: 'SAVING TO CLOUD…', color: t.accent },
    synced: { label: 'ALL DATA SAVED', color: t.success },
    offline: { label: 'OFFLINE — SAVED LOCALLY, WILL RETRY', color: t.danger },
  };
  const s = map[sync.status] || map.idle;
  return (
    <Chip t={t}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.color, display: 'inline-block', marginRight: 7 }} />
      <span style={{ color: s.color }}>{s.label}</span>
    </Chip>
  );
}

function Chip({ t, children, accent }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 11px',
        borderRadius: 999,
        border: `1px solid ${accent ? t.accent + '44' : t.line}`,
        background: accent ? t.accentSoft : t.bgElevated,
        fontFamily: t.fontMono,
        fontSize: 9,
        letterSpacing: 1,
        color: accent ? t.accent : t.textDim,
      }}
    >
      {children}
    </span>
  );
}

const fmtG = (v) => (v == null ? '—' : Number(v) >= 1000 ? (v / 1000).toFixed(2) + 'k' : Number(v).toFixed(1));
const fmtMoney = (usd) =>
  usd == null
    ? '—'
    : usd >= 10000
      ? `$${(usd / 1000).toFixed(1)}k`
      : `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctLabel = (v, text) => (v != null ? `${v.toFixed(1)}% ${text}` : undefined);

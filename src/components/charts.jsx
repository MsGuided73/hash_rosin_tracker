// Lightweight themed chart primitives for the Analytics dashboard.
// Pure SVG/CSS — no chart library, matches the Hashashin industrial look.
import React from 'react';

export function KpiTile({ label, value, unit, sub, t, accent }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: t.cardRadius ?? 14,
        background: t.bgElevatedGrad || t.bgElevated,
        border: `1px solid ${t.line}`,
        boxShadow: t.innerHi || 'none',
        minWidth: 0,
      }}
    >
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1.5 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: t.fontLcd || t.fontMono,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: -0.5,
          marginTop: 6,
          color: accent ? t.accent : t.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 4, fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: t.fontMono,
            fontSize: 10,
            color: t.textDim,
            marginTop: 4,
            letterSpacing: 0.5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// Vertical bucket bars (temp bins, PSI bins, monthly trend…).
// data: [{ x, value, count }] — bar height ∝ value, best bar highlighted.
export function BucketBars({ data, t, unit = '%', xUnit = '', height = 132, bestX = null }) {
  if (!data.length) return <EmptyNote t={t} />;
  const max = Math.max(...data.map((d) => d.value ?? 0), 0.001);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingTop: 16 }}>
      {data.map((d) => {
        const best = bestX != null && d.x === bestX;
        const h = Math.max(4, ((d.value ?? 0) / max) * (height - 42));
        return (
          <div
            key={d.x}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: t.fontMono,
                fontSize: 9,
                color: best ? t.accent : t.textMuted,
                fontWeight: best ? 700 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {d.value == null ? '—' : d.value.toFixed(1)}
              {unit}
            </div>
            <div
              style={{
                width: '100%',
                maxWidth: 44,
                height: h,
                borderRadius: 3,
                background: best
                  ? t.accentGrad || t.accent
                  : `linear-gradient(180deg, ${t.bands['90-119']}AA 0%, ${t.bands['90-119']}55 100%)`,
                boxShadow: best ? `0 0 12px ${t.accentSoft}` : 'none',
              }}
              title={`${d.count} presses`}
            />
            <div
              style={{
                fontFamily: t.fontMono,
                fontSize: 9,
                color: best ? t.accent : t.textDim,
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {d.x}
              {xUnit}
            </div>
            <div style={{ fontFamily: t.fontMono, fontSize: 8, color: t.textDim }}>
              n={d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Temp × pressure heatmap. Cell tone scales with avg return %.
export function HeatGrid({ grid, t }) {
  if (!grid.length) return <EmptyNote t={t} />;
  const temps = [...new Set(grid.map((g) => g.tempBucket))].sort((a, b) => a - b);
  const psis = [...new Set(grid.map((g) => g.psiBucket))].sort((a, b) => a - b);
  const byKey = new Map(grid.map((g) => [`${g.tempBucket}|${g.psiBucket}`, g]));
  const vals = grid.map((g) => g.avgReturnPct).filter((v) => v != null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const best = grid.reduce((a, b) => ((b.avgReturnPct ?? -1) > (a?.avgReturnPct ?? -1) ? b : a), null);

  const cell = 46;
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `56px repeat(${temps.length}, ${cell}px)`,
          gap: 3,
          width: 'max-content',
        }}
      >
        <div />
        {temps.map((tp) => (
          <div
            key={tp}
            style={{
              fontFamily: t.fontMono,
              fontSize: 9,
              color: t.textDim,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {tp}°F
          </div>
        ))}
        {[...psis].reverse().map((psi) => (
          <React.Fragment key={psi}>
            <div
              style={{
                fontFamily: t.fontMono,
                fontSize: 9,
                color: t.textDim,
                display: 'flex',
                alignItems: 'center',
                letterSpacing: 0.5,
              }}
            >
              {psi} PSI
            </div>
            {temps.map((tp) => {
              const g = byKey.get(`${tp}|${psi}`);
              if (!g || g.avgReturnPct == null) {
                return (
                  <div
                    key={tp}
                    style={{
                      height: cell,
                      borderRadius: 4,
                      background: t.bgElevated2,
                      opacity: 0.35,
                    }}
                  />
                );
              }
              const f = hi > lo ? (g.avgReturnPct - lo) / (hi - lo) : 1;
              const isBest = best && g === best;
              return (
                <div
                  key={tp}
                  title={`${tp}°F × ${psi} PSI · ${g.avgReturnPct}% avg · ${g.pressCount} presses`}
                  style={{
                    height: cell,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `color-mix(in oklab, ${t.accent} ${Math.round(12 + f * 78)}%, ${t.bgElevated2})`,
                    outline: isBest ? `2px solid ${t.accent}` : 'none',
                    outlineOffset: -2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: t.fontMono,
                      fontSize: 11,
                      fontWeight: 700,
                      color: f > 0.55 ? t.accentInk : t.text,
                    }}
                  >
                    {g.avgReturnPct.toFixed(0)}%
                  </span>
                  <span
                    style={{
                      fontFamily: t.fontMono,
                      fontSize: 8,
                      color: f > 0.55 ? t.accentInk : t.textDim,
                    }}
                  >
                    n={g.pressCount}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Horizontal leaderboard bar.
export function LeaderBar({ label, sub, value, max, display, t, color }) {
  const pct = max > 0 ? Math.max(2, ((value ?? 0) / max) * 100) : 0;
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              fontFamily: t.fontSans,
              fontSize: 13,
              fontWeight: 600,
              color: t.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          {sub && (
            <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, marginLeft: 8 }}>
              {sub}
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: t.fontMono,
            fontSize: 12,
            fontWeight: 700,
            color: color || t.accent,
            whiteSpace: 'nowrap',
          }}
        >
          {display}
        </span>
      </div>
      <div
        style={{
          height: 4,
          marginTop: 6,
          borderRadius: 2,
          background: t.bgElevated2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: color || t.accentGrad || t.accent,
          }}
        />
      </div>
    </div>
  );
}

export function EmptyNote({ t, children }) {
  return (
    <div
      style={{
        fontFamily: t.fontMono,
        fontSize: 11,
        color: t.textDim,
        letterSpacing: 0.5,
        padding: '18px 0',
        textAlign: 'center',
      }}
    >
      {children || 'NO DATA YET — RUN SOME BATCHES'}
    </div>
  );
}

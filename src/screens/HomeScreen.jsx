import React from 'react';
import { MicronTokens, MicronBands } from '../lib/tokens.js';
import { Icon, Segmented, formatG } from '../components/primitives.jsx';
// Home screen — batch list + create new.
const { useState: useStateH } = React;

export function HomeScreen({ batches, onOpen, onCreate, unit, theme }) {
  const t = MicronTokens[theme];
  const [filter, setFilter] = useStateH('all');
  const active = batches.find((b) => b.stage !== 'done');
  const list = filter === 'active' ?
  batches.filter((b) => b.stage !== 'done') :
  filter === 'done' ?
  batches.filter((b) => b.stage === 'done') :
  batches;

  // all-time stats
  const done = batches.filter((b) => b.stage === 'done');
  const totalInput = done.reduce((s, b) => s + b.inputG, 0);
  const totalRosin = done.reduce((s, b) => s + b.presses.reduce((x, p) => x + (p.yieldG || 0), 0), 0);
  const yieldPct = totalInput ? totalRosin / totalInput * 100 : 0;

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '64px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 2 }, color: "rgba(248, 124, 13, 0.87)" }}>
            ICE WATER HASH · SOLVENTLESS
          </div>
          <div style={{ fontFamily: t.fontSans, fontSize: 32, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>HASH LAB

          </div>
        </div>
        <button onClick={() => window.__onTweak && window.__onTweak()}
        style={{
          width: 40, height: 40, borderRadius: 999, border: `1px solid ${t.line}`,
          background: t.bgElevated, color: t.textMuted,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}><Icon.settings width={18} height={18} /></button>
      </div>

      {/* scroll region */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 20 }}>

      {/* active batch card (hero) */}
      {active &&
        <div onClick={() => onOpen(active.id)} className="mi-card" style={{
          margin: '6px 16px 18px', padding: 20, borderRadius: 20,
          background: t.hl ? (t.bgElevatedGrad || t.bgElevated) :
          t.name !== 'light' ?
          `linear-gradient(155deg, #2A303B 0%, #1A1E25 48%, #11141A 100%)` :
          `linear-gradient(135deg, ${t.bgElevated} 0%, ${t.bgElevated2} 100%)`,
          border: `1px solid ${t.line}`,
          boxShadow: t.hl ? t.innerHi : t.name !== 'light' ?
          'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6), 0 14px 30px rgba(0,0,0,0.4)' :
          '0 4px 14px rgba(0,0,0,0.08)',
          cursor: 'pointer', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 999,
            background: `radial-gradient(circle, ${t.accentSoft} 0%, transparent 70%)`
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: 999, background: t.accent,
              boxShadow: `0 0 0 4px ${t.accentSoft}`,
              animation: 'micron-fade 1s ease infinite alternate'
            }} className="mi-live" />
            <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.accent, letterSpacing: 2, fontWeight: 600 }}>
              IN PROGRESS · {active.stage.toUpperCase()}
            </span>
          </div>
          <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
            {active.strain}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, color: t.textMuted, fontFamily: t.fontMono, fontSize: 12 }}>
            <span>{active.id}</span>
            <span>·</span>
            <span>{formatG(active.inputG, unit)} {unit} input</span>
          </div>
          {/* bag strip */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {MicronBands.map((b) => {
              const bag = active.bags[b.id];
              const filled = (bag.dry ?? bag.wet) != null;
              return (
                <div key={b.id} style={{
                  flex: 1, height: 40, borderRadius: 8, position: 'relative',
                  background: filled ? t.bands[b.id] + '22' : t.bgElevated2,
                  border: `1px solid ${filled ? t.bands[b.id] + '44' : t.line}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  paddingLeft: 8
                }}>
                  <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim }}>{b.short}</div>
                  <div style={{
                    fontFamily: t.fontMono, fontSize: 12, fontWeight: 600,
                    color: filled ? t.bands[b.id] : t.textDim
                  }}>{filled ? formatG(bag.dry ?? bag.wet, unit) : '—'}</div>
                </div>);

            })}
          </div>
          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted }}>
              Continue where you left off →
            </div>
            <div style={{
              background: t.accent, color: t.accentInk, padding: '8px 14px',
              borderRadius: 999, fontFamily: t.fontSans, fontSize: 13, fontWeight: 600
            }}>Resume</div>
          </div>
        </div>
        }

      {/* 30-day stats */}
      <div className="mi-card" style={{
          margin: '0 16px 20px', padding: 16, borderRadius: 16,
          background: t.bgElevatedGrad || t.bgElevated, border: `1px solid ${t.line}`,
          boxShadow: t.innerHi || 'none'
        }}>
        <div style={{
            fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 2, marginBottom: 10
          }}>LAST 30 DAYS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'BATCHES', val: done.length, unit: '' },
            { label: 'MATERIAL', val: (totalInput / 1000).toFixed(1), unit: 'kg' },
            { label: 'ROSIN', val: totalRosin.toFixed(1), unit: 'g' }].
            map((s, i) =>
            <div key={i}>
              <div style={{
                fontFamily: t.fontMono, fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: -1
              }}>
                {s.val}<span style={{ fontSize: 12, color: t.textMuted, marginLeft: 3 }}>{s.unit}</span>
              </div>
              <div style={{
                fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1.5, marginTop: 2
              }}>{s.label}</div>
            </div>
            )}
        </div>
        {/* yield bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{
              display: 'flex', justifyContent: 'space-between', marginBottom: 6,
              fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1
            }}>
            <span>AVG ROSIN YIELD</span>
            <span style={{ color: t.accent }}>{yieldPct.toFixed(2)}%</span>
          </div>
          <div style={{ height: 4, background: t.bgElevated2, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
                width: `${Math.min(yieldPct * 10, 100)}%`, height: '100%',
                background: `linear-gradient(90deg, ${t.bands['90-119']}, ${t.accent})`,
                borderRadius: 2
              }} />
          </div>
        </div>
      </div>

      {/* list header */}
      <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 20px 12px'
        }}>
        <div style={{ fontFamily: t.fontSans, fontSize: 18, fontWeight: 600 }}>Batches</div>
        <Segmented
            options={[
            { value: 'all', label: 'ALL' },
            { value: 'active', label: 'ACTIVE' },
            { value: 'done', label: 'DONE' }]
            }
            value={filter} onChange={setFilter} />
      </div>

      {/* list */}
      <div className="mi-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
        {list.map((b) => <BatchRow key={b.id} batch={b} onOpen={onOpen} unit={unit} theme={theme} />)}
      </div>

      {/* end scroll region */}
      </div>

      {/* Anchored footer */}
      <div style={{ ...{
          flexShrink: 0,
          padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 28px)',
          background: t.bg,
          borderTop: `1px solid ${t.lineStrong}`,
          display: 'flex', justifyContent: 'center'
        }, background: t.bg, borderRadius: "2px 0px 0px" }}>
        <button onClick={onCreate} style={{ ...{
            height: 50, padding: '0 30px', borderRadius: t.btnRadius ?? 999, border: 'none',
            background: t.accentGrad || t.accent, color: t.accentInk,
            fontFamily: t.fontSans, fontSize: t.hl ? 14 : 15,
            fontWeight: t.hl ? 400 : 600,
            letterSpacing: t.hl ? 1 : -0.2,
            textTransform: t.hl ? 'uppercase' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            boxShadow: `0 4px 16px rgba(0,0,0,0.4)`
          }, color: "rgb(20, 12, 3)", fontWeight: "700", border: "rgba(248, 245, 238, 0.973)" }}>
          <Icon.plus width={18} height={18} />
          New batch
        </button>
      </div>
    </div>);

}

function BatchRow({ batch, onOpen, unit, theme }) {
  const t = MicronTokens[theme];
  const totalDry = MicronBands.reduce((s, b) => s + (batch.bags[b.id].dry || 0), 0);
  const totalRosin = batch.presses.reduce((s, p) => s + (p.yieldG || 0), 0);
  const dryPct = totalDry / batch.inputG * 100;
  const rosinPct = batch.inputG ? totalRosin / batch.inputG * 100 : 0;
  const d = new Date(batch.startedAt);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div onClick={() => onOpen(batch.id)} className="mi-row" style={{
      padding: 14, borderRadius: 14,
      background: t.bgElevatedGrad || t.bgElevated,
      border: `1px solid ${t.line}`,
      boxShadow: t.innerHi || 'none',
      cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'center'
    }}>
      {/* date column */}
      <div style={{
        width: 46, flexShrink: 0, textAlign: 'center',
        padding: '6px 0', borderRight: `1px solid ${t.line}`
      }}>
        <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1 }}>
          {dateStr.split(' ')[0].toUpperCase()}
        </div>
        <div style={{ fontFamily: t.fontSans, fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.5 }}>
          {dateStr.split(' ')[1]}
        </div>
      </div>
      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: t.fontSans, fontSize: 15, fontWeight: 600, color: t.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{batch.strain}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
          fontFamily: t.fontMono, fontSize: 10, color: t.textMuted
        }}>
          <span>{batch.id}</span>
          {batch.stage === 'done' ?
          <>
              <span>·</span>
              <span>{totalDry.toFixed(1)}g dry</span>
              <span>·</span>
              <span style={{ color: t.accent, fontWeight: "600" }}>{rosinPct.toFixed(1)}% yield</span>
            </> :

          <>
              <span>·</span>
              <span style={{ color: t.accent }}>{batch.stage.toUpperCase()}</span>
            </>
          }
        </div>
        {/* bag pips */}
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {MicronBands.map((b) => {
            const bag = batch.bags[b.id];
            const filled = bag.dry != null;
            return (
              <div key={b.id} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: filled ? t.bands[b.id] : t.bgElevated2
              }} />);

          })}
        </div>
      </div>
      <Icon.chev width={16} height={16} style={{ color: t.textDim, flexShrink: 0 }} />
    </div>);

}

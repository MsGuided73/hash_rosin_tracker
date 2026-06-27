// Summary screen — yields, breakdowns, press runs
function SummaryScreen({ batch, onBack, onEdit, unit, theme }) {
  const t = window.withStage(theme, 'summary');
  const bands = window.MicronBands;
  const totalDry  = bands.reduce((s,b) => s + (batch.bags[b.id].dry || 0), 0);
  const totalWet  = bands.reduce((s,b) => s + (batch.bags[b.id].wet || 0), 0);
  const totalRosin = batch.presses.reduce((s,p) => s + (p.yieldG || 0), 0);
  const totalCharge = batch.presses.reduce((s,p) => s + (p.chargeG || 0), 0);
  const dryPct   = batch.inputG ? totalDry / batch.inputG * 100 : 0;
  const rosinPct = batch.inputG ? totalRosin / batch.inputG * 100 : 0;
  const returnPct = totalCharge ? totalRosin / totalCharge * 100 : 0;
  const d = new Date(batch.startedAt);

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={batch.strain} subtitle={`${batch.id} · ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${batch.operator}`}
        onBack={onBack} theme={theme}
        right={
          <button onClick={onEdit} style={{
            height: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${t.line}`,
            background: t.bgElevated, color: t.text, cursor: 'pointer',
            fontFamily: t.fontSans, fontSize: 13, fontWeight: 500,
          }}>Edit</button>
        }/>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>
      {/* Hero yield card */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{
          padding: 20, borderRadius: 20,
          background: t.hl ? (t.bgElevatedGrad || t.bgElevated)
            : t.name !== 'light'
            ? `linear-gradient(155deg, #2A303B 0%, #1A1E25 48%, #11141A 100%)`
            : `linear-gradient(135deg, ${t.bgElevated} 0%, ${t.bgElevated2} 100%)`,
          border: `1px solid ${t.line}`,
          boxShadow: t.hl
            ? t.innerHi
            : t.name !== 'light'
            ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.55), 0 16px 34px rgba(0,0,0,0.4)'
            : '0 6px 16px rgba(0,0,0,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 999,
            background: `radial-gradient(circle, ${t.accentSoft} 0%, transparent 70%)`,
          }}/>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 2 }}>
            TOTAL ROSIN YIELD
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <div style={{
              fontFamily: t.fontMono, fontSize: 52, fontWeight: 700,
              color: t.text, letterSpacing: -2, lineHeight: 1,
            }}>{totalRosin.toFixed(1)}<span style={{ fontSize: 20, color: t.textMuted, marginLeft: 4 }}>{unit}</span></div>
            <div style={{
              padding: '4px 10px', borderRadius: 999, background: t.accent, color: t.accentInk,
              fontFamily: t.fontMono, fontSize: 13, fontWeight: 700,
            }}>{rosinPct.toFixed(2)}%</div>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18,
            position: 'relative',
          }}>
            {[
              { label: 'INPUT',       val: formatG(batch.inputG, unit), u: unit },
              { label: 'DRY HASH',    val: totalDry.toFixed(1), u: unit, sub: `${dryPct.toFixed(1)}%` },
              { label: 'RETURN',      val: returnPct.toFixed(0), u: '%', sub: `of charge` },
            ].map((s,i) => (
              <div key={i} style={{ paddingLeft: i>0 ? 12 : 0, borderLeft: i>0 ? `1px solid ${t.line}` : 'none' }}>
                <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1.5 }}>{s.label}</div>
                <div style={{
                  fontFamily: t.fontMono, fontSize: 20, fontWeight: 700, color: t.text, marginTop: 2, letterSpacing: -0.5,
                }}>{s.val}<span style={{ fontSize: 11, color: t.textMuted, marginLeft: 2 }}>{s.u}</span></div>
                {s.sub && <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMuted, marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow bar: input → dry → rosin */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel theme={theme}>FLOW</SectionLabel>
        <div style={{
          padding: 14, borderRadius: 14,
          background: t.bgElevatedGrad || t.bgElevated,
          border: `1px solid ${t.line}`,
          boxShadow: t.innerHi || 'none',
        }}>
          <FlowBar segments={[
            { label: 'INPUT', val: batch.inputG, color: t.lineStrong },
            { label: 'DRY',   val: totalDry, color: t.bands['90-119'] },
            { label: 'ROSIN', val: totalRosin, color: t.accent },
          ]} unit={unit} theme={theme}/>
        </div>
      </div>

      {/* Per-bag breakdown */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel theme={theme}>PER-BAG BREAKDOWN</SectionLabel>
        <div style={{
          padding: 4, borderRadius: 14,
          background: t.bgElevatedGrad || t.bgElevated,
          border: `1px solid ${t.line}`,
          boxShadow: t.innerHi || 'none',
        }}>
          {bands.map((b, i) => {
            const bag = batch.bags[b.id];
            const pct = totalDry ? (bag.dry || 0) / totalDry * 100 : 0;
            const color = t.bands[b.id];
            return (
              <div key={b.id} style={{
                padding: '12px 14px',
                borderBottom: i < bands.length-1 ? `1px solid ${t.line}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BandChip bandId={b.id} size="sm"/>
                    {bag.color != null && (
                      <div style={{
                        width: 18, height: 18, borderRadius: 999,
                        background: t.colorScale[bag.color].hex,
                        border: `1px solid rgba(0,0,0,0.25)`,
                      }}/>
                    )}
                    {bag.melt > 0 && (
                      <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMuted }}>{bag.melt}★</span>
                    )}
                    {bag.texture && (
                      <span style={{
                        fontFamily: t.fontSans, fontSize: 11, color: t.textMuted,
                      }}>{bag.texture}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: t.fontMono, fontSize: 14, fontWeight: 700, color: t.text }}>
                      {bag.dry != null ? formatG(bag.dry, unit) : '—'}
                      <span style={{ color: t.textMuted, fontSize: 10, marginLeft: 3 }}>{unit}</span>
                    </div>
                    <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
                {/* bar */}
                <div style={{ marginTop: 8, height: 3, background: t.bgElevated2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color }}/>
                </div>
                {bag.notes && (
                  <div style={{
                    marginTop: 8, fontFamily: t.fontSans, fontSize: 12, color: t.textMuted,
                    lineHeight: 1.4,
                  }}>{bag.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Merged grades */}
      {(batch.mergedGrades || []).length > 0 && (
        <div style={{ padding: '18px 16px 0' }}>
          <SectionLabel theme={theme}>MERGED GRADES · {batch.mergedGrades.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {batch.mergedGrades.map(m => {
              const dry = window.GradeUnits.mergeDry(batch, m);
              const pct = totalDry ? dry / totalDry * 100 : 0;
              return (
                <div key={m.id} style={{
                  padding: 14, borderRadius: 14,
                  background: t.bgElevatedGrad || t.bgElevated,
                  border: `1px solid ${t.accent}33`,
                  boxShadow: t.innerHi || 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                      borderRadius: 999, background: t.accentSoft, border: `1px solid ${t.accent}66`,
                      color: t.accent, fontFamily: t.fontMono, fontSize: 11, fontWeight: 600,
                    }}>
                      <span>⛓</span>{m.label}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: t.fontMono, fontSize: 15, fontWeight: 700, color: t.text }}>
                        {formatG(dry, unit)}<span style={{ color: t.textMuted, fontSize: 10, marginLeft: 3 }}>{unit}</span>
                      </div>
                      <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim }}>{pct.toFixed(1)}% of dry</div>
                    </div>
                  </div>
                  {/* constituents */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {m.bandIds.map(bid => (
                      <div key={bid} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
                        borderRadius: 999, background: t.bgElevated2, border: `1px solid ${t.bands[bid]}44`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: t.bands[bid] }}/>
                        <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.bands[bid] }}>{bid}µ</span>
                        <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.text }}>
                          {formatG(batch.bags[bid]?.dry, unit)}{unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* appearance */}
                  {(m.color != null || m.melt > 0 || m.texture) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      {m.color != null && (
                        <div style={{ width: 16, height: 16, borderRadius: 999, background: t.colorScale[m.color].hex, border: '1px solid rgba(0,0,0,0.25)' }}/>
                      )}
                      {m.melt > 0 && <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMuted }}>{m.melt}★</span>}
                      {m.texture && <span style={{ fontFamily: t.fontSans, fontSize: 11, color: t.textMuted }}>{m.texture}</span>}
                    </div>
                  )}
                  {m.notes && (
                    <div style={{ marginTop: 8, fontFamily: t.fontSans, fontSize: 12, color: t.textMuted, lineHeight: 1.4 }}>{m.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Press runs */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel theme={theme}>PRESS RUNS · {batch.presses.length}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {batch.presses.map((p,i) => <PressCard key={p.id} run={p} index={i+1} unit={unit} theme={theme} batch={batch}/>)}
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel theme={theme}>BATCH META</SectionLabel>
        <div style={{
          padding: '2px 14px', borderRadius: 14,
          background: t.bgElevatedGrad || t.bgElevated,
          border: `1px solid ${t.line}`,
          boxShadow: t.innerHi || 'none',
        }}>
          {[
            ['Operator', batch.operator],
            ['Started', d.toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})],
            ['Input', `${formatG(batch.inputG, unit)} ${unit}`],
            ['Total wet', totalWet ? `${formatG(totalWet, unit)} ${unit}` : '—'],
            ['Total dry', `${formatG(totalDry, unit)} ${unit}`],
            ['Press runs', batch.presses.length],
          ].map(([k,v], i, arr) => (
            <div key={k} style={{
              padding: '12px 0', display: 'flex', justifyContent: 'space-between',
              borderBottom: i < arr.length-1 ? `1px solid ${t.line}` : 'none',
            }}>
              <span style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted }}>{k}</span>
              <span style={{ fontFamily: t.fontMono, fontSize: 13, color: t.text, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onBack} style={{ flex: 1 }}>Done</Btn>
        <Btn kind="secondary" style={{ flex: 1 }}>Export</Btn>
      </BottomBar>
    </div>
  );
}

function FlowBar({ segments, unit, theme }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  const max = Math.max(...segments.map(s => s.val));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {segments.map((s,i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1 }}>{s.label}</span>
            <span style={{ fontFamily: t.fontMono, fontSize: 12, color: t.text, fontWeight: 600 }}>
              {s.val.toFixed(1)}<span style={{ color: t.textMuted, fontSize: 10, marginLeft: 2 }}>{unit}</span>
            </span>
          </div>
          <div style={{ height: 6, background: t.bgElevated2, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(s.val/max)*100}%`, height: '100%', background: s.color, borderRadius: 3 }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { SummaryScreen, FlowBar });

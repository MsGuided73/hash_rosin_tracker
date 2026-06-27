// Cure screen — storage method, container, light, temp, time
const { useState: useStateC } = React;

function CureScreen({ batch, setBatch, onContinue, onBack, unit, tempUnit, theme }) {
  const t = window.withStage(theme, 'cure');
  const cure = batch.cure || {
    method: '',
    container: '',
    vacuumSealed: false,
    lightExposure: '',
    tempF: null,
    targetDays: 21,
    startedAt: null,
    notes: '',
  };
  const update = (patch) =>
    setBatch(b => ({ ...b, cure: { ...(b.cure || cure), ...patch } }));

  const methods = [
    { id: 'cold-cure',   label: 'Cold Cure',    sub: 'Refrigerated (~38°F)' },
    { id: 'room-cure',   label: 'Room Cure',    sub: '60–70°F' },
    { id: 'warm-cure',   label: 'Warm Cure',    sub: '78–85°F' },
    { id: 'flash-cure',  label: 'Flash',        sub: '90°F · 24–48h' },
    { id: 'no-cure',     label: 'No Cure',      sub: 'Fresh press' },
  ];
  const containers = [
    { id: 'glass',       label: 'Glass jar' },
    { id: 'parchment',   label: 'Parchment fold' },
    { id: 'silicone',    label: 'Silicone' },
    { id: 'mylar',       label: 'Mylar bag' },
    { id: 'other',       label: 'Other' },
  ];
  const lights = [
    { id: 'opaque',      label: 'Opaque',     sub: 'No light' },
    { id: 'uv-blocking', label: 'UV-blocking',sub: 'Amber / blackout' },
    { id: 'clear',       label: 'Clear',      sub: 'Ambient light' },
  ];

  const days = cure.startedAt
    ? Math.floor((Date.now() - new Date(cure.startedAt).getTime()) / (1000*60*60*24))
    : 0;

  const start = () => update({ startedAt: new Date().toISOString() });
  const stop  = () => update({ startedAt: null });

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={batch.strain} subtitle={`${batch.id} · Cure`} onBack={onBack} theme={theme}/>
      <Stepper current="cure" onJump={(s) => setBatch(b => ({ ...b, stage: s }))}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>

      <div style={{ padding: '4px 20px 14px' }}>
        <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
          Cure & storage
        </div>
        <div style={{ fontFamily: t.fontSans, fontSize: 14, color: t.textMuted, marginTop: 4 }}>
          Log how you're storing this run — affects terpene retention, color, and stability.
        </div>
      </div>

      {/* Live cure clock */}
      <div style={{
        margin: '0 16px 14px', padding: 18, borderRadius: 18,
        background: t.bgElevatedGrad || t.bgElevated,
        border: `1px solid ${t.line}`,
        boxShadow: t.innerHi || 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
      }}>
        <div>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1.5 }}>CURE TIME</div>
          <div style={{ fontFamily: t.fontMono, fontSize: 38, fontWeight: 700, lineHeight: 1, marginTop: 6 }}>
            {cure.startedAt ? days : '—'}
            <span style={{ fontSize: 14, color: t.textMuted, marginLeft: 6, fontWeight: 500 }}>
              {cure.startedAt ? `day${days===1?'':'s'} of ${cure.targetDays}` : 'not started'}
            </span>
          </div>
          {cure.startedAt && (
            <div style={{
              marginTop: 10, height: 5, borderRadius: 999,
              background: 'rgba(255,255,255,0.08)', overflow: 'hidden', width: 220,
            }}>
              <div style={{
                height: '100%', width: `${Math.min(100, (days/cure.targetDays)*100)}%`,
                background: t.accentGrad || t.accent, borderRadius: 999,
              }}/>
            </div>
          )}
        </div>
        <Btn kind={cure.startedAt ? 'ghost' : 'primary'} onClick={cure.startedAt ? stop : start}>
          {cure.startedAt ? 'Reset' : 'Start cure'}
        </Btn>
      </div>

      {/* Method */}
      <Section theme={theme} label="METHOD">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {methods.map(m => {
            const sel = cure.method === m.id;
            return (
              <button key={m.id} onClick={() => update({ method: sel ? '' : m.id })} style={{
                padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: sel ? t.accentSoft : t.bgElevated2,
                boxShadow: sel ? `inset 0 0 0 1px ${t.accent}` : `inset 0 0 0 1px ${t.line}`,
                textAlign: 'left',
              }}>
                <div style={{ fontFamily: t.fontSans, fontSize: 14, fontWeight: 600, color: sel ? t.text : t.textMuted }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, marginTop: 2, letterSpacing: 0.6 }}>
                  {m.sub}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Container */}
      <Section theme={theme} label="CONTAINER">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {containers.map(c => {
            const sel = cure.container === c.id;
            return (
              <button key={c.id} onClick={() => update({ container: sel ? '' : c.id })} style={{
                padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: sel ? t.accent : t.bgElevated2,
                color: sel ? t.accentInk : t.textMuted,
                fontFamily: t.fontSans, fontSize: 13, fontWeight: 600,
              }}>{c.label}</button>
            );
          })}
        </div>

        {/* Vacuum sealed toggle */}
        <button onClick={() => update({ vacuumSealed: !cure.vacuumSealed })} style={{
          marginTop: 10, width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none',
          cursor: 'pointer',
          background: t.bgElevated2,
          boxShadow: cure.vacuumSealed ? `inset 0 0 0 1px ${t.accent}` : `inset 0 0 0 1px ${t.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: t.fontSans, fontSize: 14, fontWeight: 600, color: t.text }}>
              Vacuum sealed
            </div>
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 0.6, marginTop: 2 }}>
              Removes oxygen — preserves terps
            </div>
          </div>
          <div style={{
            width: 44, height: 26, borderRadius: 999, position: 'relative',
            background: cure.vacuumSealed ? t.accent : 'rgba(255,255,255,0.12)',
            transition: 'background 0.15s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: cure.vacuumSealed ? 21 : 3,
              width: 20, height: 20, borderRadius: 999,
              background: '#fff', transition: 'left 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}/>
          </div>
        </button>
      </Section>

      {/* Light exposure */}
      <Section theme={theme} label="LIGHT EXPOSURE">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {lights.map(l => {
            const sel = cure.lightExposure === l.id;
            return (
              <button key={l.id} onClick={() => update({ lightExposure: sel ? '' : l.id })} style={{
                padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: sel ? t.accentSoft : t.bgElevated2,
                boxShadow: sel ? `inset 0 0 0 1px ${t.accent}` : `inset 0 0 0 1px ${t.line}`,
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: t.fontSans, fontSize: 13, fontWeight: 600, color: sel ? t.text : t.textMuted }}>
                  {l.label}
                </div>
                <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, marginTop: 2, letterSpacing: 0.6 }}>
                  {l.sub}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Temp + duration */}
      <Section theme={theme} label="ENVIRONMENT">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldCard theme={theme} label={`STORAGE TEMP (°${tempUnit})`} value={cure.tempF}
            onChange={v => update({ tempF: v })} placeholder="—" suffix={`°${tempUnit}`} step={1}/>
          <FieldCard theme={theme} label="TARGET DAYS" value={cure.targetDays}
            onChange={v => update({ targetDays: v })} placeholder="21" suffix="d" step={1}/>
        </div>
      </Section>

      {/* Notes */}
      <div style={{ padding: '0 16px' }}>
        <Input label="CURE NOTES" value={cure.notes} onChange={v => update({ notes: v })}
          placeholder="Color shift, terp evolution, container behavior, taste at day 7 / 14 / 21…" multi/>
      </div>

      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onBack} style={{ flex: 1 }}>Back</Btn>
        <Btn kind="primary" onClick={onContinue} style={{ flex: 2 }}>Done · view summary</Btn>
      </BottomBar>
    </div>
  );
}

function Section({ label, children, theme }) {
  const t = window.withStage(theme, window.__stage);
  return (
    <div style={{ padding: '0 16px 18px' }}>
      <div style={{
        fontFamily: t.fontMono, fontSize: 10, color: t.textDim,
        letterSpacing: 1.5, marginBottom: 10, padding: '0 4px',
      }}>{label}</div>
      {children}
    </div>
  );
}

function FieldCard({ label, value, onChange, placeholder, suffix, step = 1, theme }) {
  const t = window.withStage(theme, window.__stage);
  const adjust = (delta) => onChange((value || 0) + delta * step);
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: t.bgElevated2,
      boxShadow: `inset 0 0 0 1px ${t.line}`,
    }}>
      <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1.2 }}>{label}</div>
      <div style={{
        marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => adjust(-1)} style={{
          width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: t.textMuted, fontSize: 18, lineHeight: 1,
        }}>−</button>
        <div style={{ fontFamily: t.fontMono, fontSize: 22, fontWeight: 700, color: value != null ? t.text : t.textDim }}>
          {value != null ? value : placeholder}
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 3 }}>{suffix}</span>
        </div>
        <button onClick={() => adjust(1)} style={{
          width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: t.textMuted, fontSize: 18, lineHeight: 1,
        }}>+</button>
      </div>
    </div>
  );
}

Object.assign(window, { CureScreen });

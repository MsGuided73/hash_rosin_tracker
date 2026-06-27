// Setup + Wash screens
const { useState: useStateS } = React;

function SetupScreen({ draft, setDraft, onContinue, onCancel, theme }) {
  const t = window.MicronTokens[theme];
  const canContinue = draft.strain && draft.inputG;
  const [inputPadOpen, setInputPadOpen] = useStateS(false);
  const [costPadOpen, setCostPadOpen] = useStateS(false);

  // Vocabulary — seed + user-added (persisted in localStorage for prototype)
  const [sourceTypes, setSourceTypes] = useStateS(() => {
    const saved = localStorage.getItem('micron-source-types');
    return saved ? JSON.parse(saved) : ['Outdoor','Indoor','Light Dep','Hoop House','Hydroponic','Greenhouse','Living Soil'];
  });
  const [sourceNames, setSourceNames] = useStateS(() => {
    const saved = localStorage.getItem('micron-source-names');
    return saved ? JSON.parse(saved) : ['Leafy Jungle','Emerald Cove','Black Maple Co.','Alpine Gardens','Coastal Fog Farms'];
  });
  const [harvestTypes, setHarvestTypes] = useStateS(() => {
    const saved = localStorage.getItem('micron-harvest-types');
    return saved ? JSON.parse(saved) : ['Fresh Frozen','Cured','Sugar Trim'];
  });
  const addToVocab = (key, value, setter, current) => {
    if (!value || current.includes(value)) return;
    const next = [...current, value];
    setter(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="New batch" onBack={onCancel} subtitle={`#${draft.id}`} theme={theme}/>
      <Stepper current="setup"/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>

      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
          Intake
        </div>
        <div style={{ fontFamily: t.fontSans, fontSize: 14, color: t.textMuted, marginTop: 4 }}>
          Capture every detail of the source material — feeds the database.
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Strain */}
        <Input label="STRAIN / CULTIVAR" value={draft.strain} onChange={v => setDraft(d => ({ ...d, strain: v }))}
          placeholder="e.g. Papaya Zkittlez"/>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: -8 }}>
          {window.MicronSeed.strains.slice(0,5).map(s => (
            <button key={s} onClick={() => setDraft(d => ({ ...d, strain: s }))}
              style={{
                padding: '5px 10px', borderRadius: 999, background: t.bgElevated2,
                color: t.textMuted, border: 'none', fontFamily: t.fontSans, fontSize: 12, cursor: 'pointer',
              }}>{s}</button>
          ))}
        </div>

        {/* Batch ID + Operator */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="BATCH ID" value={draft.id} onChange={v => setDraft(d => ({ ...d, id: v }))} mono/>
          <Input label="OPERATOR" value={draft.operator} onChange={v => setDraft(d => ({ ...d, operator: v }))}/>
        </div>

        {/* SECTION DIVIDER */}
        <div style={{
          marginTop: 6, padding: '12px 0 4px',
          borderTop: `1px solid ${t.line}`,
        }}>
          <div style={{
            fontFamily: t.fontMono, fontSize: 10, color: t.accent, letterSpacing: 1.5,
          }}>SOURCE MATERIAL</div>
        </div>

        {/* Source Type */}
        <ComboField label="SOURCE TYPE" value={draft.sourceType}
          options={sourceTypes}
          onChange={v => { setDraft(d => ({ ...d, sourceType: v })); addToVocab('micron-source-types', v, setSourceTypes, sourceTypes); }}
          placeholder="Outdoor, Indoor, Light Dep…"
          theme={theme}/>

        {/* Source Name */}
        <ComboField label="SOURCE NAME · FARM / GROWER" value={draft.sourceName}
          options={sourceNames}
          onChange={v => { setDraft(d => ({ ...d, sourceName: v })); addToVocab('micron-source-names', v, setSourceNames, sourceNames); }}
          placeholder="Select or add new"
          theme={theme}/>

        {/* Harvest date + type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DateField label="HARVEST DATE" value={draft.harvestDate}
            onChange={v => setDraft(d => ({ ...d, harvestDate: v }))}
            theme={theme}/>
          <ComboField label="HARVEST TYPE" value={draft.harvestType}
            options={harvestTypes}
            onChange={v => { setDraft(d => ({ ...d, harvestType: v })); addToVocab('micron-harvest-types', v, setHarvestTypes, harvestTypes); }}
            placeholder="Fresh Frozen…"
            theme={theme}/>
        </div>

        {/* Input weight */}
        <div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1, marginBottom: 6,
          }}>INPUT WEIGHT</div>
          <button onClick={() => setInputPadOpen(true)} style={{
            width: '100%', padding: '18px 16px', borderRadius: 14,
            background: t.bgElevatedGrad || t.bgElevated,
            border: `1px solid ${t.line}`,
            boxShadow: t.innerHi || 'none',
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.textMuted }}>
              <Icon.scale width={20} height={20}/>
              <span style={{ fontFamily: t.fontSans, fontSize: 14 }}>Starting material</span>
            </div>
            <div style={{
              fontFamily: t.fontMono, fontSize: 22, fontWeight: 700, color: draft.inputG ? t.text : t.textDim,
            }}>
              {draft.inputG ? formatG(draft.inputG, 'g') : '—'}
              <span style={{ fontSize: 13, color: t.textMuted, marginLeft: 4 }}>g</span>
            </div>
          </button>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[454, 907, 1361, 1814, 2268].map(g => (
              <button key={g} onClick={() => setDraft(d => ({ ...d, inputG: g }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: `1px solid ${t.line}`,
                  background: 'transparent', color: t.textMuted, cursor: 'pointer',
                  fontFamily: t.fontMono, fontSize: 11,
                }}>{(g/453.6).toFixed(0)}lb</button>
            ))}
          </div>
        </div>

        {/* Biomass cost */}
        <div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1, marginBottom: 6,
          }}>BIOMASS COST</div>
          <button onClick={() => setCostPadOpen(true)} style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            background: t.bgElevated2, border: `1px solid ${t.line}`, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted }}>
              Total paid
            </span>
            <span style={{
              fontFamily: t.fontMono, fontSize: 18, fontWeight: 700,
              color: draft.biomassCost != null ? t.text : t.textDim,
            }}>
              <span style={{ fontSize: 13, color: t.textMuted, marginRight: 2 }}>$</span>
              {draft.biomassCost != null ? Number(draft.biomassCost).toLocaleString() : '—'}
            </span>
          </button>
          {draft.biomassCost && draft.inputG && (
            <div style={{
              marginTop: 6, fontFamily: t.fontMono, fontSize: 10, color: t.textDim,
              textAlign: 'right',
            }}>
              ${(draft.biomassCost / (draft.inputG/453.6)).toFixed(0)}/lb
              <span style={{ marginLeft: 8 }}>·</span>
              <span style={{ marginLeft: 8 }}>${(draft.biomassCost / draft.inputG).toFixed(2)}/g</span>
            </div>
          )}
        </div>

        {/* Quality notes with photos */}
        <div style={{ marginTop: 4 }}>
          <PhotoNotes
            label="MATERIAL NOTES & PHOTOS"
            value={draft.intakeNotes}
            photos={draft.intakePhotos || []}
            onChange={v => setDraft(d => ({ ...d, intakeNotes: v }))}
            onPhotosChange={ps => setDraft(d => ({ ...d, intakePhotos: ps }))}
            placeholder="Visual quality, trichome density, smell, color, leaf-to-bud ratio…"
            theme={theme}/>
        </div>
      </div>

      <NumberPad open={inputPadOpen} onClose={() => setInputPadOpen(false)}
        initial={draft.inputG} onSubmit={v => setDraft(d => ({ ...d, inputG: v }))}
        title="Input weight" unit="g"
        helper="Total material going into the wash."/>
      <NumberPad open={costPadOpen} onClose={() => setCostPadOpen(false)}
        initial={draft.biomassCost} onSubmit={v => setDraft(d => ({ ...d, biomassCost: v }))}
        title="Biomass cost" unit="$"
        helper="Total paid for this biomass."/>
      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</Btn>
        <Btn kind="primary" onClick={onContinue} disabled={!canContinue} style={{ flex: 2 }}>
          Continue to wash
        </Btn>
      </BottomBar>
    </div>
  );
}

function WashScreen({ batch, setBatch, onContinue, onBack, unit, theme }) {
  const t = window.withStage(theme, 'wash');
  const [activeBag, setActiveBag] = useStateS(null);

  const enteredCount = window.MicronBands.filter(b => batch.bags[b.id].wet != null).length;

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={batch.strain} subtitle={`${batch.id} · ${formatG(batch.inputG, unit)} ${unit} input`} onBack={onBack} theme={theme}/>
      <Stepper current="wash" onJump={(s) => setBatch(b => ({ ...b, stage: s }))}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>

      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
            Wet weights
          </div>
          <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMuted }}>
            Optional · {enteredCount}/4
          </div>
        </div>
        <div style={{ fontFamily: t.fontSans, fontSize: 14, color: t.textMuted, marginTop: 4 }}>
          Log straight off the wash, or skip and weigh after freeze dry.
        </div>
      </div>

      {/* Grid of 4 bag dials */}
      <div className="mi-stagger" style={{
        padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {window.MicronBands.map(b => {
          const bag = batch.bags[b.id];
          return (
            <div key={b.id} onClick={() => setActiveBag(b.id)} className="mi-card" style={{
              padding: 14, borderRadius: 16,
              background: t.bgElevatedGrad || t.bgElevated,
              border: `1px solid ${bag.wet != null ? t.bands[b.id] + '44' : t.line}`,
              boxShadow: t.innerHi || 'none',
              cursor: 'pointer',
            }}>
              <BandChip bandId={b.id}/>
              <div style={{ marginTop: 12 }}>
                <ScaleFace value={bag.wet} unit={unit} size="sm" bandColor={t.bands[b.id]}/>
              </div>
              <div style={{
                marginTop: 8, fontFamily: t.fontMono, fontSize: 10, color: t.textDim,
                letterSpacing: 1, textAlign: 'center',
              }}>
                WET WEIGHT
              </div>
            </div>
          );
        })}
      </div>

      <NumberPad
        open={activeBag != null} onClose={() => setActiveBag(null)}
        initial={activeBag ? batch.bags[activeBag].wet : ''}
        onSubmit={v => setBatch(b => ({
          ...b, bags: { ...b.bags, [activeBag]: { ...b.bags[activeBag], wet: v } },
        }))}
        title={activeBag ? `Wet weight · ${activeBag}µ` : 'Wet weight'}
        unit={unit}
        helper="Off-the-bag weight, before freeze dry."/>
      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onBack} style={{ flex: 1 }}>Back</Btn>
        <Btn kind="primary" onClick={onContinue} style={{ flex: 2 }}>
          {enteredCount === 0 ? 'Skip to freeze dry' : 'Continue to freeze dry'}
        </Btn>
      </BottomBar>
    </div>
  );
}

// ─────────── Shared chrome ───────────
function TopBar({ title, subtitle, onBack, theme, right }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  return (
    <div style={{
      padding: '62px 16px 8px',
      display: 'flex', alignItems: 'center', gap: 12, background: 'transparent',
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 999, border: 'none',
          background: t.bgElevated, color: t.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon.chevL width={18} height={18}/></button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: t.fontSans, fontSize: 18, fontWeight: 700, color: t.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontFamily: t.fontMono, fontSize: 12, fontWeight: 500, color: t.textMuted, letterSpacing: 0.8, marginTop: 3,
          }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

function BottomBar({ children, theme }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 28px)',
      background: t.bg,
      borderTop: `1px solid ${t.lineStrong}`,
      display: 'flex', gap: 10, zIndex: 50,
    }}>{children}</div>
  );
}

Object.assign(window, { SetupScreen, WashScreen, TopBar, BottomBar });

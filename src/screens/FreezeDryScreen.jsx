import React from 'react';
import { MicronTokens, MicronBands, withStage } from '../lib/tokens.js';
import { GradeUnits } from '../lib/grade-units.js';
import { Stepper, ScaleFace, ColorSwatches, MeltRating, Input, BandChip, Sheet, NumberPad, Btn, Icon, formatG } from '../components/primitives.jsx';
import { PhotoNotes } from '../components/PhotoNotes.jsx';
import { TopBar, BottomBar } from '../components/Chrome.jsx';

// Freeze Dry screen — per-bag weight + color + melt + texture + notes,
// plus the ability to COMBINE 2+ micron ranges into a merged grade.
const { useState: useStateFD } = React;

export function FreezeDryScreen({ batch, setBatch, onContinue, onBack, unit, theme }) {
  const t = withStage(theme, 'freezedry');
  const GU = GradeUnits;

  const [activeId, setActiveId] = useStateFD(MicronBands[0].id);
  const [padOpen, setPadOpen] = useStateFD(false);
  const [combineOpen, setCombineOpen] = useStateFD(false);
  const [textures, setTextures] = useStateFD(() => {
    const saved = localStorage.getItem('micron-textures');
    return saved ? JSON.parse(saved) : ['Sandy','Creamy','Sticky','Crumbly','Chunky','Greasy'];
  });
  const [texEditOpen, setTexEditOpen] = useStateFD(false);
  const [newTex, setNewTex] = useStateFD('');
  const saveTextures = (arr) => {
    setTextures(arr);
    localStorage.setItem('micron-textures', JSON.stringify(arr));
  };

  const enteredCount = MicronBands.filter(b => batch.bags[b.id].dry != null).length;
  const allUnits = GU.units(batch);
  const activeU = allUnits.find(u => u.id === activeId) || allUnits[0];
  const isMerge = activeU && activeU.kind === 'merge';
  const merge = isMerge ? activeU.mergeRef : null;
  const bag = isMerge ? null : batch.bags[activeU.id];
  const activeColor = GU.unitColor(t, activeU);

  // Update whichever entity is active (band bag OR merge object)
  const updateActive = (patch) => {
    if (isMerge) setBatch(b => GU.updateMerge(b, merge.id, patch));
    else setBatch(b => ({ ...b, bags: { ...b.bags, [activeU.id]: { ...b.bags[activeU.id], ...patch } } }));
  };

  const av = isMerge ? merge : bag;            // active values (color/melt/texture/notes/photos)
  const activeDry = isMerge ? activeU.dry : (bag ? bag.dry : null);
  const activeWet = isMerge ? GU.mergeWet(batch, merge) : (bag ? bag.wet : null);

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={batch.strain} subtitle={`${batch.id} · ${formatG(batch.inputG, unit)}${unit} input`} onBack={onBack} theme={theme}/>
      <Stepper current="freezedry" onJump={(s) => setBatch(b => ({ ...b, stage: s }))}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>

      <div style={{ padding: '4px 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: t.fontSans, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
            Freeze dry
          </div>
          <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMuted }}>
            {enteredCount}/4 bags
          </div>
        </div>
      </div>

      {/* Unit tabs (bands + merged grades) + Combine */}
      <div style={{
        display: 'flex', gap: 6, padding: '4px 16px 12px', overflowX: 'auto',
      }}>
        {allUnits.map(u => {
          const active = u.id === activeU.id;
          const color = GU.unitColor(t, u);
          const filled = u.dry != null && u.dry > 0;
          return (
            <button key={u.id} onClick={() => setActiveId(u.id)} className="mi-tap" style={{
              flexShrink: 0, minWidth: u.kind === 'merge' ? 86 : 64,
              flex: u.kind === 'band' ? 1 : undefined,
              padding: '10px 10px', borderRadius: 12, border: 'none',
              background: active ? t.bgElevated : 'transparent',
              boxShadow: active ? `inset 0 0 0 1px ${color}88` : `inset 0 0 0 1px ${t.line}`,
              color: t.text, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              WebkitTapHighlightColor: 'transparent', position: 'relative',
            }}>
              <div style={{
                fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1,
                color: active ? color : t.textMuted, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {u.kind === 'merge' && <span style={{ fontSize: 9 }}>⛓</span>}
                {u.kind === 'merge' ? `${u.bandIds.length}-WAY` : u.short}
              </div>
              <div style={{
                fontFamily: t.fontMono, fontSize: 13, fontWeight: 700,
                color: filled ? (active ? t.text : t.textMuted) : t.textDim,
              }}>
                {filled ? formatG(u.dry, unit) : '—'}
              </div>
            </button>
          );
        })}
        {/* Combine button */}
        <button onClick={() => setCombineOpen(true)} className="mi-tap" style={{
          flexShrink: 0, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
          border: `1px dashed ${t.lineStrong}`, background: 'transparent', color: t.accent,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        }}>
          <Icon.plus width={16} height={16}/>
          <span style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1 }}>COMBINE</span>
        </button>
      </div>

      {/* Active unit detail */}
      <div style={{
        margin: '0 16px', padding: 20, borderRadius: 20,
        background: t.bgElevatedGrad || t.bgElevated,
        border: `1px solid ${activeColor}33`,
        boxShadow: t.hl ? t.innerHi
          : t.name !== 'light'
          ? `inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.5), 0 12px 28px rgba(0,0,0,0.35)`
          : 'none',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isMerge ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                borderRadius: 999, border: `1px solid ${t.accent}55`, color: t.accent,
                fontFamily: t.fontMono, fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
              }}>
                <span>⛓</span>{merge.label}
              </span>
            </div>
          ) : <BandChip bandId={activeU.id}/>}
          {activeWet != null && activeWet > 0 && (
            <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1 }}>
              WET: {formatG(activeWet, unit)}{unit}
              {activeDry != null && activeDry > 0 && (
                <span style={{ color: t.accent, marginLeft: 8 }}>
                  −{((1 - activeDry/activeWet)*100).toFixed(0)}% H₂O
                </span>
              )}
            </div>
          )}
        </div>

        {/* Weight */}
        {isMerge ? (
          <div style={{ marginTop: 18 }}>
            <div style={{
              background: 'linear-gradient(180deg, #1A201C 0%, #0D110E 100%)',
              border: `1px solid ${t.hl ? '#0C0F0B' : t.line}`,
              boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.55)',
              borderRadius: t.cardRadius ?? 12, padding: '16px 18px',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <span className="mi-lcd" style={{
                fontFamily: t.fontMono, fontSize: 44, lineHeight: 0.95, letterSpacing: -1,
                color: t.readout || t.accent,
              }}>{formatG(activeDry, unit)}</span>
              <span style={{ fontFamily: t.fontMono, fontSize: 13, color: '#5A635B', marginBottom: 5 }}>{unit}</span>
            </div>
            <div style={{
              marginTop: 6, fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 0.5, textAlign: 'center',
            }}>COMBINED DRY · AUTO-SUMMED FROM {merge.bandIds.length} RANGES</div>
            {/* constituent breakdown */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
              {merge.bandIds.map(bid => (
                <div key={bid} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
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
            <button onClick={() => { setBatch(b => GU.removeMerge(b, merge.id)); setActiveId(MicronBands[0].id); }}
              className="mi-tap" style={{
                marginTop: 14, width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${t.danger}44`, background: 'transparent', color: t.danger,
                fontFamily: t.fontMono, fontSize: 11, letterSpacing: 1,
              }}>⛓ SPLIT BACK INTO SEPARATE RANGES</button>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            <ScaleFace
              value={bag.dry} unit={unit} size="lg"
              bandColor={activeColor}
              label="Tap to enter dry weight"
              onTap={() => setPadOpen(true)}/>
          </div>
        )}

        {/* Color */}
        <div style={{ marginTop: 24 }}>
          <SectionLabel theme={theme}>COLOR / APPEARANCE</SectionLabel>
          <ColorSwatches value={av.color} onChange={(v) => updateActive({ color: v })}/>
        </div>

        {/* Melt */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel theme={theme} style={{ marginBottom: 0 }}>MELT</SectionLabel>
          <MeltRating value={av.melt} onChange={(v) => updateActive({ melt: v })}/>
        </div>

        {/* Texture */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel theme={theme} style={{ marginBottom: 0 }}>TEXTURE</SectionLabel>
            <button onClick={() => setTexEditOpen(true)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.textMuted, fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon.plus width={12} height={12}/> CUSTOMIZE
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {textures.map(tx => {
              const sel = av.texture === tx;
              return (
                <button key={tx} onClick={() => updateActive({ texture: sel ? '' : tx })} className="mi-tap" style={{
                  padding: '6px 12px', borderRadius: 999, border: 'none',
                  background: sel ? t.accent : t.bgElevated2,
                  color: sel ? t.accentInk : t.textMuted,
                  fontFamily: t.fontSans, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{tx}</button>
              );
            })}
          </div>
        </div>

        {/* Notes with photos */}
        <div style={{ marginTop: 20 }}>
          <PhotoNotes
            label={isMerge ? 'BLEND NOTES & PHOTOS' : 'BAG NOTES & PHOTOS'}
            value={av.notes}
            photos={av.photos || []}
            onChange={v => updateActive({ notes: v })}
            onPhotosChange={ps => updateActive({ photos: ps })}
            placeholder="Contam, aroma, separation events, visual quality…"
            accentColor={activeColor}
            theme={theme}/>
        </div>

        {/* Station notes — shared for the whole freeze-dry stage */}
        <div style={{ marginTop: 16 }}>
          <PhotoNotes
            label="FREEZE DRY STATION NOTES"
            value={batch.freezeDryNotes || ''}
            photos={batch.freezeDryPhotos || []}
            onChange={v => setBatch(b => ({ ...b, freezeDryNotes: v }))}
            onPhotosChange={ps => setBatch(b => ({ ...b, freezeDryPhotos: ps }))}
            placeholder="Cycle length, chamber temp/vacuum, deviations, operator observations…"
            theme={theme}/>
        </div>
      </div>

      <NumberPad open={padOpen} onClose={() => setPadOpen(false)}
        initial={bag ? bag.dry : null} onSubmit={v => updateActive({ dry: v })}
        title={`Dry weight · ${activeU.id}µ`} unit={unit}
        helper={bag && bag.wet != null ? `Wet was ${formatG(bag.wet, unit)}${unit}` : undefined}/>

      <CombineSheet
        open={combineOpen} onClose={() => setCombineOpen(false)}
        batch={batch} theme={theme} unit={unit}
        onCreate={(bandIds, label, alsoSave) => {
          if (alsoSave) GU.saveCombo(label, bandIds);
          setBatch(b => {
            const nb = GU.createMerge(b, bandIds, label);
            setActiveId(nb.__newMergeId);
            const { __newMergeId, ...clean } = nb;
            return clean;
          });
          setCombineOpen(false);
        }}/>

      <Sheet open={texEditOpen} onClose={() => setTexEditOpen(false)} title="Texture categories">
        <div style={{ padding: '6px 20px 20px' }}>
          <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, marginBottom: 14 }}>
            Add, rename, or remove texture categories. Shared across all bags.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {textures.map((tx, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 4px 4px 12px', borderRadius: 10, background: t.bgElevated2,
              }}>
                <input value={tx}
                  onChange={e => { const copy = [...textures]; copy[i] = e.target.value; saveTextures(copy); }}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    fontFamily: t.fontSans, fontSize: 14, color: t.text, outline: 'none',
                  }}/>
                <button onClick={() => saveTextures(textures.filter((_,j) => j !== i))}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: 'none',
                    background: 'transparent', color: t.danger, cursor: 'pointer',
                  }}><Icon.close width={16} height={16}/></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input value={newTex} onChange={e => setNewTex(e.target.value)}
              placeholder="Add a texture (e.g. Fluffy, Waxy…)"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10,
                background: t.bgElevated2, border: `1px solid ${t.line}`,
                color: t.text, fontFamily: t.fontSans, fontSize: 14, outline: 'none',
              }}/>
            <Btn kind="primary" onClick={() => {
              const v = newTex.trim(); if (!v) return;
              saveTextures([...textures, v]); setNewTex('');
            }} style={{ height: 46 }}>Add</Btn>
          </div>
        </div>
      </Sheet>
      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onBack} style={{ flex: 1 }}>Back</Btn>
        <Btn kind="primary" onClick={onContinue} disabled={enteredCount === 0} style={{ flex: 2 }}>
          Continue to press
        </Btn>
      </BottomBar>
    </div>
  );
}

// ─────────── Combine sheet — build a merged grade from 2+ ranges ───────────
export function CombineSheet({ open, onClose, batch, theme, unit, onCreate }) {
  const t = withStage(theme, 'freezedry');
  const GU = GradeUnits;
  const [sel, setSel] = useStateFD([]);
  const [label, setLabel] = useStateFD('');
  const [alsoSave, setAlsoSave] = useStateFD(false);
  const [combos, setCombos] = useStateFD([]);

  React.useEffect(() => {
    if (open) { setSel([]); setLabel(''); setAlsoSave(false); setCombos(GU.getCombos()); }
  }, [open]);

  // Bands available to combine: weighed, and not already inside a merge.
  const inMerge = new Set((batch.mergedGrades || []).flatMap(m => m.bandIds));
  const available = MicronBands.filter(b => !inMerge.has(b.id));

  const toggle = (id) => setSel(s => {
    const next = s.includes(id) ? s.filter(x => x !== id) : [...s, id];
    setLabel(GU.makeMergeLabel(next));
    return next;
  });

  const sumDry = sel.reduce((s, id) => s + (batch.bags[id]?.dry || 0), 0);
  const canCreate = sel.length >= 2;

  const applyCombo = (combo) => {
    const usable = combo.bandIds.filter(id => !inMerge.has(id));
    setSel(usable);
    setLabel(combo.label);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Combine micron ranges">
      <div style={{ padding: '4px 20px 20px' }}>
        <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, marginBottom: 14, lineHeight: 1.45 }}>
          Select two or more ranges to merge into a new grade. It presses and reports
          as one unit, with its own color, melt, texture and analytics.
        </div>

        {/* Saved combos */}
        {combos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel theme={theme}>SAVED COMBINATIONS</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {combos.map(c => (
                <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <button onClick={() => applyCombo(c)} className="mi-tap" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: '999px 0 0 999px', cursor: 'pointer',
                    border: `1px solid ${t.line}`, borderRight: 'none', background: t.bgElevated2, color: t.text,
                    fontFamily: t.fontSans, fontSize: 12,
                  }}>
                    <span>⛓</span>{c.label}
                  </button>
                  <button onClick={() => setCombos(GU.deleteCombo(c.id))} style={{
                    padding: '7px 8px', borderRadius: '0 999px 999px 0', cursor: 'pointer',
                    border: `1px solid ${t.line}`, background: t.bgElevated2, color: t.textDim,
                  }}><Icon.close width={11} height={11}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Range checklist */}
        <SectionLabel theme={theme}>SELECT RANGES</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {available.map(b => {
            const selected = sel.includes(b.id);
            const dry = batch.bags[b.id]?.dry;
            return (
              <button key={b.id} onClick={() => toggle(b.id)} className="mi-tap" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: selected ? t.accentSoft : t.bgElevated2,
                boxShadow: selected ? `inset 0 0 0 1px ${t.accent}` : 'none',
                color: t.text,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: selected ? t.accent : 'transparent',
                  border: `1.5px solid ${selected ? t.accent : t.lineStrong}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentInk,
                }}>{selected && <Icon.check width={14} height={14}/>}</div>
                <BandChip bandId={b.id} size="sm"/>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: t.fontMono, fontSize: 13, fontWeight: 600,
                  color: dry != null ? t.text : t.textDim }}>
                  {dry != null ? formatG(dry, unit) + unit : 'not weighed'}
                </span>
              </button>
            );
          })}
          {available.length < 2 && (
            <div style={{ padding: '16px 0', textAlign: 'center', fontFamily: t.fontSans, fontSize: 13, color: t.textDim }}>
              Need at least two un-merged ranges to combine.
            </div>
          )}
        </div>

        {/* Summary + name */}
        {sel.length > 0 && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 12, background: t.bgElevated2,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1 }}>
                COMBINED DRY
              </span>
              <span style={{ fontFamily: t.fontMono, fontSize: 20, fontWeight: 700, color: t.accent }}>
                {formatG(sumDry, unit)}<span style={{ fontSize: 12, color: t.textMuted, marginLeft: 3 }}>{unit}</span>
              </span>
            </div>
            <Input label="GRADE NAME" value={label} onChange={setLabel} placeholder="e.g. 90–159µ Blend"/>
            <button onClick={() => setAlsoSave(s => !s)} style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              background: 'transparent', border: 'none', padding: 0, color: t.text,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: alsoSave ? t.accent : 'transparent',
                border: `1.5px solid ${alsoSave ? t.accent : t.lineStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentInk,
              }}>{alsoSave && <Icon.check width={13} height={13}/>}</div>
              <span style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted }}>
                Save as a reusable combination
              </span>
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Btn kind="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn kind="primary" disabled={!canCreate}
            onClick={() => onCreate(sel, label || GU.makeMergeLabel(sel), alsoSave)}
            style={{ flex: 2 }}>
            Create merged grade
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

export function SectionLabel({ children, theme, style }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
  return (
    <div style={{
      fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted,
      letterSpacing: 1.2, marginBottom: 10, ...style,
    }}>{children}</div>
  );
}

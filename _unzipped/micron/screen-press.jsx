// Press builder screen — multi-run, flexible grade combining
const { useState: useStatePR } = React;

function PressScreen({ batch, setBatch, onContinue, onBack, unit, theme }) {
  const t = window.withStage(theme, 'press');
  const [building, setBuilding] = useStatePR(null); // press draft or null
  const [pad, setPad] = useStatePR(null); // which numpad is open

  const GU = window.GradeUnits;
  const allUnits = GU.units(batch);
  const unitMap = Object.fromEntries(allUnits.map(u => [u.id, u]));
  const dryOf = (id) => unitMap[id] ? (unitMap[id].dry || 0) : (batch.bags[id]?.dry || 0);

  const availableUnits = allUnits.filter(u =>
    u.dry != null && u.dry > 0 &&
    !batch.presses.some(p => (p.grades || []).includes(u.id))
  );
  const allPressed = availableUnits.length === 0;

  const startPress = () => {
    const initialGrades = availableUnits.map(u => u.id).slice(0, 1);
    setBuilding({
      id: `P-${batch.presses.length + 1}`,
      grades: initialGrades,
      chargeG: initialGrades.reduce((s,g) => s + dryOf(g), 0) || null,
      yieldG: null,
      yieldByGrade: Object.fromEntries(initialGrades.map(g => [g, null])),
      tempF: 180, pressurePsi: 800, minutes: 3,
      notes: '', photos: [],
    });
  };

  const commit = () => {
    setBatch(b => ({ ...b, presses: [...b.presses, building] }));
    setBuilding(null);
  };

  const toggleGrade = (id) => {
    setBuilding(p => {
      const has = p.grades.includes(id);
      const grades = has ? p.grades.filter(g => g !== id) : [...p.grades, id];
      const charge = grades.reduce((s,g) => s + dryOf(g), 0);
      const ybg = Object.fromEntries(grades.map(g => [g, (p.yieldByGrade || {})[g] ?? null]));
      const totalYield = Object.values(ybg).reduce((s,v) => s + (Number(v) || 0), 0);
      return { ...p, grades, chargeG: charge || null, yieldByGrade: ybg, yieldG: totalYield || null };
    });
  };

  const setGradeYield = (gradeId, value) => {
    setBuilding(p => {
      const ybg = { ...(p.yieldByGrade || {}), [gradeId]: value };
      const totalYield = Object.values(ybg).reduce((s,v) => s + (Number(v) || 0), 0);
      return { ...p, yieldByGrade: ybg, yieldG: totalYield || null };
    });
  };

  return (
    <div style={{ background: t.bgGradient || t.bg, height: '100%', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={batch.strain} subtitle={`${batch.id} · Press`} onBack={onBack} theme={theme}/>
      <Stepper current="press" onJump={(s) => setBatch(b => ({ ...b, stage: s }))}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 16 }}>

      {/* YIELD BY MICRON — running totals across all presses */}
      <YieldByMicronSummary batch={batch} unit={unit} theme={theme}/>

      {/* Completed presses */}
      {batch.presses.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <SectionLabel theme={theme} style={{ padding: '4px 4px' }}>
            COMPLETED · {batch.presses.length}
          </SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {batch.presses.map((p, i) => <PressCard key={p.id} run={p} index={i+1} unit={unit} theme={theme} batch={batch}/>)}
          </div>
        </div>
      )}

      {/* Remaining grades */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel theme={theme}>
          {allPressed ? 'ALL GRADES PRESSED' : 'REMAINING · NOT YET PRESSED'}
        </SectionLabel>
        <div style={{
          padding: 14, borderRadius: 14,
          background: t.bgElevatedGrad || t.bgElevated,
          border: `1px solid ${t.line}`,
          boxShadow: t.innerHi || 'none',
        }}>
          {availableUnits.length === 0 ? (
            <div style={{
              padding: '20px 0', textAlign: 'center',
              fontFamily: t.fontSans, fontSize: 14, color: t.textMuted,
            }}>
              Every grade has been pressed. Complete the batch to close it out.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableUnits.map(u => {
                const bag = u.kind === 'band' ? batch.bags[u.id] : null;
                return (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <UnitChip batch={batch} id={u.id}/>
                      {bag && bag.color != null && (
                        <div style={{
                          width: 16, height: 16, borderRadius: 999,
                          background: t.colorScale[bag.color].hex,
                          border: `1px solid rgba(0,0,0,0.25)`,
                        }}/>
                      )}
                      {bag && bag.melt > 0 && (
                        <span style={{ fontFamily: t.fontMono, fontSize: 11, color: t.textMuted }}>
                          {bag.melt}★
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: t.fontMono, fontSize: 16, color: t.text, fontWeight: 700 }}>
                      {formatG(u.dry, unit)}<span style={{ color: t.textMuted, fontSize: 12, marginLeft: 3 }}>{unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!allPressed && (
          <Btn kind="primary" onClick={startPress} fullWidth style={{ marginTop: 14 }} icon={<Icon.plus width={18} height={18}/>}>
            New press run
          </Btn>
        )}
      </div>

      {/* Press builder sheet */}
      <Sheet open={!!building} onClose={() => setBuilding(null)}
        title={building ? `New press · ${building.id}` : ''}>
        {building && (
          <div style={{ padding: '4px 20px 8px' }}>
            {/* Grade selection */}
            <SectionLabel theme={theme}>SELECT GRADES TO COMBINE</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allUnits.filter(u => u.dry != null && u.dry > 0).map(u => {
                const selected = building.grades.includes(u.id);
                const alreadyPressed = batch.presses.some(p => (p.grades||[]).includes(u.id));
                const disabled = alreadyPressed && !selected;
                return (
                  <button key={u.id}
                    onClick={() => !disabled && toggleGrade(u.id)}
                    disabled={disabled}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 12, border: 'none',
                      background: selected ? t.accentSoft : t.bgElevated2,
                      boxShadow: selected ? `inset 0 0 0 1px ${t.accent}` : 'none',
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      color: t.text,
                    }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: selected ? t.accent : 'transparent',
                      border: `1.5px solid ${selected ? t.accent : t.lineStrong}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: t.accentInk, flexShrink: 0,
                    }}>
                      {selected && <Icon.check width={14} height={14}/>}
                    </div>
                    <UnitChip batch={batch} id={u.id} size="sm"/>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <span style={{ fontFamily: t.fontMono, fontSize: 15, fontWeight: 700, color: t.text }}>
                        {formatG(u.dry, unit)}{unit}
                      </span>
                      {alreadyPressed && !selected && (
                        <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, marginTop: 2 }}>
                          ALREADY PRESSED
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Charge */}
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: t.bgElevated2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted, letterSpacing: 1 }}>
                CHARGE
              </div>
              <div style={{ fontFamily: t.fontMono, fontSize: 20, fontWeight: 700, color: t.text }}>
                {building.chargeG ? formatG(building.chargeG, unit) : '—'}
                <span style={{ fontSize: 13, color: t.textMuted, marginLeft: 3 }}>{unit}</span>
              </div>
            </div>

            {/* Params */}
            <div style={{
              marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            }}>
              <ParamCard icon={<Icon.thermo width={16} height={16}/>} label="TEMP"
                value={building.tempF} unit="°F"
                onTap={() => setPad('temp')} theme={theme}/>
              <ParamCard icon={<Icon.gauge width={16} height={16}/>} label="PRESSURE"
                value={building.pressurePsi} unit="PSI"
                onTap={() => setPad('pressure')} theme={theme}/>
              <ParamCard icon={<Icon.clock width={16} height={16}/>} label="TIME"
                value={building.minutes} unit="MIN"
                onTap={() => setPad('time')} theme={theme}/>
            </div>

            {/* Per-grade yield entry */}
            <div style={{ marginTop: 16 }}>
              <SectionLabel theme={theme}>ROSIN YIELD · PER MICRON</SectionLabel>
              <div style={{
                padding: 12, borderRadius: 14,
                background: t.bg, border: `1px solid ${t.line}`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {building.grades.length === 0 && (
                  <div style={{
                    padding: '14px 0', textAlign: 'center',
                    fontFamily: t.fontSans, fontSize: 13, color: t.textDim,
                  }}>Select at least one grade above</div>
                )}
                {building.grades.map(g => {
                  const y = (building.yieldByGrade || {})[g];
                  const gDry = dryOf(g);
                  const ret = (y != null && gDry) ? (y / gDry * 100) : null;
                  return (
                    <button key={g} onClick={() => setPad('yield:' + g)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: t.bgElevated2, color: t.text, textAlign: 'left',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UnitChip batch={batch} id={g} size="sm"/>
                        <span style={{
                          fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted,
                        }}>CHARGE {formatG(gDry, unit)}{unit}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontFamily: t.fontMono, fontSize: 18, fontWeight: 700,
                          color: y != null ? t.text : t.textDim,
                        }}>
                          {y != null ? formatG(y, unit) : '—'}
                          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 2 }}>{unit}</span>
                        </span>
                        {ret != null && (
                          <div style={{ fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.accent }}>
                            {ret.toFixed(1)}% return
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Total row */}
                {building.grades.length > 1 && (
                  <div style={{
                    marginTop: 4, padding: '10px 12px', borderRadius: 10,
                    background: t.accentSoft, border: `1px solid ${t.accent}33`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{
                      fontFamily: t.fontMono, fontSize: 13, color: t.accent, letterSpacing: 1, fontWeight: 700,
                    }}>TOTAL YIELD</span>
                    <span style={{
                      fontFamily: t.fontMono, fontSize: 20, fontWeight: 700, color: t.text,
                    }}>
                      {building.yieldG ? formatG(building.yieldG, unit) : '—'}
                      <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 2 }}>{unit}</span>
                      {building.chargeG && building.yieldG && (
                        <span style={{ color: t.accent, fontSize: 12, marginLeft: 8 }}>
                          {((building.yieldG / building.chargeG) * 100).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes + photos */}
            <div style={{ marginTop: 14 }}>
              <PhotoNotes
                label="PRESS NOTES & PHOTOS"
                value={building.notes}
                photos={building.photos || []}
                onChange={v => setBuilding(p => ({ ...p, notes: v }))}
                onPhotosChange={ps => setBuilding(p => ({ ...p, photos: ps }))}
                placeholder="Observations, adjustments, appearance, swing/stretch…"
                theme={theme}/>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Btn kind="ghost" onClick={() => setBuilding(null)} style={{ flex: 1 }}>Discard</Btn>
              <Btn kind="primary" onClick={commit}
                disabled={building.grades.length === 0 || !building.yieldG}
                style={{ flex: 2 }}>
                Log press
              </Btn>
            </div>
          </div>
        )}

        {/* Nested number pads for params */}
        {building && (
          <>
            <NumberPad open={pad === 'temp'} onClose={() => setPad(null)}
              initial={building.tempF}
              onSubmit={v => setBuilding(p => ({ ...p, tempF: v }))}
              title="Temperature" unit="°F"/>
            <NumberPad open={pad === 'pressure'} onClose={() => setPad(null)}
              initial={building.pressurePsi}
              onSubmit={v => setBuilding(p => ({ ...p, pressurePsi: v }))}
              title="Pressure" unit="PSI"/>
            <NumberPad open={pad === 'time'} onClose={() => setPad(null)}
              initial={building.minutes}
              onSubmit={v => setBuilding(p => ({ ...p, minutes: v }))}
              title="Time" unit="min"/>
            {building.grades.map(g => (
              <NumberPad key={g} open={pad === 'yield:' + g} onClose={() => setPad(null)}
                initial={(building.yieldByGrade || {})[g]}
                onSubmit={v => setGradeYield(g, v)}
                title={`Yield · ${g}µ`} unit={unit}
                helper={`Charge was ${formatG(dryOf(g), unit)}${unit}`}/>
            ))}
          </>
        )}
      </Sheet>
      </div>

      <BottomBar theme={theme}>
        <Btn kind="ghost" onClick={onBack} style={{ flex: 1 }}>Back</Btn>
        <Btn kind="primary" onClick={onContinue}
          disabled={batch.presses.length === 0}
          style={{ flex: 2 }}>
          {allPressed ? 'Complete batch' : 'Finish & view summary'}
        </Btn>
      </BottomBar>
    </div>
  );
}

function YieldByMicronSummary({ batch, unit, theme }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  // Sum yield per grade across all completed presses
  const totals = {};
  let grandTotal = 0;
  batch.presses.forEach(p => {
    if (p.yieldByGrade) {
      Object.entries(p.yieldByGrade).forEach(([g, v]) => {
        if (v != null) { totals[g] = (totals[g] || 0) + Number(v); grandTotal += Number(v); }
      });
    } else if (p.yieldG != null && p.grades && p.grades.length) {
      // Legacy: distribute by dry weight
      const totalDry = p.grades.reduce((s,g) => s + (batch.bags[g]?.dry || 0), 0) || 1;
      p.grades.forEach(g => {
        const share = (batch.bags[g]?.dry || 0) / totalDry * p.yieldG;
        totals[g] = (totals[g] || 0) + share; grandTotal += share;
      });
    }
  });

  return (
    <div style={{ padding: '0 16px 14px' }}>
      <div style={{
        padding: 16, borderRadius: 16,
        background: t.bgElevatedGrad || t.bgElevated,
        border: `1px solid ${t.line}`,
        boxShadow: t.innerHi || 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12,
        }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted, letterSpacing: 1.2 }}>
            YIELD BY MICRON
          </div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: -1,
          }}>
            {grandTotal > 0 ? grandTotal.toFixed(1) : '0.0'}
            <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {window.GradeUnits.units(batch).map(u => {
            const uDry = u.dry || 0;
            const v = totals[u.id] || 0;
            const pct = uDry ? (v / uDry * 100) : 0;
            const filled = v > 0;
            const barColor = u.kind === 'merge' ? t.accent : t.bands[u.id];
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 8,
                background: filled ? t.bgElevated2 : 'transparent',
                opacity: uDry === 0 ? 0.4 : 1,
              }}>
                <UnitChip batch={batch} id={u.id} size="sm"/>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, pct)}%`, height: '100%',
                      background: barColor, borderRadius: 2,
                    }}/>
                  </div>
                </div>
                <div style={{
                  fontFamily: t.fontMono, fontSize: 15, fontWeight: 700,
                  color: filled ? t.text : t.textDim, minWidth: 58, textAlign: 'right',
                }}>
                  {filled ? v.toFixed(1) : '—'}
                  <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 2 }}>{unit}</span>
                </div>
                <div style={{
                  fontFamily: t.fontMono, fontSize: 12, fontWeight: 500, color: t.textMuted,
                  minWidth: 42, textAlign: 'right',
                }}>
                  {filled && pct > 0 ? pct.toFixed(1) + '%' : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ParamCard({ icon, label, value, unit, onTap, theme }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  return (
    <button onClick={onTap} style={{
      padding: '12px 10px', borderRadius: 12, border: 'none',
      background: t.bgElevated2, color: t.text, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.textMuted }}>
        {icon}
        <span style={{ fontFamily: t.fontMono, fontSize: 11, fontWeight: 600, letterSpacing: 0.8 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: t.fontMono, fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.5,
      }}>
        {value || '—'}
        <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 3 }}>{unit}</span>
      </div>
    </button>
  );
}

function PressCard({ run, index, unit, theme, batch }) {
  const t = (window.__stage && window.withStage) ? window.withStage(theme, window.__stage) : window.MicronTokens[theme];
  const ret = run.chargeG ? (run.yieldG / run.chargeG * 100) : 0;
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: t.bgElevatedGrad || t.bgElevated,
      border: `1px solid ${t.line}`,
      boxShadow: t.innerHi || 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: t.accent, color: t.accentInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: t.fontMono, fontSize: 11, fontWeight: 700,
          }}>{index}</div>
          <div style={{ fontFamily: t.fontSans, fontSize: 15, fontWeight: 700, color: t.text }}>
            {run.grades.length === 1 ? 'Single grade' : `${run.grades.length}-grade combo`}
          </div>
        </div>
        <div style={{ fontFamily: t.fontMono, fontSize: 16, fontWeight: 700, color: t.text }}>
          {run.yieldG}<span style={{ color: t.textMuted, fontSize: 12 }}>{unit}</span>
          <span style={{ color: t.accent, fontSize: 12, fontWeight: 600, marginLeft: 6 }}>{ret.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
        {run.grades.map(g => {
          const y = (run.yieldByGrade || {})[g];
          const u = batch ? window.GradeUnits.resolveUnit(batch, g) : { kind: 'band', label: g + 'µ', bandIds: [g] };
          const isMerge = u.kind === 'merge';
          const dot = isMerge ? t.accent : (t.bands[g] || t.accent);
          return (
            <div key={g} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 8px 3px 6px', borderRadius: 999,
              background: isMerge ? t.accentSoft : 'transparent', border: `1px solid ${dot}55`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }}/>
              <span style={{
                fontFamily: t.fontMono, fontSize: 12, color: dot, fontWeight: 700, letterSpacing: 0.5,
              }}>{isMerge ? u.label : `${g}µ`}</span>
              {y != null && (
                <span style={{
                  fontFamily: t.fontMono, fontSize: 12, color: t.text, fontWeight: 700,
                }}>{y.toFixed(1)}{unit}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', gap: 12, marginTop: 10,
        fontFamily: t.fontMono, fontSize: 13, fontWeight: 500, color: t.textMuted,
      }}>
        <span><Icon.thermo width={11} height={11} style={{ display: 'inline-block', verticalAlign: -1 }}/> {run.tempF}°F</span>
        <span><Icon.gauge width={11} height={11} style={{ display: 'inline-block', verticalAlign: -1 }}/> {run.pressurePsi} PSI</span>
        <span><Icon.clock width={11} height={11} style={{ display: 'inline-block', verticalAlign: -1 }}/> {run.minutes}min</span>
      </div>
      {run.notes && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 8,
          background: t.bgElevated2,
          fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, lineHeight: 1.45,
        }}>{run.notes}</div>
      )}
      {run.photos && run.photos.length > 0 && (
        <div style={{
          marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap',
        }}>
          {run.photos.slice(0,4).map(p => (
            <div key={p.id} style={{
              width: 48, height: 48, borderRadius: 6, overflow: 'hidden',
              border: `1px solid ${t.line}`,
            }}>
              <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
          ))}
          {run.photos.length > 4 && (
            <div style={{
              width: 48, height: 48, borderRadius: 6, background: t.bgElevated2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.fontMono, fontSize: 11, color: t.textMuted,
            }}>+{run.photos.length - 4}</div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PressScreen, PressCard, YieldByMicronSummary });

// Shared primitives: icons, stepper, scale face, number pad, swatches, melt rating.

import React from 'react';
import { MicronTokens, MicronStages, MicronBands } from '../lib/tokens.js';
import { GradeUnits } from '../lib/grade-units.js';

const { useState, useEffect, useRef, useMemo } = React;

// ─────────── Icons (tight, consistent 20-stroke set) ───────────
export const Icon = {
  plus:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  close:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  check:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chev:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevL:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevDn: (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  drop:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M10 3s-5 5.5-5 9a5 5 0 0010 0c0-3.5-5-9-5-9z" stroke="currentColor" strokeWidth="1.6"/></svg>,
  snow:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M10 2v16M3 10h14M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  press:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M4 3h12M4 17h12M6 3v4h8V3M6 17v-4h8v4M7 9h6v2H7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  scale:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M10 10l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  thermo: (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M10 2a2 2 0 012 2v7.5a3.5 3.5 0 11-4 0V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.4"/><circle cx="10" cy="14.5" r="1.3" fill="currentColor"/></svg>,
  gauge:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M3 14a7 7 0 1114 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10 14l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  clock:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  note:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M4 3h12v14l-3-2-3 2-3-2-3 2V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  star:   (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M10 2l2.5 5.2 5.7.8-4.1 4 1 5.6L10 15l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 2z"/></svg>,
  starO:  (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M10 2l2.5 5.2 5.7.8-4.1 4 1 5.6L10 15l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  more:   (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>,
  settings: (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  filter: (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  wash:   (p) => <svg viewBox="0 0 20 20" fill="none" {...p}><path d="M4 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M4 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M4 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

// ─────────── Utilities ───────────
export function useTheme(mode = 'dark') {
  const base = MicronTokens[mode];
  const stageId = window.__stage;
  if (!stageId || !MicronStages) return base;
  const stage = MicronStages[stageId];
  if (!stage || !stage[mode]) return base;
  return { ...base, ...stage[mode], stage: stageId, stageKind: stage.kind };
}

export function formatG(v, unit = 'g') {
  if (v == null || v === '') return '—';
  const num = Number(v);
  if (unit === 'oz') return (num / 28.3495).toFixed(2);
  return num.toFixed(num < 10 ? 2 : 1);
}

// ─────────── Button ───────────
export function Btn({ kind = 'primary', children, onClick, disabled, style, icon, fullWidth }) {
  const t = useTheme(window.__theme || 'dark');
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, padding: '0 20px', borderRadius: t.btnRadius ?? 999,
    fontFamily: t.fontSans, fontSize: t.hl ? 15 : 16, fontWeight: t.hl ? 600 : 600,
    letterSpacing: t.hl ? 1 : -0.2,
    textTransform: t.hl ? 'uppercase' : 'none',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1, transition: 'transform 80ms',
    width: fullWidth ? '100%' : undefined, WebkitTapHighlightColor: 'transparent',
  };
  const variants = {
    primary: {
      background: t.accentGrad || t.accent, color: t.accentInk,
      boxShadow: t.name !== 'light'
        ? 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.2)'
        : '0 4px 12px rgba(0,0,0,0.15)',
    },
    secondary: {
      background: t.bgElevated2Grad || t.bgElevated2, color: t.text,
      boxShadow: t.innerHi || 'none',
    },
    ghost: { background: 'transparent', color: t.text, border: `1px solid ${t.lineStrong}` },
    subtle: { background: 'transparent', color: t.textMuted, height: 44, padding: '0 12px' },
    danger: { background: 'transparent', color: t.danger, border: `1px solid ${t.danger}55` },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      className="mi-btn"
      style={{ ...base, ...variants[kind], ...style }}>
      {icon}{children}
    </button>
  );
}

// ─────────── Stepper (Setup → Wash → Freeze Dry → Press) ───────────
export function Stepper({ current, onJump }) {
  const t = useTheme(window.__theme || 'dark');
  const steps = [
    { id: 'setup',     label: 'SETUP' },
    { id: 'wash',      label: 'WASH' },
    { id: 'freezedry', label: 'FREEZE DRY' },
    { id: 'press',     label: 'PRESS' },
    { id: 'cure',      label: 'CURE' },
  ];
  // Per-stage hue so the stepper visibly telegraphs cold → warm
  const stageColor = (id) => {
    const stage = MicronStages && MicronStages[id];
    if (!stage || stage.kind === 'neutral') return t.accent;
    const override = stage[t.name];
    return (override && override.accent) || t.accent;
  };
  const curIdx = steps.findIndex(s => s.id === current);
  const curColor = stageColor(current);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '10px 16px 14px', background: 'transparent',
    }}>
      {steps.map((s, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        const col = stageColor(s.id);
        const dotBg = (active || done) ? col : t.bgElevated2;
        const dotInk = (active || done)
          ? (MicronStages[s.id] && MicronStages[s.id][t.name] && MicronStages[s.id][t.name].accentInk) || t.accentInk
          : t.textDim;
        return (
          <React.Fragment key={s.id}>
            <div
              onClick={() => onJump && onJump(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: onJump ? 'pointer' : 'default',
                padding: '6px 8px', borderRadius: 999,
                background: active ? `color-mix(in oklch, ${col} 18%, transparent)` : 'transparent',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dotBg, color: dotInk,
                fontFamily: t.fontMono, fontSize: 11, fontWeight: 700,
                boxShadow: active ? `0 0 0 3px color-mix(in oklch, ${col} 22%, transparent)` : 'none',
              }}>
                {done ? <Icon.check width={12} height={12}/> : i+1}
              </div>
              <div style={{
                fontFamily: t.fontMono, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8,
                color: active ? t.text : done ? t.textMuted : t.textDim,
              }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1, minWidth: 4,
                background: i < curIdx ? col : t.line,
              }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────── Scale face (tap to enter weight) ───────────
export function ScaleFace({ value, unit = 'g', label, onTap, size = 'lg', bandColor, placeholder = '— —' }) {
  const t = useTheme(window.__theme || 'dark');
  const big = size === 'lg';
  const diameter = big ? 140 : 92;
  const hasValue = value != null && value !== '';

  // Hashashin — rectangular recessed LCD readout (matches the v5 concept)
  if (t.hl) {
    return (
      <div onClick={onTap} className="mi-tap" style={{
        width: '100%', cursor: 'pointer', userSelect: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: big ? 10 : 6,
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #1A201C 0%, #0D110E 100%)',
          border: '1px solid #0C0F0B',
          boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.4)',
          borderRadius: t.cardRadius ?? 4,
          padding: big ? '18px 18px' : '12px 14px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <span className={hasValue ? 'mi-lcd' : undefined} style={{
            fontFamily: t.fontLcd || t.fontMono, fontSize: big ? 46 : 28, lineHeight: 0.95, letterSpacing: -1,
            color: hasValue ? (t.readout || t.accent) : '#4E574F',
          }}>{hasValue ? formatG(value, unit) : (big ? '0.000' : '0.0')}</span>
          <span style={{
            fontFamily: t.fontMono, fontSize: big ? 14 : 11, color: '#5A635B', marginBottom: big ? 6 : 3,
          }}>{unit}</span>
        </div>
        {label && (
          <div style={{
            fontFamily: t.fontSans, fontSize: 12, color: t.textMuted, textAlign: 'center', letterSpacing: 0.5,
          }}>{label}</div>
        )}
      </div>
    );
  }

  return (
    <div onClick={onTap} style={{
      width: '100%', cursor: 'pointer', userSelect: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: big ? 12 : 8,
    }}>
      {/* dial — gunmetal with recessed bezel */}
      <div style={{
        width: diameter, height: diameter, borderRadius: 999, position: 'relative',
        background: t.name !== 'light'
          ? `radial-gradient(circle at 50% 30%, #2C333E 0%, #1A1E25 55%, #0C0E12 100%)`
          : `radial-gradient(circle at 50% 38%, ${t.bgElevated2} 0%, ${t.bg} 88%)`,
        boxShadow: t.name !== 'light'
          ? `inset 0 2px 3px rgba(255,255,255,0.12), inset 0 -3px 8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.55)`
          : `inset 0 0 0 1px ${t.line}, inset 0 -6px 20px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {/* tick marks */}
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {Array.from({length: 40}).map((_, i) => {
            const a = (i / 40) * Math.PI * 2 - Math.PI/2;
            const r1 = 44, r2 = i % 5 === 0 ? 38 : 41;
            const x1 = 50 + Math.cos(a) * r1, y1 = 50 + Math.sin(a) * r1;
            const x2 = 50 + Math.cos(a) * r2, y2 = 50 + Math.sin(a) * r2;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i % 5 === 0 ? t.textMuted : t.textDim} strokeWidth={i % 5 === 0 ? 0.6 : 0.3} />;
          })}
          {hasValue && (
            <circle cx="50" cy="50" r="2" fill={bandColor || t.accent}/>
          )}
        </svg>
        {/* readout */}
        <div style={{
          position: 'relative', textAlign: 'center',
          background: t.hl
            ? 'linear-gradient(180deg, #1A201C 0%, #0E120F 100%)'
            : t.name !== 'light'
              ? 'linear-gradient(180deg, #0A0C10 0%, #05070A 100%)'
              : t.bg,
          borderRadius: t.cardRadius ?? 12, padding: big ? '6px 12px' : '4px 8px',
          boxShadow: t.name !== 'light'
            ? 'inset 0 1px 2px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.04)'
            : `inset 0 0 0 1px ${t.line}`,
        }}>
          <div style={{
            fontFamily: t.fontMono, fontSize: big ? 22 : 16, fontWeight: 700,
            color: hasValue ? (t.readout || t.text) : t.textDim,
            letterSpacing: -0.5, lineHeight: 1,
          }}>{hasValue ? formatG(value, unit) : placeholder}</div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 9, color: t.textDim,
            letterSpacing: 1, marginTop: 2,
          }}>{unit.toUpperCase()}</div>
        </div>
      </div>
      {label && (
        <div style={{
          fontFamily: t.fontSans, fontSize: 12, color: t.textMuted, fontWeight: 500,
          textAlign: 'center',
        }}>{label}</div>
      )}
    </div>
  );
}

// ─────────── Number pad (sheet) ───────────
export function NumberPad({ open, onClose, initial = '', onSubmit, title, unit = 'g', helper }) {
  const t = useTheme(window.__theme || 'dark');
  const [val, setVal] = useState(String(initial ?? ''));
  useEffect(() => { if (open) setVal(String(initial ?? '')); }, [open, initial]);

  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
  const tap = (k) => {
    if (k === '⌫') setVal(v => v.slice(0, -1));
    else if (k === '.') setVal(v => v.includes('.') ? v : (v === '' ? '0.' : v + '.'));
    else setVal(v => (v === '0' ? k : v + k).slice(0, 7));
  };
  return (
    <Sheet open={open} onClose={onClose} title={title || 'Enter weight'}>
      <div style={{
        textAlign: 'center', padding: '12px 20px 4px',
      }}>
        <div style={{
          fontFamily: t.fontLcd || t.fontMono, fontSize: 56, fontWeight: 700,
          color: val ? (t.readout || t.text) : t.textDim, letterSpacing: -2, lineHeight: 1,
        }}>
          {val || '0'}
          <span style={{ fontSize: 22, color: t.textMuted, marginLeft: 6 }}>{unit}</span>
        </div>
        {helper && (
          <div style={{
            fontFamily: t.fontSans, fontSize: 12, color: t.textMuted, marginTop: 10,
          }}>{helper}</div>
        )}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        padding: '18px 16px 8px',
      }}>
        {keys.map(k => (
          <button key={k} onClick={() => tap(k)}
            style={{
              height: 60, borderRadius: 16, border: 'none',
              background: k === '⌫' ? 'transparent' : t.bgElevated2, color: t.text,
              fontFamily: t.fontMono, fontSize: 26, fontWeight: 500,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>{k}</button>
        ))}
      </div>
      <div style={{ padding: '4px 16px 20px', display: 'flex', gap: 10 }}>
        <Btn kind="ghost" onClick={() => { onSubmit(null); onClose(); }} style={{ flex: 1 }}>Clear</Btn>
        <Btn kind="primary" onClick={() => { onSubmit(val === '' ? null : Number(val)); onClose(); }} style={{ flex: 2 }}>Save</Btn>
      </div>
    </Sheet>
  );
}

// ─────────── Bottom sheet ───────────
export function Sheet({ open, onClose, title, children, height }) {
  const t = useTheme(window.__theme || 'dark');
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'auto',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', animation: 'micron-fade 180ms ease',
      }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: t.bgElevated, borderRadius: '24px 24px 0 0',
        boxShadow: `0 -10px 30px rgba(0,0,0,0.4)`,
        maxHeight: '85%', overflow: 'auto',
        animation: 'micron-sheet 240ms cubic-bezier(.2,.8,.2,1)',
        paddingBottom: 24,
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.lineStrong }}/>
        </div>
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px 8px',
          }}>
            <div style={{ fontFamily: t.fontSans, fontSize: 18, fontWeight: 600, color: t.text }}>
              {title}
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 999, border: 'none',
              background: t.bgElevated2, color: t.textMuted, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><Icon.close width={16} height={16}/></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─────────── Color swatches (Blonde → Dark) ───────────
export function ColorSwatches({ value, onChange }) {
  const t = useTheme(window.__theme || 'dark');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {t.colorScale.map((c, i) => {
          const active = value === i;
          return (
            <button key={i} onClick={() => onChange(i)}
              className="mi-tap"
              style={{
                flex: 1, aspectRatio: '1 / 1', borderRadius: 10,
                background: c.hex, border: 'none',
                boxShadow: active
                  ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${t.accent}`
                  : `inset 0 0 0 1px rgba(0,0,0,0.2)`,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                transition: 'transform 120ms', transform: active ? 'scale(1.05)' : 'scale(1)',
              }}/>
          );
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1,
      }}>
        <span>BLONDE</span>
        {value != null && (
          <span style={{ color: t.textMuted }}>{t.colorScale[value].name.toUpperCase()}</span>
        )}
        <span>DARK</span>
      </div>
    </div>
  );
}

// ─────────── Melt rating (1–6 stars) ───────────
export function MeltRating({ value = 0, onChange, max = 6 }) {
  const t = useTheme(window.__theme || 'dark');
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        const I = filled ? Icon.star : Icon.starO;
        return (
          <button key={i} onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            className="mi-tap"
            style={{
              width: 28, height: 28, border: 'none', background: 'transparent',
              cursor: 'pointer', padding: 0, color: filled ? t.accent : t.textDim,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <I width={22} height={22}/>
          </button>
        );
      })}
      <span style={{
        fontFamily: t.fontMono, fontSize: 11, color: t.textMuted, marginLeft: 6,
      }}>{value ? `${value}★` : '—'}</span>
    </div>
  );
}

// ─────────── Input ───────────
export function Input({ value, onChange, placeholder, label, mono, multi, style }) {
  const t = useTheme(window.__theme || 'dark');
  const C = multi ? 'textarea' : 'input';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <span style={{
          fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1,
        }}>{label}</span>
      )}
      <C
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multi ? 3 : undefined}
        style={{
          background: t.bgElevated2, border: `1px solid ${t.line}`,
          borderRadius: 12, padding: '12px 14px',
          fontFamily: mono ? t.fontMono : t.fontSans, fontSize: 15, color: t.text,
          outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical',
          minHeight: multi ? 72 : undefined,
        }}
      />
    </label>
  );
}

// ─────────── Band chip (micron label) ───────────
export function BandChip({ bandId, size = 'md' }) {
  const t = useTheme(window.__theme || 'dark');
  const color = t.bands[bandId];
  const band = MicronBands.find(b => b.id === bandId);
  const pad = size === 'sm' ? '4px 9px' : '6px 11px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad,
      borderRadius: 999, background: 'transparent',
      border: `1px solid ${color}55`, color: color,
      fontFamily: t.fontMono, fontSize: fs, fontWeight: 700, letterSpacing: 0.5,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: color,
      }}/>
      {band?.label || bandId + 'µ'}
    </span>
  );
}

// ─────────── Unit chip — band OR merged grade ───────────
export function UnitChip({ batch, id, size = 'md' }) {
  const t = useTheme(window.__theme || 'dark');
  const u = GradeUnits.resolveUnit(batch, id);
  if (u.kind === 'band') return <BandChip bandId={id} size={size}/>;
  // merged grade chip
  const pad = size === 'sm' ? '4px 10px' : '6px 12px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad,
      borderRadius: 999, background: t.accentSoft,
      border: `1px solid ${t.accent}66`, color: t.accent,
      fontFamily: t.fontMono, fontSize: fs, fontWeight: 700, letterSpacing: 0.3,
    }}>
      <span style={{ fontSize: fs }}>⛓</span>
      {u.label}
      <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
        {u.bandIds.map(bid => (
          <span key={bid} style={{ width: 5, height: 5, borderRadius: 999, background: t.bands[bid] }}/>
        ))}
      </span>
    </span>
  );
}

// ─────────── Segmented control ───────────
export function Segmented({ options, value, onChange }) {
  const t = useTheme(window.__theme || 'dark');
  return (
    <div style={{
      display: 'inline-flex', padding: 3, background: t.bgElevated2,
      borderRadius: 10, gap: 2,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: active ? t.bgElevated : 'transparent',
              color: active ? t.text : t.textMuted,
              fontFamily: t.fontMono, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', letterSpacing: 0.5,
              boxShadow: active ? `0 1px 2px rgba(0,0,0,0.3)` : 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// Keep CSS animations in one place (injected once on load)
export function injectGlobalCSS() {
  if (document.getElementById('micron-css')) return;
  const s = document.createElement('style');
  s.id = 'micron-css';
  s.textContent = `
    @keyframes micron-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes micron-fade  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes micron-pop   { from { transform: scale(.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes mi-enter     { from { transform: translateY(12px); } to { transform: none; } }
    @keyframes mi-rise      { from { transform: translateY(14px); } to { transform: none; } }
    @keyframes mi-lcd-glow  { 0%,100% { text-shadow: 0 0 7px rgba(217,102,63,0.30); } 50% { text-shadow: 0 0 15px rgba(217,102,63,0.55); } }
    @keyframes mi-pulse     { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
    @keyframes mi-sheen     { from { transform: translateX(-120%); } to { transform: translateX(220%); } }

    *::-webkit-scrollbar { width: 0; height: 0; }

    /* Interactive primitives — hover/press feedback */
    .mi-card { transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s, filter .2s; will-change: transform; }
    .mi-row  { transition: transform .16s cubic-bezier(.2,.8,.2,1), filter .16s; }
    .mi-tap  { transition: transform .12s cubic-bezier(.2,.8,.2,1), filter .16s, box-shadow .2s; }
    .mi-btn  { position: relative; overflow: hidden; transition: transform .1s, filter .18s, box-shadow .22s; }

    @media (hover: hover) {
      .mi-card:hover { transform: translateY(-2px); filter: brightness(1.07); }
      .mi-row:hover  { transform: translateX(3px); filter: brightness(1.09); }
      .mi-tap:hover  { filter: brightness(1.12); }
      .mi-btn:hover  { filter: brightness(1.08); }
      .mi-btn:hover::after {
        content: ''; position: absolute; top: 0; bottom: 0; width: 40%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent);
        animation: mi-sheen .65s ease-out; pointer-events: none;
      }
    }
    .mi-tap:active { transform: scale(.95); }
    .mi-card:active { transform: translateY(-1px) scale(.995); }
    .mi-btn:active { transform: scale(.97); }
    .mi-row:active { transform: translateX(1px) scale(.997); }

    /* Entrance + stagger — NO fill-mode, so resting state is always visible
       even if the animation is throttled or never runs. */
    .mi-enter { animation: mi-enter .34s cubic-bezier(.2,.8,.2,1); }
    @media (prefers-reduced-motion: no-preference) {
      .mi-stagger > * { animation: mi-rise .42s cubic-bezier(.2,.8,.2,1); }
      .mi-stagger > *:nth-child(1){ animation-delay: .02s; }
      .mi-stagger > *:nth-child(2){ animation-delay: .06s; }
      .mi-stagger > *:nth-child(3){ animation-delay: .10s; }
      .mi-stagger > *:nth-child(4){ animation-delay: .14s; }
      .mi-stagger > *:nth-child(5){ animation-delay: .18s; }
      .mi-stagger > *:nth-child(6){ animation-delay: .22s; }
      .mi-stagger > *:nth-child(7){ animation-delay: .26s; }
      .mi-stagger > *:nth-child(8){ animation-delay: .30s; }
      .mi-lcd { animation: mi-lcd-glow 3.2s ease-in-out infinite; }
      .mi-live { animation: mi-pulse 1.6s ease-in-out infinite; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mi-enter, .mi-stagger > * { animation: none !important; }
    }

    /* Square-corner mode (Hashashin themes) — overrides inline border-radius.
       Element-scoped (cheap) so style recalc stays fast; SVG shapes untouched. */
    .hl-square div, .hl-square button, .hl-square input, .hl-square textarea,
    .hl-square span, .hl-square a, .hl-square img, .hl-square label,
    .hl-square section, .hl-square header { border-radius: 2px !important; }
  `;
  document.head.appendChild(s);
}

// PhotoNotes — reusable notes field with attached photo thumbnails.
// For the prototype, photos are stored as data URLs in state. In production
// these will be uploaded to Supabase Storage and replaced with signed URLs.

import React from 'react';
import { MicronTokens, withStage } from '../lib/tokens.js';
import { Icon } from './primitives.jsx';

const { useRef: useRefPN, useState: useStatePN } = React;

export function PhotoNotes({ label, value = '', photos = [], onChange, onPhotosChange, placeholder, theme, accentColor }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
  const fileRef = useRefPN(null);
  const [lightbox, setLightbox] = useStatePN(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id: Date.now() + '-' + Math.random(), url: r.result, name: f.name, ts: new Date().toISOString() });
      r.readAsDataURL(f);
    }))).then(newPhotos => {
      onPhotosChange([...(photos || []), ...newPhotos]);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  const remove = (id) => onPhotosChange(photos.filter(p => p.id !== id));
  const accent = accentColor || t.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted, letterSpacing: 1.2,
          }}>{label}</span>
          <button onClick={() => fileRef.current?.click()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: accent, fontFamily: t.fontMono, fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
          }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7 5l1.5-2h3L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
            ADD PHOTO
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple
            capture="environment"
            onChange={handleFiles}
            style={{ display: 'none' }}/>
        </div>
      )}

      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          background: t.bgElevated2, border: `1px solid ${t.line}`,
          borderRadius: 12, padding: '12px 14px',
          fontFamily: t.fontSans, fontSize: 15, fontWeight: 500, color: t.text,
          outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical',
          minHeight: 72,
        }}/>

      {photos && photos.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
        }}>
          {photos.map(p => (
            <div key={p.id} style={{
              position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden',
              border: `1px solid ${t.line}`, cursor: 'zoom-in',
            }}
              onClick={() => setLightbox(p)}>
              <img src={p.url} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              <button onClick={(e) => { e.stopPropagation(); remove(p.id); }} style={{
                position: 'absolute', top: 4, right: 4,
                width: 22, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,0.7)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon.close width={12} height={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.94)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out',
        }}>
          <img src={lightbox.url} alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }}/>
        </div>
      )}
    </div>
  );
}

// Searchable dropdown w/ "Add new" — used for Source Name and other free-vocabulary fields.
export function ComboField({ label, value, onChange, options = [], allowAdd = true, placeholder, theme }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
  const [open, setOpen] = useStatePN(false);
  const [query, setQuery] = useStatePN('');
  const filtered = options.filter(o => !query || o.toLowerCase().includes(query.toLowerCase()));
  const noExactMatch = query && !options.some(o => o.toLowerCase() === query.toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      {label && (
        <span style={{
          fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1,
        }}>{label}</span>
      )}
      <button onClick={() => setOpen(o => !o)} style={{
        textAlign: 'left',
        background: t.bgElevated2, border: `1px solid ${t.line}`,
        borderRadius: 12, padding: '12px 14px',
        fontFamily: t.fontSans, fontSize: 15,
        color: value ? t.text : t.textDim,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder || 'Select…'}
        </span>
        <Icon.chevDn width={16} height={16} style={{ color: t.textMuted, flexShrink: 0 }}/>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 50, background: 'transparent',
          }}/>
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 51,
            marginTop: 4, padding: 6, borderRadius: 12,
            background: t.bgElevated, border: `1px solid ${t.lineStrong}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            maxHeight: 260, overflowY: 'auto',
          }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${label ? label.toLowerCase() : 'options'}…`}
              style={{
                width: '100%', boxSizing: 'border-box', background: t.bgElevated2,
                border: `1px solid ${t.line}`, borderRadius: 8, padding: '8px 10px',
                fontFamily: t.fontSans, fontSize: 13, color: t.text, outline: 'none',
                marginBottom: 4,
              }}/>
            {filtered.map(o => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); setQuery(''); }} style={{
                width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8,
                background: o === value ? t.accentSoft : 'transparent',
                border: 'none', cursor: 'pointer',
                color: t.text, fontFamily: t.fontSans, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{o}</span>
                {o === value && <Icon.check width={14} height={14} style={{ color: t.accent }}/>}
              </button>
            ))}
            {allowAdd && noExactMatch && (
              <button onClick={() => { onChange(query.trim()); setOpen(false); setQuery(''); }} style={{
                width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8,
                background: t.accentSoft, border: 'none', cursor: 'pointer',
                color: t.text, fontFamily: t.fontSans, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 4,
              }}>
                <Icon.plus width={14} height={14} style={{ color: t.accent }}/>
                <span>Add <strong>"{query.trim()}"</strong></span>
              </button>
            )}
            {filtered.length === 0 && !noExactMatch && (
              <div style={{
                padding: 14, textAlign: 'center', color: t.textDim,
                fontFamily: t.fontSans, fontSize: 13,
              }}>No matches</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Date picker — native date input wrapped to match aesthetic.
export function DateField({ label, value, onChange, theme }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
  // Native input wants YYYY-MM-DD
  const dateStr = value ? new Date(value).toISOString().slice(0,10) : '';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{
          fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1,
        }}>{label}</span>
      )}
      <input
        type="date"
        value={dateStr}
        onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        style={{
          background: t.bgElevated2, border: `1px solid ${t.line}`,
          borderRadius: 12, padding: '12px 14px',
          fontFamily: t.fontSans, fontSize: 15, color: t.text,
          outline: 'none', width: '100%', boxSizing: 'border-box',
          colorScheme: (t.name === 'light' || t.name === 'hashashin-light') ? 'light' : 'dark',
        }}/>
    </label>
  );
}

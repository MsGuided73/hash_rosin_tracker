// PhotoNotes — reusable notes field with attached photo thumbnails.
// Two capture paths, both auto-backed-up to Supabase Storage (photo-backup.js):
//   TAKE   — native camera on touch devices (capture="environment"),
//            getUserMedia webcam modal on desktop
//   UPLOAD — file picker / photo library (no capture attribute, so mobile
//            browsers offer the gallery)

import React from 'react';
import { MicronTokens, withStage } from '../lib/tokens.js';
import { Icon } from './primitives.jsx';

const { useRef: useRefPN, useState: useStatePN, useEffect: useEffectPN } = React;

const isCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const hasWebcamApi = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export function PhotoNotes({ label, value = '', photos = [], onChange, onPhotosChange, placeholder, theme, accentColor }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
  const fileRef = useRefPN(null);
  const takeRef = useRefPN(null);
  const [lightbox, setLightbox] = useStatePN(null);
  const [camera, setCamera] = useStatePN(false);

  const addPhotos = (newPhotos) => {
    onPhotosChange([...(photos || []), ...newPhotos]);
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const input = e.target;
    if (!files.length) return;
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id: Date.now() + '-' + Math.random(), url: r.result, name: f.name, ts: new Date().toISOString() });
      r.readAsDataURL(f);
    }))).then(newPhotos => {
      addPhotos(newPhotos);
      input.value = '';
    });
  };

  const handleTake = () => {
    if (isCoarsePointer()) {
      // Phones/tablets: the native camera app (focus, flash, HDR) beats an
      // in-page preview every time.
      takeRef.current?.click();
    } else if (hasWebcamApi()) {
      setCamera(true);
    } else {
      fileRef.current?.click();
    }
  };

  const remove = (id) => onPhotosChange(photos.filter(p => p.id !== id));
  const accent = accentColor || t.accent;
  const photoBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: 'transparent',
    color: accent, fontFamily: t.fontMono, fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: t.fontMono, fontSize: 12, fontWeight: 600, color: t.textMuted, letterSpacing: 1.2,
          }}>{label}</span>
          <span style={{ display: 'inline-flex', gap: 2 }}>
            <button onClick={handleTake} style={photoBtn} title="Take a picture">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M7 5l1.5-2h3L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
              TAKE
            </button>
            <button onClick={() => fileRef.current?.click()} style={photoBtn} title="Upload from library">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M10 13V4M6.5 7.5L10 4l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.5 13v2.5a1 1 0 001 1h11a1 1 0 001-1V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              UPLOAD
            </button>
          </span>
          {/* UPLOAD: no `capture` attr → mobile offers the photo library. */}
          <input ref={fileRef} type="file" accept="image/*" multiple
            onChange={handleFiles}
            style={{ display: 'none' }}/>
          {/* TAKE (mobile): capture attr jumps straight into the camera. */}
          <input ref={takeRef} type="file" accept="image/*" capture="environment"
            onChange={handleFiles}
            style={{ display: 'none' }}/>
        </div>
      )}

      {camera && (
        <CameraModal
          t={t}
          onClose={() => setCamera(false)}
          onCapture={(url) => addPhotos([{
            id: Date.now() + '-' + Math.random(), url, name: 'camera.jpg', ts: new Date().toISOString(),
          }])}
        />
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

// Webcam capture modal (desktop). Mobile uses the native camera via the
// capture-attribute input instead.
function CameraModal({ t, onCapture, onClose }) {
  const videoRef = useRefPN(null);
  const streamRef = useRefPN(null);
  const [error, setError] = useStatePN(null);
  const [ready, setReady] = useStatePN(false);

  useEffectPN(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => setError(err.name === 'NotAllowedError'
        ? 'Camera permission denied — allow camera access in your browser, or use UPLOAD instead.'
        : err.name === 'NotFoundError'
          ? 'No camera found on this device — use UPLOAD instead.'
          : err.message));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    onCapture(c.toDataURL('image/jpeg', 0.9));
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.94)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
    }}>
      {error ? (
        <div style={{
          maxWidth: 420, textAlign: 'center', color: '#F2EFE6',
          fontFamily: t.fontSans, fontSize: 14, lineHeight: 1.6,
        }}>{error}</div>
      ) : (
        <video
          ref={videoRef} autoPlay playsInline muted
          onLoadedMetadata={() => setReady(true)}
          style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 14, background: '#000' }}/>
      )}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {!error && (
          <button onClick={shoot} disabled={!ready} aria-label="Take picture" style={{
            width: 64, height: 64, borderRadius: 999, cursor: ready ? 'pointer' : 'wait',
            background: t.accent, border: '4px solid rgba(255,255,255,0.85)',
            opacity: ready ? 1 : 0.5,
          }}/>
        )}
        <button onClick={onClose} style={{
          padding: '10px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: '#F2EFE6', cursor: 'pointer',
          fontFamily: t.fontMono, fontSize: 12, letterSpacing: 1,
        }}>CANCEL</button>
      </div>
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

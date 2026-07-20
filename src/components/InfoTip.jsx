// InfoTip — the soft-guidance primitive.
// A small ⓘ next to any label; hover (desktop) or tap (touch) reveals a
// plain-language explanation of what the number means and why it matters.
import React from 'react';

const { useState, useRef, useEffect } = React;

export function InfoTip({ t, children, wide, side = 'top' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="What does this mean?"
        onClick={() => setOpen(true)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          border: `1px solid ${t.textDim}`,
          background: 'transparent',
          color: t.textDim,
          fontFamily: t.fontMono,
          fontSize: 9,
          lineHeight: 1,
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          marginLeft: 6,
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            ...(side === 'bottom'
              ? { top: 'calc(100% + 8px)' }
              : { bottom: 'calc(100% + 8px)' }),
            left: '50%',
            transform: 'translateX(-50%)',
            width: wide ? 280 : 220,
            maxWidth: '78vw',
            padding: '10px 12px',
            borderRadius: 10,
            background: t.bgOverlay,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${t.lineStrong}`,
            boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
            color: t.text,
            fontFamily: t.fontSans,
            fontSize: 12,
            lineHeight: 1.5,
            letterSpacing: 0.1,
            textTransform: 'none',
            fontWeight: 400,
            zIndex: 60,
            whiteSpace: 'normal',
            textAlign: 'left',
            pointerEvents: 'none',
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

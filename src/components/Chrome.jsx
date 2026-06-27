// Shared screen chrome — top bar (title + back) and bottom action bar.
// Extracted from the prototype's screen-setup-wash.jsx so every screen can
// import these instead of relying on a global registration.

import React from 'react';
import { MicronTokens, withStage } from '../lib/tokens.js';
import { Icon } from './primitives.jsx';

export function TopBar({ title, subtitle, onBack, theme, right }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
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

export function BottomBar({ children, theme }) {
  const t = (window.__stage && withStage) ? withStage(theme, window.__stage) : MicronTokens[theme];
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

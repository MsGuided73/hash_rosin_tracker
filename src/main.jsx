import React from 'react';
import ReactDOM from 'react-dom/client';
import { MicronTokens, normalizeTheme } from './lib/tokens.js';
import { MicronApp } from './App.jsx';
import './styles/stage.css';

// Shell — renders the app full-screen (no simulated device frame / status bar)
// and reflects the active theme background. Polls localStorage so theme changes
// from the in-app Tweaks panel update the page background.
function Shell() {
  const [theme, setTheme] = React.useState(
    normalizeTheme(localStorage.getItem('micron-theme') || 'hashashin'),
  );
  React.useEffect(() => {
    const i = setInterval(() => {
      const t = normalizeTheme(localStorage.getItem('micron-theme') || 'hashashin');
      if (t !== theme) setTheme(t);
    }, 200);
    return () => clearInterval(i);
  }, [theme]);
  const squareClass = theme === 'hashashin' || theme === 'hashashin-light' ? 'hl-square' : '';
  return (
    <div
      className={squareClass}
      data-screen-label="Hashashin"
      style={{
        position: 'fixed',
        inset: 0,
        background: MicronTokens[theme].bg,
        overflow: 'hidden',
      }}
    >
      <MicronApp />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Shell />);

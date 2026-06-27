import React from 'react';
import ReactDOM from 'react-dom/client';
import { MicronTokens } from './lib/tokens.js';
import { IOSDevice } from './components/IOSFrame.jsx';
import { MicronApp } from './App.jsx';
import './styles/stage.css';

// Shell — wraps the app in the iOS device frame and reflects the active theme.
// Polls localStorage so theme changes from the in-app Tweaks panel propagate
// to the frame chrome (mirrors the original prototype Shell behavior).
function Shell() {
  const [theme, setTheme] = React.useState(localStorage.getItem('micron-theme') || 'hashlab');
  React.useEffect(() => {
    const i = setInterval(() => {
      const t = localStorage.getItem('micron-theme') || 'hashlab';
      if (t !== theme) setTheme(t);
    }, 200);
    return () => clearInterval(i);
  }, [theme]);
  const dark = !(theme === 'light' || theme === 'hashlab-light');
  const squareClass = theme === 'hashlab' || theme === 'hashlab-light' ? 'hl-square' : '';
  return (
    <div data-screen-label="Micron prototype" style={{ position: 'relative' }}>
      <IOSDevice dark={dark} width={402} height={874}>
        <div
          className={squareClass}
          style={{ position: 'relative', height: '100%', background: MicronTokens[theme].bg }}
          data-screen-label="App"
        >
          <MicronApp />
        </div>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Shell />);

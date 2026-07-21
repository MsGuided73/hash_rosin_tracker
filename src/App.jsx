// App root — routing + state
import React from 'react';
import { MicronTokens, MicronBands, normalizeTheme } from './lib/tokens.js';
import { MicronSeed } from './lib/data.js';
import { injectGlobalCSS, Sheet, Btn, Segmented } from './components/primitives.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { SetupScreen, WashScreen } from './screens/SetupWashScreens.jsx';
import { FreezeDryScreen } from './screens/FreezeDryScreen.jsx';
import { PressScreen } from './screens/PressScreen.jsx';
import { CureScreen } from './screens/CureScreen.jsx';
import { SummaryScreen } from './screens/SummaryScreen.jsx';
import { AnalyticsScreen } from './screens/AnalyticsScreen.jsx';
import { scheduleSync } from './lib/sync.js';
import { schedulePhotoBackup } from './lib/photo-backup.js';
import { subscribeInstall, promptInstall, isIOSSafari } from './lib/pwa-install.js';

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

export function MicronApp() {
  injectGlobalCSS();
  const [theme, setTheme] = useStateA(() => normalizeTheme(localStorage.getItem('micron-theme') || 'hashashin'));
  const [unit, setUnit]   = useStateA(() => localStorage.getItem('micron-unit')  || 'g');
  const [tempUnit, setTempUnit] = useStateA(() => localStorage.getItem('micron-tempUnit') || 'F');
  const [route, setRoute] = useStateA(() => {
    const s = localStorage.getItem('micron-route');
    return s ? JSON.parse(s) : { name: 'home' };
  });
  const [batches, setBatches] = useStateA(() => {
    const s = localStorage.getItem('micron-batches');
    return s ? JSON.parse(s) : MicronSeed.batches();
  });
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  // Set global theme/stage SYNCHRONOUSLY during render so primitives (which read
  // window.__theme / window.__stage) get current values on the first paint.
  window.__theme = theme;
  window.__stage = ({ home: null, analytics: null, setup: 'setup', wash: 'wash', freezedry: 'freezedry', press: 'press', cure: 'cure', summary: 'summary' })[route.name] || null;

  useEffectA(() => { localStorage.setItem('micron-theme', theme); }, [theme]);
  useEffectA(() => { localStorage.setItem('micron-unit', unit); }, [unit]);
  useEffectA(() => { localStorage.setItem('micron-tempUnit', tempUnit); }, [tempUnit]);
  useEffectA(() => { localStorage.setItem('micron-route', JSON.stringify(route)); }, [route]);
  useEffectA(() => { localStorage.setItem('micron-batches', JSON.stringify(batches)); }, [batches]);
  // Auto-save: every batch change is pushed to the shared database (debounced,
  // demo batches excluded, retries silently when offline). Photos ride along —
  // compressed and backed up to Supabase Storage.
  useEffectA(() => { scheduleSync(batches); schedulePhotoBackup(batches); }, [batches]);
  useEffectA(() => { window.__onTweak = () => setTweaksOpen(true); }, []);

  // Tweaks bridge
  useEffectA(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const t = MicronTokens[theme];

  const currentBatch = useMemoA(() => batches.find(b => b.id === route.batchId), [batches, route.batchId]);
  const setCurrentBatch = (updater) => {
    setBatches(arr => arr.map(b => b.id === route.batchId ? (typeof updater === 'function' ? updater(b) : updater) : b));
  };

  const createNewBatch = () => {
    const num = 47 + batches.filter(b => b.id.startsWith('B-0')).length - 5;
    const id = `B-0${num}`;
    const draft = {
      id,
      strain: '',
      operator: 'You',
      startedAt: new Date().toISOString(),
      inputG: null,
      stage: 'setup',
      notes: '',
      bags: Object.fromEntries(MicronBands.map(b => [b.id, { wet: null, dry: null, color: null, melt: 0, texture: '', notes: '' }])),
      mergedGrades: [],
      presses: [],
    };
    setBatches(arr => [draft, ...arr]);
    setRoute({ name: 'setup', batchId: id });
  };

  const goStage = (stage) => {
    setCurrentBatch(b => ({ ...b, stage }));
    setRoute(r => ({ ...r, name: stage }));
  };

  // Render
  let screen;
  if (route.name === 'analytics') {
    screen = <AnalyticsScreen
      batches={batches} unit={unit} theme={theme}
      onBack={() => setRoute({ name: 'home' })}/>;
  } else if (route.name === 'home' || !currentBatch) {
    screen = <HomeScreen
      batches={batches} unit={unit} theme={theme}
      onOpen={(id) => {
        const b = batches.find(x => x.id === id);
        if (!b) return;
        setRoute({ name: b.stage === 'done' ? 'summary' : b.stage, batchId: id });
      }}
      onCreate={createNewBatch}
      onAnalytics={() => setRoute({ name: 'analytics' })}/>;
  } else if (route.name === 'setup') {
    screen = <SetupScreen draft={currentBatch} setDraft={setCurrentBatch}
      theme={theme}
      onCancel={() => {
        // remove the just-created draft if empty
        if (!currentBatch.strain && !currentBatch.inputG) {
          setBatches(arr => arr.filter(b => b.id !== currentBatch.id));
        }
        setRoute({ name: 'home' });
      }}
      onContinue={() => goStage('wash')}/>;
  } else if (route.name === 'wash') {
    screen = <WashScreen batch={currentBatch} setBatch={setCurrentBatch}
      unit={unit} theme={theme}
      onBack={() => setRoute({ name: 'home' })}
      onContinue={() => goStage('freezedry')}/>;
  } else if (route.name === 'freezedry') {
    screen = <FreezeDryScreen batch={currentBatch} setBatch={setCurrentBatch}
      unit={unit} theme={theme}
      onBack={() => goStage('wash')}
      onContinue={() => goStage('press')}/>;
  } else if (route.name === 'press') {
    screen = <PressScreen batch={currentBatch} setBatch={setCurrentBatch}
      unit={unit} theme={theme}
      onBack={() => goStage('freezedry')}
      onContinue={() => goStage('cure')}/>;
  } else if (route.name === 'cure') {
    screen = <CureScreen batch={currentBatch} setBatch={setCurrentBatch}
      unit={unit} tempUnit={tempUnit} theme={theme}
      onBack={() => goStage('press')}
      onContinue={() => {
        setCurrentBatch(b => ({ ...b, stage: 'done' }));
        setRoute({ name: 'summary', batchId: currentBatch.id });
      }}/>;
  } else if (route.name === 'summary') {
    screen = <SummaryScreen batch={currentBatch}
      unit={unit} theme={theme}
      onBack={() => setRoute({ name: 'home' })}
      onEdit={() => goStage('freezedry')}/>;
  }

  return (
    <>
      <div key={route.name} className="mi-enter" style={{ height: '100%' }}>
        {screen}
      </div>
      <TweaksPanel
        open={tweaksOpen} onClose={() => setTweaksOpen(false)}
        theme={theme} setTheme={setTheme}
        unit={unit} setUnit={setUnit}
        tempUnit={tempUnit} setTempUnit={setTempUnit}
        onReset={() => {
          setBatches(MicronSeed.batches());
          setRoute({ name: 'home' });
          setTweaksOpen(false);
        }}/>
    </>
  );
}

// ─────────── Tweaks ───────────
function TweaksPanel({ open, onClose, theme, setTheme, unit, setUnit, tempUnit, setTempUnit, onReset }) {
  const t = MicronTokens[theme];
  const [installable, setInstallable] = React.useState(false);
  React.useEffect(() => subscribeInstall(setInstallable), []);
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onClose} title="Tweaks">
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ padding: '14px 0', borderBottom: `1px solid ${t.line}` }}>
          <div style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1.5, marginBottom: 10 }}>THEME</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { value: 'hashashin',       label: 'Hashashin',    sub: 'Terminal · dark' },
              { value: 'hashashin-light', label: 'Hashashin Lt', sub: 'Terminal · light' },
              { value: 'dark',          label: 'Gunmetal',   sub: 'Steel · cool' },
              { value: 'light',         label: 'Paper',      sub: 'Light · warm' },
            ].map(o => {
              const active = theme === o.value;
              return (
                <button key={o.value} onClick={() => setTheme(o.value)} style={{
                  flex: '1 1 44%', padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                  background: active ? t.accentSoft : t.bgElevated2,
                  border: active ? `1px solid ${t.accent}` : `1px solid ${t.line}`,
                  color: t.text, textAlign: 'left',
                }}>
                  <div style={{ fontFamily: t.fontSans, fontSize: 13, fontWeight: 600, color: active ? t.text : t.textMuted }}>{o.label}</div>
                  <div style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 0.5, marginTop: 3 }}>{o.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
        <TweakRow label="WEIGHT UNIT" theme={theme}>
          <Segmented
            options={[{ value: 'g', label: 'GRAMS' }, { value: 'oz', label: 'OUNCES' }]}
            value={unit} onChange={setUnit}/>
        </TweakRow>
        <TweakRow label="TEMPERATURE" theme={theme}>
          <Segmented
            options={[{ value: 'F', label: '°F' }, { value: 'C', label: '°C' }]}
            value={tempUnit} onChange={setTempUnit}/>
        </TweakRow>
        {installable && (
          <Btn fullWidth style={{ marginTop: 20 }} onClick={() => promptInstall()}>
            Install Hashashin on this device
          </Btn>
        )}
        {!installable && isIOSSafari() && (
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 12,
            background: t.accentSoft, border: `1px solid ${t.accent}44`,
            fontFamily: t.fontSans, fontSize: 13, color: t.text, lineHeight: 1.5,
          }}>
            Install on iPhone: tap the Share button in Safari, then
            “Add to Home Screen.”
          </div>
        )}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          background: t.bgElevated2,
          fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, lineHeight: 1.45,
        }}>
          Your work is saved on this device and auto-synced to the cloud as you go.
          Install the app for a full-screen, offline-capable experience.
        </div>
        <Btn kind="danger" fullWidth style={{ marginTop: 14 }} onClick={onReset}>
          Reset prototype data
        </Btn>
      </div>
    </Sheet>
  );
}

function TweakRow({ label, children, theme }) {
  const t = MicronTokens[theme];
  return (
    <div style={{
      padding: '14px 0', borderBottom: `1px solid ${t.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim, letterSpacing: 1.5 }}>{label}</span>
      {children}
    </div>
  );
}

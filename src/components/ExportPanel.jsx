// ExportPanel — download your records as CSV, Markdown, or Excel,
// scoped to everything, one strain, or one batch.
import React from 'react';
import { exportBatches } from '../lib/export.js';
import { InfoTip } from './InfoTip.jsx';

const { useState, useMemo } = React;

export function ExportPanel({ batches, t, card, label }) {
  const [kind, setKind] = useState('all');
  const [value, setValue] = useState('');
  const [state, setState] = useState({ status: 'idle', error: null });

  const strains = useMemo(
    () => [...new Set(batches.map((b) => b.strain).filter(Boolean))].sort(),
    [batches],
  );
  const batchIds = useMemo(() => batches.map((b) => b.id), [batches]);

  const scope =
    kind === 'all' ? { kind: 'all' } : { kind, value: value || (kind === 'strain' ? strains[0] : batchIds[0]) };

  const run = async (format) => {
    setState({ status: 'working', error: null });
    try {
      await exportBatches(batches, scope, format);
      setState({ status: 'done', error: null });
    } catch (err) {
      setState({ status: 'error', error: err.message || String(err) });
    }
  };

  const selStyle = {
    height: 40,
    padding: '0 12px',
    borderRadius: t.btnRadius ?? 10,
    border: `1px solid ${t.lineStrong}`,
    background: t.bgElevated2,
    color: t.text,
    fontFamily: t.fontMono,
    fontSize: 12,
    cursor: 'pointer',
    minWidth: 0,
  };

  return (
    <div style={card}>
      <div style={{ ...label, display: 'flex', alignItems: 'center' }}>
        EXPORT RECORDS
        <InfoTip t={t} wide>
          Download your data for spreadsheets, lab notebooks, or sharing with a
          grower. CSV opens straight into Excel or Sheets; Markdown is a readable
          report; Excel is a real workbook with Batches, Bags, and Press Runs tabs.
        </InfoTip>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value); setValue(''); }}
          style={selStyle}
          aria-label="Export scope"
        >
          <option value="all">Everything</option>
          <option value="strain">One strain</option>
          <option value="batch">One batch</option>
        </select>

        {kind === 'strain' && (
          <select value={value || strains[0] || ''} onChange={(e) => setValue(e.target.value)} style={selStyle} aria-label="Strain">
            {strains.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {kind === 'batch' && (
          <select value={value || batchIds[0] || ''} onChange={(e) => setValue(e.target.value)} style={selStyle} aria-label="Batch">
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.id} · {b.strain || 'unnamed'}</option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {[
            { fmt: 'csv', label: '.CSV' },
            { fmt: 'md', label: '.MD' },
            { fmt: 'xlsx', label: 'EXCEL' },
          ].map(({ fmt, label: l }) => (
            <button
              key={fmt}
              onClick={() => run(fmt)}
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: t.btnRadius ?? 999,
                border: `1px solid ${t.accent}55`,
                background: t.accentSoft,
                color: t.accent,
                fontFamily: t.fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {state.status === 'error' && (
        <div style={{ marginTop: 10, fontFamily: t.fontSans, fontSize: 12, color: t.danger }}>
          {state.error}
        </div>
      )}
      {state.status === 'done' && (
        <div style={{ marginTop: 10, fontFamily: t.fontMono, fontSize: 10, color: t.success, letterSpacing: 1 }}>
          FILE DOWNLOADED
        </div>
      )}
    </div>
  );
}

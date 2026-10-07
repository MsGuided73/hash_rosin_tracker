// AgentAccess — "Connect an agent" panel inside Tweaks.
// Issues per-user MCP bearer tokens, shows the raw token exactly once,
// lists existing tokens, and revokes them.
import React from 'react';
import { MicronTokens } from '../lib/tokens.js';
import { createAgentToken, listAgentTokens, revokeAgentToken, MCP_ENDPOINT } from '../lib/agent-tokens.js';

const { useState, useEffect } = React;

export function AgentAccess({ theme }) {
  const t = MicronTokens[theme];
  const [tokens, setTokens] = useState(null); // null = loading
  const [fresh, setFresh] = useState(null);   // { raw, row } just created
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    listAgentTokens().then(setTokens).catch((e) => setError(e.message));
  };
  useEffect(refresh, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createAgentToken('Agent');
      setFresh(result);
      setCopied(false);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    setError(null);
    try {
      await revokeAgentToken(id);
      if (fresh && fresh.row.id === id) setFresh(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fresh.raw);
      setCopied(true);
    } catch {
      setError('Copy failed — select and copy the token manually.');
    }
  };

  const mono9 = { fontFamily: t.fontMono, fontSize: 9, color: t.textDim, letterSpacing: 1 };
  const active = (tokens || []).filter((x) => !x.revoked_at);

  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ ...mono9, letterSpacing: 1.5, marginBottom: 8 }}>AGENT ACCESS · MCP</div>
      <div style={{ fontFamily: t.fontSans, fontSize: 12.5, color: t.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
        Let an AI assistant read your run data. Create a token, paste it into your
        agent's config, and point it at{' '}
        <span style={{ fontFamily: t.fontMono, fontSize: 11, color: t.text }}>{MCP_ENDPOINT}</span>.
        Agents can only read your own runs — never anyone else's, and never edit or delete.
      </div>

      {fresh && (
        <div style={{
          padding: 12, borderRadius: 10, marginBottom: 10,
          background: t.accentSoft, border: `1px solid ${t.accent}55`,
        }}>
          <div style={{ ...mono9, color: t.accent, marginBottom: 6 }}>
            COPY THIS NOW — IT WILL NOT BE SHOWN AGAIN
          </div>
          <div style={{
            fontFamily: t.fontMono, fontSize: 11, color: t.text,
            wordBreak: 'break-all', userSelect: 'all', marginBottom: 8,
          }}>{fresh.raw}</div>
          <button onClick={copy} style={{
            padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: t.accentGrad || t.accent, color: t.accentInk,
            fontFamily: t.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
          }}>{copied ? 'COPIED ✓' : 'COPY TOKEN'}</button>
        </div>
      )}

      {tokens === null && <div style={mono9}>LOADING…</div>}
      {active.map((row) => (
        <div key={row.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
          borderBottom: `1px solid ${t.line}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.text }}>
              {row.name} <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textDim }}>···{row.token_tail}</span>
            </div>
            <div style={mono9}>
              {row.last_used_at
                ? `last used ${new Date(row.last_used_at).toLocaleDateString()}`
                : 'never used'}
            </div>
          </div>
          <button onClick={() => revoke(row.id)} style={{
            padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${t.danger}55`, color: t.danger,
            fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1,
          }}>REVOKE</button>
        </div>
      ))}

      <button onClick={create} disabled={busy} style={{
        marginTop: 10, padding: '9px 16px', borderRadius: 999, cursor: busy ? 'wait' : 'pointer',
        background: 'transparent', border: `1px solid ${t.lineStrong}`, color: t.text,
        fontFamily: t.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
        opacity: busy ? 0.5 : 1,
      }}>+ CONNECT AN AGENT</button>

      {error && (
        <div style={{ fontFamily: t.fontSans, fontSize: 12, color: t.danger, marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}

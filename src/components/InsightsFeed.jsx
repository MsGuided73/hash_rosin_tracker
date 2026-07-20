// InsightsFeed — "What your results are saying."
// Renders the pattern-recognizer findings as plain-language cards, and hosts
// the AI Analyst panel (Claude via the ai-analyst edge function).
import React from 'react';
import { computeInsights, recordInsights } from '../lib/insights.js';
import { getSupabase, ensureSession, fetchOwnProfile } from '../lib/supabase.js';
import { deriveBatch } from '../lib/analytics.js';
import { InfoTip } from './InfoTip.jsx';

const { useState, useEffect, useMemo } = React;

const SEVERITY = {
  win: { label: 'WORKING', tone: 'success' },
  watch: { label: 'WATCH', tone: 'danger' },
  tip: { label: 'GUIDE', tone: 'muted' },
  milestone: { label: 'MILESTONE', tone: 'accent' },
};

function toneColor(t, tone) {
  return { success: t.success, danger: t.danger, accent: t.accent, muted: t.textDim }[tone] || t.textDim;
}

export function InsightsFeed({ batches, t, card, label }) {
  const insights = useMemo(() => computeInsights(batches), [batches]);

  // Record keeper: every finding is logged to the database as it's recognized.
  useEffect(() => {
    recordInsights(insights);
  }, [insights]);

  const order = { watch: 0, win: 1, milestone: 2, tip: 3 };
  const sorted = [...insights].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return (
    <div style={card}>
      <div style={{ ...label, display: 'flex', alignItems: 'center' }}>
        WHAT YOUR RESULTS ARE SAYING
        <InfoTip t={t} wide>
          The app watches your data as it comes in and surfaces patterns automatically —
          what's working, what's drifting, and what to log next. Every finding is also
          recorded to your database journal with the date it was first spotted.
        </InfoTip>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}
      >
        {sorted.map((i) => (
          <InsightCard key={i.key} t={t} insight={i} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ t, insight }) {
  const sev = SEVERITY[insight.severity] || SEVERITY.tip;
  const color = toneColor(t, sev.tone);
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: t.cardRadius ?? 12,
        background: t.bgElevated2Grad || t.bgElevated2,
        border: `1px solid ${t.line}`,
        borderLeft: `3px solid ${color}`,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: t.fontMono,
            fontSize: 8,
            letterSpacing: 1.5,
            color,
            border: `1px solid ${color}55`,
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {sev.label}
        </span>
        {insight.category && (
          <span style={{ fontFamily: t.fontMono, fontSize: 8, letterSpacing: 1.5, color: t.textDim }}>
            {insight.category.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ fontFamily: t.fontSans, fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.3 }}>
        {insight.title}
      </div>
      {insight.body && (
        <div
          style={{
            fontFamily: t.fontSans,
            fontSize: 12,
            color: t.textMuted,
            lineHeight: 1.55,
            marginTop: 6,
          }}
        >
          {insight.body}
        </div>
      )}
    </div>
  );
}

// ─────────── AI Analyst ───────────
export function AiAnalyst({ batches, t, card, label }) {
  const [state, setState] = useState({ status: 'idle', analysis: null, error: null });

  const run = async () => {
    setState({ status: 'loading', analysis: null, error: null });
    try {
      await ensureSession();
      const sb = getSupabase();
      const summary = buildAiSummary(batches);
      const { data, error } = await sb.functions.invoke('ai-analyst', { body: { summary } });
      if (error) {
        // supabase-js wraps non-2xx; try to read the body for the real reason
        let code = null;
        try {
          const body = await error.context?.json();
          code = body?.error;
        } catch { /* opaque error — fall through to generic message */ }
        if (code === 'not_configured') {
          setState({ status: 'unconfigured', analysis: null, error: null });
          return;
        }
        throw new Error(code || error.message);
      }
      setState({ status: 'ready', analysis: data.analysis, error: null });
      // Record the AI findings in the journal too
      recordInsights(
        (data.analysis.findings || []).map((f, idx) => ({
          key: `ai-${slugify(f.title) || idx}`,
          kind: 'ai',
          category: f.category,
          severity: f.severity === 'watch' ? 'watch' : f.severity === 'win' ? 'win' : 'tip',
          title: f.title,
          body: f.body,
        })),
      );
    } catch (err) {
      setState({ status: 'error', analysis: null, error: err.message || String(err) });
    }
  };

  const a = state.analysis;
  return (
    <div style={{ ...card, border: `1px solid ${t.accent}33` }}>
      <div style={{ ...label, display: 'flex', alignItems: 'center' }}>
        AI ANALYST
        <InfoTip t={t} wide>
          Sends a summary of your own production numbers to Claude and returns a
          narrative read: what's driving your results and the single most valuable
          experiment to run next. Only your data, only when you ask.
        </InfoTip>
      </div>

      {state.status === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, flex: 1, minWidth: 220, lineHeight: 1.5 }}>
            Get a written analysis of your runs — pattern calls, anomalies, and the next
            experiment worth trying.
          </div>
          <AiButton t={t} onClick={run}>ANALYZE MY RESULTS</AiButton>
        </div>
      )}

      {state.status === 'loading' && (
        <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.accent, letterSpacing: 1, padding: '10px 0' }}>
          READING YOUR RUNS…
        </div>
      )}

      {state.status === 'unconfigured' && (
        <div style={{ fontFamily: t.fontSans, fontSize: 12.5, color: t.textMuted, lineHeight: 1.6 }}>
          The AI analyst isn't switched on yet. Add an Anthropic API key to the backend
          (<span style={{ fontFamily: t.fontMono, fontSize: 11 }}>supabase secrets set ANTHROPIC_API_KEY=…</span>)
          and this panel lights up. The built-in pattern recognizer above keeps working either way.
        </div>
      )}

      {state.status === 'error' && (
        <div style={{ fontFamily: t.fontSans, fontSize: 12.5, color: t.danger }}>
          Analysis failed: {state.error}
          <AiButton t={t} onClick={run} style={{ marginLeft: 12 }}>RETRY</AiButton>
        </div>
      )}

      {state.status === 'ready' && a && (
        <div>
          <div style={{ fontFamily: t.fontSans, fontSize: 15, fontWeight: 600, color: t.text, lineHeight: 1.45, marginBottom: 12 }}>
            “{a.headline}”
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {(a.findings || []).map((f, i) => (
              <InsightCard
                key={i}
                t={t}
                insight={{ severity: f.severity || 'tip', category: f.category, title: f.title, body: f.body }}
              />
            ))}
          </div>
          {a.next_experiment && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: t.accentSoft,
                border: `1px solid ${t.accent}44`,
                fontFamily: t.fontSans,
                fontSize: 13,
                color: t.text,
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, color: t.accent, display: 'block', marginBottom: 4 }}>
                NEXT EXPERIMENT
              </span>
              {a.next_experiment}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <AiButton t={t} onClick={run}>RE-ANALYZE</AiButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── Ask the Analyst (members) ───────────
export function AskAnalyst({ batches, t, card, label }) {
  const [membership, setMembership] = useState('unknown'); // unknown | member | locked
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: 'idle', qa: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchOwnProfile()
      .then((p) => !cancelled && setMembership(p?.is_member ? 'member' : 'locked'))
      .catch(() => !cancelled && setMembership('locked'));
    return () => { cancelled = true; };
  }, []);

  const ask = async (q) => {
    const text = (q ?? question).trim();
    if (!text) return;
    setQuestion(text);
    setState({ status: 'loading', qa: null, error: null });
    try {
      await ensureSession();
      const sb = getSupabase();
      const { data, error } = await sb.functions.invoke('ai-analyst', {
        body: { summary: buildAiSummary(batches), question: text },
      });
      if (error) {
        let code = null;
        try {
          const body = await error.context?.json();
          code = body?.error;
        } catch { /* opaque error — fall through */ }
        if (code === 'members_only') { setMembership('locked'); setState({ status: 'idle', qa: null, error: null }); return; }
        if (code === 'not_configured') { setState({ status: 'unconfigured', qa: null, error: null }); return; }
        throw new Error(code || error.message);
      }
      setState({ status: 'ready', qa: data.qa, error: null });
    } catch (err) {
      setState({ status: 'error', qa: null, error: err.message || String(err) });
    }
  };

  const inputStyle = {
    flex: 1,
    minWidth: 200,
    height: 44,
    padding: '0 14px',
    borderRadius: t.btnRadius ?? 10,
    border: `1px solid ${t.lineStrong}`,
    background: t.bgElevated2,
    color: t.text,
    fontFamily: t.fontSans,
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={card}>
      <div style={{ ...label, display: 'flex', alignItems: 'center' }}>
        ASK THE ANALYST · MEMBERS
        <InfoTip t={t} wide>
          Members can ask the analyst direct questions — "how do I lift my wash
          yield?", "why did my last press return low?" — and get answers grounded
          in their own numbers plus solventless best practice.
        </InfoTip>
      </div>

      {membership === 'locked' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div style={{ fontFamily: t.fontSans, fontSize: 13, color: t.textMuted, lineHeight: 1.55, flex: 1, minWidth: 220 }}>
            Direct Q&A with the analyst is a membership feature. Your pattern feed and
            one-tap analysis stay free — membership adds unlimited questions about
            improving yield, wash technique, press recipes, and cure.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              style={inputStyle}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="e.g. How can I improve my wash yield on outdoor material?"
              aria-label="Ask the analyst a question"
            />
            <AiButton t={t} onClick={() => ask()}>ASK</AiButton>
          </div>

          {state.status === 'loading' && (
            <div style={{ fontFamily: t.fontMono, fontSize: 11, color: t.accent, letterSpacing: 1, marginTop: 12 }}>
              THINKING IT THROUGH…
            </div>
          )}
          {state.status === 'unconfigured' && (
            <div style={{ fontFamily: t.fontSans, fontSize: 12.5, color: t.textMuted, marginTop: 12, lineHeight: 1.6 }}>
              The analyst needs an Anthropic API key on the backend before it can answer
              (<span style={{ fontFamily: t.fontMono, fontSize: 11 }}>supabase secrets set ANTHROPIC_API_KEY=…</span>).
            </div>
          )}
          {state.status === 'error' && (
            <div style={{ fontFamily: t.fontSans, fontSize: 12.5, color: t.danger, marginTop: 12 }}>
              {state.error}
            </div>
          )}
          {state.status === 'ready' && state.qa && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: t.fontSans, fontSize: 13.5, color: t.text, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {state.qa.answer}
              </div>
              {(state.qa.follow_ups || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {state.qa.follow_ups.map((f) => (
                    <button
                      key={f}
                      onClick={() => ask(f)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 999,
                        border: `1px solid ${t.line}`,
                        background: t.bgElevated2,
                        color: t.textMuted,
                        fontFamily: t.fontSans,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AiButton({ t, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: t.btnRadius ?? 999,
        border: 'none',
        background: t.accentGrad || t.accent,
        color: t.accentInk,
        fontFamily: t.fontMono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Compact, anonymized-enough summary of the user's own data for the AI.
function buildAiSummary(batches) {
  const real = batches.filter((b) => !b.demo).map(deriveBatch);
  return {
    generated_at: new Date().toISOString(),
    batch_count: real.length,
    batches: real.slice(-40).map((b) => ({
      id: b.id,
      strain: b.strain,
      farm: b.farm,
      location: b.location,
      grow_type: b.growType,
      material: b.materialType,
      stage: b.stage,
      input_g: b.inputG,
      cost_per_lb: b.costPerLb ?? null,
      wash_water_f: b.wash ? [b.wash.waterTempLoF, b.wash.waterTempHiF] : null,
      hash_dry_g: b.totalDryG || null,
      hash_yield_pct: round2(b.hashYieldPct),
      rosin_g: b.totalRosinG || null,
      rosin_return_pct: round2(b.rosinReturnPct),
      bags: Object.fromEntries(
        Object.entries(b.bags || {}).map(([band, bag]) => [
          band,
          { dry_g: bag.dry, melt_0_6: bag.melt || null, texture: bag.texture || null },
        ]),
      ),
      presses: (b.presses || []).map((p) => ({
        grades: p.grades,
        charge_g: p.chargeG,
        yield_g: p.yieldG,
        temp_f: p.tempF,
        psi: p.pressurePsi,
        minutes: p.minutes,
      })),
      cure: b.cure
        ? { method: b.cure.method, container: b.cure.container, vacuum: b.cure.vacuumSealed, temp_f: b.cure.tempF }
        : null,
      started_at: b.startedAt,
    })),
  };
}

const round2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

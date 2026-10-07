// Agent access tokens — issued from the app, consumed by the MCP server.
//
// The raw token is shown to the user exactly ONCE at creation; only its
// sha256 hash is stored (agent_tokens.token_hash). Revoking a token takes
// effect on the agent's next call.
import { getSupabase, ensureSession } from './supabase.js';

const TOKEN_PREFIX = 'hl_';

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateRawToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return TOKEN_PREFIX + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Create a token for the signed-in user. Returns { raw, row } — `raw` must be
// surfaced to the user immediately; it cannot be recovered later.
export async function createAgentToken(name) {
  await ensureSession();
  const sb = getSupabase();
  const raw = generateRawToken();
  const { data, error } = await sb
    .from('agent_tokens')
    .insert({
      name: name || 'Agent',
      token_hash: await sha256Hex(raw),
      token_tail: raw.slice(-4),
    })
    .select('id, name, token_tail, created_at')
    .single();
  if (error) throw new Error(`Could not create token: ${error.message}`);
  return { raw, row: data };
}

export async function listAgentTokens() {
  await ensureSession();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('agent_tokens')
    .select('id, name, token_tail, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not list tokens: ${error.message}`);
  return data || [];
}

export async function revokeAgentToken(id) {
  await ensureSession();
  const sb = getSupabase();
  const { error } = await sb
    .from('agent_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Could not revoke token: ${error.message}`);
}

export const MCP_ENDPOINT = 'https://hashashins.fyi/api/mcp';

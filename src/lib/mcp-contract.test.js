// MCP server contract enforcement (handoff D3/D4/D8).
// These tests statically audit the deployed MCP edge function source. They
// exist to FAIL LOUDLY if someone erodes the security posture or silently
// breaks the public tool contract that agent clients pin by name.
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mcpSource = readFileSync(
  path.join(here, '..', '..', 'supabase', 'functions', 'mcp', 'index.ts'),
  'utf8',
);

describe('MCP server contract', () => {
  test('D3: the service role key is unreachable from the MCP path', () => {
    // One successful prompt injection with service_role = every tenant's data.
    expect(mcpSource).not.toMatch(/SERVICE_ROLE/i);
    expect(mcpSource).toContain('SUPABASE_ANON_KEY');
  });

  test('D2: no tool accepts a user id — identity comes from the token only', () => {
    // Audit code, not comments: a user/owner id must never appear as a tool
    // parameter or RPC argument the caller controls.
    const code = mcpSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/user_id|owner_id|p_user|p_owner/);
  });

  test('D4/anti-patterns: no generic SQL access, no destructive tools', () => {
    expect(mcpSource).not.toMatch(/execute_sql/i);
    expect(mcpSource).not.toMatch(/"delete_run"|"update_run"|\.delete\(/);
  });

  test('D8: the pinned tool names exist exactly as published', () => {
    // Hermes pins these in a client-side allowlist. Renaming one silently
    // unregisters it on Albert's machine. Add new tools; never rename these.
    for (const name of ['list_runs', 'get_run', 'yield_summary', 'cultivar_stats']) {
      expect(mcpSource).toContain(`name: "${name}"`);
    }
  });

  test('tool descriptions state units and wet/dry basis (they are prompts)', () => {
    expect(mcpSource).toMatch(/GRAMS/);
    expect(mcpSource).toMatch(/dry hash ÷ wet input|dry_over_wet/i);
    expect(mcpSource).toMatch(/fresh-frozen/i);
  });
});

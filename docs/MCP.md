# Hash Lab MCP Server — Agent Interface (Phase 1: read-only)

Hash Lab exposes an HTTP MCP (Model Context Protocol) server so AI agents can
read a user's lab data on their behalf. First consumer: Hermes Agent. The
endpoint is agent-agnostic — anything that speaks MCP over Streamable HTTP
works (Claude, Cursor, etc).

## Endpoint

```
https://hashashins.fyi/api/mcp          (nginx proxy — canonical, use this)
https://qpoqxagsvvdpyqvmfxkv.supabase.co/functions/v1/mcp   (origin)
```

Transport: MCP Streamable HTTP (JSON-RPC 2.0 over POST). Auth: per-user
bearer token issued in the app (Tweaks → **Agent access → Connect an agent**).
The raw token is shown once; only its sha256 hash is stored. Revocation is
immediate from the same panel.

Client config (Hermes `~/.hermes/config.yaml`):

```yaml
mcp_servers:
  hashlab:
    url: "https://hashashins.fyi/api/mcp"
    headers:
      Authorization: "Bearer ${HASHLAB_TOKEN}"
    tools:
      include: [list_runs, get_run, yield_summary, cultivar_stats]
      prompts: false
      resources: false
```

## Tools (public contract — version additively, NEVER rename)

| Tool | Purpose |
|---|---|
| `list_runs` | Recent runs (batches) with filters: date range, cultivar, stage, limit |
| `get_run` | Full detail for one run: micron fractions (wet/dry g, melt), presses (°F/PSI/min), cure, notes |
| `yield_summary` | Totals + averages over a period, finished runs only |
| `cultivar_stats` | Per-cultivar performance incl. best press temp/pressure buckets and melt by micron band |

Units: all weights in **grams**; temps **°F**; pressure **PSI**. Two yield
bases, never interchangeable: hash yield % = dry hash ÷ **wet** fresh-frozen
input; press return % = rosin ÷ **dry** hash charged. Micron fractions are
band ranges: 73µ → `45-89`, 90µ → `90-119`, 120µ → `120-159`, 160µ → `160-219`.

## Security model

- **Tokens, not JWTs**: opaque `hl_…` bearer, resolved server-side by
  `mcp__auth()` to exactly one `owner_id`. No tool accepts a user id.
- **Isolation below the agent**: every `mcp_*` SQL function is SECURITY
  DEFINER with a pinned search_path and filters by the resolved owner.
  Proven by live test: user A's token cannot list or fetch user B's runs.
- **D3 — service_role never touches the MCP path.** Enforced by
  [mcp-contract.test.js](../src/lib/mcp-contract.test.js), which fails the
  suite if the function source ever references it.
- **Read-only surface.** No delete, no bulk update, no raw SQL.
- **Rate limit**: 60 tool calls per token per minute (DB-enforced).
- **Audit**: every call recorded in `agent_actions` (owner, token, tool,
  args, result meta, timestamp).

## Source layout

- Edge function: [supabase/functions/mcp/index.ts](../supabase/functions/mcp/index.ts)
- DB layer (tokens, audit, tool functions): [supabase/migrations/20261006_mcp_agent_layer.sql](../supabase/migrations/20261006_mcp_agent_layer.sql)
- Token issuance UI: [src/components/AgentAccess.jsx](../src/components/AgentAccess.jsx), [src/lib/agent-tokens.js](../src/lib/agent-tokens.js)
- nginx proxy: [nginx.conf](../nginx.conf) (`location = /api/mcp`)

## Phases

- **Phase 1 (this)** — read-only: SHIPPED. Done-when met: question → answer
  from own data; cross-tenant read provably impossible (tested, not asserted).
- **Phase 2** — pending-confirmation writes (`log_wash`, `log_press` → pending
  table + in-app confirm/reject + idempotency keys). Not started.
- **Phase 3** — accuracy validation over two weeks of real use.

Non-goals (permanent unless Dana says otherwise): no compliance/METRC
integration, no destructive tools, no generic SQL access, no chat UI in app.

// Hash Lab MCP server (Streamable HTTP, JSON-RPC 2.0).
//
// Agents authenticate with a per-user bearer token issued from the Hash Lab
// app ("Connect an agent"). Every tool call passes that opaque token to a
// SECURITY DEFINER SQL function which resolves it to exactly one owner_id,
// rate-limits it, writes an audit row, and returns only that owner's data.
//
// SECURITY INVARIANTS (handoff D2/D3/D4 — enforced by test in the app repo):
//  * This file must NEVER reference the service role key. The only key used
//    is the publishable ANON key; authorization lives in the database layer.
//  * No tool accepts a user id. Identity comes from the token alone.
//  * Read-only tool surface. No delete, no bulk update, no raw SQL.
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { auth: { persistSession: false } },
);

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "hashlab-mcp", version: "1.0.0" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────── tool definitions (descriptions are prompts — treat as spec) ───────────
const TOOLS = [
  {
    name: "list_runs",
    description:
      "List the authenticated user's recent hash/rosin runs (a 'run' is one batch: wash → freeze dry → press → cure), newest first. " +
      "Returns per-run: cultivar, stage, farm, input_weight_grams (WET fresh-frozen biomass), hash_dry_weight_grams (DRY hash collected), " +
      "rosin_weight_grams, hash_yield_pct (dry hash ÷ wet input) and press_return_pct (rosin ÷ dry hash charged). All weights are GRAMS. " +
      "Use this to find runs or answer 'what did I run recently'. Do NOT use it for aggregate questions across many runs — use yield_summary " +
      "or cultivar_stats instead, they compute totals correctly.",
    inputSchema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Earliest run start date, YYYY-MM-DD. Omit for no lower bound." },
        to_date: { type: "string", description: "Latest run start date, YYYY-MM-DD, inclusive. Omit for no upper bound." },
        cultivar: { type: "string", description: "Filter by cultivar/strain name, case-insensitive partial match (e.g. 'Papaya')." },
        stage: {
          type: "string",
          enum: ["setup", "wash", "freezedry", "press", "cure", "done", "archived"],
          description: "Filter by workflow stage. 'done' = finished runs only.",
        },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Max runs to return. Default 20." },
      },
    },
  },
  {
    name: "get_run",
    description:
      "Full detail for ONE run by its run_id (e.g. 'B-046' — get ids from list_runs). Returns the complete record: wash room/water temps (°F), " +
      "every micron fraction (bag) with wet_weight_grams and dry_weight_grams separately — never conflate wet and dry — melt rating (0–6, 6 = full melt), " +
      "every press (plate_temp_f, pressure_psi, duration_minutes, charge_weight_grams_dry_hash in, rosin_yield_grams out, return_pct), cure method, and notes. " +
      "Micron fractions use band ranges: a 73µ bag falls in band '45-89', 90µ in '90-119', 120µ in '120-159', 160µ in '160-219'. " +
      "This is the right tool for a per-batch breakdown from fresh frozen through cured rosin (e.g. for the user's own compliance entry). " +
      "Do NOT guess run ids — if unsure, call list_runs first.",
    inputSchema: {
      type: "object",
      properties: {
        run_id: { type: "string", description: "The run's id, e.g. 'B-046'. Exact match, from list_runs." },
      },
      required: ["run_id"],
    },
  },
  {
    name: "yield_summary",
    description:
      "Aggregate production totals and averages over a period for the authenticated user, computed from FINISHED runs only. " +
      "Returns total_input_weight_grams_wet (fresh-frozen biomass), total_hash_weight_grams_dry, total_rosin_weight_grams, " +
      "avg_hash_yield_pct_dry_over_wet_input and avg_press_return_pct_rosin_over_dry_hash. The two percentages have DIFFERENT bases — " +
      "report them with their basis, never interchangeably. Use for 'how much did I produce / what's my average yield' questions. " +
      "Do NOT use for per-run detail (get_run) or cross-cultivar comparison with press parameters (cultivar_stats).",
    inputSchema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Period start, YYYY-MM-DD. Omit for all time." },
        to_date: { type: "string", description: "Period end, YYYY-MM-DD, inclusive. Omit for today." },
        cultivar: { type: "string", description: "Optional cultivar filter, case-insensitive partial match." },
      },
    },
  },
  {
    name: "cultivar_stats",
    description:
      "Performance profile for one cultivar (strain) from the user's own finished runs: run count, total rosin grams, average hash yield % " +
      "(dry ÷ wet input), average press return % (rosin ÷ dry hash), the best-performing plate temperature range (°F) and pressure range (PSI) " +
      "with their average returns and sample sizes, and average melt rating per micron band. Sample sizes matter: press_count of 1 is an " +
      "anecdote, not a pattern — say so when reporting. Use for 'what's my best press temp for X' and sourcing decisions. " +
      "Do NOT use this for overall production totals (yield_summary) and do NOT answer from general knowledge when this tool returns data.",
    inputSchema: {
      type: "object",
      properties: {
        cultivar: { type: "string", description: "Cultivar/strain name, case-insensitive partial match (e.g. 'Papaya')." },
      },
      required: ["cultivar"],
    },
  },
];

const RPC_BY_TOOL: Record<string, (token: string, args: Record<string, unknown>) => Promise<unknown>> = {
  list_runs: (token, args) =>
    rpc("mcp_list_runs", {
      p_token: token,
      p_from: dateOrNull(args.from_date),
      p_to: dateOrNull(args.to_date),
      p_cultivar: strOrNull(args.cultivar),
      p_stage: strOrNull(args.stage),
      p_limit: typeof args.limit === "number" ? args.limit : 20,
    }),
  get_run: (token, args) => rpc("mcp_get_run", { p_token: token, p_run_id: String(args.run_id ?? "") }),
  yield_summary: (token, args) =>
    rpc("mcp_yield_summary", {
      p_token: token,
      p_from: dateOrNull(args.from_date),
      p_to: dateOrNull(args.to_date),
      p_cultivar: strOrNull(args.cultivar),
    }),
  cultivar_stats: (token, args) =>
    rpc("mcp_cultivar_stats", { p_token: token, p_cultivar: String(args.cultivar ?? "") }),
};

async function rpc(fn: string, params: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    if (/invalid_token/.test(error.message)) throw new McpError(-32001, "Invalid or revoked token");
    if (/rate_limited/.test(error.message)) throw new McpError(-32002, "Rate limited: max 60 tool calls per minute");
    throw new McpError(-32603, `Tool failed: ${error.message}`);
  }
  return data;
}

class McpError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

// ─────────── helpers ───────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateOrNull = (v: unknown) => (typeof v === "string" && DATE_RE.test(v) ? v : null);
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, status);
}

// ─────────── JSON-RPC dispatch ───────────
async function handleMessage(msg: Record<string, unknown>, token: string | null): Promise<Response | null> {
  const { id, method } = msg as { id?: unknown; method?: string };
  const params = (msg.params ?? {}) as Record<string, unknown>;

  // Notifications (no id) get 202 and no body
  if (id === undefined && typeof method === "string" && method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: CORS });
  }

  switch (method) {
    case "initialize": {
      const requested = String(params.protocolVersion ?? "");
      const version = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: version,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            "Hash Lab production data for the authenticated lab only. All weights are grams. " +
            "hash yield % = dry hash ÷ wet fresh-frozen input; press return % = rosin ÷ dry hash charged. " +
            "This server is read-only.",
        },
      });
    }
    case "ping":
      return json({ jsonrpc: "2.0", id, result: {} });
    case "tools/list":
      return json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    case "tools/call": {
      if (!token) return rpcError(id, -32001, "Missing bearer token", 401);
      const name = String(params.name ?? "");
      const handler = RPC_BY_TOOL[name];
      if (!handler) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const data = await handler(token, (params.arguments ?? {}) as Record<string, unknown>);
        return json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
        });
      } catch (err) {
        if (err instanceof McpError && (err.code === -32001 || err.code === -32002)) {
          return rpcError(id, err.code, err.message, err.code === -32001 ? 401 : 429);
        }
        // Tool-level failure: report inside the result so the model can recover
        const message = err instanceof Error ? err.message : String(err);
        return json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: `Error: ${message}` }], isError: true },
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. MCP Streamable HTTP: POST JSON-RPC messages." }, 405);
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim() || null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }

  if (Array.isArray(body)) {
    // Batches were removed in protocol 2025-06-18; process sequentially for older clients.
    const responses: unknown[] = [];
    for (const msg of body) {
      const res = await handleMessage(msg as Record<string, unknown>, token);
      if (res && res.status !== 202) responses.push(await res.json());
    }
    return responses.length ? json(responses) : new Response(null, { status: 202, headers: CORS });
  }

  return (await handleMessage(body as Record<string, unknown>, token)) ?? json(null, 202);
});

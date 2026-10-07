-- ============================================================
-- MCP agent layer (applied to project qpoqxagsvvdpyqvmfxkv on 2026-10-06
-- as migrations: mcp_agent_layer, mcp_functions_volatile, mcp_auth_fixes).
-- This file is the consolidated, repo-tracked record of the live state.
--
-- Per-user API tokens, audit log, and the four Phase-1 read tools as
-- SECURITY DEFINER functions.
--
-- Security model (handoff D2/D3, "option B"):
--  * The agent presents an opaque bearer token (never a Supabase JWT).
--  * Every mcp_* function resolves that token to ONE owner_id internally.
--    Identity never comes from a parameter the caller controls.
--  * Functions are SECURITY DEFINER with pinned search_path; they filter
--    every query by the resolved owner_id. service_role is never involved.
--  * The edge function calls these with the ANON key only.
-- ============================================================

-- 1. Tokens (managed by the user from the app; RLS owner-scoped)
create table if not exists public.agent_tokens (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null default 'Agent',
  token_hash   text not null unique,          -- sha256 hex of the raw token
  token_tail   text,                          -- last 4 chars, display only
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create index if not exists agent_tokens_owner_idx on public.agent_tokens(owner_id);

alter table public.agent_tokens enable row level security;
drop policy if exists agent_tokens_owner_rw on public.agent_tokens;
create policy agent_tokens_owner_rw on public.agent_tokens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 2. Audit log — every agent action, attributable and reviewable
create table if not exists public.agent_actions (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  token_id    uuid references public.agent_tokens(id) on delete set null,
  tool        text not null,
  args        jsonb not null default '{}'::jsonb,
  ok          boolean not null default true,
  result_meta jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists agent_actions_owner_idx on public.agent_actions(owner_id, created_at desc);
create index if not exists agent_actions_token_idx on public.agent_actions(token_id, created_at desc);

alter table public.agent_actions enable row level security;
drop policy if exists agent_actions_owner_read on public.agent_actions;
create policy agent_actions_owner_read on public.agent_actions
  for select using (owner_id = auth.uid());
-- no insert/update/delete policies: API roles cannot write; only the
-- definer functions below (running as table owner) insert rows.

-- 3. Token resolution + rate limit (internal — NOT exposed to API roles)
create or replace function public.mcp__auth(p_token text)
returns table (owner_id uuid, token_id uuid)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_owner uuid;
  v_token uuid;
  v_recent int;
begin
  if p_token is null or length(p_token) < 24 or length(p_token) > 256 then
    raise exception 'invalid_token' using errcode = '28000';
  end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select t.owner_id, t.id into v_owner, v_token
  from agent_tokens t
  where t.token_hash = v_hash and t.revoked_at is null;

  if v_owner is null then
    raise exception 'invalid_token' using errcode = '28000';
  end if;

  -- Rate limit: 60 tool calls per token per minute
  select count(*) into v_recent
  from agent_actions a
  where a.token_id = v_token and a.created_at > now() - interval '60 seconds';
  if v_recent >= 60 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  update agent_tokens set last_used_at = now() where id = v_token;
  return query select v_owner, v_token;
end $$;
revoke execute on function public.mcp__auth(text) from public, anon, authenticated;

-- Internal audit writer
create or replace function public.mcp__log(p_owner uuid, p_token uuid, p_tool text, p_args jsonb, p_meta jsonb)
returns void language sql security definer set search_path = public as $$
  insert into agent_actions (owner_id, token_id, tool, args, result_meta)
  values (p_owner, p_token, p_tool, coalesce(p_args, '{}'::jsonb), coalesce(p_meta, '{}'::jsonb));
$$;
revoke execute on function public.mcp__log(uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;

-- ============================================================
-- 4. Phase-1 read tools
-- All weights GRAMS. hash_yield_pct = dry hash ÷ WET fresh-frozen input.
-- press_return_pct = rosin ÷ DRY hash charged.
-- (Bodies identical to the live functions — see the applied migrations
--  mcp_agent_layer + mcp_functions_volatile + mcp_auth_fixes in Supabase.)
-- ============================================================

create or replace function public.mcp_list_runs(
  p_token text,
  p_from date default null,
  p_to date default null,
  p_cultivar text default null,
  p_stage text default null,
  p_limit int default 20
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  a record;
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  result jsonb;
begin
  select * into a from mcp__auth(p_token);

  select coalesce(jsonb_agg(row_data order by started_at desc), '[]'::jsonb) into result
  from (
    select b.started_at,
      jsonb_build_object(
        'run_id', b.batch_code,
        'cultivar', b.strain,
        'stage', b.stage::text,
        'farm', f.name,
        'started_at', to_char(b.started_at, 'YYYY-MM-DD'),
        'press_date', to_char(b.press_date, 'YYYY-MM-DD'),
        'input_weight_grams', b.input_g,
        'hash_dry_weight_grams', (select round(sum(bg.dry_g), 1) from bags bg where bg.batch_id = b.id),
        'rosin_weight_grams', (select round(sum(p.yield_g), 1) from presses p where p.batch_id = b.id),
        'hash_yield_pct', case when b.input_g > 0 then
          round((select coalesce(sum(bg.dry_g), 0) from bags bg where bg.batch_id = b.id) / b.input_g * 100, 2)
          else null end,
        'press_return_pct', case when (select coalesce(sum(bg.dry_g), 0) from bags bg where bg.batch_id = b.id) > 0 then
          round((select coalesce(sum(p.yield_g), 0) from presses p where p.batch_id = b.id)
                / (select sum(bg.dry_g) from bags bg where bg.batch_id = b.id) * 100, 2)
          else null end
      ) as row_data
    from batches b
    left join farms f on f.id = b.farm_id
    where b.owner_id = a.owner_id
      and (p_from is null or b.started_at >= p_from)
      and (p_to is null or b.started_at < p_to + 1)
      and (p_cultivar is null or b.strain ilike '%' || p_cultivar || '%')
      and (p_stage is null or b.stage::text = p_stage)
    order by b.started_at desc
    limit v_limit
  ) runs;

  perform mcp__log(a.owner_id, a.token_id, 'list_runs',
    jsonb_build_object('from', p_from, 'to', p_to, 'cultivar', p_cultivar, 'stage', p_stage, 'limit', v_limit),
    jsonb_build_object('rows', jsonb_array_length(result)));
  return result;
end $$;

create or replace function public.mcp_get_run(p_token text, p_run_id text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  a record;
  b record;
  result jsonb;
begin
  select * into a from mcp__auth(p_token);

  select bt.*, f.name as farm_name, f.location as farm_location into b
  from batches bt left join farms f on f.id = bt.farm_id
  where bt.owner_id = a.owner_id and bt.batch_code = p_run_id;

  if b.id is null then
    perform mcp__log(a.owner_id, a.token_id, 'get_run', jsonb_build_object('run_id', p_run_id), jsonb_build_object('found', false));
    return jsonb_build_object('error', 'run not found', 'run_id', p_run_id);
  end if;

  result := jsonb_build_object(
    'run_id', b.batch_code,
    'cultivar', b.strain,
    'stage', b.stage::text,
    'farm', b.farm_name,
    'farm_location', b.farm_location,
    'material_type', b.material_type::text,
    'grow_type', b.grow_type,
    'started_at', to_char(b.started_at, 'YYYY-MM-DD'),
    'wash_date', to_char(b.wash_date, 'YYYY-MM-DD'),
    'press_date', to_char(b.press_date, 'YYYY-MM-DD'),
    'input_weight_grams', b.input_g,
    'input_is_wet_fresh_frozen', true,
    'cost_per_lb_usd', case when b.cost_per_lb_cents is not null then round(b.cost_per_lb_cents / 100.0, 2) else null end,
    'wash_room_temp_f', case when b.room_temp_lo_f is not null then jsonb_build_array(b.room_temp_lo_f, b.room_temp_hi_f) else null end,
    'wash_water_temp_f', case when b.water_temp_lo_f is not null then jsonb_build_array(b.water_temp_lo_f, b.water_temp_hi_f) else null end,
    'micron_fractions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'micron_band', bg.band_id,
        'wet_weight_grams', bg.wet_g,
        'dry_weight_grams', bg.dry_g,
        'melt_rating_0_to_6', nullif(bg.melt_rating, 0),
        'texture', bg.texture
      ) order by bg.band_id desc), '[]'::jsonb)
      from bags bg where bg.batch_id = b.id
    ),
    'presses', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'press', p.press_code,
        'micron_grades', p.grade_ids,
        'charge_weight_grams_dry_hash', p.charge_g,
        'rosin_yield_grams', p.yield_g,
        'return_pct', case when p.charge_g > 0 and p.yield_g is not null then round(p.yield_g / p.charge_g * 100, 2) else null end,
        'plate_temp_f', p.temp_f,
        'pressure_psi', p.pressure_psi,
        'duration_minutes', p.minutes,
        'notes', p.notes
      ) order by p.press_number), '[]'::jsonb)
      from presses p where p.batch_id = b.id
    ),
    'cure', (
      select jsonb_build_object(
        'method', cl.method::text, 'container', cl.container::text,
        'vacuum_sealed', cl.vacuum_sealed, 'temp_f', cl.temp_f,
        'target_days', cl.target_days,
        'started_at', to_char(cl.started_at, 'YYYY-MM-DD'))
      from cure_logs cl where cl.batch_id = b.id
      order by cl.created_at desc limit 1
    ),
    'impression_notes', b.impression,
    'biomass_notes', b.biomass_notes
  );

  perform mcp__log(a.owner_id, a.token_id, 'get_run', jsonb_build_object('run_id', p_run_id), jsonb_build_object('found', true));
  return result;
end $$;

create or replace function public.mcp_yield_summary(
  p_token text,
  p_from date default null,
  p_to date default null,
  p_cultivar text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  a record;
  result jsonb;
begin
  select * into a from mcp__auth(p_token);

  with scoped as (
    select b.id, b.input_g,
      (select coalesce(sum(bg.dry_g), 0) from bags bg where bg.batch_id = b.id) as dry_g,
      (select coalesce(sum(p.yield_g), 0) from presses p where p.batch_id = b.id) as rosin_g
    from batches b
    where b.owner_id = a.owner_id
      and b.stage = 'done'
      and (p_from is null or b.started_at >= p_from)
      and (p_to is null or b.started_at < p_to + 1)
      and (p_cultivar is null or b.strain ilike '%' || p_cultivar || '%')
  )
  select jsonb_build_object(
    'period_from', coalesce(to_char(p_from, 'YYYY-MM-DD'), 'all time'),
    'period_to', coalesce(to_char(p_to, 'YYYY-MM-DD'), 'today'),
    'cultivar_filter', p_cultivar,
    'finished_run_count', count(*),
    'total_input_weight_grams_wet', round(sum(input_g), 1),
    'total_hash_weight_grams_dry', round(sum(dry_g), 1),
    'total_rosin_weight_grams', round(sum(rosin_g), 1),
    'avg_hash_yield_pct_dry_over_wet_input', round(avg(case when input_g > 0 and dry_g > 0 then dry_g / input_g * 100 end), 2),
    'avg_press_return_pct_rosin_over_dry_hash', round(avg(case when dry_g > 0 and rosin_g > 0 then rosin_g / dry_g * 100 end), 2)
  ) into result
  from scoped;

  perform mcp__log(a.owner_id, a.token_id, 'yield_summary',
    jsonb_build_object('from', p_from, 'to', p_to, 'cultivar', p_cultivar), '{}'::jsonb);
  return result;
end $$;

create or replace function public.mcp_cultivar_stats(p_token text, p_cultivar text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  a record;
  result jsonb;
begin
  select * into a from mcp__auth(p_token);
  if coalesce(trim(p_cultivar), '') = '' then
    return jsonb_build_object('error', 'cultivar is required');
  end if;

  with scoped as (
    select b.id, b.strain, b.input_g,
      (select coalesce(sum(bg.dry_g), 0) from bags bg where bg.batch_id = b.id) as dry_g,
      (select coalesce(sum(p.yield_g), 0) from presses p where p.batch_id = b.id) as rosin_g
    from batches b
    where b.owner_id = a.owner_id and b.strain ilike '%' || p_cultivar || '%' and b.stage = 'done'
  ),
  scoped_presses as (
    select p.temp_f, p.pressure_psi, p.yield_g, p.charge_g
    from presses p join scoped s on s.id = p.batch_id
    where p.charge_g > 0 and p.yield_g is not null
  ),
  temp_buckets as (
    select (floor(temp_f / 5) * 5)::int as lo, count(*) as n,
           round(avg(yield_g / charge_g * 100), 2) as avg_ret
    from scoped_presses where temp_f is not null group by 1
  ),
  psi_buckets as (
    select (floor(pressure_psi / 100.0) * 100)::int as lo, count(*) as n,
           round(avg(yield_g / charge_g * 100), 2) as avg_ret
    from scoped_presses where pressure_psi is not null group by 1
  )
  select jsonb_build_object(
    'cultivar_filter', p_cultivar,
    'matched_cultivars', (select coalesce(jsonb_agg(distinct strain), '[]'::jsonb) from scoped),
    'finished_run_count', (select count(*) from scoped),
    'total_rosin_weight_grams', (select round(sum(rosin_g), 1) from scoped),
    'avg_hash_yield_pct_dry_over_wet_input', (select round(avg(case when input_g > 0 and dry_g > 0 then dry_g / input_g * 100 end), 2) from scoped),
    'avg_press_return_pct_rosin_over_dry_hash', (select round(avg(case when dry_g > 0 and rosin_g > 0 then rosin_g / dry_g * 100 end), 2) from scoped),
    'best_press_temp', (
      select jsonb_build_object('range_f', jsonb_build_array(lo, lo + 5), 'avg_return_pct', avg_ret, 'press_count', n)
      from temp_buckets order by (n >= 2) desc, avg_ret desc limit 1),
    'best_pressure', (
      select jsonb_build_object('range_psi', jsonb_build_array(lo, lo + 100), 'avg_return_pct', avg_ret, 'press_count', n)
      from psi_buckets order by (n >= 2) desc, avg_ret desc limit 1),
    'melt_by_micron_band', (
      select coalesce(jsonb_agg(jsonb_build_object('micron_band', band_id, 'avg_melt_0_to_6', avg_melt, 'bag_count', n)), '[]'::jsonb)
      from (
        select bg.band_id, round(avg(bg.melt_rating), 2) as avg_melt, count(*) as n
        from bags bg join scoped s on s.id = bg.batch_id
        where bg.melt_rating > 0 group by bg.band_id
      ) m)
  ) into result;

  perform mcp__log(a.owner_id, a.token_id, 'cultivar_stats',
    jsonb_build_object('cultivar', p_cultivar), '{}'::jsonb);
  return result;
end $$;

-- API exposure: callable with the anon key (the edge function's client).
-- Authorization happens INSIDE each function via mcp__auth.
do $$
declare fn text;
begin
  foreach fn in array array[
    'mcp_list_runs(text, date, date, text, text, int)',
    'mcp_get_run(text, text)',
    'mcp_yield_summary(text, date, date, text)',
    'mcp_cultivar_stats(text, text)'
  ] loop
    execute format('revoke execute on function public.%s from public', fn);
    execute format('grant execute on function public.%s to anon, authenticated', fn);
  end loop;
end $$;

-- 0023_public_rate_limits.sql
-- Atomic server-side rate limiting for public submission and checkout routes.
-- The raw client address is never stored; the app hashes scope + identifier before calling the RPC.

create table if not exists public.public_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  hits integer not null default 1 check (hits >= 1),
  updated_at timestamptz not null default now()
);

alter table public.public_rate_limits enable row level security;
revoke all on public.public_rate_limits from public, anon, authenticated;
grant all on public.public_rate_limits to service_role;

create or replace function public.consume_public_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hits integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 100
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_arguments';
  end if;

  insert into public.public_rate_limits(key_hash, window_started_at, hits, updated_at)
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update
  set window_started_at = case
        when public.public_rate_limits.window_started_at
             + make_interval(secs => p_window_seconds) <= now()
        then now()
        else public.public_rate_limits.window_started_at
      end,
      hits = case
        when public.public_rate_limits.window_started_at
             + make_interval(secs => p_window_seconds) <= now()
        then 1
        else public.public_rate_limits.hits + 1
      end,
      updated_at = now()
  returning hits into v_hits;

  -- Small opportunistic cleanup keeps the table bounded without a separate cron job.
  if random() < 0.01 then
    delete from public.public_rate_limits
    where updated_at < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;

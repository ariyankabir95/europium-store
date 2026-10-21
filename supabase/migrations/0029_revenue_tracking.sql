-- 0029_revenue_tracking.sql
-- Admin revenue dashboard: auto-calculated totals straight from `orders` (no duplicated/denormalized
-- numbers to drift out of sync), plus a small, separate "manual adjustment" ledger the admin can use to
-- correct the picture by hand (an offline sale not in the system, a correction, a written-off order...)
-- without ever editing real order rows. Review and test against a disposable Supabase database before
-- applying to production.

-- ═══════════════════════════ PART 1 — manual revenue adjustments ═══════════════════════════
-- A small, append-mostly ledger. amount_cents can be positive (adds to revenue, e.g. an offline sale)
-- or negative (a correction/write-off). This never touches `orders` or stock -- it only affects the
-- reporting total computed in Part 2. adjustment_date (not created_at) is what the summary groups by,
-- so a correction can be dated to the day it actually belongs to, not the day it was entered.
create table if not exists revenue_adjustments (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount_cents int not null,
  note text,
  adjustment_date date not null default current_date,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create index if not exists revenue_adjustments_date_idx on revenue_adjustments (adjustment_date);

alter table revenue_adjustments enable row level security;

-- Same pattern as orders (0020): admin can READ directly, but every write goes through a SECURITY
-- DEFINER function below -- no direct insert/update/delete policy exists, so a blanket "admin all"
-- policy is never introduced here in the first place.
drop policy if exists "admin read" on revenue_adjustments;
create policy "admin read" on revenue_adjustments for select using (is_admin());

create or replace function admin_add_revenue_adjustment(
  p_label text,
  p_amount_cents int,
  p_note text default null,
  p_date date default current_date
) returns uuid
-- `set timezone` makes the current_date default (when the caller omits p_date) land on the Dhaka
-- calendar day, matching how the summary functions below read `orders.created_at`, rather than
-- whatever timezone this database session defaults to (Supabase's default is UTC).
language plpgsql security definer set search_path = public, pg_temp set timezone = 'Asia/Dhaka' as $$
declare new_id uuid;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'invalid_label';
  end if;
  if length(p_label) > 200 then
    raise exception 'invalid_label';
  end if;
  if p_amount_cents is null or p_amount_cents = 0 then
    raise exception 'invalid_amount';
  end if;
  if p_date is null then
    raise exception 'invalid_date';
  end if;

  insert into revenue_adjustments(label, amount_cents, note, adjustment_date, created_by)
  values (trim(p_label), p_amount_cents, nullif(trim(coalesce(p_note, '')), ''), p_date, auth.uid())
  returning id into new_id;

  return new_id;
end; $$;

-- Deliberately delete-only, no update: fixing a mistaken entry means deleting it and adding a corrected
-- one, which keeps every row's created_at/created_by meaning exactly what it says, rather than allowing
-- a silently-edited history.
create or replace function admin_delete_revenue_adjustment(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  delete from revenue_adjustments where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
end; $$;

revoke all on function admin_add_revenue_adjustment(text, int, text, date) from public, anon;
revoke all on function admin_delete_revenue_adjustment(uuid) from public, anon;
grant execute on function admin_add_revenue_adjustment(text, int, text, date) to authenticated;
grant execute on function admin_delete_revenue_adjustment(uuid) to authenticated;

-- ═══════════════════════════ PART 2 — auto-calculated summary ═══════════════════════════
-- One pass over `orders` with FILTER aggregates (not N separate queries, not "fetch every row and sum
-- in JS" -- that would silently undercount once an admin has more orders than a single PostgREST page
-- returns). SECURITY DEFINER so it can read every order regardless of the caller's own RLS grant, but
-- it re-checks is_admin() itself first -- required here, since bypassing RLS without that check would
-- let any authenticated customer call this function and read the whole store's revenue.
create or replace function admin_revenue_summary(p_from date, p_to date)
returns table (
  paid_orders_count bigint,
  paid_revenue_cents bigint,
  paid_subtotal_cents bigint,
  paid_discount_cents bigint,
  paid_shipping_cents bigint,
  pending_collection_cents bigint,
  pending_collection_count bigint,
  refunded_cents bigint,
  refunded_count bigint,
  adjustments_cents bigint,
  adjustments_count bigint
)
-- `o.created_at::date` casts using the SESSION timezone. Supabase's database default is UTC, which
-- would make a "Today" range silently cover roughly 6:00pm Dhaka yesterday through 5:59pm Dhaka today
-- instead of actual Dhaka midnight-to-midnight (Bangladesh is a fixed UTC+6, no DST, so this is safe to
-- set directly rather than deriving it). p_from/p_to are computed as Dhaka calendar dates by the caller
-- (app/admin/revenue/page.jsx), so the cast below must use the same timezone to line up with them.
language plpgsql security definer set search_path = public, pg_temp set timezone = 'Asia/Dhaka' as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid_range';
  end if;

  return query
  select
    count(*) filter (where o.payment_status = 'paid'),
    coalesce(sum(o.total_cents) filter (where o.payment_status = 'paid'), 0),
    coalesce(sum(o.subtotal_cents) filter (where o.payment_status = 'paid'), 0),
    coalesce(sum(o.discount_cents) filter (where o.payment_status = 'paid'), 0),
    coalesce(sum(o.shipping_cents) filter (where o.payment_status = 'paid'), 0),
    -- Orders placed but not yet marked paid (typically COD awaiting collection, or bKash awaiting
    -- manual verification) -- not revenue yet, but useful to see what's still outstanding.
    coalesce(sum(o.total_cents) filter (where o.payment_status = 'unpaid' and o.status <> 'cancelled'), 0),
    count(*) filter (where o.payment_status = 'unpaid' and o.status <> 'cancelled'),
    coalesce(sum(o.total_cents) filter (where o.payment_status = 'refunded'), 0),
    count(*) filter (where o.payment_status = 'refunded'),
    (select coalesce(sum(amount_cents), 0) from revenue_adjustments where adjustment_date between p_from and p_to),
    (select count(*) from revenue_adjustments where adjustment_date between p_from and p_to)
  from orders o
  where o.trashed_at is null
    and o.created_at::date between p_from and p_to;
end; $$;

-- Per-day paid revenue for the simple trend table on the admin page. Same admin check and reasoning as above.
create or replace function admin_revenue_by_day(p_from date, p_to date)
returns table (day date, orders_count bigint, revenue_cents bigint)
language plpgsql security definer set search_path = public, pg_temp set timezone = 'Asia/Dhaka' as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid_range';
  end if;

  return query
    select o.created_at::date as day, count(*), coalesce(sum(o.total_cents), 0)
    from orders o
    where o.payment_status = 'paid' and o.trashed_at is null and o.created_at::date between p_from and p_to
    group by o.created_at::date
    order by day;
end; $$;

revoke all on function admin_revenue_summary(date, date) from public, anon;
revoke all on function admin_revenue_by_day(date, date) from public, anon;
grant execute on function admin_revenue_summary(date, date) to authenticated;
grant execute on function admin_revenue_by_day(date, date) to authenticated;

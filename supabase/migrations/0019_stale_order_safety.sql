-- 0019_stale_order_safety.sql
-- Hardens the stale-order release job, closes a race between it and admin order-status changes, and
-- makes the admin order-status/payment/tracking update a single atomic RPC call.

-- ═════════════════════ PART 1 — validate p_minutes inside release_stale_orders ═════════════════════
-- Additive/defensive only: no table changed, signature unchanged, so CREATE OR REPLACE on the same
-- signature preserves the existing service-role-only grant automatically (same convention already used
-- when 0006/0008 replaced create_order()).
-- Both current callers (netlify/functions/release-stale.mjs, app/api/cron/release-stale/route.js)
-- already clamp their STALE_ORDER_MINUTES override to >= 60 before calling this function, so this
-- change is a no-op for them today -- their behavior is unchanged. It protects any OTHER caller (a
-- direct SQL-editor call, a future script) that doesn't apply the same floor:
--   * an explicit NULL previously made the function silently release nothing
--     (created_at < NULL is never true, so the loop matched zero rows and returned 0 with no error);
--   * a negative value previously turned `now() - make_interval(mins => p_minutes)` into a FUTURE
--     timestamp (subtracting a negative interval adds it), which would have matched and cancelled
--     essentially every pending/unpaid/reserved order in one call, regardless of its actual age.
create or replace function release_stale_orders(p_minutes int default 60) returns int
language plpgsql security definer set search_path = public as $$
declare
  o record;
  r record;
  n int := 0;
  mins int := coalesce(p_minutes, 60);
begin
  if mins < 60 then
    mins := 60;
  end if;

  for o in
    select id from orders
    where status = 'pending' and payment_status = 'unpaid' and stock_state = 'reserved'
      and created_at < now() - make_interval(mins => mins)
    for update
  loop
    for r in select variant_id, quantity from order_items where order_id = o.id and variant_id is not null loop
      update product_variants set reserved = greatest(0, reserved - r.quantity) where id = r.variant_id;
    end loop;
    update orders set stock_state = 'released', status = 'cancelled' where id = o.id;
    n := n + 1;
  end loop;

  return n;
end $$;

-- ═════ PART 2 — admin_set_order_status: atomic status + payment + tracking, no silent fulfillment ═════
-- The original race: release_stale_orders() and admin_set_order_status() both take `select ... for
-- update` on the same `orders` row. If an admin confirmed/processed/shipped/delivered an order at the
-- exact moment the stale-order job had already released that order's stock (stock_state = 'released'),
-- the OLD function body (from 0004) matched neither of its two `if` branches (both required
-- stock_state = 'reserved'), so it fell straight through to `update orders set status = p_status` --
-- changing status to something implying active fulfillment while stock_state stayed 'released' (no
-- stock actually held), with no error raised and nothing shown in the admin UI.
--
-- This version also folds the admin UI's separate `orders.update({payment_status, tracking_number})`
-- Supabase call into this same function, so one RPC call now commits order status, payment status and
-- tracking number as ONE Postgres transaction. Previously those were two separate Supabase requests
-- from app/admin/orders/page.jsx (the payment/tracking write ran BEFORE the status RPC and was never
-- conditioned on its outcome), so a failed status change could not stop an already-submitted
-- payment_status/tracking edit from the same form submission -- that was a real, if narrow, gap.
-- Because Postgres wraps one function call's entire body in a single implicit transaction, a
-- `raise exception` anywhere below -- the existing 'forbidden' / 'invalid_status' / 'not_found' checks,
-- the new 'invalid_payment_status' check, or the new 'insufficient_stock' check -- now rolls back
-- EVERYTHING this call attempted, including the payment_status/tracking_number write at the bottom. No
-- partial update is possible from a single call.
--
-- payment_status is still only ever set to whatever value the admin explicitly chose in the form's
-- payment-status dropdown (unchanged meaning, just moved into this function) -- this migration adds no
-- new way for payment_status to become 'paid' other than that same explicit admin action. It still never
-- touches payment_method or payment_reference (the submitted bKash TrxID), so the manual
-- bKash-verification workflow (admin reads the TrxID, checks it themselves, then flips payment_status)
-- is unchanged.
--
-- Signature change: adds p_payment_status (required) and p_tracking (optional, NULL = no tracking
-- number). The old 2-argument overload, admin_set_order_status(uuid,text), is dropped rather than left
-- in place alongside the new one: Postgres resolves overloads by argument count, so an unpatched 2-arg
-- version left in place would still be reachable (it was granted to `authenticated` in 0004) and would
-- still contain the original race-condition bug this migration exists to fix. The one caller in this
-- repo, app/admin/orders/page.jsx, is updated in this same change to call the new 4-argument signature
-- exclusively, and its own grant is re-declared below (CREATE OR REPLACE does not carry grants across a
-- signature change, unlike Part 1 above).
--
-- p_payment_status has no default (always required): the table's own `payment_status` column is
-- `not null`, so there is no meaningful "leave it unset" call. p_tracking defaults to NULL, which is
-- itself a valid, meaningful tracking_number value (no tracking number yet) -- not a "don't touch"
-- sentinel. The one real caller always has the order's current values on hand (it reads them to
-- populate the form) and always submits both on every save, so neither limits the app; a future ad-hoc
-- SQL-editor call that wants to leave payment_status/tracking unchanged just needs to pass the order's
-- current values explicitly.
--
-- Known, deliberately accepted limitation carried over from the original fix: the per-item availability
-- check below does not aggregate multiple order_items rows against the same variant within one order.
-- This repo's schema makes that impossible today (cart_items' primary key is
-- (user_id, product_id, size, color), so create_order() can only ever produce at most one order_item per
-- variant per order) -- noted here rather than left as a silent assumption, in case that constraint is
-- ever relaxed.
drop function if exists admin_set_order_status(uuid, text);

create or replace function admin_set_order_status(
  p_order uuid,
  p_status text,
  p_payment_status text,
  p_tracking text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  r record;
  avail int;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') then
    raise exception 'invalid_status';
  end if;

  if p_payment_status not in ('unpaid', 'paid', 'failed', 'refunded') then
    raise exception 'invalid_payment_status';
  end if;

  select * into o from orders where id = p_order for update;
  if not found then
    raise exception 'not_found';
  end if;

  if o.stock_state = 'reserved' and p_status in ('cancelled', 'refunded') then
    for r in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
      update product_variants set reserved = greatest(0, reserved - r.quantity) where id = r.variant_id;
    end loop;
    update orders set stock_state = 'released' where id = p_order;

  elsif o.stock_state = 'reserved' and p_status in ('shipped', 'delivered') then
    for r in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
      update product_variants set stock = greatest(0, stock - r.quantity), reserved = greatest(0, reserved - r.quantity) where id = r.variant_id;
    end loop;
    update orders set stock_state = 'committed' where id = p_order;

  elsif o.stock_state = 'released' and p_status in ('confirmed', 'processing', 'shipped', 'delivered') then
    for r in
      select oi.variant_id, oi.quantity, pv.stock, pv.reserved
      from order_items oi
      join product_variants pv on pv.id = oi.variant_id
      where oi.order_id = p_order and oi.variant_id is not null
      for update of pv
    loop
      avail := r.stock - r.reserved;
      if avail < r.quantity then
        raise exception 'insufficient_stock';
      end if;
    end loop;

    if p_status in ('confirmed', 'processing') then
      for r in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
        update product_variants set reserved = reserved + r.quantity where id = r.variant_id;
      end loop;
      update orders set stock_state = 'reserved' where id = p_order;
    else
      -- 'shipped' / 'delivered': commit directly. These items are not currently counted in `reserved`
      -- (already released), so only `stock` is decremented here -- this mirrors the net effect of the
      -- normal reserved -> committed transition above without double-touching `reserved`.
      for r in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
        update product_variants set stock = greatest(0, stock - r.quantity) where id = r.variant_id;
      end loop;
      update orders set stock_state = 'committed' where id = p_order;
    end if;
  end if;

  update orders set status = p_status, payment_status = p_payment_status, tracking_number = p_tracking where id = p_order;
end $$;

revoke all on function admin_set_order_status(uuid, text, text, text) from public, anon;
grant execute on function admin_set_order_status(uuid, text, text, text) to authenticated;

-- 0024_reactivate_released_orders.sql
-- Re-reserve stock when an admin reactivates a cancelled/stale order as pending.
-- Migration 0019 already safely re-reserves released orders set to confirmed/processing and
-- directly commits stock for shipped/delivered. It missed the released -> pending transition,
-- which could leave an order looking pending while no stock was reserved.

create or replace function admin_set_order_status(
  p_order uuid,
  p_status text,
  p_payment_status text,
  p_tracking text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  r record;
  avail int;
  needed int;
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
    for r in
      select variant_id, quantity from order_items
      where order_id = p_order and variant_id is not null
    loop
      update product_variants
      set reserved = greatest(0, reserved - r.quantity)
      where id = r.variant_id;
    end loop;
    update orders set stock_state = 'released' where id = p_order;

  elsif o.stock_state = 'reserved' and p_status in ('shipped', 'delivered') then
    for r in
      select variant_id, quantity from order_items
      where order_id = p_order and variant_id is not null
    loop
      update product_variants
      set stock = greatest(0, stock - r.quantity),
          reserved = greatest(0, reserved - r.quantity)
      where id = r.variant_id;
    end loop;
    update orders set stock_state = 'committed' where id = p_order;

  elsif o.stock_state = 'released' and p_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered') then
    -- Lock and check every variant before changing any stock, so failure rolls back atomically.
    -- Lock each affected variant once and compare against the TOTAL quantity for that
    -- variant. An order can contain duplicate lines for one variant; checking each line
    -- independently against the same pre-update stock snapshot could otherwise under-reserve.
    for r in
      select pv.id, pv.stock, pv.reserved
      from product_variants pv
      where pv.id in (
        select distinct oi.variant_id
        from order_items oi
        where oi.order_id = p_order and oi.variant_id is not null
      )
      order by pv.id
      for update
    loop
      select coalesce(sum(oi.quantity), 0)::int
      into needed
      from order_items oi
      where oi.order_id = p_order and oi.variant_id = r.id;

      avail := r.stock - r.reserved;
      if avail < needed then
        raise exception 'insufficient_stock';
      end if;
    end loop;

    if p_status in ('pending', 'confirmed', 'processing') then
      for r in
        select variant_id, quantity from order_items
        where order_id = p_order and variant_id is not null
      loop
        update product_variants
        set reserved = reserved + r.quantity
        where id = r.variant_id;
      end loop;
      update orders set stock_state = 'reserved' where id = p_order;
    else
      -- Shipped/delivered transitions from released state commit directly, without adding a reservation.
      for r in
        select variant_id, quantity from order_items
        where order_id = p_order and variant_id is not null
      loop
        update product_variants
        set stock = greatest(0, stock - r.quantity)
        where id = r.variant_id;
      end loop;
      update orders set stock_state = 'committed' where id = p_order;
    end if;
  end if;

  update orders
  set status = p_status,
      payment_status = p_payment_status,
      tracking_number = p_tracking
  where id = p_order;
end;
$$;

revoke all on function admin_set_order_status(uuid, text, text, text) from public, anon;
grant execute on function admin_set_order_status(uuid, text, text, text) to authenticated;

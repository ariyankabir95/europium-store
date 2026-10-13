-- 0027_admin_reversible_trash.sql
-- Reversible admin-only trash for test/fake orders and customer profiles.
-- Orders and customer identities are retained; no hard deletes are performed.

alter table public.orders
  add column if not exists trashed_at timestamptz;

alter table public.profiles
  add column if not exists trashed_at timestamptz;

create index if not exists orders_trashed_at_idx
  on public.orders (trashed_at)
  where trashed_at is not null;

create index if not exists profiles_trashed_at_idx
  on public.profiles (trashed_at)
  where trashed_at is not null;

create or replace function public.admin_set_order_trashed(
  p_order uuid,
  p_trashed boolean
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o public.orders%rowtype;
  r record;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_trashed is null then
    raise exception 'invalid_input';
  end if;

  select * into o
  from public.orders
  where id = p_order
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if p_trashed then
    -- Do not hide paid, shipped/fulfilled, or otherwise active confirmed orders.
    -- Pending unpaid test orders can be safely cancelled and their reservations released.
    if o.payment_status = 'paid'
       or o.stock_state = 'committed'
       or o.status not in ('pending', 'cancelled', 'refunded') then
      raise exception 'order_not_trashable';
    end if;

    if o.stock_state = 'reserved' then
      for r in
        select variant_id, quantity
        from public.order_items
        where order_id = p_order and variant_id is not null
      loop
        update public.product_variants
        set reserved = greatest(0, reserved - r.quantity)
        where id = r.variant_id;
      end loop;

      update public.orders
      set stock_state = 'released',
          status = 'cancelled'
      where id = p_order;
    elsif o.status = 'pending' then
      update public.orders set status = 'cancelled' where id = p_order;
    end if;

    update public.orders set trashed_at = now() where id = p_order;
  else
    update public.orders set trashed_at = null where id = p_order;
  end if;
end;
$$;

create or replace function public.admin_set_customer_trashed(
  p_customer uuid,
  p_trashed boolean
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  customer_role text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_customer is null or p_trashed is null then
    raise exception 'invalid_input';
  end if;

  select role into customer_role
  from public.profiles
  where id = p_customer
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if customer_role <> 'customer' then
    raise exception 'customer_only';
  end if;

  update public.profiles
  set trashed_at = case when p_trashed then now() else null end
  where id = p_customer;
end;
$$;

revoke all on function public.admin_set_order_trashed(uuid, boolean) from public, anon;
revoke all on function public.admin_set_customer_trashed(uuid, boolean) from public, anon;
grant execute on function public.admin_set_order_trashed(uuid, boolean) to authenticated;
grant execute on function public.admin_set_customer_trashed(uuid, boolean) to authenticated;

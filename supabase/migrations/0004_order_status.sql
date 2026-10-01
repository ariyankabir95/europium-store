alter table orders add column if not exists stock_state text not null default 'reserved' check (stock_state in ('reserved','committed','released'));
-- Status change with stock handling. Cancel/refund releases reservations; ship/deliver commits them (idempotent via stock_state).
create or replace function admin_set_order_status(p_order uuid, p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; r record;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded') then raise exception 'invalid_status'; end if;
  select * into o from orders where id=p_order for update; if not found then raise exception 'not_found'; end if;
  if o.stock_state='reserved' and p_status in ('cancelled','refunded') then
    for r in select variant_id, quantity from order_items where order_id=p_order and variant_id is not null loop
      update product_variants set reserved=greatest(0,reserved-r.quantity) where id=r.variant_id; end loop;
    update orders set stock_state='released' where id=p_order;
  elsif o.stock_state='reserved' and p_status in ('shipped','delivered') then
    for r in select variant_id, quantity from order_items where order_id=p_order and variant_id is not null loop
      update product_variants set stock=greatest(0,stock-r.quantity), reserved=greatest(0,reserved-r.quantity) where id=r.variant_id; end loop;
    update orders set stock_state='committed' where id=p_order;
  end if;
  update orders set status=p_status where id=p_order;
end $$;
revoke all on function admin_set_order_status(uuid,text) from public, anon;
grant execute on function admin_set_order_status(uuid,text) to authenticated;

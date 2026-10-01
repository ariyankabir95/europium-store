-- Variant admin CRUD: active flag, no-duplicate-combo constraint, active-aware order matching and public visibility.
alter table product_variants add column if not exists active boolean not null default true;
create unique index if not exists product_variants_product_size_color_key on product_variants(product_id, size, color_name);

drop policy if exists "public read" on product_variants;
create policy "public read" on product_variants for select using (active and exists(select 1 from products p where p.id=product_id and p.published));

-- Same as 0006's create_order, plus: only an active variant can be matched/ordered. Prices and stock remain resolved server-side, never from the client.
create or replace function create_order(p_user uuid, p_email text, p_address jsonb, p_items jsonb, p_coupon text)
returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; it jsonb; v record; sub int := 0; disc int := 0; ship int := 0; cp record; cp_id uuid; qty int;
begin
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'invalid_item'; end if;
  insert into orders(user_id,email,shipping_address,subtotal_cents,total_cents) values(p_user,p_email,p_address,0,0) returning id into oid;
  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it->>'qty')::int; if qty is null or qty<1 or qty>10 then raise exception 'invalid_item'; end if;
    select pv.id as vid, pv.stock, pv.reserved, p.id as pid, p.name, coalesce(p.sale_price_cents,p.price_cents) as price into v
      from product_variants pv join products p on p.id=pv.product_id
      where p.slug=it->>'slug' and p.published and pv.active and pv.size=it->>'size' and pv.color_name=it->>'color' for update of pv;
    if not found then raise exception 'invalid_item'; end if;
    if v.stock - v.reserved < qty then raise exception 'out_of_stock'; end if;
    update product_variants set reserved=reserved+qty where id=v.vid;
    insert into order_items(order_id,product_id,variant_id,name,unit_price_cents,quantity) values(oid,v.pid,v.vid,v.name||' / '||(it->>'size')||' / '||(it->>'color'),v.price,qty);
    sub := sub + v.price*qty;
  end loop;
  if coalesce(p_coupon,'')<>'' then
    select * into cp from coupons where code=upper(p_coupon) and active and (expires_at is null or expires_at>now()) and (usage_limit is null or used_count<usage_limit) and min_order_cents<=sub for update;
    if not found then raise exception 'invalid_coupon'; end if;
    cp_id := cp.id;
    disc := least(sub, case cp.kind when 'percent' then sub*cp.value/100 else cp.value*100 end);
    update coupons set used_count=used_count+1 where id=cp.id;
    insert into coupon_usage(coupon_id,order_id,user_id) values(cp.id,oid,p_user);
  end if;
  ship := case when sub-disc>=20000 then 0 else 1200 end;
  update orders set subtotal_cents=sub, discount_cents=disc, shipping_cents=ship, total_cents=sub-disc+ship, coupon_id=cp_id where id=oid;
  return oid;
end $$;

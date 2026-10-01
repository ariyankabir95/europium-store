-- 1) Fix: create_order referenced an unassigned record (cp) when no coupon was used.
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
      where p.slug=it->>'slug' and p.published and pv.size=it->>'size' and pv.color_name=it->>'color' for update of pv;
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
-- 2) Fix: profile update policy blocked admins (role='customer' check). Now: role may not change, whatever it is.
create or replace function my_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() $$;
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role=my_role());
-- 3) Stale unpaid orders hold stock: release them (call from a scheduled job with the service role).
create or replace function release_stale_orders(p_minutes int default 60) returns int language plpgsql security definer set search_path=public as $$
declare o record; r record; n int := 0;
begin
  for o in select id from orders where status='pending' and payment_status='unpaid' and stock_state='reserved' and created_at < now() - make_interval(mins => p_minutes) for update loop
    for r in select variant_id, quantity from order_items where order_id=o.id and variant_id is not null loop update product_variants set reserved=greatest(0,reserved-r.quantity) where id=r.variant_id; end loop;
    update orders set stock_state='released', status='cancelled' where id=o.id; n := n+1;
  end loop; return n;
end $$;
revoke all on function release_stale_orders(int) from public, anon, authenticated; grant execute on function release_stale_orders(int) to service_role;
-- 4) Storage: public read, admin-only write for image buckets.
insert into storage.buckets(id,name,public) values ('products','products',true),('categories','categories',true),('collections','collections',true),('homepage','homepage',true),('lookbook','lookbook',true) on conflict do nothing;
create policy "public read images" on storage.objects for select using (bucket_id in ('products','categories','collections','homepage','lookbook'));
create policy "admin write images" on storage.objects for insert with check (bucket_id in ('products','categories','collections','homepage','lookbook') and is_admin());
create policy "admin update images" on storage.objects for update using (is_admin());
create policy "admin delete images" on storage.objects for delete using (is_admin());

-- 0012_fix_create_order.sql
-- 1) FIX (critical): the 7-argument create_order() added in 0010 was copied from the ORIGINAL 0003 version, so it
--    had two regressions that earlier migrations had already fixed:
--      a) `coupon_id = cp.id` on an unassigned record -> every order WITHOUT a coupon failed with
--         "record cp is not assigned yet" (checkout returned "We couldn't place your order").
--      b) it no longer filtered on `pv.active` (0008), so archived variants could still be ordered.
--    This restores both fixes and keeps the bKash payment-reference rules from 0010.
-- 2) Drops the obsolete 5-argument overload so orders can only be created with a payment reference.
-- 3) Adds length limits for the two tables that accept anonymous inserts.

drop function if exists create_order(uuid, text, jsonb, jsonb, text);

create or replace function create_order(
  p_user uuid,
  p_email text,
  p_address jsonb,
  p_items jsonb,
  p_coupon text,
  p_payment_method text,
  p_payment_reference text
) returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; it jsonb; v record; sub int := 0; disc int := 0; ship int := 0; cp record; cp_id uuid; qty int;
begin
  if p_payment_method <> 'bkash_manual' or length(trim(coalesce(p_payment_reference,''))) < 4 then raise exception 'invalid_payment'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'invalid_item'; end if;
  insert into orders(user_id,email,shipping_address,subtotal_cents,total_cents,payment_method,payment_reference)
    values(p_user,p_email,p_address,0,0,'bkash_manual',trim(p_payment_reference)) returning id into oid;
  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it->>'qty')::int; if qty is null or qty<1 or qty>10 then raise exception 'invalid_item'; end if;
    select pv.id as vid, pv.stock, pv.reserved, p.id as pid, p.name, coalesce(p.sale_price_cents,p.price_cents) as price into v
      from product_variants pv join products p on p.id=pv.product_id
      where p.slug=it->>'slug' and p.published and pv.active and pv.size=it->>'size' and pv.color_name=it->>'color' for update of pv;
    if not found then raise exception 'invalid_item'; end if;
    if v.stock - v.reserved < qty then raise exception 'out_of_stock'; end if;
    update product_variants set reserved=reserved+qty where id=v.vid;
    insert into order_items(order_id,product_id,variant_id,name,unit_price_cents,quantity)
      values(oid,v.pid,v.vid,v.name||' / '||(it->>'size')||' / '||(it->>'color'),v.price,qty);
    sub := sub + v.price*qty;
  end loop;
  if coalesce(p_coupon,'')<>'' then
    select * into cp from coupons
      where code=upper(p_coupon) and active and (expires_at is null or expires_at>now()) and (usage_limit is null or used_count<usage_limit) and min_order_cents<=sub for update;
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

revoke all on function create_order(uuid,text,jsonb,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function create_order(uuid,text,jsonb,jsonb,text,text,text) to service_role;

-- Anonymous visitors can insert into these tables (RLS `with check (true)`), so cap the sizes at the database too.
-- NOT VALID: applies to new rows only, so existing data can never block the migration.
do $$ begin
  alter table contact_messages add constraint contact_messages_len
    check (char_length(name) <= 120 and char_length(email) <= 254 and char_length(coalesce(subject,'')) <= 200 and char_length(message) <= 5000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table newsletter_subscribers add constraint newsletter_subscribers_len check (char_length(email) <= 254) not valid;
exception when duplicate_object then null; end $$;

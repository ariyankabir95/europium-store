create extension if not exists pgcrypto;
create table profiles (id uuid primary key references auth.users on delete cascade, full_name text, phone text, role text not null default 'customer' check (role in ('customer','admin')), created_at timestamptz default now());
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table categories (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, description text, image_url text, seo_title text, seo_description text, published boolean default true, sort int default 0);
create table collections (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text, image_url text, published boolean default true, sort int default 0);
create table products (id uuid primary key default gen_random_uuid(), slug text unique not null, sku text unique, name text not null, description text, price_cents int not null check (price_cents>=0), sale_price_cents int check (sale_price_cents>=0 and sale_price_cents<price_cents), category_id uuid references categories, tags text[] default '{}', badge text check (badge in ('NEW','SALE','BESTSELLER')), materials text, care text, seo_title text, seo_description text, published boolean default false, sold int default 0, created_at timestamptz default now());
create table product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, url text not null, alt text, sort int default 0);
create table product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, size text, color_name text, color_hex text, sku text unique, stock int not null default 0 check (stock>=0), reserved int not null default 0 check (reserved>=0), low_stock_threshold int default 5);
create table collection_products (collection_id uuid references collections on delete cascade, product_id uuid references products on delete cascade, sort int default 0, primary key(collection_id,product_id));
create table addresses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, first_name text, last_name text, line1 text, city text, state text, postal_code text, country text, phone text);
create table wishlist_items (user_id uuid references auth.users on delete cascade, product_id uuid references products on delete cascade, created_at timestamptz default now(), primary key(user_id,product_id));
create table coupons (id uuid primary key default gen_random_uuid(), code text unique not null, kind text not null check (kind in ('percent','fixed')), value int not null check (value>0), min_order_cents int default 0, expires_at timestamptz, usage_limit int, used_count int default 0, active boolean default true);
create table orders (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users, email text not null, shipping_address jsonb not null, subtotal_cents int not null, discount_cents int default 0, shipping_cents int default 0, total_cents int not null, coupon_id uuid references coupons, status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')), payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','failed','refunded')), tracking_number text, created_at timestamptz default now());
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, product_id uuid references products, variant_id uuid references product_variants, name text not null, unit_price_cents int not null, quantity int not null check (quantity>0));
create table coupon_usage (coupon_id uuid references coupons, order_id uuid references orders, user_id uuid, primary key(coupon_id,order_id));
create table reviews (id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, user_id uuid references auth.users, rating int not null check (rating between 1 and 5), body text, status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz default now());
create table newsletter_subscribers (id uuid primary key default gen_random_uuid(), email text unique not null, status text default 'active', created_at timestamptz default now());
create table contact_messages (id uuid primary key default gen_random_uuid(), name text not null, email text not null, subject text, message text not null, is_read boolean default false, created_at timestamptz default now());
create table homepage_sections (key text primary key, content jsonb not null default '{}', published boolean default true, sort int default 0);
create table lookbook_items (id uuid primary key default gen_random_uuid(), title text not null, description text, image_url text, product_ids uuid[] default '{}', published boolean default false, sort int default 0);
create table site_settings (key text primary key, value jsonb not null);
create index on products(category_id); create index on products(published, created_at desc); create index on product_variants(product_id); create index on order_items(order_id); create index on orders(user_id); create index on reviews(product_id,status);

do $$ declare t text; begin
  foreach t in array array['profiles','categories','collections','products','product_images','product_variants','collection_products','addresses','wishlist_items','coupons','orders','order_items','coupon_usage','reviews','newsletter_subscribers','contact_messages','homepage_sections','lookbook_items','site_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "admin all" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;
-- Public read of published content
create policy "public read" on categories for select using (published);
create policy "public read" on collections for select using (published);
create policy "public read" on products for select using (published);
create policy "public read" on product_images for select using (exists(select 1 from products p where p.id=product_id and p.published));
create policy "public read" on product_variants for select using (exists(select 1 from products p where p.id=product_id and p.published));
create policy "public read" on collection_products for select using (true);
create policy "public read" on homepage_sections for select using (published);
create policy "public read" on lookbook_items for select using (published);
create policy "public read" on reviews for select using (status='approved');
-- Customer-owned data
create policy "own profile" on profiles for select using (id=auth.uid());
create policy "own profile update" on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role='customer');
create policy "own addresses" on addresses for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own wishlist" on wishlist_items for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own orders" on orders for select using (user_id=auth.uid());
create policy "own order items" on order_items for select using (exists(select 1 from orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "submit review" on reviews for insert with check (user_id=auth.uid() and status='pending');
create policy "subscribe" on newsletter_subscribers for insert with check (true);
create policy "contact" on contact_messages for insert with check (true);
-- Orders, coupons and payments are written server-side with the service role only.

-- Account-only persistent cart. There is no guest cart: rows exist only for signed-in users.
-- Run this once in the Supabase SQL editor (or via the CLI) before deploying the matching code.
create table if not exists cart_items (
  user_id uuid not null references auth.users on delete cascade,
  product_id uuid not null references products on delete cascade,
  size text not null,
  color text not null,
  qty int not null check (qty between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id, size, color)
);
create index if not exists cart_items_user_idx on cart_items(user_id, created_at);
alter table cart_items enable row level security;
drop policy if exists "own cart" on cart_items;
create policy "own cart" on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin all" on cart_items;
create policy "admin all" on cart_items for all using (is_admin()) with check (is_admin());

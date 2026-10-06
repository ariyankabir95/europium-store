-- 0011_cms.sql — Full storefront CMS: pages, page sections, navigation, footer.
-- Additive only: no existing table, row or policy is dropped or altered.
-- Reuses is_admin() from 0001. The legacy homepage_sections table is kept (it still
-- backs the announcement bar and is the source of the one-time homepage migration below).

create or replace function cms_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── pages ─────────────────────────
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_home boolean not null default false,
  published boolean not null default false,   -- unpublished pages are not publicly accessible (404)
  hidden boolean not null default false,      -- published but unlisted: reachable by URL, noindex, kept out of the sitemap
  seo_title text,
  seo_description text,
  canonical_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pages_single_home on pages(is_home) where is_home;
create index if not exists pages_published_idx on pages(published, hidden);
create trigger pages_touch before update on pages for each row execute function cms_touch_updated_at();

create table if not exists page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null check (type in ('hero','text','image_text','image','product_grid','featured_products','category_grid','collection_grid','promo_banner','rich_text','cta','newsletter','spacer')),
  sort int not null default 0,
  active boolean not null default true,       -- hidden sections are not rendered
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists page_sections_page_idx on page_sections(page_id, sort);
create trigger page_sections_touch before update on page_sections for each row execute function cms_touch_updated_at();

-- ───────────────────────── navigation ─────────────────────────
-- One row per menu ('header' drives desktop AND mobile; 'footer' holds footer text settings).
create table if not exists navigation_menus (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger navigation_menus_touch before update on navigation_menus for each row execute function cms_touch_updated_at();

create table if not exists navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references navigation_menus(id) on delete cascade,
  label text not null,
  link_type text not null default 'custom' check (link_type in ('page','product','category','collection','route','custom')),
  link_target text not null default '',       -- page id | product slug | category slug | collection slug | built-in route | custom URL
  open_new_tab boolean not null default false,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists navigation_items_menu_idx on navigation_items(menu_id, sort);
create trigger navigation_items_touch before update on navigation_items for each row execute function cms_touch_updated_at();

-- ───────────────────────── footer ─────────────────────────
create table if not exists footer_columns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  placement text not null default 'main' check (placement in ('main','bottom')),  -- bottom = inline legal row under the footer
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger footer_columns_touch before update on footer_columns for each row execute function cms_touch_updated_at();

create table if not exists footer_links (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references footer_columns(id) on delete cascade,
  label text not null,
  link_type text not null default 'custom' check (link_type in ('page','product','category','collection','route','custom')),
  link_target text not null default '',
  open_new_tab boolean not null default false,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists footer_links_column_idx on footer_links(column_id, sort);
create trigger footer_links_touch before update on footer_links for each row execute function cms_touch_updated_at();

-- ───────────────────────── RLS ─────────────────────────
-- Writes: admins only (is_admin()). Public reads: published / active rows only.
-- Storefront code ALSO filters explicitly, because an admin session can read everything.
do $$ declare t text; begin
  foreach t in array array['pages','page_sections','navigation_menus','navigation_items','footer_columns','footer_links'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin all" on %I', t);
    execute format('create policy "admin all" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;

drop policy if exists "public read" on pages;
create policy "public read" on pages for select using (published);
drop policy if exists "public read" on page_sections;
create policy "public read" on page_sections for select using (active and exists(select 1 from pages p where p.id = page_id and p.published));
drop policy if exists "public read" on navigation_menus;
create policy "public read" on navigation_menus for select using (active);
drop policy if exists "public read" on navigation_items;
create policy "public read" on navigation_items for select using (active and exists(select 1 from navigation_menus m where m.id = menu_id and m.active));
drop policy if exists "public read" on footer_columns;
create policy "public read" on footer_columns for select using (active);
drop policy if exists "public read" on footer_links;
create policy "public read" on footer_links for select using (active and exists(select 1 from footer_columns c where c.id = column_id and c.active));

-- ───────────────────────── seed: navigation ─────────────────────────
insert into navigation_menus(key, name, settings) values
  ('header', 'Header & mobile menu', '{"logo_text":"EUROPIUM"}'::jsonb),
  ('footer', 'Footer settings', '{"about_text":"Modern menswear in natural fabrics, made to last beyond the season.","copyright_text":""}'::jsonb)
on conflict (key) do nothing;

insert into navigation_items(menu_id, label, link_type, link_target, sort)
select m.id, v.label, v.t, v.target, v.sort
from navigation_menus m,
  (values (1,'Home','route','/'), (2,'Shop','route','/shop'), (3,'Clothing','category','clothing'), (4,'Footwear','category','footwear'),
          (5,'Accessories','category','accessories'), (6,'Lookbook','route','/lookbook'), (7,'Sale','route','/sale')) as v(sort, label, t, target)
where m.key = 'header' and not exists (select 1 from navigation_items i where i.menu_id = m.id);

-- ───────────────────────── seed: footer (mirrors the previous hard-coded footer) ─────────────────────────
do $$
declare cid uuid;
begin
  if exists (select 1 from footer_columns) then return; end if;

  insert into footer_columns(title, sort) values ('Shop', 1) returning id into cid;
  insert into footer_links(column_id, label, link_type, link_target, sort) values
    (cid,'New Arrivals','custom','/shop?sort=newest',1), (cid,'Clothing','category','clothing',2), (cid,'Footwear','category','footwear',3),
    (cid,'Accessories','category','accessories',4), (cid,'Sale','route','/sale',5);

  insert into footer_columns(title, sort) values ('Help', 2) returning id into cid;
  insert into footer_links(column_id, label, link_type, link_target, sort) values
    (cid,'Contact','route','/contact',1), (cid,'Shipping','custom','/shipping',2), (cid,'Returns','custom','/returns',3), (cid,'FAQ','custom','/faq',4);

  insert into footer_columns(title, sort) values ('About', 3) returning id into cid;
  insert into footer_links(column_id, label, link_type, link_target, sort) values
    (cid,'Our Story','route','/about',1), (cid,'Lookbook','route','/lookbook',2), (cid,'Journal','custom','/journal',3);

  insert into footer_columns(title, sort) values ('Follow', 4) returning id into cid;
  insert into footer_links(column_id, label, link_type, link_target, sort) values
    (cid,'Instagram','custom','#',1), (cid,'Facebook','custom','#',2), (cid,'TikTok','custom','#',3), (cid,'Pinterest','custom','#',4);

  insert into footer_columns(title, placement, sort) values ('Legal', 'bottom', 5) returning id into cid;
  insert into footer_links(column_id, label, link_type, link_target, sort) values
    (cid,'Privacy','custom','/privacy',1), (cid,'Terms','custom','/terms',2);
end $$;

-- ───────────────────────── seed: homepage → CMS sections ─────────────────────────
-- Copies the CURRENT homepage (same order, same text/images/visibility from homepage_sections)
-- into page_sections so the storefront looks identical until you change it in Admin → Pages.
do $$
declare hid uuid; r record; c jsonb; pub boolean;
begin
  insert into pages(title, slug, is_home, published, seo_title, seo_description)
  values ('Home', 'home', true, true, null, null) on conflict (slug) do nothing;
  select id into hid from pages where is_home limit 1;
  if hid is null or exists (select 1 from page_sections where page_id = hid) then return; end if;

  for r in select * from (values
    (1,  'hero',         'hero',         '{"title":"Define\nYour Style","body":"Modern Menswear for Every Occasion","cta_label":"Shop Now","cta_type":"custom","cta_target":"/shop","cta2_label":"New Arrivals","cta2_type":"custom","cta2_target":"/shop?sort=newest","height":"full"}'),
    (2,  'essentials',   'category_grid','{"title":"Essentials"}'),
    (3,  'promo',        'image_text',   '{"title":"Autumn Collection\nUp to 30% OFF","body":"Selected outerwear and tailoring, for a limited time.","cta_label":"Shop collection","cta_type":"custom","cta_target":"/sale","tone":"cream","flip":false}'),
    (4,  'trending',     'product_grid', '{"title":"Trending Now","source":"trending","limit":8,"view_all_type":"route","view_all_target":"/shop"}'),
    (5,  'new_arrivals', 'product_grid', '{"title":"New Arrivals","source":"newest","limit":4,"view_all_type":"custom","view_all_target":"/shop?sort=newest"}'),
    (6,  'editorial',    'image_text',   '{"title":"Designed for\nEvery Move","body":"Cut for movement, finished to last: natural fabrics and quiet detail.","cta_label":"Explore collection","cta_type":"custom","cta_target":"/shop","tone":"warm","flip":true}'),
    (7,  'featured',     'image_text',   '{"title":"The Autumn Edit","body":"Layers in wool, cotton and leather.","cta_label":"Shop collection","cta_type":"custom","cta_target":"/shop","tone":"cream","flip":false}'),
    (8,  'lookbook',     'image_text',   '{"title":"The Lookbook","body":"Explore the latest silhouettes, textures and seasonal essentials.","cta_label":"View lookbook","cta_type":"custom","cta_target":"/lookbook","tone":"warm","flip":true}'),
    (9,  'best_sellers', 'product_grid', '{"title":"Best Sellers","source":"best","limit":4,"view_all_type":"route","view_all_target":"/shop"}'),
    (10, 'social',       'cta',          '{"title":"Follow along","body":"Styling notes and new arrivals on Instagram.","cta_label":"Instagram","cta_type":"custom","cta_target":"#","style":"line","tone":"warm"}'),
    (11, 'newsletter',   'newsletter',   '{"title":"Stay in Style","body":"Get updates on new arrivals, collections and private offers."}')
  ) as t(sort, legacy_key, type, defaults) loop
    select h.content, h.published into c, pub from homepage_sections h where h.key = r.legacy_key;
    insert into page_sections(page_id, type, sort, active, content)
    values (hid, r.type, r.sort, coalesce(pub, true),
      r.defaults::jsonb || jsonb_strip_nulls(jsonb_build_object(
        'title', case when r.type in ('category_grid','product_grid') and r.legacy_key in ('essentials','trending') then null else c->'title' end,
        'body', c->'body', 'cta_label', c->'cta_label', 'image_url', c->'image_url', 'cta_target', c->'cta_href')));
  end loop;
end $$;

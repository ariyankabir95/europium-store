# EUROPIUM – men's fashion store (in progress)

**Status:** storefront core done on demo data (home, shop, category, sale, search, product, cart, wishlist with localStorage persistence). Never built or run in the authoring environment. Also added: Supabase clients, sign in/up/forgot, protected /account and /admin (middleware + server role check), account order list, admin dashboard counts, contact and newsletter APIs, about and lookbook pages. Also added: checkout page and `/api/checkout` (server-side prices, stock reservation and coupons via the `create_order` SQL function), a disabled payment adapter, product JSON-LD, error/loading pages. Admin (role-checked in every page and action, plus RLS): products CRUD, inventory, orders with cancel/refund stock release and ship stock commit (migration 0004), coupons, reviews moderation, messages, newsletter. Also: categories, collections and customers admin; account profile/addresses/order detail; password reset (`/account/reset`); review submission (pending moderation; migration 0005 adds profiles.email). Storefront now reads Supabase via `lib/catalog.ts` (demo data only when Supabase env vars are unset; Product.id = slug; products are passed to client cart/wishlist/checkout through StoreProvider). Also: public approved reviews, custom cursor, image zoom, recently viewed, breadcrumb JSON-LD, payment webhook skeleton (returns 501 until an adapter exists), migration 0006 (create_order coupon bug fix, admin profile-edit RLS fix, stale-order stock release function, Storage buckets and admin-only policies). Also: homepage CMS (all 12 sections, migration 0007), lookbook CMS + public page, site settings, media library (Storage upload/delete, admin-only), collection product assignment + `/collection/[slug]`, DB-driven category pages, wishlist DB sync (`/api/wishlist`), cart drawer, scheduled stale-order release (`netlify/functions/release-stale.mts`). Also: product/category/collection image attachment (uploads in admin, shown on cards, gallery, category tiles and collection page), settings shown in footer/contact, sitemap from DB categories, wishlist Move to cart, skip link, drawer focus trap. Also: full product variant CRUD in `/admin/products/[id]` — create, edit and archive/reactivate size+color variants, with server-side uniqueness and duplicate-combo checks, admin-editable stock/threshold/active status that never touches `reserved`, and safe archive-instead-of-delete when a variant has reserved stock or order history (migration 0008: `active` column, unique `(product_id,size,color_name)` index, active-aware `create_order`, active-aware public RLS). Not yet: payment adapter, verified responsive/a11y testing. See "Not yet built".

## Stack
Next.js 15, React 19, TypeScript, Tailwind 3, Supabase (Postgres/Auth/Storage), Netlify.

## Environment required to finish setup
This project was written and packaged in an environment with no network access and no installed dependencies, so `npm install`, a production build, and every Supabase/Netlify integration were never run. Do these in a normal, network-enabled environment before relying on it:
1. `npm install` (this also generates `package-lock.json`, which is not included since it was never generated).
2. `npm run build` — a type-check happens as part of this; fix anything it reports.
3. Apply the Supabase migrations for real and exercise auth, checkout, storage uploads and the admin panel against a live project.

## Run locally
```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```
`@netlify/plugin-nextjs` and `@netlify/functions` are already in `package.json`'s devDependencies, so `npm install` covers Netlify too.

## Supabase setup
1. Create a project; put URL and anon key in `.env.local`. Keep the service role key server-only.
2. Run migrations `0001_schema.sql` through `0008_variant_crud.sql` in order (SQL editor or `supabase db push`). `0002_seed.sql` adds demo products.
3. Create Storage buckets `products`, `categories`, `lookbook` (public read, admin write).
4. Sign up a user, then make them admin: `update profiles set role='admin' where id='<user uuid>';`

## Security notes
RLS is enabled on every table; admins are identified by `profiles.role`. Orders, coupon usage and payments are meant to be written only by server code using the service role key. Payment stays disabled until `PAYMENT_*` variables and a provider integration exist.

## Not yet built
Password-reset page, address/profile editing; DB-backed products and cart/wishlist sync; payment provider adapter and webhook; DB-backed storefront (checkout matches demo products to the DB by slug, so seed 0002 must be applied); customer account; admin panel and CMS; reviews UI; newsletter/contact handlers; SEO metadata, sitemap and structured data; cart drawer; custom cursor; 404/error/loading UI; remaining homepage sections; real photography.

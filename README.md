# EUROPIUM – men's fashion store (in progress)

**Status:** storefront core done on demo data (home, shop, category, sale, search, product, cart, wishlist with localStorage persistence). Never built or run in the authoring environment. Also added: Supabase clients, sign in/up/forgot, protected /account and /admin (middleware + server role check), account order list, admin dashboard counts, contact and newsletter APIs, about and lookbook pages. Also added: checkout page and `/api/checkout` (server-side prices, stock reservation and coupons via the `create_order` SQL function), a disabled payment adapter, product JSON-LD, error/loading pages. Admin (role-checked in every page and action, plus RLS): products CRUD, inventory, orders with cancel/refund stock release and ship stock commit (migration 0004), coupons, reviews moderation, messages, newsletter. Also: categories, collections and customers admin; account profile/addresses/order detail; password reset (`/account/reset`); review submission (pending moderation; migration 0005 adds profiles.email). Storefront now reads Supabase via `lib/catalog.ts` (demo data only when Supabase env vars are unset; Product.id = slug; products are passed to client cart/wishlist/checkout through StoreProvider). Also: public approved reviews, custom cursor, image zoom, recently viewed, breadcrumb JSON-LD, payment webhook skeleton (returns 501 until an adapter exists), migration 0006 (create_order coupon bug fix, admin profile-edit RLS fix, stale-order stock release function, Storage buckets and admin-only policies). Also: homepage CMS (all 12 sections, migration 0007), lookbook CMS + public page, site settings, media library (Storage upload/delete, admin-only), collection product assignment + `/collection/[slug]`, DB-driven category pages, wishlist DB sync (`/api/wishlist`), cart drawer, scheduled stale-order release (`netlify/functions/release-stale.mts`). Also: product/category/collection image attachment (uploads in admin, shown on cards, gallery, category tiles and collection page), settings shown in footer/contact, sitemap from DB categories, wishlist Move to cart, skip link, drawer focus trap. Also: full product variant CRUD in `/admin/products/[id]` — create, edit and archive/reactivate size+color variants, with server-side uniqueness and duplicate-combo checks, admin-editable stock/threshold/active status that never touches `reserved`, and safe archive-instead-of-delete when a variant has reserved stock or order history (migration 0008: `active` column, unique `(product_id,size,color_name)` index, active-aware `create_order`, active-aware public RLS). Not yet: payment adapter, verified responsive/a11y testing. See "Not yet built".

## Stack
Next.js 15, React 19, JavaScript (converted from TypeScript; no type checking), Tailwind 3, Supabase (Postgres/Auth/Storage), Netlify.

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
2. Run ALL migrations in order: `0001` … `0008`, `0010`, `0011`, then `0012_fix_create_order.sql` (SQL editor or `supabase db push`). There is intentionally no `0009`. **`0012` is required**: without it, checkout fails for every order that has no coupon. `0002_seed.sql` adds demo products.
3. Create Storage buckets `products`, `categories`, `lookbook` (public read, admin write).
4. Sign up a user, then make them admin: `update profiles set role='admin' where id='<user uuid>';`

## Security notes
RLS is enabled on every table; admins are identified by `profiles.role`. Orders, coupon usage and payments are meant to be written only by server code using the service role key. Payment stays disabled until `PAYMENT_*` variables and a provider integration exist.

## Not yet built
Password-reset page, address/profile editing; DB-backed products and cart/wishlist sync; payment provider adapter and webhook; DB-backed storefront (checkout matches demo products to the DB by slug, so seed 0002 must be applied); customer account; admin panel and CMS; reviews UI; newsletter/contact handlers; SEO metadata, sitemap and structured data; cart drawer; custom cursor; 404/error/loading UI; remaining homepage sections; real photography.


## CMS (Pages, Navigation, Footer, Homepage) — migration `0011_cms.sql`
Run `supabase/migrations/0011_cms.sql` after the earlier migrations. It only **adds** tables (`pages`, `page_sections`, `navigation_menus`, `navigation_items`, `footer_columns`, `footer_links`), RLS policies (admin-only writes via `is_admin()`; public reads only published/active rows) and seed data. It copies the current homepage (order, text, images, visibility from `homepage_sections`), the current header menu and the current footer into the new tables, so the storefront looks the same until you edit it. Nothing existing is dropped or modified.

- **Admin → Pages**: create/edit/delete pages, publish/unpublish (draft = 404 publicly, admins can preview), hide/show (live but unlisted: noindex, kept out of the sitemap), slug, SEO title/description/canonical. Pages render at `/<slug>` from the database (`app/[slug]/page.tsx`), no new files needed per page. Static routes (`/shop`, `/sale`, `/contact`, `/about`, ...) always win, and those slugs are reserved.
- **Page builder**: sections Hero, Text, Image + Text, Image, Product Grid, Featured Products, Category Grid, Collection Grid, Promo Banner, Rich Text, CTA, Newsletter, Spacer. Add, edit, delete, reorder (up/down), hide/show. Section types and fields are defined once in `lib/cms-schema.ts`; renderers are in `components/cms/`.
- **Homepage**: the page flagged `is_home` (Admin → Homepage opens it). If CMS data is missing or has no visible sections, the original built-in homepage (`components/sections/LegacyHome.tsx`) renders.
- **Admin → Navigation**: header + mobile menu items (same data), logo text, announcement bar. **Admin → Footer**: columns, links, bottom row (Privacy/Terms), brand text, copyright. Built-in fallbacks (`lib/cms-fallback.ts`) are used if CMS data is unavailable.
- **Links** use a type + target picker (Store page, CMS page, Category, Collection, Product, Custom URL). CMS-page links store the page id, so changing a slug does not break menus. Custom URLs are validated (`/path`, `#`, `https://`, `mailto:`, `tel:`).
- Footer links to `/shipping`, `/returns`, `/faq`, `/journal`, `/privacy`, `/terms` were already dead links before the CMS. Create CMS pages with those slugs to make them work.

## Deploying on Render
Web Service, Node 20+. Build command: `npm install && npm run build`. Start command: `npm start`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only) and `NEXT_PUBLIC_SITE_URL`. `netlify.toml` and `netlify/functions` are kept for compatibility; the stale-order release function is Netlify-scheduled, so on Render run `release_stale_orders` (migration 0006) with a Render cron job or Supabase pg_cron instead.


## Audit notes (October 2026)
- Fixed `create_order()` regression from `0010` (new migration `0012`).
- Footer and Contact page now read public settings through the service-role helper (RLS hides `site_settings` from visitors).
- `release_stale_orders` job now waits `STALE_ORDER_MINUTES` (default 24h) instead of 60 min, because bKash is verified by hand.
- Added `.env.example`, `.gitignore`, `next.config.mjs` (security headers), `app/global-error.tsx`, `npm run typecheck`.
- Still recommended: add rate limiting / CAPTCHA to `/api/checkout`, `/api/contact`, `/api/newsletter`, `/api/reviews` (anyone can reserve stock or spam); commit `package-lock.json` after the first `npm install`.


## Image management (October 2026)
- All uploads go through `lib/storage.ts` (`uploadEntityImage`): 5 MB max, JPG/PNG/WEBP only (checked by file signature, not just extension), stored at `{entity-id}/{uuid}.{ext}` in the EXISTING buckets. Errors are shown in the admin and logged; a failed upload never changes the saved image.
- `next.config.mjs` allows next/image for your Supabase host and raises the Server Action body limit (the default 1 MB made larger uploads fail).
- `components/ui/SmartImage.tsx` renders every stored image with a fallback (never a broken icon). `lib/images.ts` holds URL/validation helpers. No migration is required.

## Reviews & Messages (migration `0014_reviews_messages.sql`)
Run `supabase/migrations/0014_reviews_messages.sql` in Supabase after 0013. It is additive and idempotent.
- **Reviews**: Admin → Reviews has All/Pending/Approved/Rejected filters, search, badges, dates, and only the relevant actions per status. Every moderation action checks the Supabase result: a database error, or an update/delete that changes 0 rows (what row-level security does when it refuses a change), shows a visible admin error and is logged on the server. Delete asks for confirmation. A partial unique index allows one pending/approved review per customer per product; existing duplicates are set to `rejected` with a note (never deleted) before the index is created.
- **Messages**: statuses unread / read / replied (backfilled from `is_read`, which is kept in sync). Admin → Messages has filters and search; each message opens at `/admin/messages/[id]` with the full conversation. Replies live in `message_replies` and never overwrite the original. `reply_to_message()` saves the reply and marks the message replied in one transaction.
- **Email**: no email provider is configured in this project (no Resend/SMTP/etc.), so replies are saved in the conversation but NOT emailed. The reply UI says so and offers an "Email this reply" mailto link. Connecting a provider is still required for automatic delivery.
- **RLS**: unchanged for reviews. `message_replies` is admin-only. The anonymous `contact` insert policy now only allows `status = 'unread'` with no `replied_at`.

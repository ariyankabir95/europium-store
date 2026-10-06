# Audit report — update-cms-main

**Limit:** `npm install` / `npm run build` could not run (sandbox has no npm registry access: 403). Audit = full manual read of all 205 files + `tsc` syntax pass. **Run `npm install && npm run build` on your machine to confirm.**

## Fixed
| # | Severity | Problem | Fix |
|---|---|---|---|
| 1 | CRITICAL | `0010_manual_bkash.sql` re-created `create_order()` from the old 0003 version → every order **without a coupon** crashed (`cp` record unassigned); archived variants also orderable again | New `0012_fix_create_order.sql` (run it!); old 5-arg overload dropped |
| 2 | HIGH | Footer + Contact page used `getSettings()`; RLS hides `site_settings` from visitors → store name/email/phone/Instagram never showed publicly | Use `getPublicSettings()` |
| 3 | HIGH | Stale-order job cancelled unpaid orders after 60 min, but bKash is verified manually → paid customers could lose their order | Default 24h, env `STALE_ORDER_MINUTES` |
| 4 | MED | "Quick add" / "Move to cart" used first size + first color, which may not exist or be out of stock → checkout rejects | `lib/variant.ts` picks first available variant |
| 5 | MED | `robots.ts` pointed to `https://example.com/sitemap.xml`; private paths indexable | Uses `NEXT_PUBLIC_SITE_URL`, disallows admin/api/account/etc. |
| 6 | MED | Open-redirect via `/\host` in `next` param (login + auth callback) | Reject backslashes |
| 7 | MED | Coupon expiry date = start of day (unusable on its own last day); NaN inputs not validated | End-of-day, validation |
| 8 | LOW | Empty store name could be saved; JSON-LD always "InStock"; `border-current/30` invalid Tailwind; hard-coded © 2026; admin dashboard lacked `requireAdmin`; no `metadataBase`; no global-error | All fixed |
| 9 | LOW | Missing `.gitignore`, `.env.example` (README referenced it), security headers, DB length limits on anonymous inserts | Added |

## Not fixed (needs your decision)
- No rate limiting / CAPTCHA on `/api/checkout` (anyone can reserve stock), contact, newsletter, reviews.
- `getProducts()` loads *all* products + reviews on every request and ships them to the client via `StoreProvider` — will not scale past a few hundred products. Whole site is dynamic (cookies in root layout), so no CDN caching.
- No `package-lock.json` → non-reproducible builds. Commit it after first install.
- Footer links `/shipping /returns /faq /journal /privacy /terms` are 404 until you create CMS pages with those slugs.
- `products.sold` is never incremented, so "Best sellers/Trending" sort by 0 unless badges are set.
- Products with order history can't be deleted (FK) and the admin gets no message.
- Reviews: no one-review-per-user-per-product rule; coupons: no per-user limit.
- Re-activating a cancelled order does not re-reserve stock.

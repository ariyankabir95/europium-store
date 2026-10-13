# EUROPIUM A-to-Z Customization — Master Plan

**Working branch:** `feature/complete-a-to-z-customization`  
**Production safety:** All work stays on this branch until reviewed. Do not apply database migrations to production automatically.  
**Goal:** Make normal storefront content and configuration changes manageable from the admin panel without editing source code, while preserving checkout, payment, inventory, customer privacy, SEO and brand styling.

## Completion rules

- Existing features must be extended rather than duplicated.
- Every server action and route handler must authenticate/authorize independently and validate untrusted input.
- Never expose service-role keys or private configuration to the browser.
- Schema changes must be additive, reversible where practical, and documented with exact Supabase SQL steps.
- Never test order/payment/stock mutations on a real customer order.
- A feature is not marked complete until its UI, database behavior, error handling, build/CI, and production verification requirements are recorded.
- Keep production unchanged until the branch is reviewed and tests pass.

## Scope and acceptance checklist

### A. Admin foundations
- [ ] Verify every admin page and server action calls `requireAdmin()` or an equivalent authorization check.
- [ ] Make admin errors understandable; avoid silent database failures.
- [ ] Confirm loading, empty, success, failure and destructive-confirmation states. Product and lookbook mutations now show clearer validation/database errors; a full admin-wide audit remains.
- [ ] Keep all private/admin pages out of search indexing.

### B. Homepage and CMS
- [ ] Add/edit/remove/reorder/publish/hide sections from Admin.
- [ ] Support headings, body text, images, alt text, buttons, safe links, layout/tone and product/category/collection sources where applicable.
- [ ] Ensure public rendering uses published content only and safe fallback content when CMS data is unavailable.
- [ ] Verify homepage builder preview and responsive behavior.

### C. Pages and SEO
- [ ] Create/edit/draft/publish/unpublish pages and section content.
- [ ] Manage slugs, SEO title/description, canonical URL and index visibility.
- [x] Prevent reserved-slug conflicts and duplicate slugs; canonical URLs are validated as HTTPS URLs without embedded credentials. Sitemap generation returns no URLs when `NEXT_PUBLIC_SITE_URL` is missing instead of emitting incorrect `example.com` links.
- [ ] Ensure sitemap/robots/metadata only include intended public pages.
- [ ] Create/edit essential policy pages (shipping, returns, FAQ, journal, privacy, terms) or ensure no dead footer links remain.

### D. Header, navigation and footer
- [ ] Edit logo text, announcement bar, menu labels/links, visibility and order.
- [x] Add parent/child menu hierarchy, safe same-menu/cycle validation, and desktop/mobile nested rendering (requires migration `0021_nested_navigation.sql`).
- [ ] Validate custom URLs and keep route/page/category/collection/product links consistent.
- [ ] Edit footer columns, links, social links, newsletter content and contact details.

### E. Theme and brand system
- [x] Admin-manage supported theme colors and font choices. Settings validates contact email/Instagram URL, reports save/test-email success or failure, and can reset only appearance settings to the EUROPIUM defaults.
- [ ] Verify theme settings are applied consistently across storefront, buttons, cards, forms, menus and footer.
- [ ] Keep EUROPIUM's warm neutral luxury-minimal identity as defaults.
- [x] Provide safe defaults for invalid or missing settings and a way to restore defaults. Admin → Settings now has a confirmed “Reset colors and fonts” action that preserves store/contact/payment/ad settings.

### F. Products, images, variants and categories
- [ ] Manage product copy, SEO fields, category, tags, badges, pricing and publication.
- [ ] Manage product image gallery order, alt text, primary image and per-color images.
- [ ] Manage variant size/color/SKU/stock/low-stock threshold/active state without corrupting reserved stock.
- [x] Manage category and collection pages, product assignments, visibility and ordering. Added parent/child categories and descendant product inclusion; requires migration `0022_category_hierarchy.sql`.
- [ ] Prevent unsafe product deletion when order history exists; show an actionable error or archive instead.

### G. Orders, payments and inventory
- [x] Admin Orders page now has an expandable order-details section in the working branch, intended to show items, quantities, unit prices, line totals, shipping address and tracking.
- [ ] Verify order items are loaded in one batched query and errors are shown clearly.
- [ ] Verify order status, payment status and tracking are committed atomically via the status RPC.
- [ ] Test status transitions using disposable test orders only.
- [ ] Confirm cancelled/refunded/shipped transitions update reserved and physical stock correctly.
- [x] Add migration `0024_reactivate_released_orders.sql` so reactivating a released/cancelled order as pending re-reserves stock after an availability check; still requires disposable-order database tests before production.
- [ ] Confirm bKash instructions, transaction reference, manual verification and payment email behavior.
- [ ] Confirm stale-order cron is separately configured and tested in the hosting provider; route code alone does not create a scheduled job.

### H. Customer accounts and checkout
- [ ] Verify profile, addresses, order history and order details are customer-scoped.
- [ ] Verify checkout uses server-side prices, stock checks and coupon validation.
- [x] Add atomic DB-backed rate limits for checkout, contact, newsletter, reviews and customer support (5 checkout/contact requests per 15 minutes; 3 newsletter signups/hour; 5 reviews/hour per signed-in user; 3 new support tickets and 10 replies/hour per signed-in user). Requires migration `0023_public_rate_limits.sql`; CAPTCHA and hosting-level IP throttling remain separate optional defenses.
- [ ] Verify cart/wishlist persistence behavior and document any local-only fallback.
- [ ] Ensure checkout failures are understandable and do not leave inconsistent stock reservations.

### I. Email and support
- [ ] Verify order-placed, payment-received and status-change emails with safe, idempotent behavior.
- [ ] Keep Resend API key server-only; clearly separate test sender limitations from verified-domain production sending.
- [ ] Manage support conversations and replies from Admin.
- [ ] Show email event/delivery errors without losing successful order updates.

### J. Adsterra and promotional placements
- [x] Provide Admin enable/disable controls for the existing Social Bar and CMS Native Banner placements. Popunder/Smartlink are not injected by this repo, so they remain external Adsterra configuration rather than new scripts added without an explicit placement decision.
- [x] Keep native banner placement editable from CMS; its visibility can also be globally disabled in Admin → Settings without deleting the section.
- [ ] Avoid enabling popunder/social-bar scripts by default without an explicit store decision.
- [ ] Validate scripts/URLs and prevent arbitrary unsafe script injection through normal text fields.

### K. Performance, accessibility and reliability
- [ ] Audit product/catalog loading so page size and latency remain reasonable as the catalog grows.
- [x] Add search and 50-row pagination to Admin → Inventory; continue evaluating other large lists as the catalog grows.
- [ ] Check keyboard navigation, labels, focus handling, contrast and mobile layouts.
- [ ] Verify missing images, missing settings, unavailable CMS tables and empty states degrade gracefully.
- [ ] Add/maintain security headers, input length limits and useful logging without exposing secrets or personal data.

## Known items from the existing repository audit

- CAPTCHA and host-level IP throttling are not configured; the application-level database limiter for checkout, contact, newsletter and reviews requires migration `0023_public_rate_limits.sql`.
- Product retrieval currently loads the full catalog and reviews into the client store; evaluate pagination/caching before catalog growth.
- No lockfile was present in the earlier audit; ensure the CI environment installs reproducibly and commit a lockfile only when it can be generated and verified.
- Some footer destinations (shipping, returns, FAQ, journal, privacy, terms) may be dead links unless matching CMS pages exist.
- Product `sold` count may not be updated, affecting best-seller ordering.
- Product deletion now checks order history first and shows an actionable message to unpublish instead.
- Re-activating cancelled orders may not re-reserve stock.
- Production schema already includes migrations through 0020 per the project's recent manual verification; confirm against the actual Supabase project before any future migration.

## Work log

### 2026-10-13
- Created isolated working branch `feature/complete-a-to-z-customization`.
- Reviewed existing `AUDIT.md`, admin settings/navigation/orders, CMS schema, order creation SQL and color-specific image migration.
- Updated `app/admin/orders/page.jsx` to query the latest 100 orders and their order items in a batched query, and display product/variant label, quantity, unit price, line total, shipping address, and tracking in expandable details.
- Added `adsterra_social_bar_enabled` to default settings and Admin → Settings; the existing Social Bar script now respects that toggle. Default is enabled to preserve current behavior until the admin turns it off. The script is now excluded from admin, account, cart, checkout, login, auth and wishlist routes to avoid interfering with transactional/admin workflows.
- Confirmed `adsterra_native` already exists as a CMS section type. Added a separate Admin → Settings toggle for Native Banner placement; disabling it hides existing native sections without deleting CMS content. The default is enabled to preserve existing behavior. Social Bar has its own toggle. Popunder/Smartlink are not injected by the repository and were not added as arbitrary scripts.
- Added `0021_nested_navigation.sql`, parent selection in Admin → Navigation, same-menu/cycle validation, and nested desktop/mobile rendering. This migration has **not** been applied to production.
- Added `0022_category_hierarchy.sql`, parent selection in Admin → Categories, child-category links on category pages, and descendant-product inclusion. This migration has **not** been applied to production.
- Added `0023_public_rate_limits.sql` and a server-only hashed-key limiter for checkout, contact, newsletter, product-review and customer-support submissions; raw client IPs are not stored. Migration has **not** been applied to production.
- Added `0024_reactivate_released_orders.sql` to re-reserve stock when an admin changes a released order back to pending. Migration has **not** been applied to production.
- Updated Admin → Settings to validate contact email/Instagram URL and show save/test-email feedback; updated Admin → Lookbook to validate image/product/order input and show database errors.
- Updated Admin → Products to prevent deletion when order history exists and show visible errors for failed mutations.
- Added search and 50-row pagination to Admin → Inventory, plus visible update/load errors.
- Opened PR #2 for CI verification; it is not merged and does not deploy production by itself.
- GitHub Actions build passed at commit `571aaa5e`. The later theme-reset/settings-precedence changes triggered a fresh CI run; verify that run passes before merge.
- Fixed legacy nested-theme precedence so current top-level admin color/font edits are not silently overridden by stale nested theme values.
- Tightened CMS canonical URL validation to require valid HTTPS and removed the sitemap's `example.com` fallback when the canonical site URL is unset.
- **Not yet verified:** browser rendering, live Supabase query permissions, rate-limit behavior against migration `0023`, and full checkout/email/admin workflows.
- Added `adsterra_native_enabled` to default settings and made CMS Native Banner sections respect the Admin → Settings toggle; existing behavior stays enabled by default.
- Fixed the invalid nested form around the appearance-reset confirmation by extending the shared `ConfirmButton` to accept `formAction` and targeting the reset server action directly.
- GitHub Actions build verification passed for the latest code at commit `db1dd81a3479aaa62cb065841d40e275eda2bc49`; subsequent commits were also individually green through run `38334350745` at the time of the check.
- No production database, live orders, payment statuses, or deployment configuration was changed by this branch work.

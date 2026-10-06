# Image-management fix — report

**Build status: NOT run.** The sandbox has no npm registry access (`npm install` → 403), so `npm run build` and the live Supabase tests (steps 1–22) could not be executed here. What WAS done: every changed file was type-checked with `tsc` against stub typings (no missing exports/names/syntax errors; only stub noise remained). Run `npm install && npm run build` and the test list below on your machine.

## Root causes found
1. **Server Actions default to a 1 MB request body.** Any image above ~1 MB failed before reaching Storage → the "silent failure". Fixed in `next.config.mjs` (`serverActions.bodySizeLimit: 25mb`).
2. The old `uploadImage()` returned `null` for every kind of failure and callers did `...(img ? {image_url} : {})`, so errors vanished. Replaced by `uploadEntityImage()` returning an explicit `none | ok | error` result.
3. Category and Collection admin pages had no feedback channel at all; Product images had no primary/reorder/replace.

## Files added
- `lib/images.ts` – URL normalisation (never rewrites absolute Supabase URLs), validation constants, Storage-URL parser, bucket list
- `lib/storage.ts` – upload (signature check, safe `{id}/{uuid}.ext` path), reference check, safe delete, reference index
- `lib/product-images.ts` – ordered gallery helpers
- `components/ui/SmartImage.tsx` – next/image for Supabase URLs, `<img>` otherwise, fallback on missing/broken
- `components/admin/ImageField.tsx`, `SubmitButton.tsx`, `CopyField.tsx`
- `app/admin/categories/actions.ts`, `app/admin/collections/actions.ts`, `app/admin/products/image-actions.ts`

## Files changed
`next.config.mjs`, `lib/admin.ts` (old uploader removed), `lib/catalog.ts`, `lib/cms-data.ts`, `app/admin/categories/page.tsx`, `app/admin/collections/page.tsx`, `app/admin/products/page.tsx` (thumbnails), `app/admin/products/[id]/page.tsx`, `app/admin/media/page.tsx`, `app/admin/pages/actions.ts` + `components/admin/SectionFields.tsx` (section uploads now report errors), `app/category/[slug]/page.tsx` (hero), `app/collection/[slug]/page.tsx` (hero), `components/products/ProductCard.tsx`, `ProductDetail.tsx`, `app/cart/page.tsx`, `components/cart/CartDrawer.tsx`, `components/cms/blocks-catalog.tsx`, `components/sections/Essentials.tsx`, `app/lookbook/page.tsx`, `README.md`.

## Database migrations: none
`categories.image_url`, `collections.image_url` and `product_images(url, alt, sort)` already provide everything (multi-image gallery, ordering, primary = first). Nothing duplicated.

## Storage / RLS changes: none
Existing buckets (`products, categories, collections, homepage, lookbook`, public) and policies from `0006_fixes_storage.sql` (public read; admin-only insert/update/delete via `is_admin()`) are correct and untouched. Uploads run with the signed-in admin's session.

## Behaviour
- Category/Collection: create with image, edit shows current image, empty file input keeps it, new file replaces it (old file deleted only if unreferenced), explicit "Remove current image" checkbox, text fields save even if the upload fails and a visible message says "The existing image was kept."
- Product: images optional on create; gallery with multi-upload (12 max/request), Make main, ← →, per-image Replace, Remove (confirm). Admin list shows a thumbnail.
- Media: lists root + `{id}/` sub-folders, "In use: …" labels, copyable URLs, delete refused when still referenced or when that can't be verified. Uploading there attaches nothing.
- Public: category/collection heroes (hidden when no image), product cards/detail/cart/drawer/home tiles/lookbook all use `SmartImage`; invalid or broken URLs show the existing placeholder.

## Remaining issues / caveats
- **Netlify:** synchronous functions cap request bodies at ~6 MB, so a 5 MB image (plus form overhead) or several gallery images in one submit can still be rejected there; Render/Node hosting has no such cap. Fix if needed: upload from the browser straight to Supabase Storage (admin policy already allows it).
- No `/collection` listing page exists in the project, so there is nothing to update there.
- `lookbook_items` still takes a pasted image URL (not in scope); use Media → copy URL.
- Reference counting uses exact object paths; `_` in a name can only make it over-match (keeps files), never under-match.
- Untested live: all 22 manual test steps.

## Test checklist (run after `npm install && npm run build`)
Category create/replace/remove/public page · Product create with images, replace, make main, reorder, remove, detail + card · Collection create/replace/public page · Media (3 buckets, delete in-use refused) · missing image · .txt renamed to .jpg · file > 5 MB · existing records · mobile layout.

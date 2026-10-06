# Cart-requires-account, currency selector, site title

## Run first
Run `supabase/migrations/0013_cart_items.sql` in the Supabase SQL editor (new `cart_items` table + RLS). Without it the cart API cannot save anything.

## 1. Account-only cart
- Server is the only cart store: `app/api/cart/route.ts` (GET / POST add|setQty|remove|clear), `lib/cart-server.ts`.
- `lib/store.tsx`: guest cart and the `eu_cart` localStorage key are gone (the old key is deleted on load). `count`, drawer and `/cart` all read the same `cart` state.
- Sign-in popup: `components/auth/AuthModal.tsx`, shared form `components/auth/AuthForm.tsx` (also used by `/login`), page gate `components/auth/AuthGate.tsx`.
- `/cart` and `/checkout` are wrapped in `AuthGate`. `/api/checkout` returns 401 before anything else for guests and builds the order from the saved server cart, then clears it.

## 2. Currency selector
`components/layout/Header.tsx` (`CurrencySelect`): native select kept, browser chrome reset, themed border/background/hover/focus/active, option list themed, no global black focus outline.

## 3. Site title
`app/layout.tsx` now uses `generateMetadata()`; default title, title template and OG site name come from Admin -> Settings -> Store name. `metadataBase` and description unchanged. Saving settings revalidates the root layout.

## Add to cart auth flow (follow-up)
- Root cause: only `Catalog` passed `onQuickAdd` to `ProductCard`; every other grid (home rows, Trending, Recently viewed, related, wishlist) rendered a Quick add button that did nothing.
- `ProductCard` now owns Add to cart through the store (`add`). Signed out: popup opens immediately and the exact product/size/color/qty is kept as the pending add (memory only). After login/sign-up it is added automatically and the drawer opens.
- Email-confirmation sign-up: the pending add rides the `next` URL (`?cart_add=...`, no storage) and is completed on return when signed in.
- `components/cart/CartToast.tsx` reports failures such as out-of-stock.

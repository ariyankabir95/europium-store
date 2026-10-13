# EUROPIUM Order and Stock Safety Test Matrix

This is a **pre-production test plan**, not evidence that the database tests have already passed. Run it only against a disposable Supabase project or a local database seeded with fake products and orders. Never use a real customer order or production inventory.

## Before testing

1. Use the same migration sequence documented in `README.md`; apply missing migrations in order, especially `0019_stale_order_safety.sql`, `0023_public_rate_limits.sql`, `0024_reactivate_released_orders.sql`, and `0025_order_email_recovery.sql`.
2. Create a fake product variant with known stock and reserved quantities, plus test orders whose item rows refer only to that variant.
3. Record the initial values of `orders.status`, `orders.stock_state`, `product_variants.stock`, and `product_variants.reserved`.
4. Run each scenario in isolation and reset the fake fixture between cases.

## Order status and stock scenarios

| Scenario | Expected result |
| --- | --- |
| Reserved order → cancelled | Order becomes cancelled; its item quantities are removed from `reserved` once; stock state becomes `released`. |
| Repeat cancelled/refunded save on already released order | No second stock release; reservation counts do not go negative. |
| Reserved order → shipped/delivered | Physical stock and reserved stock decrease by each item quantity once; stock state becomes `committed`. |
| Repeat shipped/delivered save after stock is committed | No second decrement of stock. |
| Released order → pending/confirmed/processing, with sufficient stock | All required variant quantities are re-reserved; stock state becomes `reserved`. |
| Released order → pending/confirmed/processing, insufficient stock | RPC fails with `insufficient_stock`; order status/payment/tracking and all stock values remain unchanged. |
| Released order has two item rows for the same variant | Availability is checked against the sum of both quantities; the operation fails if the combined quantity is unavailable. |
| Committed order → pending/confirmed/processing | RPC fails with `invalid_stock_transition`; no stock/status/payment/tracking change is committed. |
| Invalid status or payment status | RPC fails; no partial order or stock update occurs. |
| Non-admin calls admin status RPC | RPC fails with `forbidden`. |
| Stale-order release runs concurrently with admin status update | Row locking serializes the operations; no active order should remain with released stock. |

## Rate-limit scenarios

Use test identities only. Call each route repeatedly within its configured time window and verify the expected response becomes HTTP 429 after the limit. Verify requests resume after the window expires. If the rate-limit RPC/table is unavailable, the server helper is designed to fail closed rather than silently accept unlimited requests.

- Checkout: 5 requests per 15 minutes per signed-in user.
- Contact: 5 requests per 15 minutes per client identifier.
- Newsletter: 3 requests per hour per client identifier.
- Reviews: 5 requests per hour per signed-in user.
- Support: 3 new tickets per hour and 10 replies per hour per signed-in user.

## Email and admin UI regression checks

- Save a valid status/payment/tracking update; verify it persists as one RPC transaction.
- Force an invalid/insufficient-stock transition; verify no payment/tracking edit persists and the Admin page shows a useful error.
- Verify email failures do not roll back a successful order update and do not expose secrets in logs.
- Verify only an actual transition to `paid` triggers the payment-received email, and a status change triggers the status email.
- With migration `0025_order_email_recovery.sql) applied to the disposable database, verify each new event persists the exact payload and deterministic idempotency key before provider send.
- Simulate a crash after the provider accepts an email but before `status='sent'`; run two recovery workers concurrently and verify Resend idempotency returns the same provider email rather than delivering a duplicate.
- Verify a stale event younger than 20 hours is leased by only one worker and retried with the original stored payload/key; verify a stale event older than 20 hours becomes `needs_review` and is not automatically sent.
- Verify pre-migration `sending` rows with no stored payload are flagged for review only after their lease becomes stale.
- Verify a non-retryable provider response becomes `needs_review`, while network/timeout/429/5xx failures retain the claim for safe retry.
- Confirm the protected recovery route returns 401 for a missing/wrong bearer token, 503 when required configuration is absent, and a bounded summary for an authorized run.
- Confirm the order-details panel loads the correct item quantities, prices and shipping address.

## Release gate

Do not apply these migrations to production until the disposable-database cases above have passed, the latest GitHub Actions build is green, and a human reviewer has checked the SQL and deployment order. A successful application build does **not** prove that Postgres locking, RLS/grants, email delivery or checkout behavior works end-to-end.

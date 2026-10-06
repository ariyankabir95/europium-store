-- 0015_order_email_events.sql — Duplicate protection for transactional order emails.
-- Additive. No existing table, column or policy is changed.
--
-- Each customer-facing order email is "claimed" by inserting one row here BEFORE the email is sent.
-- The unique (order_id, event_type) constraint means a second attempt (double save, retry, race between
-- two admins) cannot claim the same event, so the email is sent at most once. If the provider call fails,
-- the claim is removed so a later genuine status change can try again.
--
-- Written only by server code using the service role, which bypasses RLS. Admins may read it for support.
-- Customers and anonymous visitors have no access at all.

create table if not exists order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  event_type text not null check (event_type in (
    'order_placed',
    'payment_received',
    'order_confirmed',
    'order_processing',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'order_refunded'
  )),
  status text not null default 'sending' check (status in ('sending', 'sent')),
  provider_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_email_events_once unique (order_id, event_type)
);

alter table order_email_events enable row level security;

drop policy if exists "admin all" on order_email_events;
create policy "admin all" on order_email_events for all using (is_admin()) with check (is_admin());
-- No customer or anonymous policy: these rows are internal bookkeeping.

-- 0025_order_email_recovery.sql
-- Persist exact outbound payloads and provider idempotency keys so stale sends can be retried safely.
-- Apply only after reviewing this migration and testing against a disposable Supabase database.

alter table public.order_email_events
  add column if not exists payload jsonb,
  add column if not exists idempotency_key text,
  add column if not exists attempt_count integer not null default 1;

-- A stale 'sending' row from before this migration has no frozen payload and cannot be safely replayed.
-- Do not rewrite recent rows during migration; the recovery job will flag stale legacy rows for review.
alter table public.order_email_events
  drop constraint if exists order_email_events_status_check;

alter table public.order_email_events
  add constraint order_email_events_status_check
  check (status in ('sending', 'sent', 'needs_review'));

-- Keep event rows private to server-side service-role code; the existing admin read policy remains.


alter table public.order_email_events
  drop constraint if exists order_email_events_attempt_count_check;

alter table public.order_email_events
  add constraint order_email_events_attempt_count_check
  check (attempt_count between 1 and 5);

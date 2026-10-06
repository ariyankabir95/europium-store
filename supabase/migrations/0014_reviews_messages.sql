-- 0014_reviews_messages.sql — Reviews: one active review per customer per product. Messages: statuses + reply history.
-- Additive and idempotent. Nothing is dropped and no row is deleted. Existing RLS policies are kept, except that the
-- anonymous "contact" insert policy is tightened (see the end of part 2).

-- ═════════════════════════ PART 1 — REVIEWS ═════════════════════════
alter table reviews add column if not exists moderation_note text;

-- Existing duplicates must not make the unique index fail, and no customer review may be deleted.
-- For every (customer, product) pair with more than one non-rejected review, ONE is kept as-is
-- (an approved one if there is one, otherwise the newest) and the others are set to 'rejected' with a note.
-- The rows stay in the table and an admin can see them under Admin → Reviews → Rejected.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, product_id
           order by (status = 'approved') desc, created_at desc nulls last, id desc
         ) as rn
  from reviews
  where user_id is not null and status <> 'rejected'
)
update reviews r
set status = 'rejected',
    moderation_note = 'Superseded by another review from the same customer for this product (migration 0014). Not deleted.'
from ranked
where r.id = ranked.id and ranked.rn > 1;

-- At most ONE pending/approved review per customer per product. A rejected review does not block a new submission.
create unique index if not exists reviews_one_active_per_user_product
  on reviews (user_id, product_id)
  where user_id is not null and status <> 'rejected';

-- RLS for reviews is unchanged and already correct:
--   "admin all"     for all    using / with check is_admin()
--   "public read"   for select using (status = 'approved')
--   "submit review" for insert with check (user_id = auth.uid() and status = 'pending')

-- ═════════════════════════ PART 2 — MESSAGES ═════════════════════════
alter table contact_messages add column if not exists status text not null default 'unread';
alter table contact_messages add column if not exists replied_at timestamptz;
alter table contact_messages add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table contact_messages add constraint contact_messages_status_check check (status in ('unread', 'read', 'replied'));
exception when duplicate_object then null; end $$;

-- Backfill from the old boolean: is_read=true -> read, is_read=false -> unread (the column default). is_read itself is kept.
update contact_messages set status = 'read' where is_read is true and status = 'unread';

-- Keep the legacy is_read column in step with status (created AFTER the backfill so it cannot overwrite it).
create or replace function contact_messages_sync() returns trigger language plpgsql as $$
begin
  new.is_read := (new.status <> 'unread');
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists contact_messages_sync on contact_messages;
create trigger contact_messages_sync before insert or update on contact_messages for each row execute function contact_messages_sync();

create index if not exists contact_messages_status_idx on contact_messages (status, created_at desc);

-- Conversation history. The original message is never overwritten; deleting a message removes only its own thread.
create table if not exists message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references contact_messages (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  -- 'not_sent' until an email provider is connected: the reply is stored in the conversation but nothing was emailed.
  delivery text not null default 'not_sent' check (delivery in ('not_sent', 'sent', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists message_replies_message_idx on message_replies (message_id, created_at);

alter table message_replies enable row level security;
drop policy if exists "admin all" on message_replies;
create policy "admin all" on message_replies for all using (is_admin()) with check (is_admin());
-- No public/anon policy: customers can never read or write replies.

-- Atomic reply: saves the reply AND marks the message replied in one transaction. SECURITY INVOKER, so RLS applies:
-- if the caller is not an admin (or the update is denied) the whole thing rolls back and nothing is marked replied.
create or replace function reply_to_message(p_message_id uuid, p_body text) returns uuid
language plpgsql security invoker set search_path = public as $$
declare rid uuid; n int;
begin
  if not is_admin() then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_body is null or char_length(btrim(p_body)) = 0 or char_length(p_body) > 5000 then raise exception 'invalid reply' using errcode = '22023'; end if;
  insert into message_replies (message_id, author_id, body) values (p_message_id, auth.uid(), btrim(p_body)) returning id into rid;
  update contact_messages set status = 'replied', replied_at = now() where id = p_message_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'message not found or not updatable' using errcode = 'P0002'; end if;
  return rid;
end $$;
revoke all on function reply_to_message (uuid, text) from public, anon;
grant execute on function reply_to_message (uuid, text) to authenticated;

-- The anonymous contact form may only create UNREAD, un-replied messages (before, an anonymous client could insert any status).
drop policy if exists "contact" on contact_messages;
create policy "contact" on contact_messages for insert with check (status = 'unread' and replied_at is null);

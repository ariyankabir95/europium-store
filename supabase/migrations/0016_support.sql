-- 0016_support.sql — Customer support tickets for signed-in customers.
-- Additive. Existing tables (contact_messages, message_replies, orders, profiles) are not changed.
-- The anonymous public contact form keeps using contact_messages; this system is for account holders,
-- optionally linked to one of their own orders.
--
-- Security model:
--   * Customers never get direct INSERT/UPDATE/DELETE on these tables. Every customer write goes through the
--     SECURITY DEFINER functions below, which check auth.uid() ownership and the conversation state themselves.
--   * Customers can SELECT only conversations where user_id = auth.uid(), and messages inside them.
--   * Admins (is_admin()) can read and manage everything, matching the existing admin policies.

-- ═════════════════════════ TABLES ═════════════════════════

create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  -- 'open' = waiting for Europium; 'pending' = waiting for the customer; 'resolved' / 'closed' = finished.
  last_message_at timestamptz not null default now(),
  last_message_sender text check (last_message_sender in ('customer', 'admin')),
  last_message_preview text check (char_length(last_message_preview) <= 200),
  -- Read markers drive the unread indicators. A side is unread when the other side posted after its marker.
  customer_read_at timestamptz,
  admin_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references support_conversations (id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'admin')),
  sender_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_conversations_user_idx on support_conversations (user_id, updated_at desc);
create index if not exists support_conversations_status_idx on support_conversations (status, last_message_at desc);
create index if not exists support_conversations_order_idx on support_conversations (order_id);
create index if not exists support_messages_conversation_idx on support_messages (conversation_id, created_at);

-- ═════════════════════════ RLS ═════════════════════════

alter table support_conversations enable row level security;
alter table support_messages enable row level security;

drop policy if exists "admin all" on support_conversations;
create policy "admin all" on support_conversations for all using (is_admin()) with check (is_admin());
drop policy if exists "own conversations" on support_conversations;
create policy "own conversations" on support_conversations for select using (user_id = auth.uid());

drop policy if exists "admin all" on support_messages;
create policy "admin all" on support_messages for all using (is_admin()) with check (is_admin());
drop policy if exists "own messages" on support_messages;
create policy "own messages" on support_messages for select using (
  exists (select 1 from support_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
-- No INSERT/UPDATE/DELETE policy for customers: writes happen only through the functions below.

-- ═════════════════════════ FUNCTIONS ═════════════════════════

-- Customer creates a ticket with its first message. The optional order must belong to the caller.
create or replace function support_open_conversation(p_subject text, p_order uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  subj text := btrim(coalesce(p_subject, ''));
  msg text := btrim(coalesce(p_body, ''));
  cid uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if char_length(subj) not between 1 and 200 then raise exception 'invalid_subject' using errcode = '22023'; end if;
  if char_length(msg) not between 1 and 5000 then raise exception 'invalid_body' using errcode = '22023'; end if;
  if p_order is not null and not exists (select 1 from orders where id = p_order and user_id = uid) then
    raise exception 'invalid_order' using errcode = '22023';
  end if;

  insert into support_conversations (user_id, order_id, subject, status, last_message_at, last_message_sender, last_message_preview, customer_read_at)
  values (uid, p_order, subj, 'open', now(), 'customer', left(msg, 160), now())
  returning id into cid;

  insert into support_messages (conversation_id, sender_type, sender_id, body) values (cid, 'customer', uid, msg);
  return cid;
end $$;

-- Posts a reply. Admin reply → status 'pending' (waiting on the customer). Customer reply → status 'open'.
-- Closed conversations accept no replies; an admin must reopen them first.
create or replace function support_post_message(p_conversation uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  adm boolean := is_admin();
  c support_conversations%rowtype;
  msg text := btrim(coalesce(p_body, ''));
  mid uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if char_length(msg) not between 1 and 5000 then raise exception 'invalid_body' using errcode = '22023'; end if;

  -- Row lock serialises concurrent replies. Non-owners get "not_found", so ticket ids cannot be probed.
  select * into c from support_conversations where id = p_conversation for update;
  if not found or (not adm and c.user_id <> uid) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if c.status = 'closed' then raise exception 'conversation_closed' using errcode = 'P0001'; end if;

  insert into support_messages (conversation_id, sender_type, sender_id, body)
  values (c.id, case when adm then 'admin' else 'customer' end, uid, msg)
  returning id into mid;

  update support_conversations set
    last_message_at = now(),
    updated_at = now(),
    last_message_sender = case when adm then 'admin' else 'customer' end,
    last_message_preview = left(msg, 160),
    status = case when adm then 'pending' else 'open' end,
    admin_read_at = case when adm then now() else admin_read_at end,
    customer_read_at = case when adm then customer_read_at else now() end
  where id = c.id;

  return mid;
end $$;

-- Marks a conversation read for the caller. Admins set admin_read_at; the owning customer sets customer_read_at.
create or replace function support_mark_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); adm boolean := is_admin();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if adm then
    update support_conversations set admin_read_at = now() where id = p_conversation;
  else
    update support_conversations set customer_read_at = now() where id = p_conversation and user_id = uid;
  end if;
end $$;

-- Admin-only status change: open, pending, resolved, closed (reopen = set open).
create or replace function support_set_status(p_conversation uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('open', 'pending', 'resolved', 'closed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update support_conversations set status = p_status, updated_at = now() where id = p_conversation;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

revoke all on function support_open_conversation(text, uuid, text) from public, anon;
revoke all on function support_post_message(uuid, text) from public, anon;
revoke all on function support_mark_read(uuid) from public, anon;
revoke all on function support_set_status(uuid, text) from public, anon;
grant execute on function support_open_conversation(text, uuid, text) to authenticated;
grant execute on function support_post_message(uuid, text) to authenticated;
grant execute on function support_mark_read(uuid) to authenticated;
grant execute on function support_set_status(uuid, text) to authenticated;

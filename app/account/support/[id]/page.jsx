import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import { supabaseServer } from "@/lib/supabase/server";
import { uuid } from "@/lib/admin";
import { replyToSupport } from "../actions";
import { STATUS_BADGE, formatWhen, shortOrderId, statusLabel } from "@/lib/support";
export const metadata = { title: "Support request" };
export default async function SupportConversation({ params, searchParams }) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);
    if (!uuid(id))
        notFound();
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect(`/login?next=/account/support/${id}`);
    // RLS returns nothing for another customer's conversation, so it shows as not found.
    const { data: conv } = await sb.from("support_conversations").select("id,subject,status,order_id,created_at,updated_at").eq("id", id).maybeSingle();
    if (!conv)
        notFound();
    const [{ data: msgs }, orderRes] = await Promise.all([
        sb.from("support_messages").select("id,sender_type,body,created_at").eq("conversation_id", id).order("created_at", { ascending: true }),
        conv.order_id ? sb.from("orders").select("id,status,payment_status,tracking_number").eq("id", conv.order_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    // Opening the conversation marks it read for the customer.
    const { error: readErr } = await sb.rpc("support_mark_read", { p_conversation: id });
    if (readErr)
        console.error("[support] mark read failed:", readErr.code, readErr.message);
    const messages = (msgs ?? []);
    const status = conv.status;
    const order = orderRes.data;
    const closed = status === "closed";
    return (<Page>
      <AccountNav />
      <p className="mb-4 text-sm"><Link href="/account/support" className="underline underline-offset-4">← All requests</Link></p>
      <h1 className="mb-3 break-words font-serif text-3xl md:text-4xl">{conv.subject}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${STATUS_BADGE[status]}`}>{statusLabel(status, "customer")}</span>
        {order && <Link href={`/account/orders/${order.id}`} className="underline underline-offset-4">Order {shortOrderId(order.id)}</Link>}
        <span className="text-taupe">Opened {formatWhen(conv.created_at)}</span>
      </div>
      <Flash ok={sp.ok} error={sp.error}/>
      {readErr && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">This conversation could not be fully loaded. Please refresh the page.</p>}

      <section aria-label="Messages" className="mb-8 max-w-2xl space-y-4">
        {messages.map((m) => {
            const mine = m.sender_type === "customer";
            return (<article key={m.id} className={`border p-4 ${mine ? "border-sand" : "border-sand bg-cream sm:ml-10"}`}>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-taupe">{mine ? "You" : "Europium Support"} · {formatWhen(m.created_at)}</p>
              <p className="whitespace-pre-line break-words text-sm">{m.body}</p>
            </article>);
        })}
      </section>

      {closed ? (<p className="max-w-2xl border border-sand px-4 py-3 text-sm text-umber">This conversation is closed. If you still need help, please <Link href="/account/support/new" className="underline underline-offset-4">start a new request</Link>.</p>) : (<form action={replyToSupport} className="max-w-2xl space-y-3">
          <input type="hidden" name="conversation_id" value={id}/>
          <label htmlFor="body" className="block text-sm font-medium">Reply</label>
          <textarea id="body" name="body" rows={5} required maxLength={5000} className="w-full border border-sand bg-transparent p-3"/>
          <SubmitButton pending="Sending…">Send reply</SubmitButton>
        </form>)}
    </Page>);
}

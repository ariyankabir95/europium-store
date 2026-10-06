import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, uuid } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import { replyAsSupport, setSupportStatus } from "../actions";
import { STATUS_BADGE, formatWhen, shortOrderId, statusLabel } from "@/lib/support";
import { money } from "@/lib/format";
export const metadata = { title: "Support conversation", robots: { index: false } };
const ACTIONS = [
    { status: "pending", label: "Mark pending", show: (s) => s === "open" || s === "resolved" },
    { status: "resolved", label: "Resolve", show: (s) => s !== "resolved" && s !== "closed" },
    { status: "open", label: "Reopen", show: (s) => s === "resolved" || s === "closed" },
    { status: "closed", label: "Close", show: (s) => s !== "closed" },
];
export default async function AdminSupportConversation({ params, searchParams }) {
    const sb = await requireAdmin();
    const [{ id }, sp] = await Promise.all([params, searchParams]);
    if (!uuid(id))
        notFound();
    const { data: conv } = await sb.from("support_conversations").select("id,user_id,order_id,subject,status,created_at").eq("id", id).maybeSingle();
    if (!conv)
        notFound();
    const [{ data: msgs }, { data: profile }, orderRes] = await Promise.all([
        sb.from("support_messages").select("id,sender_type,body,created_at").eq("conversation_id", id).order("created_at", { ascending: true }),
        sb.from("profiles").select("full_name").eq("id", conv.user_id).maybeSingle(),
        conv.order_id ? sb.from("orders").select("id,status,payment_status,payment_method,total_cents,tracking_number,created_at").eq("id", conv.order_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    // Email comes from the auth account, which only the service role can read. It is used on the server only.
    const customerEmail = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? (await supabaseAdmin().auth.admin.getUserById(conv.user_id)).data.user?.email ?? "Unknown"
        : "Unavailable (service role not configured)";
    // Mark read after the unread state has been read for rendering.
    const { error: readErr } = await sb.rpc("support_mark_read", { p_conversation: id });
    if (readErr)
        console.error("[support] admin mark read failed:", readErr.code, readErr.message);
    const messages = (msgs ?? []);
    const status = conv.status;
    const order = orderRes.data;
    const closed = status === "closed";
    const buttons = ACTIONS.filter((a) => a.show(status));
    return (<>
      <p className="mb-2 text-sm"><Link href="/admin/support" className="underline underline-offset-4">← All support</Link></p>
      <h1 className="mb-4 break-words font-serif text-3xl md:text-4xl">{conv.subject}</h1>
      <Flash ok={sp.ok} error={sp.error}/>
      {readErr && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Support could not update the read state. Check the server log.</p>}

      <div className="mb-8 grid max-w-3xl gap-6 md:grid-cols-2">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-taupe">Customer</dt><dd>{profile?.full_name || "No name on profile"}</dd>
          <dt className="text-taupe">Email</dt><dd className="break-all">{customerEmail}</dd>
          <dt className="text-taupe">Opened</dt><dd>{formatWhen(conv.created_at)}</dd>
          <dt className="text-taupe">Status</dt><dd><span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${STATUS_BADGE[status]}`}>{statusLabel(status, "admin")}</span></dd>
        </dl>
        <div className="border border-sand p-4 text-sm">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-taupe">Linked order</p>
          {order ? (<ul className="space-y-1">
              <li>Order {shortOrderId(order.id)} · <span className="capitalize">{order.status}</span></li>
              <li>Payment: <span className="capitalize">{order.payment_status}</span></li>
              <li>Total: {money(order.total_cents / 100, "BDT")}</li>
              {order.tracking_number && <li>Tracking: {order.tracking_number}</li>}
              <li><Link href="/admin/orders" className="underline underline-offset-4">Open in Orders</Link></li>
            </ul>) : <p className="text-umber">No order linked to this conversation.</p>}
        </div>
      </div>

      <section aria-label="Conversation" className="mb-8 max-w-3xl space-y-4">
        {messages.map((m) => {
            const fromCustomer = m.sender_type === "customer";
            return (<article key={m.id} className={`border p-4 ${fromCustomer ? "border-sand" : "border-sand bg-cream sm:ml-10"}`}>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-taupe">{fromCustomer ? "Customer" : "Europium Support"} · {formatWhen(m.created_at)}</p>
              <p className="whitespace-pre-line break-words text-sm">{m.body}</p>
            </article>);
        })}
      </section>

      {closed ? (<p className="mb-8 max-w-3xl border border-sand px-4 py-3 text-sm text-umber">This conversation is closed. Reopen it to reply.</p>) : (<form action={replyAsSupport} className="mb-8 max-w-3xl space-y-3">
          <input type="hidden" name="conversation_id" value={id}/>
          <label htmlFor="body" className="block text-sm font-medium">Reply to customer</label>
          <textarea id="body" name="body" rows={6} required maxLength={5000} className="w-full border border-sand bg-transparent p-3"/>
          <p className="text-xs text-taupe">Sending saves the reply to this conversation and emails the customer a link to their request.</p>
          <SubmitButton pending="Sending reply…">Send reply</SubmitButton>
        </form>)}

      {buttons.length > 0 && (<div className="flex max-w-3xl flex-wrap gap-2 border-t border-sand pt-4">
          {buttons.map((a) => (<form key={a.status} action={setSupportStatus}>
              <input type="hidden" name="conversation_id" value={id}/>
              <input type="hidden" name="status" value={a.status}/>
              <button className="btn-line min-h-11 px-4">{a.label}</button>
            </form>))}
        </div>)}
    </>);
}

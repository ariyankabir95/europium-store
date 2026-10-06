import Link from "next/link";
import { redirect } from "next/navigation";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import { supabaseServer } from "@/lib/supabase/server";
import { STATUS_BADGE, formatWhen, isUnreadForCustomer, shortOrderId, statusLabel } from "@/lib/support";
export const metadata = { title: "Support" };
export default async function SupportList() {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/support");
    const { data, error } = await sb
        .from("support_conversations")
        .select("id,subject,status,order_id,last_message_at,last_message_sender,last_message_preview,customer_read_at,admin_read_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
    if (error)
        console.error("[support] list load failed:", error.code, error.message);
    const rows = (data ?? []);
    return (<Page title="Support" intro="Ask us about your orders, sizing, delivery or anything else. We reply here and by email.">
      <AccountNav />
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl">Your requests</h2>
        <Link href="/account/support/new" className="btn-dark">New request</Link>
      </div>
      {error && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Your support requests could not be loaded. Please try again shortly.</p>}
      {!rows.length && !error ? (<p className="text-umber">You have no support requests yet.</p>) : (<ul className="divide-y divide-sand border-y border-sand text-sm">
          {rows.map((c) => {
                const unread = isUnreadForCustomer(c);
                return (<li key={c.id}>
                <Link href={`/account/support/${c.id}`} className="block py-4 hover:bg-cream">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={unread ? "font-semibold" : ""}>{c.subject}</span>
                    <span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${STATUS_BADGE[c.status]}`}>{statusLabel(c.status, "customer")}</span>
                    {unread && <span className="rounded-full bg-charcoal px-2 py-0.5 text-xs text-warm">New reply<span className="sr-only"> from Europium Support</span></span>}
                  </div>
                  <p className="mt-1 text-xs text-taupe">
                    {shortOrderId(c.order_id) ? `Order ${shortOrderId(c.order_id)} · ` : ""}Updated {formatWhen(c.updated_at)}
                  </p>
                  {c.last_message_preview && <p className="mt-1 line-clamp-2 text-umber">{c.last_message_preview}</p>}
                </Link>
              </li>);
            })}
        </ul>)}
    </Page>);
}

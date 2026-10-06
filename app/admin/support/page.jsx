import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import { STATUS_BADGE, formatWhen, isUnreadForAdmin, shortOrderId, statusLabel, SUPPORT_STATUSES } from "@/lib/support";
export const metadata = { title: "Support", robots: { index: false } };
const FILTERS = ["all", "unread", ...SUPPORT_STATUSES];
export default async function SupportInbox({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const filter = FILTERS.includes(sp.status ?? "") ? sp.status : "all";
    const { data, error } = await sb
        .from("support_conversations")
        .select("id,user_id,order_id,subject,status,last_message_at,last_message_sender,last_message_preview,admin_read_at,customer_read_at,updated_at")
        .order("last_message_at", { ascending: false })
        .limit(300);
    if (error)
        console.error("[support] inbox load failed:", error.code, error.message);
    const all = (data ?? []);
    // Customer names for the list. Order numbers are shown only as a short reference.
    const userIds = [...new Set(all.map((c) => c.user_id))];
    const { data: profiles } = userIds.length ? await sb.from("profiles").select("id,full_name").in("id", userIds) : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
    const count = (f) => (f === "all" ? all.length : f === "unread" ? all.filter(isUnreadForAdmin).length : all.filter((c) => c.status === f).length);
    const rows = all.filter((c) => (filter === "all" ? true : filter === "unread" ? isUnreadForAdmin(c) : c.status === filter));
    const label = (f) => (f === "all" ? "All" : f === "unread" ? "Unread" : statusLabel(f, "admin"));
    const href = (f) => (f === "all" ? "/admin/support" : `/admin/support?status=${f}`);
    return (<>
      <h1 className="mb-6 font-serif text-4xl">Support</h1>
      <Flash ok={sp.ok} error={sp.error}/>
      {error && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Support conversations could not be loaded. If migration <code>0016_support.sql</code> has not been run yet, run it in Supabase first; otherwise check the server log.</p>}

      <nav aria-label="Support status" className="mb-6 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (<Link key={f} href={href(f)} aria-current={filter === f ? "page" : undefined} className={`min-h-11 border px-4 py-3 ${filter === f ? "border-charcoal bg-charcoal text-warm" : "border-sand hover:bg-cream"}`}>
            {label(f)} ({count(f)})
          </Link>))}
      </nav>

      {!rows.length && !error ? (<p className="text-umber">{filter === "all" ? "No support conversations yet." : "No conversations match this filter."}</p>) : (<ul className="divide-y divide-sand border-y border-sand text-sm">
          {rows.map((c) => {
                const unread = isUnreadForAdmin(c);
                return (<li key={c.id}>
                <Link href={`/admin/support/${c.id}`} className="block py-4 hover:bg-cream">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {unread && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-charcoal"/>}
                    <strong className={unread ? "font-semibold" : "font-normal"}>{names.get(c.user_id) || "Customer"}</strong>
                    <span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${STATUS_BADGE[c.status]}`}>{statusLabel(c.status, "admin")}</span>
                    {unread && <span className="text-xs uppercase tracking-[0.12em]">Unread<span className="sr-only"> reply from customer</span></span>}
                  </div>
                  <p className={`mt-1 ${unread ? "font-semibold" : ""}`}>{c.subject}</p>
                  <p className="mt-1 text-xs text-taupe">
                    {shortOrderId(c.order_id) ? `Order ${shortOrderId(c.order_id)} · ` : "No linked order · "}Updated {formatWhen(c.updated_at)}
                  </p>
                  {c.last_message_preview && <p className="mt-1 line-clamp-2 text-umber">{c.last_message_sender === "admin" ? "You: " : ""}{c.last_message_preview}</p>}
                </Link>
              </li>);
            })}
        </ul>)}
    </>);
}

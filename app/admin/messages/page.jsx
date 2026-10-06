import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
const STATUSES = ["unread", "read", "replied"];
const LABEL = { unread: "Unread", read: "Read", replied: "Replied" };
const BADGE = { unread: "border-charcoal bg-charcoal text-warm", read: "border-sand text-umber", replied: "border-taupe text-charcoal" };
export default async function Messages({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const filter = STATUSES.includes(sp.status) ? sp.status : null;
    const q = (sp.q ?? "").trim().slice(0, 100).toLowerCase();
    let query = sb.from("contact_messages").select("id,name,email,subject,message,status,created_at").order("created_at", { ascending: false }).limit(300);
    if (filter)
        query = query.eq("status", filter);
    const [list, ...counts] = await Promise.all([query, ...STATUSES.map((s) => sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", s))]);
    const loadError = list.error;
    if (loadError)
        console.error("[messages] load failed:", loadError.code, loadError.message);
    const count = (s) => counts[STATUSES.indexOf(s)].count ?? 0;
    const total = STATUSES.reduce((n, s) => n + count(s), 0);
    const rows = (list.data ?? []).filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.subject ?? "").toLowerCase().includes(q));
    const qs = (status) => { const p = new URLSearchParams(); if (status)
        p.set("status", status); if (q)
        p.set("q", q); const s = p.toString(); return `/admin/messages${s ? `?${s}` : ""}`; };
    return (<>
    <h1 className="mb-6 font-serif text-4xl">Messages</h1>
    <Flash ok={sp.ok} error={sp.error}/>
    {loadError && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Messages could not be loaded. If you have not run migration <code>0014_reviews_messages.sql</code> in Supabase yet, run it first; otherwise check the server log.</p>}

    <nav aria-label="Message status" className="mb-4 flex flex-wrap gap-2 text-sm">
      {[[null, "All", total], ...STATUSES.map((s) => [s, LABEL[s], count(s)])].map(([s, l, n]) => (<Link key={l} href={qs(s)} aria-current={filter === s ? "page" : undefined} className={`min-h-11 border px-4 py-3 ${filter === s ? "border-charcoal bg-charcoal text-warm" : "border-sand hover:bg-cream"}`}>{l} ({n})</Link>))}
    </nav>
    <form method="get" action="/admin/messages" className="mb-6 flex max-w-xl gap-2">
      {filter && <input type="hidden" name="status" value={filter}/>}
      <label htmlFor="q" className="sr-only">Search messages</label>
      <input id="q" name="q" defaultValue={q} placeholder="Search name, email or subject" className="min-h-11 flex-1 border border-sand bg-transparent px-3"/>
      <button className="btn-line min-h-11 px-4">Search</button>
      {q && <Link href={qs(filter)} className="min-h-11 py-3 text-sm underline">Clear</Link>}
    </form>

    {!rows.length && !loadError ? <p className="text-umber">{filter || q ? "No messages match this filter." : "No messages yet."}</p> : (<ul className="divide-y divide-sand border-y border-sand text-sm">{rows.map((m) => (<li key={m.id}>
          <Link href={`/admin/messages/${m.id}`} className="block py-4 hover:bg-cream">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong className={m.status === "unread" ? "font-semibold" : "font-normal"}>{m.name}</strong>
              <span className="break-all text-umber">{m.email}</span>
              <span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${BADGE[m.status]}`}>{LABEL[m.status]}</span>
              {m.created_at && <time dateTime={m.created_at} className="text-xs text-taupe">{new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>}
            </div>
            <p className={`mt-1 ${m.status === "unread" ? "font-semibold" : ""}`}>{m.subject || "(no subject)"}</p>
            <p className="mt-1 line-clamp-2 text-umber">{m.message.slice(0, 160)}{m.message.length > 160 ? "…" : ""}</p>
          </Link>
        </li>))}</ul>)}
    {rows.length >= 300 && <p className="mt-4 text-xs text-taupe">Showing the latest 300 messages. Use the filters to narrow the list.</p>}
  </>);
}

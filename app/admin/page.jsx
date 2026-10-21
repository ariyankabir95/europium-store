import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/format";

/** Today's calendar date in Asia/Dhaka, as YYYY-MM-DD. Kept in sync with app/admin/revenue/page.jsx. */
function dhakaToday() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function Dashboard() {
    const sb = await requireAdmin();
    const count = async (t) => (await sb.from(t).select("*", { count: "exact", head: true })).count ?? 0;
    const today = dhakaToday();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [orders, products, customers, messages, { data: monthRows }] = await Promise.all([
        count("orders"),
        count("products"),
        count("profiles"),
        count("contact_messages"),
        sb.rpc("admin_revenue_summary", { p_from: monthStart, p_to: today }),
    ]);
    const m = monthRows?.[0];
    const monthRevenue = m ? money((Number(m.paid_revenue_cents) + Number(m.adjustments_cents)) / 100, "BDT") : "—";
    return (<>
      <h1 className="mb-8 font-serif text-4xl">Dashboard</h1>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/admin/revenue" className="block border border-charcoal bg-charcoal p-5 text-warm"><dt className="text-xs tracking-[0.18em] uppercase text-warm/70">Revenue (this month)</dt><dd className="mt-2 font-serif text-3xl">{monthRevenue}</dd></Link>
        {[["Orders", orders, "/admin/orders"], ["Products", products, "/admin/products"], ["Customers", customers, "/admin/customers"], ["Messages", messages, "/admin/messages"]].map(([k, v, href]) => <Link key={k} href={href} className="block border border-sand p-5"><dt className="text-xs tracking-[0.18em] uppercase">{k}</dt><dd className="mt-2 font-serif text-3xl">{v}</dd></Link>)}
      </dl>
    </>);
}

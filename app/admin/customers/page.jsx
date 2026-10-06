import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/format";
export default async function Customers() {
    const sb = await requireAdmin();
    const [{ data: people }, { data: orders }] = await Promise.all([sb.from("profiles").select("id,email,full_name,role,created_at").order("created_at", { ascending: false }).limit(200), sb.from("orders").select("user_id,total_cents,status").not("user_id", "is", null)]);
    const stats = new Map();
    orders?.forEach((o) => { if (o.status === "cancelled" || o.status === "refunded")
        return; const s = stats.get(o.user_id) ?? { n: 0, sum: 0 }; s.n++; s.sum += o.total_cents; stats.set(o.user_id, s); });
    return (<><h1 className="mb-6 font-serif text-4xl">Customers</h1><ul className="divide-y divide-sand border-y border-sand text-sm">{people?.map((p) => { const s = stats.get(p.id); return <li key={p.id} className="flex flex-wrap justify-between gap-2 py-3"><span>{p.full_name || "—"} · {p.email}{p.role === "admin" && " · admin"}</span><span>{s?.n ?? 0} orders · {money((s?.sum ?? 0) / 100, "BDT")} · joined {new Date(p.created_at).toLocaleDateString("en-US")}</span></li>; })}</ul></>);
}

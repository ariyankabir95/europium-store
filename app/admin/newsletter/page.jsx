import { requireAdmin } from "@/lib/admin";
export default async function Newsletter() {
    const sb = await requireAdmin();
    const { data } = await sb.from("newsletter_subscribers").select("email,status,created_at").order("created_at", { ascending: false }).limit(500);
    return (<><h1 className="mb-6 font-serif text-4xl">Newsletter</h1><p className="mb-4 text-sm text-umber">{data?.length ?? 0} subscribers</p><ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((s) => <li key={s.email} className="flex justify-between py-3"><span>{s.email}</span><span>{s.status} · {new Date(s.created_at).toLocaleDateString("en-US")}</span></li>)}</ul></>);
}

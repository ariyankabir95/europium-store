import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
async function create(fd) {
    "use server";
    const sb = await requireAdmin();
    const code = str(fd, "code", 40).toUpperCase(), kind = str(fd, "kind"), value = Math.trunc(Number(str(fd, "value")));
    if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !["percent", "fixed"].includes(kind) || !(value > 0) || (kind === "percent" && value > 100))
        return;
    const minCents = Math.round(Number(str(fd, "min") || 0) * 100), limit = str(fd, "limit") ? Math.trunc(Number(str(fd, "limit"))) : null, exp = str(fd, "expires");
    if (!Number.isFinite(minCents) || minCents < 0 || (limit !== null && !(limit >= 1)) || (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)))
        return;
    await sb.from("coupons").insert({ code, kind, value, min_order_cents: minCents, expires_at: exp ? `${exp}T23:59:59Z` : null, usage_limit: limit });
    revalidatePath("/admin/coupons");
}
async function toggle(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "coupon_id");
    if (uuid(id))
        await sb.from("coupons").update({ active: str(fd, "to") === "on" }).eq("id", id);
    revalidatePath("/admin/coupons");
}
export default async function Coupons() {
    const sb = await requireAdmin();
    const { data } = await sb.from("coupons").select("*").order("code");
    const i = "min-h-11 border border-sand bg-transparent px-2";
    return (<><h1 className="mb-6 font-serif text-4xl">Coupons</h1>
    <form action={create} className="mb-8 flex flex-wrap items-end gap-2 text-sm"><input name="code" placeholder="CODE" aria-label="Code" required className={i}/><select name="kind" aria-label="Type" className={i}><option value="percent">Percent</option><option value="fixed">Fixed (BDT)</option></select><input name="value" type="number" min={1} placeholder="Value" aria-label="Value" required className={`${i} w-24`}/><input name="min" type="number" min={0} placeholder="Min order ৳" aria-label="Minimum order" className={`${i} w-28`}/><input name="limit" type="number" min={1} placeholder="Uses" aria-label="Usage limit" className={`${i} w-24`}/><input name="expires" type="date" aria-label="Expiry" className={i}/><button className="btn-dark min-h-11 px-6">Add</button></form>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((c) => <li key={c.id} className="flex items-center justify-between py-3"><span>{c.code} · {c.kind === "percent" ? `${c.value}%` : money(c.value, "BDT")} · used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""} · {c.active ? "Active" : "Inactive"}</span><form action={toggle}><input type="hidden" name="coupon_id" value={c.id}/><button name="to" value={c.active ? "off" : "on"} className="btn-line min-h-11 px-4">{c.active ? "Deactivate" : "Activate"}</button></form></li>)}</ul></>);
}

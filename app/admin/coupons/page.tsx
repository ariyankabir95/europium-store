import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function create(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const code = str(fd, "code", 40).toUpperCase(), kind = str(fd, "kind"), value = Math.trunc(Number(str(fd, "value")));
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !["percent", "fixed"].includes(kind) || !(value > 0) || (kind === "percent" && value > 100)) return;
  await sb.from("coupons").insert({ code, kind, value, min_order_cents: Math.round(Number(str(fd, "min") || 0) * 100), expires_at: str(fd, "expires") || null, usage_limit: str(fd, "limit") ? Math.trunc(Number(str(fd, "limit"))) : null });
  revalidatePath("/admin/coupons");
}
async function toggle(fd: FormData) { "use server"; const sb = await requireAdmin(); const id = str(fd, "id"); if (uuid(id)) await sb.from("coupons").update({ active: str(fd, "to") === "on" }).eq("id", id); revalidatePath("/admin/coupons"); }
export default async function Coupons() {
  const sb = await requireAdmin(); const { data } = await sb.from("coupons").select("*").order("code"); const i = "min-h-11 border border-sand bg-transparent px-2";
  return (<><h1 className="mb-6 font-serif text-4xl">Coupons</h1>
    <form action={create} className="mb-8 flex flex-wrap items-end gap-2 text-sm"><input name="code" placeholder="CODE" aria-label="Code" required className={i} /><select name="kind" aria-label="Type" className={i}><option value="percent">Percent</option><option value="fixed">Fixed (USD)</option></select><input name="value" type="number" min={1} placeholder="Value" aria-label="Value" required className={`${i} w-24`} /><input name="min" type="number" min={0} placeholder="Min order $" aria-label="Minimum order" className={`${i} w-28`} /><input name="limit" type="number" min={1} placeholder="Uses" aria-label="Usage limit" className={`${i} w-24`} /><input name="expires" type="date" aria-label="Expiry" className={i} /><button className="btn-dark min-h-11 px-6">Add</button></form>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((c) => <li key={c.id} className="flex items-center justify-between py-3"><span>{c.code} · {c.kind === "percent" ? `${c.value}%` : `$${c.value}`} · used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""} · {c.active ? "Active" : "Inactive"}</span><form action={toggle}><input type="hidden" name="id" value={c.id} /><button name="to" value={c.active ? "off" : "on"} className="btn-line min-h-11 px-4">{c.active ? "Deactivate" : "Activate"}</button></form></li>)}</ul></>);
}

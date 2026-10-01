import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"], PAY = ["unpaid", "paid", "failed", "refunded"];
async function update(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), status = str(fd, "status"), pay = str(fd, "payment_status");
  if (!uuid(id) || !STATUS.includes(status) || !PAY.includes(pay)) return;
  await sb.from("orders").update({ payment_status: pay, tracking_number: str(fd, "tracking", 100) || null }).eq("id", id);
  await sb.rpc("admin_set_order_status", { p_order: id, p_status: status });
  revalidatePath("/admin/orders");
}
export default async function Orders() {
  const sb = await requireAdmin();
  const { data } = await sb.from("orders").select("id,email,status,payment_status,payment_method,payment_reference,tracking_number,total_cents,created_at").order("created_at", { ascending: false }).limit(100);
  const sel = "min-h-11 border border-sand bg-transparent px-2";
  return (<><h1 className="mb-6 font-serif text-4xl">Orders</h1>{!data?.length ? <p className="text-umber">No orders yet.</p> : <ul className="divide-y divide-sand border-y border-sand text-sm">{data.map((o) => (
    <li key={o.id} className="py-4"><p className="mb-2">#{o.id.slice(0, 8)} · {o.email} · {money(o.total_cents / 100)} · {new Date(o.created_at).toLocaleDateString("en-US")}</p>
      <p className="mb-2 text-xs text-taupe">Payment: {o.payment_method === "bkash_manual" ? "bKash manual" : "Not set"}{o.payment_reference ? ` · TrxID: ${o.payment_reference}` : ""}</p>
      <form action={update} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={o.id} />
        <select name="status" defaultValue={o.status} aria-label="Order status" className={sel}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="payment_status" defaultValue={o.payment_status} aria-label="Payment status" className={sel}>{PAY.map((s) => <option key={s}>{s}</option>)}</select>
        <input name="tracking" defaultValue={o.tracking_number ?? ""} placeholder="Tracking number" aria-label="Tracking number" className={sel} /><button className="btn-line min-h-11 px-4">Save</button></form></li>))}</ul>}</>);
}

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function update(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), stock = Math.trunc(Number(str(fd, "stock"))), low = Math.trunc(Number(str(fd, "low")));
  if (!uuid(id) || !(stock >= 0) || !(low >= 0)) return;
  await sb.from("product_variants").update({ stock, low_stock_threshold: low }).eq("id", id); revalidatePath("/admin/inventory");
}
export default async function Inventory() {
  const sb = await requireAdmin();
  const { data } = await sb.from("product_variants").select("id,product_id,size,color_name,sku,stock,reserved,low_stock_threshold,active,products(name)").order("sku");
  return (<><h1 className="mb-2 font-serif text-4xl">Inventory</h1><p className="mb-6 text-sm text-taupe">Stock and threshold can be adjusted here. To add, edit, archive or delete a variant, open the product under Products.</p>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((v) => { const avail = v.stock - v.reserved; const low = avail <= (v.low_stock_threshold ?? 5);
    return (<li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span><Link href={`/admin/products/${v.product_id}`} className="underline">{(v.products as unknown as { name: string } | null)?.name}</Link> · {v.size} / {v.color_name} · {v.sku} · reserved {v.reserved} · available {avail}{low && <strong className="ml-2 text-red-800">Low stock</strong>}{v.active === false && <strong className="ml-2 text-taupe">Inactive</strong>}</span>
      <form action={update} className="flex gap-2"><input type="hidden" name="id" value={v.id} /><input name="stock" type="number" min={0} defaultValue={v.stock} aria-label="Stock" className="min-h-11 w-20 border border-sand bg-transparent px-2" /><input name="low" type="number" min={0} defaultValue={v.low_stock_threshold ?? 5} aria-label="Low stock threshold" className="min-h-11 w-20 border border-sand bg-transparent px-2" /><button className="btn-line min-h-11 px-4">Save</button></form></li>); })}</ul></>);
}

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function save(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"); if (!uuid(id)) return;
  const ids = fd.getAll("p").map(String).filter(uuid);
  await sb.from("collection_products").delete().eq("collection_id", id);
  if (ids.length) await sb.from("collection_products").insert(ids.map((product_id, sort) => ({ collection_id: id, product_id, sort }))); revalidatePath("/admin/collections");
}
export default async function Assign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!uuid(id)) notFound(); const sb = await requireAdmin();
  const [{ data: c }, { data: all }, { data: cur }] = await Promise.all([sb.from("collections").select("title").eq("id", id).single(), sb.from("products").select("id,name").order("name"), sb.from("collection_products").select("product_id").eq("collection_id", id)]);
  if (!c) notFound(); const on = new Set(cur?.map((r) => r.product_id));
  return (<><h1 className="mb-6 font-serif text-4xl">{c.title}: products</h1><form action={save} className="max-w-md space-y-2 text-sm"><input type="hidden" name="id" value={id} />{all?.map((p) => <label key={p.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" name="p" value={p.id} defaultChecked={on.has(p.id)} className="h-5 w-5" />{p.name}</label>)}<button className="btn-dark mt-4">Save assignment</button></form></>);
}

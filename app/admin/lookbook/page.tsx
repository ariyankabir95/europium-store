import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), op = str(fd, "op"), title = str(fd, "title", 200);
  if (uuid(id) && op === "delete") await sb.from("lookbook_items").delete().eq("id", id);
  else if (title) {
    const slugs = str(fd, "slugs").split(",").map((s) => s.trim()).filter(Boolean); const { data: ps } = slugs.length ? await sb.from("products").select("id").in("slug", slugs) : { data: [] };
    const row = { title, description: str(fd, "description", 2000), image_url: str(fd, "image_url", 500) || null, product_ids: (ps ?? []).map((p) => p.id), sort: Math.trunc(Number(str(fd, "sort"))) || 0, published: fd.get("published") === "on" };
    if (uuid(id)) await sb.from("lookbook_items").update(row).eq("id", id); else await sb.from("lookbook_items").insert(row);
  }
  revalidatePath("/admin/lookbook"); revalidatePath("/lookbook");
}
export default async function LookbookAdmin() {
  const sb = await requireAdmin(); const [{ data }, { data: prods }] = await Promise.all([sb.from("lookbook_items").select("*").order("sort"), sb.from("products").select("id,slug")]); const slugOf = new Map(prods?.map((p) => [p.id, p.slug])); const i = "min-h-11 w-full border border-sand bg-transparent px-3 py-2";
  const Row = ({ r }: { r?: NonNullable<typeof data>[number] }) => <form action={act} className="grid gap-3 border border-sand p-4 sm:grid-cols-2"><input type="hidden" name="id" value={r?.id ?? ""} /><input name="title" defaultValue={r?.title} placeholder="Title" aria-label="Title" required className={i} /><input name="image_url" defaultValue={r?.image_url ?? ""} placeholder="Image URL (Media)" aria-label="Image URL" className={i} /><textarea name="description" defaultValue={r?.description ?? ""} placeholder="Description" aria-label="Description" className={`${i} sm:col-span-2`} /><input name="slugs" defaultValue={r?.product_ids?.map((x: string) => slugOf.get(x)).filter(Boolean).join(", ")} placeholder="Product slugs, comma separated" aria-label="Product slugs" className={i} /><input name="sort" type="number" defaultValue={r?.sort ?? 0} aria-label="Order" className={i} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={r?.published} className="h-5 w-5" />Published</label><div className="flex gap-2"><button name="op" value="save" className="btn-dark">Save</button>{r && <button name="op" value="delete" className="btn-line">Delete</button>}</div></form>;
  return (<><h1 className="mb-6 font-serif text-4xl">Lookbook</h1><div className="space-y-6"><Row />{data?.map((r) => <Row key={r.id} r={r} />)}</div></>);
}

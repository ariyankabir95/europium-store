import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid, uploadImage } from "@/lib/admin";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const img = await uploadImage(sb, "collections", fd.get("image")); const id = str(fd, "id"), op = str(fd, "op"), title = str(fd, "title", 120), sort = Math.trunc(Number(str(fd, "sort"))) || 0;
  if (op === "create") { const slug = str(fd, "slug", 120).toLowerCase(); if (!title || !/^[a-z0-9-]+$/.test(slug)) return; await sb.from("collections").insert({ title, slug, description: str(fd, "description", 1000), sort, ...(img ? { image_url: img } : {}) }); }
  else if (uuid(id) && op === "delete") await sb.from("collections").delete().eq("id", id);
  else if (uuid(id) && op === "save" && title) await sb.from("collections").update({ title, description: str(fd, "description", 1000), sort, published: fd.get("published") === "on", ...(img ? { image_url: img } : {}) }).eq("id", id);
  revalidatePath("/admin/collections");
}
export default async function Collections() {
  const sb = await requireAdmin(); const { data } = await sb.from("collections").select("*").order("sort"); const i = "min-h-11 border border-sand bg-transparent px-2";
  return (<><h1 className="mb-6 font-serif text-4xl">Collections</h1>
    <form action={act} className="mb-8 flex flex-wrap gap-2 text-sm"><input type="hidden" name="op" value="create" /><input name="title" placeholder="Title" aria-label="Title" required className={i} /><input name="slug" placeholder="slug-like-this" aria-label="Slug" required className={i} /><input name="description" placeholder="Description" aria-label="Description" className={`${i} flex-1`} /><input name="sort" type="number" placeholder="Order" aria-label="Order" className={`${i} w-24`} /><label htmlFor="new-image" className="sr-only">Image</label><input id="new-image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" /><button className="btn-dark min-h-11 px-6">Add</button></form>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((c) => <li key={c.id} className="py-3"><form action={act} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={c.id} /><input name="title" defaultValue={c.title} aria-label="Title" className={i} /><input name="description" defaultValue={c.description ?? ""} aria-label="Description" className={`${i} flex-1`} /><input name="sort" type="number" defaultValue={c.sort} aria-label="Order" className={`${i} w-20`} />
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Replace image" className="w-52 text-xs" /><label className="flex items-center gap-1"><input type="checkbox" name="published" defaultChecked={c.published} className="h-5 w-5" />Visible</label><Link href={`/admin/collections/${c.id}`} className="min-h-11 py-3 underline">Products</Link><button name="op" value="save" className="btn-line min-h-11 px-4">Save</button><button name="op" value="delete" className="btn-line min-h-11 px-4">Delete</button></form></li>)}</ul>
    <p className="mt-4 text-xs text-taupe">Use the Products link to assign products. Choose a file to set or replace the collection image.</p></>);
}

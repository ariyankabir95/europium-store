import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid, uploadImage } from "@/lib/admin";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const img = await uploadImage(sb, "categories", fd.get("image")); const id = str(fd, "id"), op = str(fd, "op"), name = str(fd, "name", 120);
  if (op === "create") { const slug = str(fd, "slug", 120).toLowerCase(); if (!name || !/^[a-z0-9-]+$/.test(slug)) return; await sb.from("categories").insert({ name, slug, description: str(fd, "description", 1000), ...(img ? { image_url: img } : {}) }); }
  else if (uuid(id) && op === "delete") await sb.from("categories").delete().eq("id", id);
  else if (uuid(id) && op === "save" && name) await sb.from("categories").update({ name, description: str(fd, "description", 1000), seo_title: str(fd, "seo_title", 120) || null, seo_description: str(fd, "seo_description", 300) || null, published: fd.get("published") === "on", ...(img ? { image_url: img } : {}) }).eq("id", id);
  revalidatePath("/admin/categories");
}
export default async function Categories() {
  const sb = await requireAdmin(); const { data } = await sb.from("categories").select("*").order("sort").order("name"); const i = "min-h-11 border border-sand bg-transparent px-2";
  return (<><h1 className="mb-6 font-serif text-4xl">Categories</h1>
    <form action={act} className="mb-8 flex flex-wrap gap-2 text-sm"><input type="hidden" name="op" value="create" /><input name="name" placeholder="Name" aria-label="Name" required className={i} /><input name="slug" placeholder="slug-like-this" aria-label="Slug" required className={i} /><input name="description" placeholder="Description" aria-label="Description" className={`${i} flex-1`} /><label htmlFor="new-image" className="sr-only">Image</label><input id="new-image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" /><button className="btn-dark min-h-11 px-6">Add</button></form>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((c) => <li key={c.id} className="py-3"><form action={act} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={c.id} />
      <input name="name" defaultValue={c.name} aria-label="Name" className={i} /><input name="description" defaultValue={c.description ?? ""} aria-label="Description" className={`${i} flex-1`} /><input name="seo_title" defaultValue={c.seo_title ?? ""} placeholder="SEO title" aria-label="SEO title" className={i} /><input name="seo_description" defaultValue={c.seo_description ?? ""} placeholder="SEO description" aria-label="SEO description" className={i} />
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Replace image" className="w-52 text-xs" /><label className="flex items-center gap-1"><input type="checkbox" name="published" defaultChecked={c.published} className="h-5 w-5" />Published</label><button name="op" value="save" className="btn-line min-h-11 px-4">Save</button><button name="op" value="delete" className="btn-line min-h-11 px-4">Delete</button></form></li>)}</ul>
    <p className="mt-4 text-xs text-taupe">A category with products can&apos;t be deleted until they are moved. Choose a file to set or replace the category image.</p></>);
}

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { safeImage } from "@/lib/cms-schema";
import Flash from "@/components/admin/Flash";

const LIST = "/admin/lookbook";
const back = (kind, message) => redirect(`${LIST}?${kind}=${encodeURIComponent(message)}`);

async function act(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "lookbook_id"), op = str(fd, "op"), title = str(fd, "title", 200);

  if (uuid(id) && op === "delete") {
    const { error } = await sb.from("lookbook_items").delete().eq("id", id);
    if (error) back("error", "Could not delete this lookbook item.");
  } else {
    if (!title) back("error", "Enter a title before saving.");
    const rawImage = str(fd, "image_url", 500);
    const image = safeImage(rawImage);
    if (rawImage && !image) back("error", "Image URL must be an https:// URL or a site-relative path.");
    const slugs = [...new Set(str(fd, "slugs", 2000).split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 100);
    const { data: ps, error: productError } = slugs.length
      ? await sb.from("products").select("id,slug").in("slug", slugs)
      : { data: [], error: null };
    if (productError) back("error", "Could not validate the selected product slugs.");
    const found = new Set((ps ?? []).map((p) => p.slug));
    const missing = slugs.filter((slug) => !found.has(slug));
    if (missing.length) back("error", `Unknown product slug(s): ${missing.slice(0, 3).join(", ")}.`);
    const rawSort = str(fd, "sort", 20);
    const parsedSort = rawSort ? Number(rawSort) : 0;
    if (!Number.isSafeInteger(parsedSort) || parsedSort < 0 || parsedSort > 100000)
      back("error", "Order must be a whole number between 0 and 100000.");
    const row = {
      title,
      description: str(fd, "description", 2000),
      image_url: image || null,
      product_ids: (ps ?? []).map((p) => p.id),
      sort: parsedSort,
      published: fd.get("published") === "on",
    };
    const result = uuid(id)
      ? await sb.from("lookbook_items").update(row).eq("id", id)
      : await sb.from("lookbook_items").insert(row);
    if (result.error) back("error", "Could not save this lookbook item. Check the database and try again.");
  }

  revalidatePath(LIST);
  revalidatePath("/lookbook");
  back("ok", op === "delete" ? "Lookbook item deleted." : "Lookbook item saved.");
}

export default async function LookbookAdmin({ searchParams }) {
  const sb = await requireAdmin();
  const sp = await searchParams;
  const [{ data, error }, { data: prods, error: productsError }] = await Promise.all([
    sb.from("lookbook_items").select("*").order("sort"),
    sb.from("products").select("id,slug"),
  ]);
  const slugOf = new Map(prods?.map((p) => [p.id, p.slug]));
  const i = "min-h-11 w-full border border-sand bg-transparent px-3 py-2";
  const Row = ({ r }) => <form action={act} className="grid gap-3 border border-sand p-4 sm:grid-cols-2">
    <input type="hidden" name="lookbook_id" value={r?.id ?? ""}/>
    <input name="title" defaultValue={r?.title} placeholder="Title" aria-label="Title" required maxLength={200} className={i}/>
    <input name="image_url" defaultValue={r?.image_url ?? ""} placeholder="Image URL (Media)" aria-label="Image URL" maxLength={500} className={i}/>
    <textarea name="description" defaultValue={r?.description ?? ""} placeholder="Description" aria-label="Description" maxLength={2000} className={`${i} sm:col-span-2`}/>
    <input name="slugs" defaultValue={r?.product_ids?.map((x) => slugOf.get(x)).filter(Boolean).join(", ")} placeholder="Product slugs, comma separated" aria-label="Product slugs" maxLength={2000} className={i}/>
    <input name="sort" type="number" min={0} max={100000} defaultValue={r?.sort ?? 0} aria-label="Order" className={i}/>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={r?.published} className="h-5 w-5"/>Published</label>
    <div className="flex gap-2"><button name="op" value="save" className="btn-dark">Save</button>{r && <button name="op" value="delete" className="btn-line">Delete</button>}</div>
  </form>;
  return <>
    <h1 className="mb-3 font-serif text-4xl">Lookbook</h1>
    <Flash ok={sp.ok} error={sp.error}/>
    {(error || productsError) && <p role="alert" className="mb-5 border border-red-800 p-3 text-sm text-red-800">Lookbook or product data could not be loaded. Refresh the page or check the database.</p>}
    <div className="space-y-6"><Row />{data?.map((r) => <Row key={r.id} r={r}/>)}</div>
  </>;
}

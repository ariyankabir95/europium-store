import { revalidatePath } from "next/cache";
import { requireAdmin, str } from "@/lib/admin";
import { DEFAULTS, getBlocks } from "@/lib/cms";
async function save(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const key = str(fd, "key"); if (!(key in DEFAULTS)) return;
  await sb.from("homepage_sections").upsert({ key, published: fd.get("published") === "on", content: { title: str(fd, "title", 300), body: str(fd, "body", 1000), cta_label: str(fd, "cta_label", 60), cta_href: str(fd, "cta_href", 300), image_url: str(fd, "image_url", 500) } });
  revalidatePath("/");
}
export default async function Homepage() {
  await requireAdmin(); const blocks = await getBlocks(); const i = "min-h-11 w-full border border-sand bg-transparent px-3 py-2";
  return (<><h1 className="mb-2 font-serif text-4xl">Homepage</h1><p className="mb-8 text-sm text-umber">Edit each section. Upload images under Media and paste the URL. Use a new line in a title to break it.</p>
    <div className="space-y-8">{Object.entries(blocks).map(([k, b]) => <form key={k} action={save} className="grid gap-3 border border-sand p-5 sm:grid-cols-2"><input type="hidden" name="key" value={k} /><h2 className="font-serif text-2xl sm:col-span-2 capitalize">{k.replace("_", " ")}</h2>
      <textarea name="title" defaultValue={b.title} rows={2} aria-label="Title" className={i} /><textarea name="body" defaultValue={b.body} rows={2} aria-label="Text" className={i} /><input name="cta_label" defaultValue={b.cta_label} placeholder="Button label" aria-label="Button label" className={i} /><input name="cta_href" defaultValue={b.cta_href} placeholder="Button link" aria-label="Button link" className={i} /><input name="image_url" defaultValue={b.image_url} placeholder="Image URL" aria-label="Image URL" className={`${i} sm:col-span-2`} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={b.published} className="h-5 w-5" />Visible</label><button className="btn-dark">Save</button></form>)}</div></>);
}

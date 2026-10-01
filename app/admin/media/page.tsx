import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin, str } from "@/lib/admin";
const BUCKETS = ["products", "categories", "collections", "homepage", "lookbook"], TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
async function upload(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const bucket = str(fd, "bucket"), f = fd.get("file");
  if (!BUCKETS.includes(bucket) || !(f instanceof File) || !TYPES.includes(f.type) || f.size > 5_000_000) return;
  await sb.storage.from(bucket).upload(`${crypto.randomUUID()}.${f.type.split("/")[1]}`, f, { contentType: f.type }); revalidatePath("/admin/media");
}
async function remove(fd: FormData) { "use server"; const sb = await requireAdmin(); const bucket = str(fd, "bucket"), name = str(fd, "name"); if (BUCKETS.includes(bucket) && /^[\w.-]+$/.test(name)) await sb.storage.from(bucket).remove([name]); revalidatePath("/admin/media"); }
export default async function Media({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const sb = await requireAdmin(); const bucket = BUCKETS.includes((await searchParams).b ?? "") ? (await searchParams).b! : "products";
  const { data } = await sb.storage.from(bucket).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  return (<><h1 className="mb-4 font-serif text-4xl">Media</h1><nav aria-label="Buckets" className="mb-6 flex flex-wrap gap-4 text-sm">{BUCKETS.map((b) => <Link key={b} href={`/admin/media?b=${b}`} aria-current={b === bucket} className={b === bucket ? "underline" : "text-umber"}>{b}</Link>)}</nav>
    <form action={upload} className="mb-8 flex flex-wrap items-center gap-3"><input type="hidden" name="bucket" value={bucket} /><label htmlFor="file" className="sr-only">Image file</label><input id="file" name="file" type="file" accept={TYPES.join(",")} required className="text-sm" /><button className="btn-dark min-h-11 px-6">Upload (max 5 MB)</button></form>
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">{data?.filter((f) => f.name !== ".emptyFolderPlaceholder").map((f) => { const url = sb.storage.from(bucket).getPublicUrl(f.name).data.publicUrl; return <li key={f.name} className="text-xs"><img src={url} alt="" loading="lazy" className="aspect-square w-full object-cover" /><input readOnly value={url} aria-label="Image URL" className="mt-2 w-full border border-sand bg-transparent p-1" /><form action={remove}><input type="hidden" name="bucket" value={bucket} /><input type="hidden" name="name" value={f.name} /><button className="mt-1 min-h-11 underline">Delete</button></form></li>; })}</ul></>);
}

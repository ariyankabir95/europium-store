import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { back } from "@/lib/cms-admin";
import { IMAGE_ACCEPT, STORAGE_BUCKETS, isBucket } from "@/lib/images";
import { findImageReferences, loadReferenceIndex, uploadEntityImage } from "@/lib/storage";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyField from "@/components/admin/CopyField";
import ImageField from "@/components/admin/ImageField";
import SubmitButton from "@/components/admin/SubmitButton";
import SmartImage from "@/components/ui/SmartImage";
const here = (b) => `/admin/media?b=${b}`;
/** The Media Library only stores files. It never attaches an image to a product, category or collection. */
async function upload(fd) {
    "use server";
    const sb = await requireAdmin();
    const bucket = String(fd.get("bucket") ?? "");
    if (!isBucket(bucket))
        back("/admin/media", "error", "Unknown bucket.");
    const up = await uploadEntityImage(sb, bucket, "library", fd.get("file"));
    if (up.status === "none")
        back(here(bucket), "error", "Choose an image first.");
    if (up.status === "error")
        back(here(bucket), "error", up.error);
    revalidatePath("/admin/media");
    back(here(bucket), "ok", "Image uploaded to the library. It is not attached to anything yet.");
}
async function remove(fd) {
    "use server";
    const sb = await requireAdmin();
    const bucket = String(fd.get("bucket") ?? ""), path = String(fd.get("path") ?? "");
    if (!isBucket(bucket) || !/^[\w.-]+(\/[\w.-]+){0,3}$/.test(path) || path.includes(".."))
        back("/admin/media", "error", "Invalid file.");
    const refs = await findImageReferences(sb, bucket, path);
    if (refs === null)
        back(here(bucket), "error", "Could not verify whether this image is in use, so it was kept.");
    if (refs.length)
        back(here(bucket), "error", `This image is still used by ${refs.join(", ")}. Detach it there first. The file was kept.`);
    const { error } = await sb.storage.from(bucket).remove([path]);
    if (error) {
        console.error("[media] remove failed", { bucket, path, message: error.message });
        back(here(bucket), "error", "Could not delete the file.");
    }
    revalidatePath("/admin/media");
    back(here(bucket), "ok", "Image deleted.");
}
/** Lists the bucket root plus one level of sub-folders ({entity-id}/{file}), newest first. */
async function listBucket(sb, bucket) {
    const opts = { limit: 100, sortBy: { column: "created_at", order: "desc" } };
    const { data: root, error } = await sb.storage.from(bucket).list("", opts);
    if (error || !root) {
        console.error("[media] list failed", { bucket, message: error?.message });
        return { items: [], failed: true };
    }
    const items = root.filter((f) => f.id && f.name !== ".emptyFolderPlaceholder").map((f) => ({ path: f.name, name: f.name, created: f.created_at ?? "" }));
    for (const folder of root.filter((f) => !f.id).slice(0, 40)) {
        const { data } = await sb.storage.from(bucket).list(folder.name, opts);
        (data ?? []).filter((f) => f.id && f.name !== ".emptyFolderPlaceholder").forEach((f) => items.push({ path: `${folder.name}/${f.name}`, name: f.name, created: f.created_at ?? "" }));
    }
    return { items: items.sort((a, b) => b.created.localeCompare(a.created)).slice(0, 200), failed: false };
}
export default async function Media({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const bucket = isBucket(sp.b ?? "") ? sp.b : "products";
    const [{ items, failed }, index] = await Promise.all([listBucket(sb, bucket), loadReferenceIndex(sb)]);
    return (<>
      <h1 className="mb-4 font-serif text-4xl">Media</h1>
      <p className="mb-4 max-w-2xl text-sm text-umber">A library of uploaded files. Uploading here does not attach an image to any product, category or collection; do that from the item&apos;s own admin page. Files that are in use cannot be deleted.</p>
      <Flash ok={sp.ok} error={sp.error}/>
      <nav aria-label="Buckets" className="mb-6 flex flex-wrap gap-4 text-sm">{STORAGE_BUCKETS.map((b) => <Link key={b} href={here(b)} aria-current={b === bucket} className={b === bucket ? "underline" : "text-umber"}>{b}</Link>)}</nav>
      <form action={upload} className="mb-8 max-w-md space-y-3"><input type="hidden" name="bucket" value={bucket}/><ImageField name="file" label={`Upload to “${bucket}”`} help="Stored in the library folder."/><SubmitButton pending="Uploading…">Upload</SubmitButton></form>
      {failed && <p role="alert" className="mb-4 text-sm text-red-800">Could not list this bucket. Check that it exists (migration 0006) and that you are signed in as admin.</p>}
      {!failed && items.length === 0 && <p className="text-umber">No images in this bucket yet.</p>}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((f) => {
            const url = sb.storage.from(bucket).getPublicUrl(f.path).data.publicUrl;
            const used = index.get(`${bucket}/${f.path}`);
            return (<li key={f.path} className="text-xs">
              <div className="relative aspect-square w-full bg-cream"><SmartImage src={url} alt={f.name} sizes="(min-width:768px) 25vw, 50vw" fallback={<div className="flex h-full items-center justify-center text-taupe">Preview unavailable</div>}/></div>
              <p className={`mt-1 ${used ? "text-umber" : "text-taupe"}`}>{used ? `In use: ${used.join(", ")}` : "Not attached"}</p>
              <CopyField value={url}/>
              <form action={remove}><input type="hidden" name="bucket" value={bucket}/><input type="hidden" name="path" value={f.path}/><ConfirmButton message="Delete this file permanently? It is only deleted if nothing uses it." className="mt-1 min-h-11 underline">Delete</ConfirmButton></form>
            </li>);
        })}
      </ul>
      <p className="mt-6 text-xs text-taupe">Accepted: {IMAGE_ACCEPT.replaceAll("image/", "").replaceAll(",", ", ")} up to 5 MB.</p>
    </>);
}

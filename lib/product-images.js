import "server-only";
import { uploadEntityImage } from "@/lib/storage";
export const MAX_GALLERY_UPLOAD = 12;
/** Image rows for one product in display order. The FIRST row is the primary (main) image. */
export async function orderedImages(sb, productId) {
    const { data } = await sb.from("product_images").select("id,url,sort").eq("product_id", productId).order("sort", { ascending: true }).order("id", { ascending: true });
    return (data ?? []);
}
/** Writes sort = 0..n-1 following the given id order. */
export async function writeOrder(sb, productId, ids) {
    for (let i = 0; i < ids.length; i++) {
        const { error } = await sb.from("product_images").update({ sort: i }).eq("id", ids[i]).eq("product_id", productId);
        if (error) {
            console.error("[product-images] reorder failed", error.message);
            return false;
        }
    }
    return true;
}
/** Uploads every chosen file (max 12) and appends them after the existing images. Never removes anything. */
export async function addProductImages(sb, productId, files, alt) {
    const picked = files.filter((f) => f instanceof File && f.size > 0).slice(0, MAX_GALLERY_UPLOAD);
    const errors = [];
    if (!picked.length)
        return { added: 0, errors };
    const { data: last } = await sb.from("product_images").select("sort").eq("product_id", productId).order("sort", { ascending: false }).limit(1);
    let next = (last?.[0]?.sort ?? -1) + 1;
    let added = 0;
    for (const f of picked) {
        const up = await uploadEntityImage(sb, "products", productId, f);
        if (up.status !== "ok") {
            errors.push(`${f.name}: ${up.status === "error" ? up.error : "no file"}`);
            continue;
        }
        const { error } = await sb.from("product_images").insert({ product_id: productId, url: up.url, alt: alt || null, sort: next });
        if (error) {
            console.error("[product-images] insert failed", error.message);
            await sb.storage.from("products").remove([up.path]); // brand-new file, nothing references it yet
            errors.push(`${f.name}: the image was uploaded but could not be saved.`);
            continue;
        }
        next++;
        added++;
    }
    return { added, errors };
}

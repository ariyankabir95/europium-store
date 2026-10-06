"use server";
import { redirect } from "next/navigation";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { refreshStorefront } from "@/lib/cms-admin";
import { addProductImages, MAX_GALLERY_UPLOAD, orderedImages, writeOrder } from "@/lib/product-images";
import { removeStoredImageIfUnused, uploadEntityImage } from "@/lib/storage";
/** Back to the product editor with a visible notice (iok = success, ierr = problem). */
function done(productId, kind, msg) {
    redirect(`/admin/products/${productId}?${kind}=${encodeURIComponent(msg)}#images`);
}
export async function uploadProductImages(fd) {
    const sb = await requireAdmin();
    const pid = str(fd, "id");
    if (!uuid(pid))
        redirect("/admin/products");
    const files = fd.getAll("files");
    if (!files.some((f) => f instanceof File && f.size > 0))
        done(pid, "ierr", "Choose at least one image first.");
    const { added, errors } = await addProductImages(sb, pid, files, str(fd, "alt", 200));
    refreshStorefront();
    if (errors.length)
        done(pid, "ierr", `${added ? `${added} image(s) added. ` : ""}Image upload failed for: ${errors.join(" ")} Existing images were kept.`);
    const skipped = files.filter((f) => f instanceof File && f.size > 0).length > MAX_GALLERY_UPLOAD ? ` Only the first ${MAX_GALLERY_UPLOAD} were uploaded.` : "";
    done(pid, "iok", `${added} image(s) added.${skipped}`);
}
/** Replaces ONE existing image (e.g. the main image) with a new file. The old row/URL is only changed after a successful upload. */
export async function replaceProductImage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "image_id"), pid = str(fd, "id");
    if (!uuid(id) || !uuid(pid))
        redirect("/admin/products");
    const { data: cur } = await sb.from("product_images").select("url").eq("id", id).eq("product_id", pid).maybeSingle();
    if (!cur)
        done(pid, "ierr", "That image no longer exists.");
    const up = await uploadEntityImage(sb, "products", pid, fd.get("file"));
    if (up.status === "none")
        done(pid, "ierr", "Choose a replacement image first.");
    if (up.status === "error")
        done(pid, "ierr", `${up.error} The existing image was kept.`);
    const { error } = await sb.from("product_images").update({ url: up.url }).eq("id", id).eq("product_id", pid);
    if (error) {
        console.error("[product-images] replace failed", error.message);
        done(pid, "ierr", "The new image could not be saved. The existing image was kept.");
    }
    await removeStoredImageIfUnused(sb, cur.url);
    refreshStorefront();
    done(pid, "iok", "Image replaced.");
}
export async function setPrimaryProductImage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "image_id"), pid = str(fd, "id");
    if (!uuid(id) || !uuid(pid))
        redirect("/admin/products");
    const rows = await orderedImages(sb, pid);
    if (!rows.some((r) => r.id === id))
        done(pid, "ierr", "That image no longer exists.");
    const ok = await writeOrder(sb, pid, [id, ...rows.filter((r) => r.id !== id).map((r) => r.id)]);
    refreshStorefront();
    done(pid, ok ? "iok" : "ierr", ok ? "Primary image updated." : "Could not change the primary image.");
}
export async function moveProductImage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "image_id"), pid = str(fd, "id"), dir = str(fd, "dir", 4);
    if (!uuid(id) || !uuid(pid) || (dir !== "up" && dir !== "down"))
        redirect("/admin/products");
    const ids = (await orderedImages(sb, pid)).map((r) => r.id);
    const i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length)
        done(pid, "iok", "Order unchanged.");
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const ok = await writeOrder(sb, pid, ids);
    refreshStorefront();
    done(pid, ok ? "iok" : "ierr", ok ? "Image order updated." : "Could not change the order.");
}
/** Removes the image from the product. The Storage file is deleted only if nothing else uses it. */
export async function removeProductImage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "image_id"), pid = str(fd, "id");
    if (!uuid(id) || !uuid(pid))
        redirect("/admin/products");
    const { data: cur } = await sb.from("product_images").select("url").eq("id", id).eq("product_id", pid).maybeSingle();
    if (!cur)
        done(pid, "ierr", "That image no longer exists.");
    const { error } = await sb.from("product_images").delete().eq("id", id).eq("product_id", pid);
    if (error)
        done(pid, "ierr", "Could not remove the image.");
    await writeOrder(sb, pid, (await orderedImages(sb, pid)).map((r) => r.id));
    await removeStoredImageIfUnused(sb, cur.url);
    refreshStorefront();
    done(pid, "iok", "Image removed.");
}

"use server";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back, refreshStorefront } from "@/lib/cms-admin";
import { removeStoredImageIfUnused, uploadEntityImage } from "@/lib/storage";
const PATH = "/admin/categories";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export async function createCategory(fd) {
    const sb = await requireAdmin();
    const name = str(fd, "name", 120), slug = str(fd, "slug", 120).toLowerCase();
    if (!name)
        back(PATH, "error", "Enter a category name.");
    if (!SLUG.test(slug))
        back(PATH, "error", "Slug must use lowercase letters, numbers and single hyphens (for example casual-wear).");
    const { data, error } = await sb.from("categories").insert({
        name, slug, description: str(fd, "description", 1000),
        seo_title: str(fd, "seo_title", 120) || null, seo_description: str(fd, "seo_description", 300) || null,
        published: fd.get("published") === "on",
    }).select("id").single();
    if (error || !data)
        back(PATH, "error", error?.code === "23505" ? "That slug is already used by another category." : "Could not create the category.");
    const id = data.id;
    const up = await uploadEntityImage(sb, "categories", id, fd.get("image"));
    if (up.status === "ok") {
        const { error: e2 } = await sb.from("categories").update({ image_url: up.url }).eq("id", id);
        if (e2) {
            console.error("[categories] saving image_url failed", e2.message);
            refreshStorefront();
            back(PATH, "error", "Category created, but the image could not be attached. Edit the category and upload it again.");
        }
    }
    else if (up.status === "error") {
        refreshStorefront();
        back(PATH, "error", `Category created without an image. ${up.error} You can retry by editing the category.`);
    }
    refreshStorefront();
    back(PATH, "ok", "Category created.");
}
export async function saveCategory(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40), name = str(fd, "name", 120);
    if (!uuid(id))
        back(PATH, "error", "Category not found.");
    if (!name)
        back(PATH, "error", "Category name cannot be empty.");
    const { data: cur } = await sb.from("categories").select("image_url").eq("id", id).maybeSingle();
    if (!cur)
        back(PATH, "error", "Category not found.");
    // Text fields are saved first and NEVER include image_url, so a failed upload cannot erase the existing image.
    const { error } = await sb.from("categories").update({
        name, description: str(fd, "description", 1000),
        seo_title: str(fd, "seo_title", 120) || null, seo_description: str(fd, "seo_description", 300) || null,
        published: fd.get("published") === "on",
    }).eq("id", id);
    if (error)
        back(PATH, "error", "Could not save the category.");
    const old = cur.image_url;
    const up = await uploadEntityImage(sb, "categories", id, fd.get("image"));
    if (up.status === "error") {
        refreshStorefront();
        back(PATH, "error", `Category details saved. ${up.error} The existing image was kept.`);
    }
    if (up.status === "ok") {
        const { error: e2 } = await sb.from("categories").update({ image_url: up.url }).eq("id", id);
        if (e2) {
            console.error("[categories] saving image_url failed", e2.message);
            back(PATH, "error", "Category details saved, but the new image could not be attached. The existing image was kept.");
        }
        if (old && old !== up.url)
            await removeStoredImageIfUnused(sb, old);
    }
    else if (fd.get("remove_image") === "on" && old) {
        const { error: e3 } = await sb.from("categories").update({ image_url: null }).eq("id", id);
        if (e3)
            back(PATH, "error", "Could not remove the image.");
        await removeStoredImageIfUnused(sb, old);
    }
    refreshStorefront();
    back(PATH, "ok", up.status === "ok" ? "Category saved and image replaced." : "Category saved.");
}
export async function deleteCategory(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Category not found.");
    const { data: cur } = await sb.from("categories").select("image_url").eq("id", id).maybeSingle();
    const { error } = await sb.from("categories").delete().eq("id", id);
    if (error)
        back(PATH, "error", "This category can't be deleted while products use it. Move those products to another category first.");
    // The Storage file is removed only if nothing else references it (shared images are kept).
    if (cur?.image_url)
        await removeStoredImageIfUnused(sb, cur.image_url);
    refreshStorefront();
    back(PATH, "ok", "Category deleted.");
}

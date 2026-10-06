"use server";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back, refreshStorefront } from "@/lib/cms-admin";
import { removeStoredImageIfUnused, uploadEntityImage } from "@/lib/storage";
const PATH = "/admin/collections";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const order = (fd) => Math.trunc(Number(str(fd, "sort"))) || 0;
export async function createCollection(fd) {
    const sb = await requireAdmin();
    const title = str(fd, "title", 120), slug = str(fd, "slug", 120).toLowerCase();
    if (!title)
        back(PATH, "error", "Enter a collection title.");
    if (!SLUG.test(slug))
        back(PATH, "error", "Slug must use lowercase letters, numbers and single hyphens.");
    const { data, error } = await sb.from("collections").insert({ title, slug, description: str(fd, "description", 1000), sort: order(fd), published: fd.get("published") === "on" }).select("id").single();
    if (error || !data)
        back(PATH, "error", error?.code === "23505" ? "That slug is already used by another collection." : "Could not create the collection.");
    const id = data.id;
    const up = await uploadEntityImage(sb, "collections", id, fd.get("image"));
    if (up.status === "ok") {
        const { error: e2 } = await sb.from("collections").update({ image_url: up.url }).eq("id", id);
        if (e2) {
            console.error("[collections] saving image_url failed", e2.message);
            refreshStorefront();
            back(PATH, "error", "Collection created, but the image could not be attached. Edit it and upload again.");
        }
    }
    else if (up.status === "error") {
        refreshStorefront();
        back(PATH, "error", `Collection created without an image. ${up.error} You can retry by editing the collection.`);
    }
    refreshStorefront();
    back(PATH, "ok", "Collection created.");
}
export async function saveCollection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40), title = str(fd, "title", 120);
    if (!uuid(id))
        back(PATH, "error", "Collection not found.");
    if (!title)
        back(PATH, "error", "Collection title cannot be empty.");
    const { data: cur } = await sb.from("collections").select("image_url").eq("id", id).maybeSingle();
    if (!cur)
        back(PATH, "error", "Collection not found.");
    const { error } = await sb.from("collections").update({ title, description: str(fd, "description", 1000), sort: order(fd), published: fd.get("published") === "on" }).eq("id", id);
    if (error)
        back(PATH, "error", "Could not save the collection.");
    const old = cur.image_url;
    const up = await uploadEntityImage(sb, "collections", id, fd.get("image"));
    if (up.status === "error") {
        refreshStorefront();
        back(PATH, "error", `Collection details saved. ${up.error} The existing image was kept.`);
    }
    if (up.status === "ok") {
        const { error: e2 } = await sb.from("collections").update({ image_url: up.url }).eq("id", id);
        if (e2) {
            console.error("[collections] saving image_url failed", e2.message);
            back(PATH, "error", "Collection details saved, but the new image could not be attached. The existing image was kept.");
        }
        if (old && old !== up.url)
            await removeStoredImageIfUnused(sb, old);
    }
    else if (fd.get("remove_image") === "on" && old) {
        const { error: e3 } = await sb.from("collections").update({ image_url: null }).eq("id", id);
        if (e3)
            back(PATH, "error", "Could not remove the image.");
        await removeStoredImageIfUnused(sb, old);
    }
    refreshStorefront();
    back(PATH, "ok", up.status === "ok" ? "Collection saved and image replaced." : "Collection saved.");
}
export async function deleteCollection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Collection not found.");
    const { data: cur } = await sb.from("collections").select("image_url").eq("id", id).maybeSingle();
    const { error } = await sb.from("collections").delete().eq("id", id);
    if (error)
        back(PATH, "error", "Could not delete the collection.");
    if (cur?.image_url)
        await removeStoredImageIfUnused(sb, cur.image_url);
    refreshStorefront();
    back(PATH, "ok", "Collection deleted.");
}

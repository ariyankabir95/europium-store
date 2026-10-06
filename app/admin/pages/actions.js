"use server";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { uploadEntityImage } from "@/lib/storage";
import { back, moveRow, nextSort, refreshStorefront } from "@/lib/cms-admin";
import { RESERVED_SLUGS, SLUG_RE, getSectionDef, isSectionType, parseSectionContent, safeUrl, slugify } from "@/lib/cms-schema";
const LIST = "/admin/pages";
const edit = (id) => `${LIST}/${id}`;
function checkSlug(slug, isHome) {
    if (isHome)
        return null;
    if (!SLUG_RE.test(slug))
        return "URL must use lowercase letters, numbers and single hyphens (for example about-us).";
    if (RESERVED_SLUGS.has(slug))
        return `“${slug}” is used by the store itself. Choose a different URL.`;
    return null;
}
export async function createPage(fd) {
    const sb = await requireAdmin();
    const title = str(fd, "title", 120);
    if (!title)
        back(LIST, "error", "Enter a page title.");
    const slug = str(fd, "slug", 80).toLowerCase() || slugify(title);
    const bad = checkSlug(slug, false);
    if (bad)
        back(LIST, "error", bad);
    const { data, error } = await sb.from("pages").insert({ title, slug, published: false }).select("id").single();
    if (error || !data)
        back(LIST, "error", error?.code === "23505" ? "That URL is already used by another page." : "Could not create the page.");
    refreshStorefront();
    back(edit(data.id), "ok", "Page created as a draft. Add sections below, then publish.");
}
export async function updatePage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(LIST, "error", "Page not found.");
    const { data: cur } = await sb.from("pages").select("is_home,slug").eq("id", id).maybeSingle();
    if (!cur)
        back(LIST, "error", "Page not found.");
    const isHome = !!cur.is_home;
    const title = str(fd, "title", 120);
    if (!title)
        back(edit(id), "error", "Title cannot be empty.");
    const slug = isHome ? cur.slug : str(fd, "slug", 80).toLowerCase();
    const bad = checkSlug(slug, isHome);
    if (bad)
        back(edit(id), "error", bad);
    const canonicalRaw = str(fd, "canonical_url", 300);
    const canonical = canonicalRaw ? (/^https?:\/\//i.test(canonicalRaw) ? safeUrl(canonicalRaw) : null) : "";
    if (canonical === null)
        back(edit(id), "error", "Canonical URL must start with https:// (or leave it empty).");
    const { error } = await sb.from("pages").update({
        title, slug,
        seo_title: str(fd, "seo_title", 160) || null,
        seo_description: str(fd, "seo_description", 320) || null,
        canonical_url: canonical || null,
        published: isHome ? true : fd.get("published") === "on",
        hidden: isHome ? false : fd.get("hidden") === "on",
    }).eq("id", id);
    if (error)
        back(edit(id), "error", error.code === "23505" ? "That URL is already used by another page." : "Could not save the page.");
    refreshStorefront();
    back(edit(id), "ok", "Page saved.");
}
/** Quick toggles from the pages list: publish/unpublish and hide/show. */
export async function setPageFlag(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const field = str(fd, "field", 20);
    if (!uuid(id) || (field !== "published" && field !== "hidden"))
        back(LIST, "error", "Invalid request.");
    const { data: cur } = await sb.from("pages").select("is_home").eq("id", id).maybeSingle();
    if (!cur)
        back(LIST, "error", "Page not found.");
    if (cur.is_home && field === "published")
        back(LIST, "error", "The home page must stay published.");
    const { error } = await sb.from("pages").update({ [field]: str(fd, "value") === "true" }).eq("id", id);
    if (error)
        back(LIST, "error", "Could not update the page.");
    refreshStorefront();
    back(LIST, "ok", "Page updated.");
}
export async function deletePage(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(LIST, "error", "Page not found.");
    const { data: cur } = await sb.from("pages").select("is_home").eq("id", id).maybeSingle();
    if (!cur)
        back(LIST, "error", "Page not found.");
    if (cur.is_home)
        back(LIST, "error", "The home page cannot be deleted.");
    const { error } = await sb.from("pages").delete().eq("id", id);
    if (error)
        back(LIST, "error", "Could not delete the page.");
    refreshStorefront();
    back(LIST, "ok", "Page deleted. Menu or footer links that pointed to it are hidden until you relink them.");
}
export async function addSection(fd) {
    const sb = await requireAdmin();
    const pageId = str(fd, "page_id", 40);
    const type = str(fd, "type", 40);
    if (!uuid(pageId) || !isSectionType(type))
        back(LIST, "error", "Invalid section.");
    const def = getSectionDef(type);
    const sort = await nextSort(sb, "page_sections", ["page_id", pageId]);
    const { error } = await sb.from("page_sections").insert({ page_id: pageId, type, sort, active: true, content: def?.defaults ?? {} });
    if (error)
        back(edit(pageId), "error", "Could not add the section.");
    refreshStorefront();
    back(edit(pageId), "ok", `${def?.label ?? "Section"} added at the bottom. Use the arrows to move it.`);
}
export async function saveSection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(LIST, "error", "Section not found.");
    const { data: cur } = await sb.from("page_sections").select("type,page_id").eq("id", id).maybeSingle();
    if (!cur || !isSectionType(cur.type))
        back(LIST, "error", "Section not found.");
    const pageId = cur.page_id;
    const content = parseSectionContent(cur.type, fd);
    const def = getSectionDef(cur.type);
    const uploadErrors = [];
    for (const f of def?.fields ?? []) {
        if (f.kind !== "image")
            continue;
        const up = await uploadEntityImage(sb, "homepage", `sections/${id}`, fd.get(`${f.key}_file`));
        if (up.status === "ok")
            content[f.key] = up.url;
        else if (up.status === "error")
            uploadErrors.push(`${f.label}: ${up.error}`); // the URL field keeps the previous image
    }
    const { error } = await sb.from("page_sections").update({ content }).eq("id", id);
    if (error)
        back(edit(pageId), "error", "Could not save the section.");
    refreshStorefront();
    if (uploadErrors.length)
        back(edit(pageId), "error", `Section saved, but an image was not uploaded. ${uploadErrors.join(" ")} The existing image was kept.`);
    back(edit(pageId), "ok", "Section saved.");
}
export async function toggleSection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const pageId = str(fd, "page_id", 40);
    if (!uuid(id) || !uuid(pageId))
        back(LIST, "error", "Section not found.");
    const { error } = await sb.from("page_sections").update({ active: str(fd, "value") === "true" }).eq("id", id);
    if (error)
        back(edit(pageId), "error", "Could not update the section.");
    refreshStorefront();
    back(edit(pageId), "ok", "Section visibility updated.");
}
export async function moveSection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const pageId = str(fd, "page_id", 40);
    const dir = str(fd, "dir", 4);
    if (!uuid(id) || !uuid(pageId) || (dir !== "up" && dir !== "down"))
        back(LIST, "error", "Invalid request.");
    await moveRow(sb, "page_sections", id, dir, ["page_id", pageId]);
    refreshStorefront();
    back(edit(pageId), "ok", "Section moved.");
}
export async function deleteSection(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const pageId = str(fd, "page_id", 40);
    if (!uuid(id) || !uuid(pageId))
        back(LIST, "error", "Section not found.");
    const { error } = await sb.from("page_sections").delete().eq("id", id);
    if (error)
        back(edit(pageId), "error", "Could not delete the section.");
    refreshStorefront();
    back(edit(pageId), "ok", "Section deleted.");
}

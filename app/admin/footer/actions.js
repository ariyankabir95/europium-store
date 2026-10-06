"use server";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back, ensureMenu, moveRow, nextSort, refreshStorefront } from "@/lib/cms-admin";
import { parseLink } from "@/lib/cms-schema";
const PATH = "/admin/footer";
const placement = (fd) => (str(fd, "placement", 10) === "bottom" ? "bottom" : "main");
export async function saveFooterSettings(fd) {
    const sb = await requireAdmin();
    const menu = await ensureMenu(sb, "footer", "Footer settings", {});
    if (!menu)
        back(PATH, "error", "Run migration 0011_cms.sql first.");
    const settings = { ...menu.settings, about_text: str(fd, "about_text", 300), copyright_text: str(fd, "copyright_text", 200) };
    const { error } = await sb.from("navigation_menus").update({ settings }).eq("id", menu.id);
    if (error)
        back(PATH, "error", "Could not save footer text.");
    refreshStorefront();
    back(PATH, "ok", "Footer text saved.");
}
export async function addColumn(fd) {
    const sb = await requireAdmin();
    const title = str(fd, "title", 60);
    if (!title)
        back(PATH, "error", "Enter a column name.");
    const sort = await nextSort(sb, "footer_columns");
    const { error } = await sb.from("footer_columns").insert({ title, placement: placement(fd), sort, active: true });
    if (error)
        back(PATH, "error", "Could not add the column.");
    refreshStorefront();
    back(PATH, "ok", "Column added at the end.");
}
export async function saveColumn(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const title = str(fd, "title", 60);
    if (!uuid(id))
        back(PATH, "error", "Column not found.");
    if (!title)
        back(PATH, "error", "Column name cannot be empty.");
    const { error } = await sb.from("footer_columns").update({ title, placement: placement(fd), active: fd.get("active") === "on" }).eq("id", id);
    if (error)
        back(PATH, "error", "Could not save the column.");
    refreshStorefront();
    back(PATH, "ok", "Column saved.");
}
export async function moveColumn(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const dir = str(fd, "dir", 4);
    if (!uuid(id) || (dir !== "up" && dir !== "down"))
        back(PATH, "error", "Invalid request.");
    await moveRow(sb, "footer_columns", id, dir);
    refreshStorefront();
    back(PATH, "ok", "Column moved.");
}
export async function deleteColumn(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Column not found.");
    const { error } = await sb.from("footer_columns").delete().eq("id", id);
    if (error)
        back(PATH, "error", "Could not delete the column.");
    refreshStorefront();
    back(PATH, "ok", "Column and its links deleted.");
}
function readLink(fd) {
    const label = str(fd, "label", 60);
    if (!label)
        back(PATH, "error", "Enter a label for the link.");
    const link = parseLink(fd, "link");
    if (!link.target)
        back(PATH, "error", "Choose where the link goes (or enter a valid URL starting with /, https://, mailto: or tel:).");
    return { label, link_type: link.type, link_target: link.target, open_new_tab: fd.get("open_new_tab") === "on", active: fd.get("active") === "on" };
}
export async function addLink(fd) {
    const sb = await requireAdmin();
    const columnId = str(fd, "column_id", 40);
    if (!uuid(columnId))
        back(PATH, "error", "Column not found.");
    const link = readLink(fd);
    const sort = await nextSort(sb, "footer_links", ["column_id", columnId]);
    const { error } = await sb.from("footer_links").insert({ ...link, column_id: columnId, sort });
    if (error)
        back(PATH, "error", "Could not add the link.");
    refreshStorefront();
    back(PATH, "ok", "Link added at the end of the column.");
}
export async function saveLink(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Link not found.");
    const { error } = await sb.from("footer_links").update(readLink(fd)).eq("id", id);
    if (error)
        back(PATH, "error", "Could not save the link.");
    refreshStorefront();
    back(PATH, "ok", "Link saved.");
}
export async function moveLink(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const dir = str(fd, "dir", 4);
    if (!uuid(id) || (dir !== "up" && dir !== "down"))
        back(PATH, "error", "Invalid request.");
    const { data } = await sb.from("footer_links").select("column_id").eq("id", id).maybeSingle();
    if (!data)
        back(PATH, "error", "Link not found.");
    await moveRow(sb, "footer_links", id, dir, ["column_id", data.column_id]);
    refreshStorefront();
    back(PATH, "ok", "Link moved.");
}
export async function deleteLink(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Link not found.");
    const { error } = await sb.from("footer_links").delete().eq("id", id);
    if (error)
        back(PATH, "error", "Could not delete the link.");
    refreshStorefront();
    back(PATH, "ok", "Link deleted.");
}

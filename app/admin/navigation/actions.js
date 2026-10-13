"use server";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back, ensureMenu, moveRow, nextSort, refreshStorefront } from "@/lib/cms-admin";
import { parseLink } from "@/lib/cms-schema";
const PATH = "/admin/navigation";
export async function saveHeaderSettings(fd) {
    const sb = await requireAdmin();
    const menu = await ensureMenu(sb, "header", "Header & mobile menu", { logo_text: "EUROPIUM" });
    if (!menu)
        back(PATH, "error", "Run migration 0011_cms.sql first.");
    const logo = str(fd, "logo_text", 40) || "EUROPIUM";
    const { error } = await sb.from("navigation_menus").update({ settings: { ...menu.settings, logo_text: logo }, active: true }).eq("id", menu.id);
    if (error)
        back(PATH, "error", "Could not save header settings.");
    refreshStorefront();
    back(PATH, "ok", "Header settings saved.");
}
/** The announcement bar still lives in the legacy homepage_sections table (key "announcement"). */
export async function saveAnnouncement(fd) {
    const sb = await requireAdmin();
    const { data: cur } = await sb.from("homepage_sections").select("content").eq("key", "announcement").maybeSingle();
    const content = { ...(cur?.content ?? {}), title: str(fd, "title", 200) };
    const { error } = await sb.from("homepage_sections").upsert({ key: "announcement", published: fd.get("published") === "on", content });
    if (error)
        back(PATH, "error", "Could not save the announcement bar.");
    refreshStorefront();
    back(PATH, "ok", "Announcement bar saved.");
}
function readItem(fd) {
    const label = str(fd, "label", 60);
    if (!label)
        back(PATH, "error", "Enter a label for the menu item.");
    const link = parseLink(fd, "link");
    if (!link.target)
        back(PATH, "error", "Choose where the link goes (or enter a valid URL starting with /, https://, mailto: or tel:).");
    const parentRaw = str(fd, "parent_id", 40);
    if (parentRaw && !uuid(parentRaw))
        back(PATH, "error", "Choose a valid parent menu item.");
    return { label, link_type: link.type, link_target: link.target, parent_id: parentRaw || null, open_new_tab: fd.get("open_new_tab") === "on", active: fd.get("active") === "on" };
}
async function validateParent(sb, parentId, menuId, itemId = null) {
    if (!parentId) return;
    if (parentId === itemId)
        back(PATH, "error", "A menu item cannot be its own parent.");
    const { data, error } = await sb.from("navigation_items").select("id,menu_id").eq("id", parentId).maybeSingle();
    if (error || !data || data.menu_id !== menuId)
        back(PATH, "error", "Choose a parent item from this same menu.");
}
export async function addNavItem(fd) {
    const sb = await requireAdmin();
    const menu = await ensureMenu(sb, "header", "Header & mobile menu", { logo_text: "EUROPIUM" });
    if (!menu)
        back(PATH, "error", "Run migration 0011_cms.sql first.");
    const item = readItem(fd);
    await validateParent(sb, item.parent_id, menu.id);
    const sort = await nextSort(sb, "navigation_items", ["menu_id", menu.id]);
    const { error } = await sb.from("navigation_items").insert({ ...item, menu_id: menu.id, sort });
    if (error)
        back(PATH, "error", "Could not add the menu item.");
    refreshStorefront();
    back(PATH, "ok", "Menu item added at the end.");
}
export async function saveNavItem(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Menu item not found.");
    const { data: current } = await sb.from("navigation_items").select("id,menu_id").eq("id", id).maybeSingle();
    if (!current)
        back(PATH, "error", "Menu item not found.");
    const item = readItem(fd);
    await validateParent(sb, item.parent_id, current.menu_id, id);
    const { error } = await sb.from("navigation_items").update(item).eq("id", id);
    if (error) {
        const message = String(error.message ?? "");
        back(PATH, "error", message.includes("navigation_parent_cycle") ? "That parent choice would create a menu loop. Choose a different parent." : "Could not save the menu item.");
    }
    refreshStorefront();
    back(PATH, "ok", "Menu item saved.");
}
export async function moveNavItem(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    const dir = str(fd, "dir", 4);
    if (!uuid(id) || (dir !== "up" && dir !== "down"))
        back(PATH, "error", "Invalid request.");
    const { data: current } = await sb.from("navigation_items").select("menu_id,parent_id").eq("id", id).maybeSingle();
    if (!current)
        back(PATH, "error", "Menu item not found.");
    let query = sb.from("navigation_items").select("id,sort,created_at").eq("menu_id", current.menu_id);
    query = current.parent_id ? query.eq("parent_id", current.parent_id) : query.is("parent_id", null);
    const { data: siblings } = await query.order("sort", { ascending: true }).order("created_at", { ascending: true });
    const rows = siblings ?? [];
    const index = rows.findIndex((row) => row.id === id);
    const nextIndex = dir === "up" ? index - 1 : index + 1;
    if (index >= 0 && nextIndex >= 0 && nextIndex < rows.length) {
        [rows[index], rows[nextIndex]] = [rows[nextIndex], rows[index]];
        for (let i = 0; i < rows.length; i++) {
            const { error } = await sb.from("navigation_items").update({ sort: i + 1 }).eq("id", rows[i].id);
            if (error) break;
        }
    }
    refreshStorefront();
    back(PATH, "ok", "Menu item moved.");
}
export async function deleteNavItem(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back(PATH, "error", "Menu item not found.");
    const { error } = await sb.from("navigation_items").delete().eq("id", id);
    if (error)
        back(PATH, "error", "Could not delete the menu item.");
    refreshStorefront();
    back(PATH, "ok", "Menu item deleted.");
}

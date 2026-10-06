import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { VIRTUAL_CATEGORIES, ROUTES } from "@/lib/cms-schema";
/** Redirects back to an admin screen with a one-line notice (`?ok=` or `?error=`). Never returns. */
export function back(path, kind, msg) {
    redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}
/** CMS changes can affect the header and footer on every page, so refresh the whole storefront layout. */
export const refreshStorefront = () => revalidatePath("/", "layout");
/** Next free sort value (max + 1), optionally within a parent (menu / column / page). */
export async function nextSort(sb, table, scope) {
    let q = sb.from(table).select("sort").order("sort", { ascending: false }).limit(1);
    if (scope)
        q = q.eq(scope[0], scope[1]);
    const { data } = await q;
    return (data?.[0]?.sort ?? 0) + 1;
}
/** Moves one row up/down among its siblings by swapping positions, then renumbers siblings 1..n. */
export async function moveRow(sb, table, id, dir, scope) {
    let q = sb.from(table).select("id,sort").order("sort", { ascending: true }).order("created_at", { ascending: true });
    if (scope)
        q = q.eq(scope[0], scope[1]);
    const { data } = await q;
    const rows = (data ?? []);
    const i = rows.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length)
        return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    for (let k = 0; k < rows.length; k++) {
        const { error } = await sb.from(table).update({ sort: k + 1 }).eq("id", rows[k].id);
        if (error)
            break;
    }
}
/** Option lists for the link pickers and product/category pickers in the editors. */
export async function loadLookups(sb) {
    const [pg, pr, ca, co] = await Promise.all([
        sb.from("pages").select("id,title,slug,is_home").order("title"),
        sb.from("products").select("slug,name").order("name"),
        sb.from("categories").select("slug,name").order("sort"),
        sb.from("collections").select("slug,title").order("sort"),
    ]);
    return {
        pages: (pg.data ?? []).map((p) => [p.id, `${p.title} (${p.is_home ? "/" : "/" + p.slug})`]),
        products: (pr.data ?? []).map((p) => [p.slug, p.name]),
        categories: [...VIRTUAL_CATEGORIES.map(([s, n]) => [s, n]), ...(ca.data ?? []).map((c) => [c.slug, c.name])],
        collections: (co.data ?? []).map((c) => [c.slug, c.title]),
        routes: ROUTES.map(([r, l]) => [r, `${l} (${r})`]),
    };
}
/** Returns the id of a navigation menu row, creating it (admin only, via RLS) if the seed has not created it. */
export async function ensureMenu(sb, key, name, settings) {
    const { data } = await sb.from("navigation_menus").select("id,settings").eq("key", key).maybeSingle();
    if (data)
        return { id: data.id, settings: (data.settings ?? {}) };
    const { data: created } = await sb.from("navigation_menus").insert({ key, name, settings }).select("id,settings").single();
    return created ? { id: created.id, settings: (created.settings ?? {}) } : null;
}

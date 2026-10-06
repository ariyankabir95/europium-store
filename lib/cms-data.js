import "server-only";
import { cache } from "react";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { isLinkType, isSectionType, resolveLink } from "@/lib/cms-schema";
import { normalizeImageUrl } from "@/lib/images";
import { FALLBACK_FOOTER, FALLBACK_HEADER } from "@/lib/cms-fallback";
const PAGE_COLS = "id,title,slug,is_home,published,hidden,seo_title,seo_description,canonical_url";
// ───────────── link context ─────────────
export const getLinkCtx = cache(async () => {
    const pages = new Map();
    if (!hasSupabase())
        return { pages };
    try {
        const { data } = await (await supabaseServer()).from("pages").select("id,slug,is_home").eq("published", true);
        (data ?? []).forEach((p) => pages.set(p.id, { slug: p.slug, is_home: !!p.is_home }));
    }
    catch { /* empty map: page links simply resolve to nothing */ }
    return { pages };
});
// ───────────── viewer ─────────────
/** True when the current visitor is a signed-in admin (used only to allow draft previews). */
export const viewerIsAdmin = cache(async () => {
    if (!hasSupabase())
        return false;
    try {
        const sb = await supabaseServer();
        const { data: { user } } = await sb.auth.getUser();
        if (!user)
            return false;
        const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
        return p?.role === "admin";
    }
    catch {
        return false;
    }
});
// ───────────── pages ─────────────
async function loadSections(pageId) {
    const { data } = await (await supabaseServer()).from("page_sections").select("id,type,sort,content").eq("page_id", pageId).eq("active", true).order("sort", { ascending: true });
    return (data ?? [])
        .filter((s) => isSectionType(s.type))
        .map((s) => ({ id: s.id, type: s.type, sort: s.sort, content: (s.content && typeof s.content === "object" ? s.content : {}) }));
}
/** `preview` lets a signed-in admin open an unpublished draft. Everyone else only ever gets published pages. */
export const getPageBySlug = cache(async (slug, preview = false) => {
    if (!hasSupabase())
        return null;
    try {
        let q = (await supabaseServer()).from("pages").select(PAGE_COLS).eq("slug", slug);
        if (!preview)
            q = q.eq("published", true);
        const { data: page } = await q.maybeSingle();
        if (!page)
            return null;
        return { page: page, sections: await loadSections(page.id) };
    }
    catch {
        return null;
    }
});
/**
 * The CMS home page, or null when it is missing, unavailable, or has no visible sections.
 * In those cases the caller renders the original built-in homepage, so the storefront can never go blank.
 */
export const getHomePage = cache(async () => {
    if (!hasSupabase())
        return null;
    try {
        const { data: page } = await (await supabaseServer()).from("pages").select(PAGE_COLS).eq("is_home", true).eq("published", true).maybeSingle();
        if (!page)
            return null;
        const sections = await loadSections(page.id);
        return sections.length ? { page: page, sections } : null;
    }
    catch {
        return null;
    }
});
export async function getSitemapPages() {
    if (!hasSupabase())
        return [];
    try {
        const { data } = await (await supabaseServer()).from("pages").select("slug,updated_at").eq("published", true).eq("hidden", false).eq("is_home", false);
        return (data ?? []).map((p) => ({ slug: p.slug, updated: p.updated_at ?? null }));
    }
    catch {
        return [];
    }
}
// ───────────── navigation ─────────────
export const getHeader = cache(async () => {
    if (!hasSupabase())
        return FALLBACK_HEADER;
    try {
        const sb = await supabaseServer();
        const { data: menu } = await sb.from("navigation_menus").select("id,settings").eq("key", "header").eq("active", true).maybeSingle();
        if (!menu)
            return FALLBACK_HEADER;
        const [{ data: rows, error }, ctx] = await Promise.all([
            sb.from("navigation_items").select("id,label,link_type,link_target,open_new_tab").eq("menu_id", menu.id).eq("active", true).order("sort", { ascending: true }),
            getLinkCtx(),
        ]);
        if (error || !rows)
            return FALLBACK_HEADER;
        const items = rows.flatMap((r) => {
            const href = isLinkType(r.link_type) ? resolveLink({ type: r.link_type, target: String(r.link_target ?? "") }, ctx) : null;
            return href ? [{ id: r.id, label: String(r.label), href, newTab: !!r.open_new_tab }] : [];
        });
        const logo = menu.settings?.logo_text?.trim();
        return { logoText: logo || FALLBACK_HEADER.logoText, items: items.length ? items : FALLBACK_HEADER.items };
    }
    catch {
        return FALLBACK_HEADER;
    }
});
// ───────────── footer ─────────────
export const getFooter = cache(async () => {
    if (!hasSupabase())
        return FALLBACK_FOOTER;
    try {
        const sb = await supabaseServer();
        const [cols, links, menu, ctx] = await Promise.all([
            sb.from("footer_columns").select("id,title,placement").eq("active", true).order("sort", { ascending: true }),
            sb.from("footer_links").select("id,column_id,label,link_type,link_target,open_new_tab").eq("active", true).order("sort", { ascending: true }),
            sb.from("navigation_menus").select("settings").eq("key", "footer").eq("active", true).maybeSingle(),
            getLinkCtx(),
        ]);
        if (cols.error || links.error || !cols.data)
            return FALLBACK_FOOTER;
        const byCol = new Map();
        (links.data ?? []).forEach((l) => {
            const href = isLinkType(l.link_type) ? resolveLink({ type: l.link_type, target: String(l.link_target ?? "") }, ctx) : null;
            if (!href)
                return;
            const arr = byCol.get(l.column_id) ?? [];
            arr.push({ id: l.id, label: String(l.label), href, newTab: !!l.open_new_tab });
            byCol.set(l.column_id, arr);
        });
        const s = (menu.data?.settings ?? {});
        const text = { aboutText: s.about_text ?? FALLBACK_FOOTER.aboutText, copyrightText: s.copyright_text ?? "" };
        // No columns configured at all: keep the built-in columns so the footer is never empty.
        if (cols.data.length === 0)
            return { ...FALLBACK_FOOTER, ...text };
        return {
            ...text,
            columns: cols.data.filter((c) => c.placement !== "bottom").map((c) => ({ id: c.id, title: String(c.title), links: byCol.get(c.id) ?? [] })).filter((c) => c.links.length > 0),
            bottom: cols.data.filter((c) => c.placement === "bottom").flatMap((c) => byCol.get(c.id) ?? []),
        };
    }
    catch {
        return FALLBACK_FOOTER;
    }
});
export const getCollections = cache(async () => {
    if (!hasSupabase())
        return [];
    try {
        const { data } = await (await supabaseServer()).from("collections").select("slug,title,description,image_url").eq("published", true).order("sort", { ascending: true });
        return (data ?? []).map((c) => ({ slug: c.slug, title: c.title, description: c.description ?? "", image_url: normalizeImageUrl(c.image_url) }));
    }
    catch {
        return [];
    }
});

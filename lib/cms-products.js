import "server-only";
import { getProducts } from "@/lib/catalog";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { cList, cNum, cStr } from "@/lib/cms-schema";
/** Mirrors the grouping used by app/category/[slug]: clothing = everything except accessories, footwear = nothing yet. */
export const categoryMatches = (slug, productCategory) => slug === "clothing" ? productCategory !== "accessories" : slug === "footwear" ? false : productCategory === slug;
async function collectionSlugs(slug) {
    if (!hasSupabase() || !slug)
        return new Set();
    try {
        const sb = await supabaseServer();
        const { data: c } = await sb.from("collections").select("id").eq("slug", slug).eq("published", true).maybeSingle();
        if (!c)
            return new Set();
        const { data: cp } = await sb.from("collection_products").select("products(slug)").eq("collection_id", c.id);
        return new Set((cp ?? []).map((r) => r.products?.slug).filter((s) => !!s));
    }
    catch {
        return new Set();
    }
}
/** Product Grid: picks products by the configured source. Uses the existing catalog, so prices/variants/stock are untouched. */
export async function selectProducts(c) {
    const all = await getProducts();
    const limit = Math.min(24, Math.max(1, cNum(c, "limit", 4)));
    const source = cStr(c, "source", "newest");
    let list;
    switch (source) {
        case "best":
            list = all.some((p) => p.badge === "BESTSELLER") ? all.filter((p) => p.badge === "BESTSELLER") : [...all].sort((a, b) => b.sold - a.sold);
            break;
        case "trending":
            list = [...all].sort((a, b) => b.sold - a.sold);
            break;
        case "sale":
            list = all.filter((p) => p.salePrice);
            break;
        case "all":
            list = all;
            break;
        case "category": {
            const s = cStr(c, "category_slug");
            list = s ? all.filter((p) => categoryMatches(s, p.category)) : [];
            break;
        }
        case "collection": {
            const set = await collectionSlugs(cStr(c, "collection_slug"));
            list = all.filter((p) => set.has(p.slug));
            break;
        }
        default: list = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list.slice(0, limit);
}
/** Featured Products: the hand-picked slugs, in catalogue order. Unpublished/deleted products drop out silently. */
export async function pickProducts(c) {
    const slugs = new Set(cList(c, "product_slugs"));
    if (!slugs.size)
        return [];
    return (await getProducts()).filter((p) => slugs.has(p.slug));
}

import { getProducts, getCategories } from "@/lib/catalog";
import { getSitemapPages } from "@/lib/cms-data";
export default async function sitemap() {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
    const [products, categories, pages] = await Promise.all([getProducts(), getCategories(), getSitemapPages()]);
    return [
        ...["", "/shop", "/sale", "/lookbook", "/about", "/contact"].map((p) => ({ url: base + p })),
        // Published, non-hidden CMS pages only. Drafts and hidden (unlisted) pages never appear here.
        ...pages.map((p) => ({ url: `${base}/${p.slug}`, ...(p.updated ? { lastModified: new Date(p.updated) } : {}) })),
        ...categories.map((c) => ({ url: `${base}/category/${c.slug}` })),
        ...products.map((p) => ({ url: `${base}/product/${p.slug}` })),
    ];
}

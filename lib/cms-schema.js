/*
 * CMS schema shared by the storefront renderers and the admin editors.
 * Pure TypeScript: no server-only imports, safe to import from client components.
 */
export const LINK_TYPES = [
    ["route", "Store page"],
    ["page", "CMS page"],
    ["category", "Category"],
    ["collection", "Collection"],
    ["product", "Product"],
    ["custom", "Custom URL"],
];
/** Built-in storefront routes that are real Next.js pages (not CMS pages). */
export const ROUTES = [
    ["/", "Home"],
    ["/shop", "Shop"],
    ["/sale", "Sale"],
    ["/lookbook", "Lookbook"],
    ["/about", "Our story (About)"],
    ["/contact", "Contact"],
    ["/search", "Search"],
    ["/wishlist", "Wishlist"],
    ["/cart", "Cart"],
    ["/account", "Account"],
];
/** Category slugs that the category route handles virtually in addition to database categories. */
export const VIRTUAL_CATEGORIES = [
    ["clothing", "Clothing (all clothing)"],
    ["footwear", "Footwear"],
];
export const isLinkType = (v) => LINK_TYPES.some(([t]) => t === v);
/** Only allows same-site paths, anchors, http(s), mailto and tel. Blocks javascript:, data:, protocol-relative URLs, etc. */
export function safeUrl(u) {
    const v = u.trim();
    if (!v)
        return null;
    if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\"))
        return v;
    if (v.startsWith("#"))
        return v;
    if (/^https?:\/\/[^\s]+$/i.test(v))
        return v;
    if (/^mailto:[^\s]+$/i.test(v) || /^tel:[+0-9()\-\s]+$/i.test(v))
        return v;
    return null;
}
/** Image sources: https URL or a site-relative path. */
export function safeImage(u) {
    const v = u.trim();
    if (/^https?:\/\/[^\s]+$/i.test(v))
        return v;
    if (v.startsWith("/") && !v.startsWith("//"))
        return v;
    return "";
}
export const isExternal = (href) => /^(https?:|mailto:|tel:)/i.test(href);
// ───────────────────────── slugs ─────────────────────────
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const ITEM_SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
/** First URL segments that already belong to the application. CMS pages may not use them. */
export const RESERVED_SLUGS = new Set([
    "admin", "api", "auth", "login", "account", "cart", "checkout", "shop", "sale", "lookbook", "about", "contact", "search", "wishlist",
    "category", "collection", "product", "products", "categories", "collections", "sitemap", "sitemap-xml", "robots", "robots-txt",
    "home", "error", "loading", "not-found", "favicon", "next", "static", "public",
]);
export function slugify(input) {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}
const TONES = [["warm", "Light (page background)"], ["cream", "Cream"], ["sand", "Sand"]];
const title = (help) => ({ key: "title", label: "Title", kind: "textarea", max: 300, help: help ?? "Press Enter for a line break." });
const body = (label = "Text", max = 2000) => ({ key: "body", label, kind: "textarea", max });
const cta = () => [
    { key: "cta_label", label: "Button label", kind: "text", max: 60, help: "Leave empty to hide the button." },
    { key: "cta", label: "Button link", kind: "link" },
];
const tone = () => ({ key: "tone", label: "Background", kind: "select", options: TONES, fallback: "warm" });
export const SECTION_DEFS = [
    {
        type: "hero", label: "Hero", description: "Large full-width banner with headline and up to two buttons.",
        fields: [
            title(), body("Subtitle", 400),
            { key: "image_url", label: "Background image", kind: "image" },
            ...cta(),
            { key: "cta2_label", label: "Second button label", kind: "text", max: 60, help: "Leave empty to hide." },
            { key: "cta2", label: "Second button link", kind: "link" },
            { key: "height", label: "Height", kind: "select", options: [["full", "Full screen"], ["tall", "Tall"], ["medium", "Medium"]], fallback: "full" },
        ],
        defaults: { title: "Your headline", body: "", cta_label: "Shop Now", cta_type: "route", cta_target: "/shop", height: "full" },
    },
    {
        type: "text", label: "Text", description: "A heading with plain paragraphs.",
        fields: [title(), body("Paragraphs", 5000), { key: "align", label: "Alignment", kind: "select", options: [["left", "Left"], ["center", "Center"]], fallback: "left" }, { key: "width", label: "Width", kind: "select", options: [["narrow", "Narrow"], ["normal", "Normal"]], fallback: "narrow" }, tone()],
        defaults: { title: "Heading", body: "Write your text here.", align: "left", width: "narrow", tone: "warm" },
    },
    {
        type: "image_text", label: "Image + Text", description: "Image beside a heading, text and optional button.",
        fields: [
            title(), body(),
            { key: "image_url", label: "Image", kind: "image" },
            { key: "image_alt", label: "Image description (alt text)", kind: "text", max: 200 },
            ...cta(),
            { key: "flip", label: "Image on the right", kind: "checkbox" },
            tone(),
        ],
        defaults: { title: "Heading", body: "Describe this section.", cta_label: "", flip: false, tone: "warm" },
    },
    {
        type: "image", label: "Image", description: "A single image with optional caption and link.",
        fields: [
            { key: "image_url", label: "Image", kind: "image" },
            { key: "image_alt", label: "Image description (alt text)", kind: "text", max: 200 },
            { key: "caption", label: "Caption", kind: "text", max: 300 },
            { key: "link", label: "Link (optional)", kind: "link" },
            { key: "width", label: "Width", kind: "select", options: [["contained", "Contained"], ["full", "Full width"]], fallback: "contained" },
            { key: "aspect", label: "Shape", kind: "select", options: [["auto", "Original"], ["16/9", "Wide 16:9"], ["21/9", "Panorama 21:9"], ["4/5", "Portrait 4:5"], ["1/1", "Square"]], fallback: "auto" },
        ],
        defaults: { width: "contained", aspect: "auto" },
    },
    {
        type: "product_grid", label: "Product Grid", description: "Automatic grid of products (newest, best sellers, sale, a category…).",
        fields: [
            { key: "title", label: "Title", kind: "text", max: 120 },
            { key: "source", label: "Products to show", kind: "select", options: [["newest", "Newest"], ["best", "Best sellers"], ["trending", "Trending"], ["sale", "On sale"], ["all", "All products"], ["category", "From a category"], ["collection", "From a collection"]], fallback: "newest" },
            { key: "category_slug", label: "Category (when source is category)", kind: "category" },
            { key: "collection_slug", label: "Collection (when source is collection)", kind: "collection" },
            { key: "limit", label: "How many", kind: "number", min: 1, max: 24, fallback: 4 },
            { key: "view_all", label: "“View all” link", kind: "link" },
        ],
        defaults: { title: "New Arrivals", source: "newest", limit: 4, view_all_type: "route", view_all_target: "/shop" },
    },
    {
        type: "featured_products", label: "Featured Products", description: "Products you pick by hand.",
        fields: [
            { key: "title", label: "Title", kind: "text", max: 120 },
            { key: "product_slugs", label: "Products", kind: "products", help: "Tick the products to feature. They show in the catalogue order." },
            { key: "view_all", label: "“View all” link", kind: "link" },
        ],
        defaults: { title: "Featured", product_slugs: [], view_all_type: "route", view_all_target: "/shop" },
    },
    {
        type: "category_grid", label: "Category Grid", description: "Image tiles linking to categories.",
        fields: [
            { key: "title", label: "Title", kind: "text", max: 120 },
            { key: "category_slugs", label: "Categories", kind: "categories", help: "Leave all unticked to show every category." },
        ],
        defaults: { title: "Shop by category", category_slugs: [] },
    },
    {
        type: "collection_grid", label: "Collection Grid", description: "Image tiles linking to collections.",
        fields: [
            { key: "title", label: "Title", kind: "text", max: 120 },
            { key: "collection_slugs", label: "Collections", kind: "collections", help: "Leave all unticked to show every collection." },
        ],
        defaults: { title: "Collections", collection_slugs: [] },
    },
    {
        type: "promo_banner", label: "Promo Banner", description: "Bold banner for an offer, with optional background image.",
        fields: [
            title(), body("Text", 500),
            { key: "image_url", label: "Background image (optional)", kind: "image" },
            ...cta(),
            { key: "tone", label: "Background colour", kind: "select", options: [["charcoal", "Dark"], ["cream", "Cream"], ["sand", "Sand"]], fallback: "charcoal" },
        ],
        defaults: { title: "Limited offer", body: "", cta_label: "Shop now", cta_type: "route", cta_target: "/sale", tone: "charcoal" },
    },
    {
        type: "rich_text", label: "Rich Text", description: "Formatted content: headings, bold, italic, lists and links.",
        fields: [
            { key: "title", label: "Title (optional)", kind: "text", max: 200 },
            { key: "body", label: "Content", kind: "textarea", max: 20000, help: "Formatting: # Heading, ## Subheading, **bold**, *italic*, [link text](/url), lines starting with - for bullet lists. Blank line = new paragraph." },
            { key: "width", label: "Width", kind: "select", options: [["narrow", "Narrow"], ["normal", "Normal"]], fallback: "narrow" },
            tone(),
        ],
        defaults: { title: "", body: "## Heading\n\nWrite **formatted** content here.", width: "narrow", tone: "warm" },
    },
    {
        type: "cta", label: "CTA", description: "Centered call-to-action with one button.",
        fields: [
            title(), body("Text", 500), ...cta(),
            { key: "style", label: "Button style", kind: "select", options: [["dark", "Solid dark"], ["line", "Outline"]], fallback: "dark" },
            tone(),
        ],
        defaults: { title: "Ready to explore?", body: "", cta_label: "Shop now", cta_type: "route", cta_target: "/shop", style: "dark", tone: "warm" },
    },
    {
        type: "newsletter", label: "Newsletter", description: "Email signup (uses the existing newsletter form).",
        fields: [{ key: "title", label: "Title", kind: "text", max: 120 }, body("Text", 300)],
        defaults: { title: "Stay in Style", body: "Get updates on new arrivals, collections and private offers." },
    },
    {
        type: "spacer", label: "Spacer", description: "Empty vertical space between sections.",
        fields: [{ key: "height", label: "Height", kind: "select", options: [["sm", "Small"], ["md", "Medium"], ["lg", "Large"]], fallback: "md" }],
        defaults: { height: "md" },
    },
];
export const SECTION_TYPES = SECTION_DEFS.map((d) => d.type);
export const isSectionType = (v) => SECTION_TYPES.includes(v);
export const getSectionDef = (t) => SECTION_DEFS.find((d) => d.type === t);
export const cStr = (c, k, d = "") => (typeof c[k] === "string" ? c[k] : d);
export const cNum = (c, k, d) => (typeof c[k] === "number" && Number.isFinite(c[k]) ? c[k] : d);
export const cBool = (c, k) => c[k] === true;
export const cList = (c, k) => (Array.isArray(c[k]) ? c[k].filter((x) => typeof x === "string") : []);
export const cLink = (c, k) => {
    const t = c[`${k}_type`];
    const v = c[`${k}_target`];
    return isLinkType(t) && typeof v === "string" && v ? { type: t, target: v } : null;
};
const text = (fd, k, max) => String(fd.get(k) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
/** Reads a link control (`<name>_type` + `<name>_target`) and validates it. */
export function parseLink(fd, name) {
    const t = String(fd.get(`${name}_type`) ?? "");
    const type = isLinkType(t) ? t : "custom";
    const raw = text(fd, `${name}_target`, 500);
    let target = "";
    if (type === "custom")
        target = safeUrl(raw) ?? "";
    else if (type === "route")
        target = ROUTES.some(([r]) => r === raw) ? raw : "";
    else if (type === "page")
        target = /^[0-9a-f-]{36}$/i.test(raw) ? raw : "";
    else
        target = ITEM_SLUG_RE.test(raw) ? raw : "";
    return { type, target };
}
const slugList = (fd, k) => fd.getAll(k).map((v) => String(v)).filter((v) => ITEM_SLUG_RE.test(v)).slice(0, 48);
/** Builds a clean `content` object for a section from submitted form data. Unknown keys are dropped. */
export function parseSectionContent(type, fd) {
    const def = getSectionDef(type);
    const out = {};
    if (!def)
        return out;
    for (const f of def.fields) {
        switch (f.kind) {
            case "text":
                out[f.key] = text(fd, f.key, f.max ?? 200);
                break;
            case "textarea":
                out[f.key] = text(fd, f.key, f.max ?? 2000);
                break;
            case "image":
                out[f.key] = safeImage(text(fd, f.key, 600));
                break;
            case "select": {
                const v = text(fd, f.key, 40);
                out[f.key] = f.options?.some(([o]) => o === v) ? v : String(f.fallback ?? f.options?.[0]?.[0] ?? "");
                break;
            }
            case "number": {
                const n = Number(text(fd, f.key, 12));
                const lo = f.min ?? 0;
                const hi = f.max ?? 100;
                out[f.key] = Number.isFinite(n) && text(fd, f.key, 12) !== "" ? Math.min(hi, Math.max(lo, Math.round(n))) : Number(f.fallback ?? lo);
                break;
            }
            case "checkbox":
                out[f.key] = fd.get(f.key) === "on";
                break;
            case "link": {
                const l = parseLink(fd, f.key);
                out[`${f.key}_type`] = l.type;
                out[`${f.key}_target`] = l.target;
                break;
            }
            case "products":
            case "categories":
            case "collections":
                out[f.key] = slugList(fd, f.key);
                break;
            case "category":
            case "collection": {
                const v = text(fd, f.key, 120);
                out[f.key] = ITEM_SLUG_RE.test(v) ? v : "";
                break;
            }
        }
    }
    return out;
}
const seg = (v) => (ITEM_SLUG_RE.test(v) ? encodeURIComponent(v) : null);
/** Turns a stored link (type + target) into a URL. Returns null when the target is missing, unpublished or unsafe. */
export function resolveLink(ref, ctx) {
    if (!ref || !ref.target)
        return null;
    switch (ref.type) {
        case "page": {
            const p = ctx.pages.get(ref.target);
            return p ? (p.is_home ? "/" : `/${p.slug}`) : null;
        }
        case "product": {
            const s = seg(ref.target);
            return s ? `/product/${s}` : null;
        }
        case "category": {
            const s = seg(ref.target);
            return s ? `/category/${s}` : null;
        }
        case "collection": {
            const s = seg(ref.target);
            return s ? `/collection/${s}` : null;
        }
        case "route": return ROUTES.some(([r]) => r === ref.target) ? ref.target : safeUrl(ref.target);
        case "custom": return safeUrl(ref.target);
        default: return null;
    }
}

/** Query parameter that carries a pending "add to cart" through the email-confirmation redirect. It holds no cart data of its own: it only lets the page finish the add once the visitor is signed in. */
export const PENDING_PARAM = "cart_add";
/** Strict shape check for a cart line that came from outside (URL). The server validates it again. */
export function toCartLine(v) {
    if (!v || typeof v !== "object")
        return null;
    const o = v;
    const qty = typeof o.qty === "number" ? Math.trunc(o.qty) : NaN;
    if (typeof o.productId !== "string" || typeof o.size !== "string" || typeof o.color !== "string")
        return null;
    if (!o.productId || o.productId.length > 200 || !o.size || o.size.length > 10 || !o.color || o.color.length > 40)
        return null;
    if (!(qty >= 1 && qty <= 10))
        return null;
    return { productId: o.productId, size: o.size, color: o.color, qty };
}
/** Adds the pending add-to-cart to a same-site return path so it survives the email-confirmation round trip. */
export function withPending(path, line) {
    if (!line)
        return path;
    const u = new URL(path, "http://local.invalid");
    u.searchParams.set(PENDING_PARAM, JSON.stringify(line));
    return `${u.pathname}${u.search}${u.hash}`;
}
export function readPendingFromUrl(href) {
    const u = new URL(href);
    const raw = u.searchParams.get(PENDING_PARAM);
    if (raw === null)
        return null;
    u.searchParams.delete(PENDING_PARAM);
    let line = null;
    try {
        line = toCartLine(JSON.parse(raw));
    }
    catch {
        line = null;
    }
    return { line, cleanPath: `${u.pathname}${u.search}${u.hash}` };
}

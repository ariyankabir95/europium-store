/*
 * Central image helpers. Pure TypeScript with no server-only imports, so it is safe in client components,
 * server components and server actions alike.
 */
/** The existing Storage buckets (created in migration 0006). No new buckets are introduced. */
export const STORAGE_BUCKETS = ["products", "categories", "collections", "homepage", "lookbook"];
export const isBucket = (v) => STORAGE_BUCKETS.includes(v);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
export const IMAGE_ERROR = "Please select a JPG, PNG, or WEBP image under 5 MB.";
/** Quick client/server pre-check on the declared type and size. Returns an error message, or null when OK. */
export function validateImageFile(f) {
    if (!f.size)
        return IMAGE_ERROR;
    if (f.size > MAX_IMAGE_BYTES)
        return IMAGE_ERROR;
    if (!ALLOWED_IMAGE_TYPES.includes(f.type))
        return IMAGE_ERROR;
    return null;
}
/**
 * Accepts only absolute http(s) URLs or site-relative paths and returns them UNCHANGED (nothing is ever prepended
 * to an already absolute Supabase URL). Anything else (null, "", javascript:, garbage) becomes null.
 */
export function normalizeImageUrl(u) {
    if (typeof u !== "string")
        return null;
    const v = u.trim();
    if (!v)
        return null;
    if (/^https?:\/\/[^\s]+$/i.test(v))
        return v;
    if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\"))
        return v;
    return null;
}
/** Hostname of this project's Supabase instance (from NEXT_PUBLIC_SUPABASE_URL), or null. */
export function supabaseHost() {
    try {
        return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
    }
    catch {
        return null;
    }
}
const PUBLIC_PATH = /\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?.*)?$/;
/** If `url` is a public URL of THIS project's Storage, returns its bucket and object path. Otherwise null. */
export function parseStorageUrl(url) {
    const v = normalizeImageUrl(url);
    const host = supabaseHost();
    if (!v || !host)
        return null;
    try {
        const u = new URL(v);
        if (u.hostname !== host)
            return null;
        const m = PUBLIC_PATH.exec(u.pathname + u.search);
        return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
    }
    catch {
        return null;
    }
}
/** True when next/image may optimise this URL (it is on the configured Supabase host). Everything else uses a plain <img>. */
export function isOptimizableImageUrl(url) {
    const host = supabaseHost();
    if (!host || !/^https:\/\//i.test(url))
        return false;
    try {
        return new URL(url).hostname === host && !/\.(gif|svg)(\?|$)/i.test(url);
    }
    catch {
        return false;
    }
}

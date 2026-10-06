import "server-only";
import { isBucket, parseStorageUrl, validateImageFile, IMAGE_ERROR } from "@/lib/images";
const KINDS = {
    jpeg: { mime: "image/jpeg", ext: "jpg" },
    png: { mime: "image/png", ext: "png" },
    webp: { mime: "image/webp", ext: "webp" },
};
/** Detects the real image type from the file's first bytes, so a renamed or spoofed file is rejected. */
async function sniff(f) {
    const b = new Uint8Array(await f.slice(0, 12).arrayBuffer());
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
        return KINDS.jpeg;
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
        return KINDS.png;
    if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
        return KINDS.webp;
    return null;
}
/** Folder names are built from ids we control; this makes sure nothing unexpected ever reaches a Storage path. */
const safeFolder = (s) => (/^[A-Za-z0-9_\-/]{1,120}$/.test(s) && !s.includes("..") ? s : "general");
/**
 * Uploads ONE image to an existing bucket at `{folder}/{random-uuid}.{ext}` (the original filename is never used).
 * Never throws and never touches the database: the caller decides what to save. Failures are logged for developers
 * (without secrets) and returned as a short, admin-friendly message.
 */
export async function uploadEntityImage(sb, bucket, folder, file) {
    if (!(file instanceof File) || file.size === 0)
        return { status: "none" };
    if (validateImageFile(file))
        return { status: "error", error: IMAGE_ERROR };
    const kind = await sniff(file);
    if (!kind)
        return { status: "error", error: IMAGE_ERROR };
    const path = `${safeFolder(folder)}/${crypto.randomUUID()}.${kind.ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: kind.mime, cacheControl: "31536000", upsert: false });
    if (error) {
        console.error("[storage] upload failed", { bucket, path, size: file.size, message: error.message });
        const m = error.message.toLowerCase();
        const why = m.includes("row-level security") || m.includes("unauthorized") || m.includes("not authorized")
            ? "Your account is not allowed to upload (admin only)."
            : m.includes("bucket not found")
                ? `The "${bucket}" storage bucket does not exist. Run migration 0006_fixes_storage.sql.`
                : m.includes("exceeded") || m.includes("too large")
                    ? "The file is too large for the storage limits."
                    : "The storage service rejected the file.";
        return { status: "error", error: `Image upload failed. ${why}` };
    }
    return { status: "ok", url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl, path };
}
// ───────────────────────── reference checks (delete safety) ─────────────────────────
const SOURCES = [
    { label: "a category", table: "categories", col: "image_url" },
    { label: "a collection", table: "collections", col: "image_url" },
    { label: "a product", table: "product_images", col: "url" },
    { label: "a lookbook item", table: "lookbook_items", col: "image_url" },
    { label: "a CMS page section", table: "page_sections", col: "content->>image_url" },
    { label: "a homepage block", table: "homepage_sections", col: "content->>image_url" },
];
/**
 * Where is this exact Storage object still referenced? Returns the list of places (empty = unused), or `null`
 * when it could NOT be determined (a query failed). Callers must treat null as "in use".
 */
export async function findImageReferences(sb, bucket, path) {
    const pattern = `%/storage/v1/object/public/${bucket}/${path}%`;
    const used = [];
    for (const s of SOURCES) {
        const { data, error } = await sb.from(s.table).select("id:" + (s.table === "homepage_sections" ? "key" : "id")).like(s.col, pattern).limit(1);
        if (error) {
            console.error("[storage] reference check failed", { table: s.table, message: error.message });
            return null;
        }
        if (data && data.length)
            used.push(s.label);
    }
    return used;
}
/**
 * Deletes the Storage file behind `url` ONLY when it is one of this project's own uploads and nothing references it
 * any more. Anything uncertain keeps the file: data safety beats automatic cleanup.
 */
export async function removeStoredImageIfUnused(sb, url) {
    const ref = parseStorageUrl(url);
    if (!ref || !isBucket(ref.bucket))
        return "kept";
    const refs = await findImageReferences(sb, ref.bucket, ref.path);
    if (refs === null || refs.length > 0)
        return "kept";
    const { error } = await sb.storage.from(ref.bucket).remove([ref.path]);
    if (error) {
        console.error("[storage] remove failed", { bucket: ref.bucket, path: ref.path, message: error.message });
        return "kept";
    }
    return "deleted";
}
/** Map of "bucket/path" -> places using it, for the Media Library "In use" labels. Best effort (PostgREST caps rows). */
export async function loadReferenceIndex(sb) {
    const out = new Map();
    for (const s of SOURCES) {
        const col = s.col.includes("->>") ? `image_url:${s.col}` : s.col;
        const { data, error } = await sb.from(s.table).select(col).limit(1000);
        if (error || !data)
            continue;
        for (const row of data) {
            const ref = parseStorageUrl(Object.values(row)[0]);
            if (!ref)
                continue;
            const key = `${ref.bucket}/${ref.path}`;
            const arr = out.get(key) ?? [];
            if (!arr.includes(s.label))
                arr.push(s.label);
            out.set(key, arr);
        }
    }
    return out;
}

import "server-only";
/** The authenticated user's cart (server source of truth). Row-level security also restricts every row to its owner. */
export async function readCart(sb, userId) {
    const { data } = await sb
        .from("cart_items")
        .select("size,color,qty,created_at,products(slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
    const lines = [];
    for (const r of data ?? []) {
        const p = r.products;
        if (p?.slug)
            lines.push({ productId: p.slug, size: String(r.size), color: String(r.color), qty: Number(r.qty) });
    }
    return lines;
}

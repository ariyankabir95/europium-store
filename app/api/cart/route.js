import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { readCart } from "@/lib/cart-server";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const guest = () => NextResponse.json({ error: "guest" }, { status: 401, headers: noStore });
const s = (v, max) => String(v ?? "").trim().slice(0, max);
async function ctx() {
    if (!hasSupabase())
        return null;
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    return user ? { sb, user } : null;
}
function parseLine(v) {
    if (!v || typeof v !== "object")
        return null;
    const o = v;
    const item = { productId: s(o.productId, 200), size: s(o.size, 10), color: s(o.color, 40), qty: Math.trunc(Number(o.qty)) };
    return item.productId && item.size && item.color && item.qty >= 1 && item.qty <= 10 ? item : null;
}
const isItemOp = (v) => v === "add" || v === "setQty" || v === "remove";
function parseMutation(b) {
    if (!b || typeof b !== "object")
        return null;
    const o = b;
    if (o.op === "clear")
        return { op: "clear" };
    const op = o.op;
    if (!isItemOp(op))
        return null;
    const item = parseLine(o.item);
    return item ? { op, item } : null;
}
export async function GET() {
    const c = await ctx();
    if (!c)
        return guest();
    try {
        return NextResponse.json({ items: await readCart(c.sb, c.user.id) }, { headers: noStore });
    } catch {
        return NextResponse.json({ error: "We couldn\u0027t load your cart. Please try again." }, { status: 503, headers: noStore });
    }
}
export async function POST(req) {
    const c = await ctx();
    if (!c)
        return guest();
    const m = parseMutation(await req.json().catch(() => null));
    if (!m)
        return NextResponse.json({ error: "Invalid cart request." }, { status: 400, headers: noStore });
    const { sb, user } = c;
    if (m.op === "clear") {
        const { error } = await sb.from("cart_items").delete().eq("user_id", user.id);
        if (error)
            return NextResponse.json({ error: "We couldn't clear your cart. Please try again." }, { status: 500, headers: noStore });
        return NextResponse.json({ items: [] }, { headers: noStore });
    }
    const { data: product, error: productError } = await sb.from("products").select("id").eq("slug", m.item.productId).maybeSingle();
    if (productError)
        return NextResponse.json({ error: "We couldn't verify that product. Please try again." }, { status: 503, headers: noStore });
    if (!product)
        return NextResponse.json({ error: "That product is no longer available." }, { status: 409, headers: noStore });
    const key = { user_id: user.id, product_id: product.id, size: m.item.size, color: m.item.color };
    if (m.op === "remove") {
        const { error } = await sb.from("cart_items").delete().match(key);
        if (error)
            return NextResponse.json({ error: "We couldn't remove that item. Please try again." }, { status: 500, headers: noStore });
    }
    else if (m.op === "setQty") {
        const { data, error } = await sb.from("cart_items").update({ qty: m.item.qty }).match(key).select("user_id");
        if (error)
            return NextResponse.json({ error: "We couldn't update that quantity. Please try again." }, { status: 500, headers: noStore });
        if (!data?.length)
            return NextResponse.json({ error: "That cart item could not be found. Refresh your cart and try again." }, { status: 404, headers: noStore });
    }
    else {
        // Only real, active size+color combinations can enter the cart (checkout enforces stock on the server too).
        const { data: variant, error: variantError } = await sb.from("product_variants").select("id,stock,reserved").eq("product_id", product.id).eq("size", m.item.size).eq("color_name", m.item.color).eq("active", true).maybeSingle();
        if (variantError)
            return NextResponse.json({ error: "We couldn't verify stock. Please try again." }, { status: 503, headers: noStore });
        if (!variant)
            return NextResponse.json({ error: "That size and color aren't offered together." }, { status: 409, headers: noStore });
        if (Number(variant.stock) - Number(variant.reserved) <= 0)
            return NextResponse.json({ error: "That size and color combination is currently out of stock." }, { status: 409, headers: noStore });
        const { data: existing, error: existingError } = await sb.from("cart_items").select("qty").match(key).maybeSingle();
        if (existingError)
            return NextResponse.json({ error: "We couldn't verify your current cart. Please try again." }, { status: 503, headers: noStore });
        const qty = Math.min(10, (existing ? Number(existing.qty) : 0) + m.item.qty);
        const { error } = await sb.from("cart_items").upsert({ ...key, qty }, { onConflict: "user_id,product_id,size,color" });
        if (error)
            return NextResponse.json({ error: "We couldn't update your cart. Please try again." }, { status: 500, headers: noStore });
    }
    try {
        return NextResponse.json({ items: await readCart(sb, user.id) }, { headers: noStore });
    } catch {
        return NextResponse.json({ error: "Your cart may have been updated, but we couldn\u0027t reload it. Please refresh and check before retrying." }, { status: 503, headers: noStore });
    }
}

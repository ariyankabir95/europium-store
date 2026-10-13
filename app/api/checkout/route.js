import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isEmail } from "@/lib/validate";
import { paymentProvider } from "@/lib/payment";
import { readCart } from "@/lib/cart-server";
import { sendOrderPlacedEmail } from "@/lib/email";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";
const s = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const fail = (error, status) => NextResponse.json({ error }, { status });
export async function POST(req) {
    if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
        return fail("Checkout is not available yet.", 503);
    // Authentication comes first: no order is created and no stock is reserved for a signed-out visitor.
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        return fail("Please sign in or create an account to check out.", 401);
    const limited = await consumeRateLimit(req, "checkout", { limit: 5, windowSeconds: 900, identifier: user.id });
    const limitResponse = rateLimitResponse(NextResponse, limited);
    if (limitResponse) return limitResponse;
    const b = await req.json().catch(() => null);
    if (!b)
        return fail("Invalid request.", 400);
    const email = s(b.email, 254);
    const address = { first_name: s(b.firstName), last_name: s(b.lastName), phone: s(b.phone, 30), line1: s(b.line1, 200), city: s(b.city), state: s(b.state), postal_code: s(b.postalCode, 20), country: s(b.country) };
    if (!isEmail(email) || Object.values(address).some((v) => !v))
        return fail("Please complete every field with a valid email.", 400);
    // Items come from the signed-in user's saved cart, never from the request body.
    let cart;
    try {
        cart = await readCart(sb, user.id);
    } catch {
        return fail("We couldn\u0027t verify your saved cart. No order was placed; please try again.", 503);
    }
    if (!cart.length)
        return fail("Your cart is empty.", 400);
    // The database order RPC accepts at most 50 lines. Never silently truncate a larger cart
    // and then delete every cart row after checkout, which would make the customer lose items.
    if (cart.length > 50)
        return fail("Your cart has too many separate items to check out at once. Remove some items and try again.", 400);
    const items = cart.map((i) => ({ slug: i.productId, size: i.size, color: i.color, qty: i.qty }));
    if (items.some((i) => !i.slug || !i.size || !i.color || !(i.qty >= 1 && i.qty <= 10)))
        return fail("Your cart has an invalid item.", 400);
    const paymentMethod = s(b.paymentMethod, 30);
    const paymentReference = s(b.paymentReference, 80);
    if (paymentMethod !== "bkash_manual")
        return fail("Please select bKash as the payment method.", 400);
    if (paymentReference.length < 4)
        return fail("Please enter the bKash transaction ID.", 400);
    const { data, error } = await supabaseAdmin().rpc("create_order", { p_user: user.id, p_email: email, p_address: address, p_items: items, p_coupon: s(b.coupon, 40) || null, p_payment_method: paymentMethod, p_payment_reference: paymentReference });
    if (error) {
        if (error.message.includes("out_of_stock"))
            return fail("An item in your cart is out of stock in the size or color chosen.", 409);
        if (error.message.includes("invalid_coupon"))
            return fail("That coupon code isn't valid for this order.", 400);
        if (error.message.includes("invalid_item"))
            return fail("An item in your cart is no longer available.", 409);
        if (error.message.includes("invalid_payment"))
            return fail("Please enter a valid bKash transaction ID.", 400);
        return fail("We couldn't place your order. Please try again.", 500);
    }
    await sb.from("cart_items").delete().eq("user_id", user.id);
    // The order is already committed. The sender never throws, so an email problem cannot fail checkout.
    await sendOrderPlacedEmail(String(data));
    return NextResponse.json({ orderId: data, paymentConfigured: paymentProvider() !== null, paymentMethod: "bkash_manual" });
}

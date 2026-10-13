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
const DELIVERY_ZONES = new Set(["epz_local", "ashulia_bypail", "savar_outer"]);

export async function POST(req) {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail("Checkout is not available yet.", 503);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail("Please sign in or create an account to check out.", 401);

  const limited = await consumeRateLimit(req, "checkout", { limit: 5, windowSeconds: 900, identifier: user.id });
  const limitResponse = rateLimitResponse(NextResponse, limited);
  if (limitResponse) return limitResponse;

  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request.", 400);
  const email = s(b.email, 254);
  const deliveryZone = s(b.deliveryZone, 40);
  const address = {
    first_name: s(b.firstName),
    last_name: s(b.lastName),
    phone: s(b.phone, 30),
    line1: s(b.line1, 200),
    city: s(b.city),
    state: s(b.state),
    postal_code: s(b.postalCode, 20),
    country: s(b.country),
    delivery_zone: deliveryZone,
  };
  if (!isEmail(email) || Object.values(address).some((v) => !v)) return fail("Please complete every field with a valid email.", 400);
  if (address.country.toLowerCase() !== "bangladesh") return fail("EUROPIUM currently delivers only in selected areas of Bangladesh.", 400);
  if (!DELIVERY_ZONES.has(deliveryZone)) return fail("Please choose an available local delivery area.", 400);

  let cart;
  try {
    cart = await readCart(sb, user.id);
  } catch {
    return fail("We couldn't verify your saved cart. No order was placed; please try again.", 503);
  }
  if (!cart.length) return fail("Your cart is empty.", 400);
  if (cart.length > 50) return fail("Your cart has too many separate items to check out at once. Remove some items and try again.", 400);
  const items = cart.map((i) => ({ slug: i.productId, size: i.size, color: i.color, qty: i.qty }));
  if (items.some((i) => !i.slug || !i.size || !i.color || !(i.qty >= 1 && i.qty <= 10))) return fail("Your cart has an invalid item.", 400);

  const paymentMethod = s(b.paymentMethod, 30);
  const paymentReference = s(b.paymentReference, 80);
  if (!["cod", "bkash_manual"].includes(paymentMethod)) return fail("Please choose COD or bKash manual payment.", 400);
  if (paymentMethod === "bkash_manual" && paymentReference.length < 4) return fail("Please enter a valid bKash transaction ID.", 400);
  if (paymentMethod === "cod" && paymentReference) return fail("Unexpected payment reference for COD order.", 400);

  const { data, error } = await supabaseAdmin().rpc("create_order", {
    p_user: user.id,
    p_email: email,
    p_address: address,
    p_items: items,
    p_coupon: s(b.coupon, 40) || null,
    p_payment_method: paymentMethod,
    p_payment_reference: paymentMethod === "bkash_manual" ? paymentReference : null,
  });
  if (error) {
    if (error.message.includes("out_of_stock")) return fail("An item in your cart is out of stock in the size or color chosen.", 409);
    if (error.message.includes("invalid_coupon")) return fail("That coupon code isn't valid for this order.", 400);
    if (error.message.includes("invalid_item")) return fail("An item in your cart is no longer available.", 409);
    if (error.message.includes("invalid_payment")) return fail("Please enter a valid bKash transaction ID for prepaid orders.", 400);
    if (error.message.includes("invalid_shipping_zone")) return fail("Please choose an available local delivery area.", 400);
    return fail("We couldn't place your order. Please try again.", 500);
  }

  await sb.from("cart_items").delete().eq("user_id", user.id);
  await sendOrderPlacedEmail(String(data));
  return NextResponse.json({ orderId: data, paymentConfigured: paymentProvider() !== null, paymentMethod });
}

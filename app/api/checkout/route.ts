import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isEmail } from "@/lib/validate";
import { paymentProvider } from "@/lib/payment";
const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function POST(req: Request) {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail("Checkout is not available yet.", 503);
  const b = await req.json().catch(() => null); if (!b) return fail("Invalid request.", 400);
  const email = s(b.email, 254);
  const address = { first_name: s(b.firstName), last_name: s(b.lastName), phone: s(b.phone, 30), line1: s(b.line1, 200), city: s(b.city), state: s(b.state), postal_code: s(b.postalCode, 20), country: s(b.country) };
  if (!isEmail(email) || Object.values(address).some((v) => !v)) return fail("Please complete every field with a valid email.", 400);
  const items = Array.isArray(b.items) ? b.items.slice(0, 50).map((i: Record<string, unknown>) => ({ slug: s(i.slug), size: s(i.size, 10), color: s(i.color, 40), qty: Math.trunc(Number(i.qty)) })) : [];
  if (!items.length || items.some((i: { slug: string; size: string; color: string; qty: number }) => !i.slug || !i.size || !i.color || !(i.qty >= 1 && i.qty <= 10))) return fail("Your cart has an invalid item.", 400);
  const paymentMethod = s(b.paymentMethod, 30);
  const paymentReference = s(b.paymentReference, 80);
  if (paymentMethod !== "bkash_manual") return fail("Please select bKash as the payment method.", 400);
  if (paymentReference.length < 4) return fail("Please enter the bKash transaction ID.", 400);
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const { data, error } = await supabaseAdmin().rpc("create_order", { p_user: user?.id ?? null, p_email: email, p_address: address, p_items: items, p_coupon: s(b.coupon, 40) || null, p_payment_method: paymentMethod, p_payment_reference: paymentReference });
  if (error) {
    if (error.message.includes("out_of_stock")) return fail("An item in your cart is out of stock in the size or color chosen.", 409);
    if (error.message.includes("invalid_coupon")) return fail("That coupon code isn't valid for this order.", 400);
    if (error.message.includes("invalid_item")) return fail("An item in your cart is no longer available.", 409);
    if (error.message.includes("invalid_payment")) return fail("Please enter a valid bKash transaction ID.", 400);
    return fail("We couldn't place your order. Please try again.", 500);
  }
  return NextResponse.json({ orderId: data, paymentConfigured: paymentProvider() !== null, paymentMethod: "bkash_manual" });
}

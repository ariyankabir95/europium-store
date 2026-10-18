import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";

async function ctx() {
  if (!hasSupabase()) return null;
  const sb = await supabaseServer();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  return { sb, user };
}

const unavailable = () => NextResponse.json(
  { error: "We couldn't update your wishlist. Please try again." },
  { status: 503, headers: { "Cache-Control": "no-store" } }
);

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "guest" }, { status: 401 });

  const { data, error } = await c.sb
    .from("wishlist_items")
    .select("products(slug)")
    .eq("user_id", c.user.id);

  // Never report an empty wishlist when the database query actually failed.
  if (error) {
    console.error("[wishlist] read failed:", error.code);
    return unavailable();
  }

  return NextResponse.json(
    { slugs: (data ?? []).map((r) => r.products?.slug).filter(Boolean) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Replaces the signed-in user's wishlist. RLS restricts every row to its owner. */
export async function POST(req) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "guest" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.slugs) || body.slugs.length > 200) {
    return NextResponse.json({ error: "Invalid wishlist request." }, { status: 400 });
  }
  if (body.slugs.some((slug) => typeof slug !== "string" || !slug.trim() || slug.length > 200)) {
    return NextResponse.json({ error: "Invalid wishlist item." }, { status: 400 });
  }

  const slugs = [...new Set(body.slugs.map((slug) => slug.trim()))];
  let ids = [];

  if (slugs.length) {
    const { data: products, error: productsError } = await c.sb
      .from("products")
      .select("id,slug")
      .in("slug", slugs);

    // Do not delete existing wishlist entries if product lookup fails or any slug is invalid.
    if (productsError) {
      console.error("[wishlist] product lookup failed:", productsError.code);
      return unavailable();
    }
    if ((products ?? []).length !== slugs.length) {
      return NextResponse.json({ error: "One or more wishlist products are unavailable." }, { status: 400 });
    }
    ids = products.map((product) => product.id);

    // Add/retain requested products before removing old entries, so a failed write doesn't empty the wishlist.
    const { error: upsertError } = await c.sb
      .from("wishlist_items")
      .upsert(ids.map((product_id) => ({ user_id: c.user.id, product_id })));
    if (upsertError) {
      console.error("[wishlist] save failed:", upsertError.code);
      return unavailable();
    }

    const { error: deleteError } = await c.sb
      .from("wishlist_items")
      .delete()
      .eq("user_id", c.user.id)
      .not("product_id", "in", `(${ids.join(",")})`);
    if (deleteError) {
      console.error("[wishlist] stale items cleanup failed:", deleteError.code);
      return unavailable();
    }
  } else {
    // An explicitly supplied empty array means the customer chose to clear the wishlist.
    const { error: deleteError } = await c.sb
      .from("wishlist_items")
      .delete()
      .eq("user_id", c.user.id);
    if (deleteError) {
      console.error("[wishlist] clear failed:", deleteError.code);
      return unavailable();
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
